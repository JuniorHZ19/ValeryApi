import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { HttpError, json, noContent, parseId, preflight, run } from '@/lib/http';
import { deleteImageIfUnused, productFromRequest } from '@/lib/products';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

type Context = { params: Promise<{ id: string }> };

/** Admin: any product by id, including hidden ones. */
export async function GET(req: Request, { params }: Context) {
  return run(req, async () => {
    await requireAdmin(req);
    const product = await db().getProductById(parseId((await params).id));
    if (!product) throw new HttpError(404, 'Producto no encontrado.');
    return json(req, product);
  });
}

export async function PUT(req: Request, { params }: Context) {
  return run(req, async () => {
    await requireAdmin(req);
    const id = parseId((await params).id);
    const previous = await db().getProductById(id);
    if (!previous) throw new HttpError(404, 'Producto no encontrado.');

    const updated = await db().updateProduct(id, await productFromRequest(req, id));
    if (!updated) throw new HttpError(404, 'Producto no encontrado.');
    if (previous.imageUrl !== updated.imageUrl) await deleteImageIfUnused(previous.imageUrl);
    return json(req, updated);
  });
}

export async function DELETE(req: Request, { params }: Context) {
  return run(req, async () => {
    await requireAdmin(req);
    const deleted = await db().deleteProduct(parseId((await params).id));
    if (!deleted) throw new HttpError(404, 'Producto no encontrado.');
    await deleteImageIfUnused(deleted.imageUrl);
    return noContent(req);
  });
}
