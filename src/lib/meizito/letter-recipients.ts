import type { MeizitoLetter } from '@/src/types/meizito';

function cleanNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((s) => String(s).trim()).filter(Boolean);
}

/** UI sends `to`; legacy rows may use referredTo. */
export function letterHasRecipients(letter: Pick<MeizitoLetter, 'to' | 'referredTo'>): boolean {
  return cleanNames(letter.to).length > 0 || cleanNames(letter.referredTo).length > 0;
}

/** Ensure both `to` and `referredTo` are populated for snapshot + DB persist. */
export function normalizeLetterRecipients<T extends Pick<MeizitoLetter, 'to' | 'referredTo'>>(letter: T): T {
  const to = cleanNames(letter.to);
  const referredTo = cleanNames(letter.referredTo);
  const mergedTo = to.length > 0 ? to : referredTo;
  const mergedReferred = referredTo.length > 0 ? referredTo : mergedTo;
  return { ...letter, to: mergedTo, referredTo: mergedReferred };
}
