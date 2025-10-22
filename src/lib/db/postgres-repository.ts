import postgres, { type Sql, type TransactionSql as Tx } from 'postgres';
import type { ContentItem, Product, ProductWrite, Repository, SiteSettings } from '../types';
import { migrate, seedIfEmpty } from './migrate';

interface ProductRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  details: string[];
  image_url: string;
  image_alt: string;
  price: string | null;
  size_info: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  details: r.details,
  imageUrl: r.image_url,
  imageAlt: r.image_alt,
  // NUMERIC comes back as a string to avoid precision loss; prices fit comfortably in a double.
  price: r.price === null ? null : Number(r.price),
  sizeInfo: r.size_info,
  isVisible: r.is_visible,
  sortOrder: r.sort_order,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

/** PostgreSQL store. The schema is migrated (and seeded when empty) on first use. */
export class PostgresRepository implements Repository {
  private readonly sql: Sql;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    // Small pool: serverless functions run many short-lived instances.
    this.sql = postgres(url, { max: 3, idle_timeout: 20, onnotice: () => {} });
  }

  async getSite() {
    await this.init();
    const [row] = await this.sql<SiteSettings[]>`
      select name, tagline, whatsapp_number as "whatsappNumber", whatsapp_display as "whatsappDisplay",
             default_message as "defaultMessage", facebook_url as "facebookUrl", instagram_handle as "instagramHandle",
             instagram_url as "instagramUrl", location, address, logo_url as "logoUrl", hero_image_url as "heroImageUrl"
      from site_settings where id = 1`;
    if (!row) throw new Error('site_settings is empty: run `npm run db:migrate`.');
    return row;
  }

  async updateSite(s: SiteSettings) {
    await this.init();
    await this.sql`
      update site_settings set
        name = ${s.name}, tagline = ${s.tagline}, whatsapp_number = ${s.whatsappNumber},
        whatsapp_display = ${s.whatsappDisplay}, default_message = ${s.defaultMessage},
        facebook_url = ${s.facebookUrl}, instagram_handle = ${s.instagramHandle}, instagram_url = ${s.instagramUrl},
        location = ${s.location}, address = ${s.address}, logo_url = ${s.logoUrl}, hero_image_url = ${s.heroImageUrl}
      where id = 1`;
    return this.getSite();
  }

  async listContent() {
    await this.init();
    return this.sql<ContentItem[]>`
      select id, section, icon, title, text, sort_order as "sortOrder"
      from content_items order by section, sort_order, id`;
  }

  async listProducts(includeHidden: boolean) {
    await this.init();
    const rows = await this.sql<ProductRow[]>`
      ${this.selectProducts()}
      where ${includeHidden ? this.sql`true` : this.sql`p.is_visible`}
      group by p.id
      order by p.sort_order, p.id`;
    return rows.map(toProduct);
  }

  async getProductBySlug(slug: string) {
    await this.init();
    const [row] = await this.sql<ProductRow[]>`${this.selectProducts()} where p.slug = ${slug} group by p.id`;
    return row ? toProduct(row) : null;
  }

  async getProductById(id: number) {
    await this.init();
    const [row] = await this.sql<ProductRow[]>`${this.selectProducts()} where p.id = ${id} group by p.id`;
    return row ? toProduct(row) : null;
  }

  async createProduct(d: ProductWrite) {
    await this.init();
    return this.sql.begin(async (tx) => {
      const [{ id }] = await tx<{ id: number }[]>`
        insert into products (slug, name, description, image_url, image_alt, price, size_info, is_visible, sort_order)
        values (${d.slug}, ${d.name}, ${d.description}, ${d.imageUrl}, ${d.imageAlt}, ${d.price}, ${d.sizeInfo},
                ${d.isVisible}, ${d.sortOrder})
        returning id`;
      await this.replaceDetails(tx, id, d.details);
      return (await this.findById(tx, id))!;
    });
  }

  async updateProduct(id: number, d: ProductWrite) {
    await this.init();
    return this.sql.begin(async (tx) => {
      const updated = await tx`
        update products set slug = ${d.slug}, name = ${d.name}, description = ${d.description},
          image_url = ${d.imageUrl}, image_alt = ${d.imageAlt}, price = ${d.price}, size_info = ${d.sizeInfo},
          is_visible = ${d.isVisible}, sort_order = ${d.sortOrder}
        where id = ${id}`;
      if (updated.count === 0) return null;
      await this.replaceDetails(tx, id, d.details);
      return this.findById(tx, id);
    });
  }

  async deleteProduct(id: number) {
    await this.init();
    return this.sql.begin(async (tx) => {
      const product = await this.findById(tx, id);
      if (!product) return null;
      await tx`delete from products where id = ${id}`; // details go with it (on delete cascade)
      return product;
    });
  }

  async slugExists(slug: string, exceptId?: number) {
    await this.init();
    const [row] = await this.sql`select 1 from products where slug = ${slug} and id <> ${exceptId ?? -1} limit 1`;
    return !!row;
  }

  async isImageInUse(url: string) {
    await this.init();
    const [row] = await this.sql`
      select 1 where exists (select 1 from products where image_url = ${url})
         or exists (select 1 from site_settings where logo_url = ${url} or hero_image_url = ${url})`;
    return !!row;
  }

  /** Product columns plus its details aggregated in order (empty array when it has none). */
  private selectProducts() {
    return this.sql`
      select p.*,
             coalesce(array_agg(d.text order by d.position) filter (where d.text is not null), '{}') as details
      from products p
      left join product_details d on d.product_id = p.id`;
  }

  /** Reads a product inside a transaction, so it sees that transaction's own writes. */
  private async findById(tx: Tx, id: number): Promise<Product | null> {
    const [row] = await tx<ProductRow[]>`${this.selectProducts()} where p.id = ${id} group by p.id`;
    return row ? toProduct(row) : null;
  }

  private async replaceDetails(tx: Tx, productId: number, details: string[]): Promise<void> {
    await tx`delete from product_details where product_id = ${productId}`;
    if (!details.length) return;
    const rows = details.map((text, position) => ({ product_id: productId, position, text }));
    await tx`insert into product_details ${tx(rows, 'product_id', 'position', 'text')}`;
  }

  private init(): Promise<void> {
    this.ready ??= (async () => {
      await migrate(this.sql);
      await seedIfEmpty(this.sql);
    })().catch((error) => {
      this.ready = null; // retry on the next request
      throw error;
    });
    return this.ready;
  }
}
