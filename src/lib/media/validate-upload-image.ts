const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

export type ImageUploadPurpose = 'avatar' | 'business-logo';

export function assertValidProfileImage(file: Blob, mimeType: string, size: number): void {
  const mime = mimeType.trim().toLowerCase() || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('فقط تصویر (JPG، PNG، WebP یا GIF) مجاز است.');
  }
  if (size > MAX_BYTES) {
    throw new Error('حداکثر حجم تصویر ۵ مگابایت است.');
  }
  void file;
}