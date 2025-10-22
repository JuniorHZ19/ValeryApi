import { requireAdmin } from '@/lib/auth';
import { HttpError, json, preflight, run } from '@/lib/http';
import { imageStore } from '@/lib/storage';
import { detectImageType, MAX_IMAGE_BYTES } from '@/lib/storage/image-type';

export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/** Uploads one image (multipart field "file": JPG, PNG or WebP) and returns its public URL. */
export async function POST(req: Request) {
  return run(req, async () => {
    await requireAdmin(req);

    const form = await req.formData().catch(() => {
      throw new HttpError(400, 'Envía la imagen como multipart/form-data en el campo "file".');
    });
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) throw new HttpError(400, 'No se recibió ninguna imagen.');
    if (file.size > MAX_IMAGE_BYTES) throw new HttpError(400, `La imagen supera ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) throw new HttpError(400, 'Formato no soportado. Usa JPG, PNG o WebP.');

    return json(req, { url: await imageStore().save(bytes, type) }, 201);
  });
}
