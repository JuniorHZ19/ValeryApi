import { requireAdmin } from '@/lib/auth';
import { categoryFromRequest } from '@/lib/categories';
import { db } from '@/lib/db';
import { HttpError, json, noContent, parseId, preflight, run } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

type Context = { params: Promise<{ id: string }> };

/** Admin: one category, with all its products counted (hidden too). */
export async function GET(req: Request, { params }: Context) {
  return run(req, async () => {
    await requireAdmin(req);
    const category = await db().getCategoryById(parseId((await params).id));
    if (!category) throw new HttpError(404, 'Categoría no encontrada.');
    return json(req, category);
  });
}

export async function PUT(req: Request, { params }: Context) {
  return run(req, async () => {
    await requireAdmin(req);
    const id = parseId((await params).id);
    const category = await db().updateCategory(id, await categoryFromRequest(req, id));
    if (!category) throw new HttpError(404, 'Categoría no encontrada.');
    return json(req, category);
  });
}

/** Only empty categories can be deleted: products must be moved to another category first. */
export async function DELETE(req: Request, { params }: Context) {
  return run(req, async () => {
    await requireAdmin(req);
    const id = parseId((await params).id);
    const category = await db().getCategoryById(id);
    if (!category) throw new HttpError(404, 'Categoría no encontrada.');
    if (category.productCount > 0) {
      const n = category.productCount;
      throw new HttpError(
        409,
        `No se puede borrar "${category.name}": tiene ${n} producto${n === 1 ? '' : 's'}. Muévelos a otra categoría primero.`,
      );
    }
    await db().deleteCategory(id);
    return noContent(req);
  });
}
