import { parseDateKey, toDateKey } from '@/src/lib/meizito/calendarGrid';

/** جابه‌جایی بازهٔ چندروزه هنگام drag رویداد */
export function shiftDateKeyWithAnchor(
  targetKey: string,
  anchorFrom: string,
  anchorTo: string
): string {
  const from = parseDateKey(anchorFrom);
  const to = parseDateKey(anchorTo);
  const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000);
  const d = parseDateKey(targetKey);
  d.setDate(d.getDate() + diffDays);
  return toDateKey(d);
}
