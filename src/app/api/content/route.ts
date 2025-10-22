import { db } from '@/lib/db';
import { json, preflight, run } from '@/lib/http';
import type { ContentItem, ContentSection } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/** Highlights, order steps and occasions of the home page. */
export async function GET(req: Request) {
  return run(req, async () => {
    const items = await db().listContent();
    const of = (section: ContentSection) =>
      items
        .filter((i) => i.section === section)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ section: _section, ...rest }: ContentItem) => rest);

    return json(req, { highlights: of('highlight'), steps: of('step'), occasions: of('occasion') });
  });
}
