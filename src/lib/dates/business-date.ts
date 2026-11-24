import { jalaaliMonthLength, toGregorian } from 'jalaali-js';
import { parseDateKey, toDateKey, toJalaaliParts } from '@/src/lib/meizito/calendarGrid';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeAsciiDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const pi = PERSIAN_DIGITS.indexOf(ch);
    if (pi >= 0) {
      out += String(pi);
      continue;
    }
    const ai = ARABIC_DIGITS.indexOf(ch);
    if (ai >= 0) {
      out += String(ai);
      continue;
    }
    out += ch;
  }
  return out;
}

/** ورودی شمسی (۱۴۰۴/۰۸/۱۰) یا میلادی ISO (2026-01-05) → تاریخ محلی نیمه‌شب */
export function parseBusinessDate(input: string | null | undefined): Date | null {
  const raw = normalizeAsciiDigits((input ?? '').trim());
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return parseDateKey(raw);
  }

  const jalali = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (jalali) {
    const jy = Number(jalali[1]);
    const jm = Number(jalali[2]);
    const jd = Number(jalali[3]);
    if (jy >= 1200 && jy <= 1600 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const g = toGregorian(jy, jm, jd);
      return new Date(g.gy, g.gm - 1, g.gd);
    }
    if (jy >= 1900 && jy <= 2100) {
      return new Date(jy, jm - 1, jd);
    }
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export function businessDateToPrismaDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function parseBusinessDateForDb(input: string | null | undefined): Date | null {
  const d = parseBusinessDate(input);
  return d ? businessDateToPrismaDate(d) : null;
}

export function formatBusinessDateIso(d: Date | null | undefined): string {
  if (!d) return '';
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return toDateKey(local);
}

export function formatBusinessDateJalali(d: Date | null | undefined): string {
  if (!d) return '';
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const { jy, jm, jd } = toJalaaliParts(local);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/** `1404-08` یا `1404/08` → بازهٔ نیمه‌باز [gte, lt) برای فیلتر @db.Date */
export function jalaliMonthRangeOnDb(monthKey: string): { gte: Date; lt: Date } | null {
  const norm = normalizeAsciiDigits(monthKey.trim());
  const m = norm.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  if (jm < 1 || jm > 12) return null;
  const startG = toGregorian(jy, jm, 1);
  const len = jalaaliMonthLength(jy, jm);
  const endG = toGregorian(jy, jm, len);
  const gte = businessDateToPrismaDate(new Date(startG.gy, startG.gm - 1, startG.gd));
  const lt = businessDateToPrismaDate(new Date(endG.gy, endG.gm - 1, endG.gd + 1));
  return { gte, lt };
}

export function dueOnFromTaskCalendarStrings(dueDate?: string, endDueDate?: string): {
  dueOn: Date | null;
  endDueOn: Date | null;
} {
  const dueOn = parseBusinessDateForDb(dueDate);
  const endRaw = (endDueDate ?? '').trim() ? endDueDate : dueDate;
  const endOn = parseBusinessDateForDb(endRaw);
  return { dueOn, endDueOn: endOn ?? dueOn };
}

export function calendarOnFromDateKeys(dateKey: string, endDateKey?: string | null): {
  startOn: Date;
  endOn: Date | null;
} {
  const start = parseBusinessDateForDb(dateKey) ?? businessDateToPrismaDate(new Date());
  const end = endDateKey?.trim() ? parseBusinessDateForDb(endDateKey) : null;
  return { startOn: start, endOn: end };
}