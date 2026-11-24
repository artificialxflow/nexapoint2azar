/** کسب‌وکار دادهٔ تست UAT — اسکریپت tenant-ronak و UI */
export const FIXTURE_BUSINESS_NAME = 'رونام';
export const FIXTURE_CREDIT_LABEL = 'fixture:ronam';
export const FIXTURE_USER_PREFIX = 'ronam.fixture.';
export const FIXTURE_ID_PREFIX = 'ronam';

/** نسخهٔ قدیمی (روناک) — برای پاکسازی */
export const LEGACY_FIXTURE_CREDIT_LABELS = ['fixture:ronak'] as const;
export const LEGACY_FIXTURE_USER_PREFIX = 'ronak.fixture.';

export const ALL_FIXTURE_CREDIT_LABELS = [
  FIXTURE_CREDIT_LABEL,
  ...LEGACY_FIXTURE_CREDIT_LABELS,
] as const;

export const ALL_FIXTURE_USER_PREFIXES = [FIXTURE_USER_PREFIX, LEGACY_FIXTURE_USER_PREFIX] as const;

export function isFixtureCreditLabel(label?: string | null): boolean {
  const t = label?.trim();
  if (!t) return false;
  if ((ALL_FIXTURE_CREDIT_LABELS as readonly string[]).includes(t)) return true;
  return t.startsWith('fixture:');
}