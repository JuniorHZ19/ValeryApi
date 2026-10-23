import { isAdmin, requireAdmin } from '@/lib/auth';
import { categoryFromRequest } from '@/lib/categories';
import { db } from '@/lib/db';
import { json, preflight, run } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/** Categories in menu order, with how many visible products each has. `?includeHidden=true` (admins) counts all. */
export async function GET(req: Request) {
  return run(req, async () => {
    const wantsHidden = new URL(req.url).searchParams.get('includeHidden') === 'true';
    return json(req, await db().listCategories(wantsHidden && (await isAdmin(req))));
  });
}

export async function POST(req: Request) {
  return run(req, async () => {
    await requireAdmin(req);
    const category = await db().createCategory(await categoryFromRequest(req));
    return json(req, category, 201);
  });
}
