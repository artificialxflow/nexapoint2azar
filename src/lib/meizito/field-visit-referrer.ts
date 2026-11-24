import type { MeizitoFieldVisit } from '@/src/types/meizito';

export const FIELD_VISIT_REFERRER_TAG_OPTIONS = [
  'مشتری قبلی',
  'همکار',
  'هم‌صنف',
  'طراح',
  'سازنده',
  'مشاور املاک',
] as const;

export type FieldVisitReferrerRow = {
  hasReferrer: boolean | null;
  referrerName: string | null;
  referrerTag: string | null;
};

/** ستون‌های DB بر معرف مقدار SSOT؛ payload همیشه هم‌خوان می‌ماند. */
export function fieldVisitReferrerColumns(visit: MeizitoFieldVisit): FieldVisitReferrerRow {
  const on = visit.hasReferrer === true;
  return {
    hasReferrer: visit.hasReferrer ?? null,
    referrerName: on && visit.referrerName?.trim() ? visit.referrerName.trim() : null,
    referrerTag: on && visit.referrerTag?.trim() ? visit.referrerTag.trim() : null,
  };
}

export function mergeFieldVisitFromDbRow(
  payload: MeizitoFieldVisit,
  row: FieldVisitReferrerRow
): MeizitoFieldVisit {
  return {
    ...payload,
    hasReferrer: row.hasReferrer ?? payload.hasReferrer,
    referrerName: row.referrerName ?? payload.referrerName,
    referrerTag: row.referrerTag ?? payload.referrerTag,
  };
}
