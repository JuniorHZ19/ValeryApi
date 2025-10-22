import { isAdmin, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { json, preflight, run } from '@/lib/http';
import { productFromRequest } from '@/lib/products';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/** Catalog in display order. `?includeHidden=true` also returns hidden products, for admins only. */
export async function GET(req: Request) {
  return run(req, async () => {
    const wantsHidden = new URL(req.url).searchParams.get('includeHidden') === 'true';
    const includeHidden = wantsHidden && (await isAdmin(req));
    return json(req, await db().listProducts(includeHidden));
  });
}

export async function POST(req: Request) {
  return run(req, async () => {
    await requireAdmin(req);
    const product = await db().createProduct(await productFromRequest(req));
    return json(req, product, 201);
  });
}
