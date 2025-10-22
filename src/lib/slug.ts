import type { Repository } from './types';

/** "Con su Nombre ñandú!" → "con-su-nombre-nandu". */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'producto';
}

/** Segments used by sibling routes under /api/products, so a product can't take them. */
const RESERVED = new Set(['id']);

/** Appends -2, -3... when another product already uses the slug. */
export async function uniqueSlug(repo: Repository, name: string, exceptId?: number): Promise<string> {
  const slugified = slugify(name);
  const base = RESERVED.has(slugified) ? `${slugified}-producto` : slugified;
  let slug = base;
  for (let n = 2; await repo.slugExists(slug, exceptId); n++) slug = `${base}-${n}`;
  return slug;
}
