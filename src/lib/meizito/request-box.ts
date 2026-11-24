import type { MeizitoInternalRequest } from '@/src/types/meizito';

/** صندوق درخواست از دید کاربر جاری (پارитет نامه). */
export function requestBoxForViewer(
  r: MeizitoInternalRequest,
  userId: string
): 'inbox' | 'outbox' | 'archive' {
  if (r.box === 'archive' || r.status === 'closed') return 'archive';
  if (r.authorId === userId) return 'outbox';
  const isRecipient =
    r.currentAssigneeId === userId ||
    r.referredToUserIds?.includes(userId) ||
    r.ccUserIds?.includes(userId) ||
    r.referredToUserId === userId;
  if (isRecipient) return 'inbox';
  return r.box ?? 'outbox';
}

export function requestMatchesSearch(r: MeizitoInternalRequest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [r.subject, r.body, r.authorName, ...(r.referredTo ?? [])].join(' ').toLowerCase();
  return hay.includes(q);
}
