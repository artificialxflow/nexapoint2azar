import type { MeizitoChecklistItem } from '@/src/types/meizito';

export function defaultDayChecklist(): MeizitoChecklistItem[] {
  return [
    { id: 'day-1', title: '', done: false },
    { id: 'day-2', title: '', done: false },
    { id: 'day-3', title: '', done: false },
  ];
}

export function normalizeDayChecklist(items?: MeizitoChecklistItem[]): MeizitoChecklistItem[] {
  if (!items?.length) return defaultDayChecklist();
  return items.map((item, idx) => ({
    id: item.id || `day-${idx + 1}`,
    title: item.title ?? '',
    done: Boolean(item.done),
  }));
}

export function dayChecklistToBodyLines(items: MeizitoChecklistItem[]): string {
  return items
    .map((item, i) => item.title.trim() && `${i + 1}. ${item.title.trim()}`)
    .filter(Boolean)
    .join('\n');
}
