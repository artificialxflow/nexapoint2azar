import { randomUUID } from 'crypto';
import type { CalendarSnapshot } from '@/src/lib/meizito/calendar/serialize';
import type { MeizitoCalendar } from '@/src/types/meizito';

export function ensureDefaultCalendarInSnapshot(snap: CalendarSnapshot): boolean {
  if (snap.calendars?.length) return false;
  const calendar: MeizitoCalendar = {
    id: randomUUID(),
    name: 'تقویم پیش‌فرض',
    kind: 'custom',
    color: '#3b82f6',
    sharedWith: [],
    ownerName: '',
  };
  snap.calendars = [calendar];
  if (!snap.events) snap.events = [];
  return true;
}
