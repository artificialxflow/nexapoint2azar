import { LANDING_PREVIEW_FILENAME } from '@/src/lib/storage/config';

/** URL served by `app/api/storage/public/[...path]/route.ts` (persistent disk). */
export function storagePublicUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '');
  return `/api/storage/public/${normalized}`;
}

/** Static asset from build (most reliable for landing hero). */
export const LANDING_PREVIEW_FALLBACK_URL = `/images/${LANDING_PREVIEW_FILENAME}`;

/** Optional copy on persistent disk (after bootstrap on server). */
export const LANDING_PREVIEW_IMAGE_URL = storagePublicUrl(
  `images/${LANDING_PREVIEW_FILENAME}`
);
