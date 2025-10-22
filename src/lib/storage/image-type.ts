/** Accepted image formats, identified by their file signature (magic bytes), not by the client's claims. */
export interface ImageType {
  extension: '.jpg' | '.png' | '.webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel functions accept request bodies up to 4.5 MB.

export function detectImageType(bytes: Uint8Array): ImageType | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0xff, 0xd8, 0xff])) return { extension: '.jpg', contentType: 'image/jpeg' };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { extension: '.png', contentType: 'image/png' };
  // "RIFF" .... "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: '.webp', contentType: 'image/webp' };
  }
  return null;
}

export const CONTENT_TYPES: Record<string, ImageType['contentType']> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
