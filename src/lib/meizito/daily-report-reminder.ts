import type { MeizitoDailyReport } from '@/src/types/meizito';

export function isDailyReportN4Enabled(rules: { id: string; enabled: boolean }[]): boolean {
  return rules.some((r) => r.id === 'n4' && r.enabled);
}

export function shouldRemindDailyReportToday(
  dateKey: string,
  todayKey: string,
  myReport: MeizitoDailyReport | undefined,
  n4Enabled: boolean
): boolean {
  if (!n4Enabled || dateKey !== todayKey) return false;
  if (!myReport) return true;
  return myReport.status === 'draft';
}

/** پایان روز کاری تقریبی — بعد از ۱۶ برای متن قوی‌تر یادآوری */
export function isPastWorkdayReminderHour(now: Date = new Date()): boolean {
  const day = now.getDay();
  if (day === 5 || day === 6) return false;
  return now.getHours() >= 16;
}
