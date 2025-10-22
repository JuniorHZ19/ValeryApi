import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, put } from '@vercel/blob';
import type { ImageType } from './image-type';

/** Where uploads live in local development; served by src/app/uploads/[file]/route.ts. */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const LOCAL_PREFIX = '/uploads/';

export interface ImageStore {
  /** Returns the public URL of the stored image. */
  save(bytes: Uint8Array, type: ImageType): Promise<string>;
  /** Deletes an image previously saved by this store. Seed images (/images/...) are never touched. */
  delete(url: string): Promise<void>;
}

/** Vercel Blob in production (BLOB_READ_WRITE_TOKEN set); local disk otherwise. */
export function imageStore(): ImageStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore;
  if (process.env.VERCEL) throw new Error('BLOB_READ_WRITE_TOKEN is required on Vercel: add a Blob store to the project.');
  return localStore;
}

const localStore: ImageStore = {
  async save(bytes, type) {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}${type.extension}`;
    await writeFile(path.join(LOCAL_UPLOAD_DIR, name), bytes);
    return `${LOCAL_PREFIX}${name}`;
  },
  async delete(url) {
    if (!url.startsWith(LOCAL_PREFIX)) return;
    await unlink(path.join(LOCAL_UPLOAD_DIR, path.basename(url))).catch(() => undefined);
  },
};

const blobStore: ImageStore = {
  async save(bytes, type) {
    const blob = await put(`uploads/${randomUUID()}${type.extension}`, Buffer.from(bytes), {
      access: 'public',
      contentType: type.contentType,
    });
    return blob.url;
  },
  async delete(url) {
    if (!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url)) return;
    await del(url).catch(() => undefined);
  },
};
