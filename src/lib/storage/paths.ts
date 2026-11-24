import path from 'node:path';
import {
  getStorageRoot,
  STORAGE_PUBLIC_DIR,
  STORAGE_UPLOADS_DIR,
} from '@/src/lib/storage/config';

export function storagePublicRoot(): string {
  return path.join(getStorageRoot(), STORAGE_PUBLIC_DIR);
}

export function storageUploadsRoot(): string {
  return path.join(getStorageRoot(), STORAGE_UPLOADS_DIR);
}

/** Resolve a file under `public/`; returns null if path escapes the public root. */
export function resolveStoragePublicFile(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;

  const root = storagePublicRoot();
  const absolute = path.resolve(root, normalized);
  const rootResolved = path.resolve(root);
  if (!absolute.startsWith(rootResolved + path.sep) && absolute !== rootResolved) {
    return null;
  }
  return absolute;
}
