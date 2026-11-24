import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { storageUploadsRoot } from '@/src/lib/storage/paths';

/** Relative path under `uploads/` for future attachment APIs. */
export function newUploadRelativePath(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  const stamp = new Date().toISOString().slice(0, 10);
  return path.join(stamp, `${randomUUID()}-${safe}`);
}

export function resolveUploadAbsolute(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  const root = storageUploadsRoot();
  const absolute = path.resolve(root, normalized);
  const rootResolved = path.resolve(root);
  if (!absolute.startsWith(rootResolved + path.sep)) return null;
  return absolute;
}
