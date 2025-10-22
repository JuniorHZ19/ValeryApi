import { db } from '@/lib/db';
import { HttpError, json, preflight, run } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/** Public product page data. Hidden products answer 404. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return run(req, async () => {
    const { slug } = await params;
    const product = await db().getProductBySlug(slug);
    if (!product || !product.isVisible) throw new HttpError(404, 'Producto no encontrado.');
    return json(req, product);
  });
}
