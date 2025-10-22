import type { Sql } from 'postgres';
import { SEED_CONTENT, SEED_PRODUCTS, SEED_SITE } from '../seed';
import { MIGRATIONS } from './migrations';

/** Arbitrary constant: serializes migrations when several serverless instances cold-start at once. */
const MIGRATION_LOCK = 724_501;

/** Applies pending migrations. Safe to call on every cold start. Returns the ids it applied. */
export async function migrate(sql: Sql): Promise<string[]> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${MIGRATION_LOCK})`;
    await tx`
      create table if not exists schema_migrations (
        id         varchar(100) primary key,
        applied_at timestamptz  not null default now()
      )`;

    const done = new Set((await tx<{ id: string }[]>`select id from schema_migrations`).map((r) => r.id));
    const applied: string[] = [];
    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      await tx.unsafe(migration.sql);
      await tx`insert into schema_migrations (id) values (${migration.id})`;
      applied.push(migration.id);
    }
    return applied;
  });
}

/** Loads the initial content into an empty database. Returns false when data already existed. */
export async function seedIfEmpty(sql: Sql): Promise<boolean> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${MIGRATION_LOCK})`;
    const [{ count }] = await tx<{ count: number }[]>`select count(*)::int as count from site_settings`;
    if (count > 0) return false;

    const s = SEED_SITE;
    await tx`
      insert into site_settings (name, tagline, whatsapp_number, whatsapp_display, default_message, facebook_url,
                                 instagram_handle, instagram_url, location, address, logo_url, hero_image_url)
      values (${s.name}, ${s.tagline}, ${s.whatsappNumber}, ${s.whatsappDisplay}, ${s.defaultMessage}, ${s.facebookUrl},
              ${s.instagramHandle}, ${s.instagramUrl}, ${s.location}, ${s.address}, ${s.logoUrl}, ${s.heroImageUrl})`;

    for (const c of SEED_CONTENT) {
      await tx`
        insert into content_items (section, icon, title, text, sort_order)
        values (${c.section}, ${c.icon}, ${c.title}, ${c.text}, ${c.sortOrder})`;
    }

    for (const p of SEED_PRODUCTS) {
      const [{ id }] = await tx<{ id: number }[]>`
        insert into products (slug, name, description, image_url, image_alt, price, size_info, is_visible, sort_order)
        values (${p.slug}, ${p.name}, ${p.description}, ${p.imageUrl}, ${p.imageAlt}, ${p.price}, ${p.sizeInfo},
                ${p.isVisible}, ${p.sortOrder})
        returning id`;
      for (const [position, text] of p.details.entries()) {
        await tx`insert into product_details (product_id, position, text) values (${id}, ${position}, ${text})`;
      }
    }
    return true;
  });
}
