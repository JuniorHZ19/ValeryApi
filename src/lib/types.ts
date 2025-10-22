export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  details: string[];
  /** Relative (/images/x.jpg, /uploads/x.jpg) or absolute (Vercel Blob) URL. */
  imageUrl: string;
  imageAlt: string;
  /** null = price on request. */
  price: number | null;
  sizeInfo: string | null;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Validated body of create/update, plus the slug computed on the server. */
export type ProductWrite = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface SiteSettings {
  name: string;
  tagline: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  defaultMessage: string;
  facebookUrl: string;
  instagramHandle: string;
  instagramUrl: string;
  location: string;
  address: string;
  logoUrl: string;
  heroImageUrl: string;
}

export type ContentSection = 'highlight' | 'step' | 'occasion';

export interface ContentItem {
  id: number;
  section: ContentSection;
  icon: string;
  title: string;
  text: string;
  sortOrder: number;
}

/** Persistence boundary: a JSON file locally, Postgres in production. */
export interface Repository {
  getSite(): Promise<SiteSettings>;
  updateSite(site: SiteSettings): Promise<SiteSettings>;
  listContent(): Promise<ContentItem[]>;
  listProducts(includeHidden: boolean): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductById(id: number): Promise<Product | null>;
  createProduct(data: ProductWrite): Promise<Product>;
  updateProduct(id: number, data: ProductWrite): Promise<Product | null>;
  deleteProduct(id: number): Promise<Product | null>;
  slugExists(slug: string, exceptId?: number): Promise<boolean>;
  /** True when a product or the site settings still reference the image. */
  isImageInUse(url: string): Promise<boolean>;
}
