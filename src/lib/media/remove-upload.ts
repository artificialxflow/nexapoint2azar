import { unlink } from 'node:fs/promises';
import { resolveUploadAbsolute } from '@/src/lib/storage/uploads';

/** حذف فایل قبلی از دیسک — خطا نادیده گرفته می‌شود */
export async function removeUploadFile(fileKey: string | null | undefined): Promise<void> {
  const key = fileKey?.trim();
  if (!key) return;
  const absolute = resolveUploadAbsolute(key);
  if (!absolute) return;
  try {
    await unlink(absolute);
  } catch {
    /* already gone */
  }
}