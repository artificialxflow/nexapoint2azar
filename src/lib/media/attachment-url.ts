/** مسیر دانلود پیوست با سشن — از `fileKey` ذخیره‌شده در DB */
export function attachmentUrlFromFileKey(fileKey: string | null | undefined): string | null {
  const key = fileKey?.trim();
  if (!key) return null;
  return `/api/attachments/${key.split('/').map(encodeURIComponent).join('/')}`;
}