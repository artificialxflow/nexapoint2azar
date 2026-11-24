/** مرجع پیوست — IndexedDB (mock) یا سرور (`url` / `fileKey`) */
export type AttachmentRef = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  /** برچسب منطقی (مثلاً meizito/card/…) — فقط برای نمایش */
  scope?: string;
  createdAt?: string;
  /** مسیر ذخیره روی سرور (بدون پیشوند /api/attachments/) */
  fileKey?: string;
  /** URL دانلود با session */
  url?: string;
};
