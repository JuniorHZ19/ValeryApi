import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { json, preflight, readJson, run } from '@/lib/http';
import { deleteImageIfUnused } from '@/lib/products';
import { siteSettingsSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export async function GET(req: Request) {
  return run(req, async () => json(req, await db().getSite()));
}

export async function PUT(req: Request) {
  return run(req, async () => {
    await requireAdmin(req);
    const next = siteSettingsSchema.parse(await readJson(req));
    const previous = await db().getSite();
    const saved = await db().updateSite(next);

    for (const url of [previous.logoUrl, previous.heroImageUrl]) {
      if (url !== saved.logoUrl && url !== saved.heroImageUrl) await deleteImageIfUnused(url);
    }
    return json(req, saved);
  });
}
