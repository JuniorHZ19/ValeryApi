import { db } from './db';
import { readJson } from './http';
import { uniqueSlug } from './slug';
import { imageStore } from './storage';
import type { ProductWrite } from './types';
import { productInputSchema } from './validation';

/** Validates a create/update body and derives the fields the server owns (slug, default alt text). */
export async function productFromRequest(req: Request, exceptId?: number): Promise<ProductWrite> {
  const input = productInputSchema.parse(await readJson(req));
  return {
    ...input,
    slug: await uniqueSlug(db(), input.name, exceptId),
    imageAlt: input.imageAlt || `Amigurumi ${input.name}`,
  };
}

/** Removes an uploaded image once nothing references it any more. */
export async function deleteImageIfUnused(url: string): Promise<void> {
  if (!(await db().isImageInUse(url))) await imageStore().delete(url);
}
