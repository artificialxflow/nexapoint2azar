import type { AttachmentRef } from '@/src/types/attachment';
import type { ImageUploadPurpose } from '@/src/lib/media/validate-upload-image';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { parseApiJson } from '@/src/lib/http/parse-api-response';
import { idbGetBlob, idbPutBlob } from '@/src/lib/attachments/idb';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function assertClientImage(file: File): void {
  const mime = (file.type || '').toLowerCase();
  if (!IMAGE_MIME.has(mime)) {
    throw new Error('فقط تصویر (JPG، PNG، WebP یا GIF) مجاز است.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('حداکثر حجم تصویر ۵ مگابایت است.');
  }
}

const blobUrlCache = new Map<string, string>();

export async function uploadLocalAttachment(file: File, scope?: string): Promise<AttachmentRef> {
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await idbPutBlob(id, file);
  return {
    id,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    scope,
    createdAt: new Date().toISOString(),
  };
}

export type ServerAttachmentLink = {
  businessId?: string;
  entityType?: string;
  entityId?: string;
};

export async function uploadServerAttachment(
  file: File,
  scope?: string,
  purpose?: ImageUploadPurpose,
  link?: ServerAttachmentLink
): Promise<AttachmentRef> {
  const form = new FormData();
  form.append('file', file);
  if (purpose) form.append('purpose', purpose);
  if (link?.businessId) form.append('businessId', link.businessId);
  if (link?.entityType) form.append('entityType', link.entityType);
  if (link?.entityId) form.append('entityId', link.entityId);
  const res = await fetch('/api/attachments', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await parseApiJson<{
    fileKey: string;
    url: string;
    name: string;
    size: number;
  }>(res);
  const id = `srv-${data.fileKey.replace(/\//g, '-')}`;
  return {
    id,
    name: data.name,
    mimeType: file.type || 'application/octet-stream',
    size: data.size,
    scope,
    fileKey: data.fileKey,
    url: data.url,
    createdAt: new Date().toISOString(),
  };
}

export async function uploadAttachment(
  file: File,
  scope?: string,
  link?: ServerAttachmentLink
): Promise<AttachmentRef> {
  if (FRONTEND_ONLY) return uploadLocalAttachment(file, scope);
  return uploadServerAttachment(file, scope, undefined, link);
}

export async function uploadBrandingImage(
  file: File,
  purpose: ImageUploadPurpose
): Promise<AttachmentRef> {
  assertClientImage(file);
  if (FRONTEND_ONLY) {
    const ref = await uploadLocalAttachment(file, purpose);
    if (typeof URL !== 'undefined' && typeof window !== 'undefined') {
      ref.url = URL.createObjectURL(file);
    }
    return ref;
  }
  return uploadServerAttachment(file, purpose, purpose);
}

export async function openLocalAttachment(ref: AttachmentRef): Promise<void> {
  if (typeof window === 'undefined') return;

  if (ref.url && !FRONTEND_ONLY) {
    const w = window.open(ref.url, '_blank', 'noopener');
    if (!w) {
      const a = document.createElement('a');
      a.href = ref.url;
      a.download = ref.name;
      a.rel = 'noopener';
      a.click();
    }
    return;
  }

  try {
    const blob = await idbGetBlob(ref.id);
    if (!blob) {
      window.alert('فایل در حافظهٔ محلی یافت نشد.');
      return;
    }
    let url = blobUrlCache.get(ref.id);
    if (!url) {
      url = URL.createObjectURL(blob);
      blobUrlCache.set(ref.id, url);
    }
    const w = window.open(url, '_blank', 'noopener');
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.download = ref.name;
      a.click();
    }
  } catch {
    window.alert('باز کردن فایل ناموفق بود.');
  }
}

/** سازگاری با دادهٔ قدیمی Nextcloud (فقط نام — بدون محتوا) */
export function isLegacyCloudRef(ref: { path?: string; id?: string }): boolean {
  return Boolean(ref.path && !ref.id?.startsWith('att-') && !ref.id?.startsWith('srv-'));
}
