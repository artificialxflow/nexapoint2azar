import { copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import {
  getStorageRoot,
  LANDING_PREVIEW_FILENAME,
  STORAGE_PUBLIC_DIR,
  STORAGE_UPLOADS_DIR,
} from '@/src/lib/storage/config';
import { storagePublicRoot } from '@/src/lib/storage/paths';
import { createLogger } from '@/src/lib/logger';

const log = createLogger('storage');

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureStorageLayout(): Promise<void> {
  const root = getStorageRoot();
  await mkdir(path.join(root, STORAGE_PUBLIC_DIR), { recursive: true });
  await mkdir(path.join(root, STORAGE_UPLOADS_DIR), { recursive: true });
}

export async function seedLandingPreviewIfMissing(): Promise<void> {
  await ensureStorageLayout();
  const dest = path.join(storagePublicRoot(), 'images', LANDING_PREVIEW_FILENAME);
  await mkdir(path.dirname(dest), { recursive: true });
  if (await exists(dest)) return;

  const bundled = path.join(process.cwd(), 'public', 'images', LANDING_PREVIEW_FILENAME);
  if (!(await exists(bundled))) {
    log.warn('bundled landing preview missing', { bundled });
    return;
  }

  await copyFile(bundled, dest);
  log.info('seeded landing preview to storage', { dest });
}

export async function bootstrapStorage(): Promise<void> {
  await ensureStorageLayout();
  await seedLandingPreviewIfMissing();
}
