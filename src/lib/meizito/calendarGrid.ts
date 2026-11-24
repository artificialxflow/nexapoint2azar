import type { MeizitoCalendarEvent, MeizitoCalendarKind } from '@/src/types/meizito';
import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';

/** تقویم شمسی (ناوبری جلالی) — ذخیرهٔ رویدادها همچنان dateKey میلادی ISO */

export const WEEKDAY_LABELS_FA = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const;

export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const DEFAULT_JALALI_YEAR_MIN = 1380;
export const DEFAULT_JALALI_YEAR_MAX = 1415;

export type MonthCell = {
  date: Date;
  dateKey: string;
  inMonth: boolean;
  /** روز شمسی (۱–۳۱) */
  jalaliDay: number;
};

export type CalendarViewMode = 'month' | 'week' | 'day';

export function buildJalaliYearOptions(
  yearMin = DEFAULT_JALALI_YEAR_MIN,
  yearMax = DEFAULT_JALALI_YEAR_MAX
): number[] {
  const years: number[] = [];
  for (let y = yearMin; y <= yearMax; y += 1) years.push(y);
  return years;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function toJalaaliParts(d: Date): { jy: number; jm: number; jd: number } {
  const r = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { jy: r.jy, jm: r.jm, jd: r.jd };
}

export function shiftJalaaliMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  let m = jm + delta;
  let y = jy;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { jy: y, jm: m };
}

/** هفتهٔ شمسی (شنبه–جمعه) حول یک dateKey */
export function buildJalaliWeekGrid(anchorDateKey: string): MonthCell[] {
  const anchor = parseDateKey(anchorDateKey);
  const offset = (anchor.getDay() + 1) % 7;
  const saturday = new Date(anchor);
  saturday.setDate(anchor.getDate() - offset);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    cells.push({
      date: d,
      dateKey: toDateKey(d),
      inMonth: true,
      jalaliDay: j.jd,
    });
  }
  return cells;
}

export function shiftWeekAnchor(anchorDateKey: string, deltaWeeks: number): string {
  const d = parseDateKey(anchorDateKey);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return toDateKey(d);
}

/** آیا رویداد (با تکرار) در dateKey رخ می‌دهد؟ */
export function eventOccursOnDate(event: MeizitoCalendarEvent, dateKey: string): boolean {
  if (event.date === dateKey) return true;
  const spanEnd = event.endDate?.trim();
  if (spanEnd && spanEnd !== event.date && dateKey > event.date && dateKey <= spanEnd) {
    if ((event.recurrence ?? 'none') === 'none') return true;
  }
  const rec = event.recurrence ?? 'none';
  if (rec === 'none') return false;
  if (dateKey < event.date) return false;
  if (event.recurrenceUntil && dateKey > event.recurrenceUntil) return false;

  const start = parseDateKey(event.date);
  const target = parseDateKey(dateKey);
  const diffMs = target.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (rec === 'daily') return diffDays >= 0;
  if (rec === 'weekly') return diffDays >= 0 && diffDays % 7 === 0;
  if (rec === 'monthly') {
    const s = toJalaaliParts(start);
    const t = toJalaaliParts(target);
    return s.jd === t.jd;
  }
  if (rec === 'yearly') {
    const s = toJalaaliParts(start);
    const t = toJalaaliParts(target);
    return s.jm === t.jm && s.jd === t.jd;
  }
  return false;
}

/** @deprecated از buildJalaliMonthGrid استفاده کنید */
export function buildMonthGrid(viewYear: number, viewMonth: number): MonthCell[] {
  const { jy, jm } = toJalaaliParts(new Date(viewYear, viewMonth, 1));
  return buildJalaliMonthGrid(jy, jm);
}

export function buildJalaliMonthGrid(viewJy: number, viewJm: number): MonthCell[] {
  const g1 = toGregorian(viewJy, viewJm, 1);
  const first = new Date(g1.gy, g1.gm - 1, g1.gd);
  const startOffset = (first.getDay() + 1) % 7;
  const startDate = new Date(first);
  startDate.setDate(first.getDate() - startOffset);

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    cells.push({
      date: d,
      dateKey: toDateKey(d),
      inMonth: j.jy === viewJy && j.jm === viewJm,
      jalaliDay: j.jd,
    });
  }
  return cells;
}

export function formatJalaliMonthYear(viewJy: number, viewJm: number): string {
  const name = JALALI_MONTHS_FA[viewJm - 1] ?? String(viewJm);
  const yearFa = viewJy.toLocaleString('fa-IR', { useGrouping: false });
  return `${name} ${yearFa}`;
}

/** برچسب دسترس‌پذیری — سال بدون جداکنندهٔ هزارگان برای خوانش صوتی */
export function formatJalaliMonthYearA11y(viewJy: number, viewJm: number): string {
  const name = JALALI_MONTHS_FA[viewJm - 1] ?? String(viewJm);
  return `${name} ${viewJy}`;
}

export function jalaaliFromDateKey(dateKey: string): { jy: number; jm: number; jd: number } {
  if (!dateKey) {
    const t = new Date();
    return toJalaaliParts(t);
  }
  return toJalaaliParts(parseDateKey(dateKey));
}

export function dateKeyFromJalaali(jy: number, jm: number, jd: number): string {
  const maxDay = jalaaliMonthLength(jy, jm);
  const safeDay = Math.min(Math.max(1, jd), maxDay);
  const g = toGregorian(jy, jm, safeDay);
  return toDateKey(new Date(g.gy, g.gm - 1, g.gd));
}

export function jalaliMonthDayOptions(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

/** @deprecated */
export function formatMonthYearFa(year: number, month: number): string {
  const { jy, jm } = toJalaaliParts(new Date(year, month, 1));
  return formatJalaliMonthYear(jy, jm);
}

export function formatPersianDay(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(d);
}

export function formatSelectedDateJalali(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateKeyJalaliHint(dateKey: string): string {
  if (!dateKey) return '';
  return formatSelectedDateJalali(dateKey);
}

export const CALENDAR_KIND_LABELS: Record<MeizitoCalendarKind, string> = {
  customer_followup: 'پیگیری مشتری',
  service: 'خدمت‌رسانی',
  general: 'عمومی / وظایف',
  custom: 'سفارشی',
  birthday: 'تولد و مناسبت',
};
