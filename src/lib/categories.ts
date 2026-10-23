import { db } from './db';
import { HttpError, readJson } from './http';
import { slugify } from './slug';
import type { CategoryWrite } from './types';
import { categoryInputSchema } from './validation';

/** Validates a create/update body and derives the slug from the name. Two categories can't share a name. */
export async function categoryFromRequest(req: Request, exceptId?: number): Promise<CategoryWrite> {
  const input = categoryInputSchema.parse(await readJson(req));
  const slug = slugify(input.name, 'categoria');
  if (await db().categorySlugExists(slug, exceptId)) throw new HttpError(409, 'Ya existe una categoría con ese nombre.');
  return { ...input, slug };
}
