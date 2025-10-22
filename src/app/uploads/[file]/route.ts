import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { LOCAL_UPLOAD_DIR } from '@/lib/storage';
import { CONTENT_TYPES } from '@/lib/storage/image-type';

export const dynamic = 'force-dynamic';

/**
 * Serves images uploaded in local development (data/uploads). In production uploads live in
 * Vercel Blob and are served from there, so this route only finds files locally.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = path.basename((await params).file); // no path traversal
  const contentType = CONTENT_TYPES[path.extname(name).toLowerCase()];
  if (!contentType) return new Response('Not found', { status: 404 });

  try {
    const bytes = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    return new Response(bytes, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
