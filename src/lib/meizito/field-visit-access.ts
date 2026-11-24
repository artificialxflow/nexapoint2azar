import type { MeizitoMockUser } from '@/src/types/meizito';

const SALES_MARKETING_HINTS = ['فروش', 'مارکت', 'marketing', 'sales'];

/** بازدید حضوری: اعضای فروش/مارکتینگ + مدیران (سند 08). */
export function canRecordFieldVisits(user: Pick<MeizitoMockUser, 'role' | 'department' | 'jobTitle'> | undefined): boolean {
  if (!user) return false;
  if (user.role === 'manager' || user.role === 'senior_manager') return true;
  const haystack = [user.department ?? '', user.jobTitle ?? ''].join(' ').toLowerCase();
  return SALES_MARKETING_HINTS.some((hint) => haystack.includes(hint.toLowerCase()));
}
