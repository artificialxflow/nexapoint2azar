import path from 'node:path';

/** Persistent volume mount (Runflare disk). Local default: `.data/storage` in project root. */
export function getStorageRoot(): string {
  const fromEnv = process.env.NEXA_STORAGE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), '.data', 'storage');
}

export const STORAGE_PUBLIC_DIR = 'public';
export const STORAGE_UPLOADS_DIR = 'uploads';

export const LANDING_PREVIEW_FILENAME = 'dashboard-preview.svg';
