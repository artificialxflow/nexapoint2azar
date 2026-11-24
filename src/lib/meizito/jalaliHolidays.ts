import { jalaaliFromDateKey } from '@/src/lib/meizito/calendarGrid';

export type JalaliHoliday = {
  dateKey: string;
  title: string;
  jm: number;
  jd: number;
};

/** مناسبت‌های ثابت (روز/ماه شمسی — هر سال) */
const FIXED_JALALI_HOLIDAYS: Omit<JalaliHoliday, 'dateKey'>[] = [
  { jm: 1, jd: 1, title: 'نوروز' },
  { jm: 1, jd: 2, title: 'تعطیل نوروز' },
  { jm: 1, jd: 3, title: 'تعطیل نوروز' },
  { jm: 1, jd: 4, title: 'تعطیل نوروز' },
  { jm: 1, jd: 12, title: 'روز جمهوری اسلامی' },
  { jm: 1, jd: 13, title: 'روز طبیعت (۱۳ بدر)' },
  { jm: 3, jd: 14, title: 'رحلت امام خمینی' },
  { jm: 3, jd: 15, title: 'قیام ۱۵ خرداد' },
  { jm: 11, jd: 22, title: 'پیروزی انقلاب' },
  { jm: 12, jd: 29, title: 'ملی شدن صنعت نفت' },
];

export function getJalaliHolidayOnDate(dateKey: string): JalaliHoliday | undefined {
  const { jm, jd } = jalaaliFromDateKey(dateKey);
  const match = FIXED_JALALI_HOLIDAYS.find((h) => h.jm === jm && h.jd === jd);
  if (!match) return undefined;
  return { dateKey, title: match.title, jm, jd };
}
