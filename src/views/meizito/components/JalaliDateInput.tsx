'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  JALALI_MONTHS_FA,
  DEFAULT_JALALI_YEAR_MAX,
  DEFAULT_JALALI_YEAR_MIN,
  buildJalaliYearOptions,
  dateKeyFromJalaali,
  jalaaliFromDateKey,
  jalaliMonthDayOptions,
  toDateKey,
} from '@/src/lib/meizito/calendarGrid';

type Props = {
  value: string;
  onChange: (dateKey: string) => void;
  className?: string;
  id?: string;
  /** وقتی مقدار خالی است، به‌جای امروز دکمهٔ انتخاب نشان داده می‌شود */
  allowEmpty?: boolean;
  yearMin?: number;
  yearMax?: number;
};

export default function JalaliDateInput({
  value,
  onChange,
  className = '',
  id,
  allowEmpty = false,
  yearMin = DEFAULT_JALALI_YEAR_MIN,
  yearMax = DEFAULT_JALALI_YEAR_MAX,
}: Props) {
  const showEmpty = allowEmpty && !value;
  const effectiveKey = value || toDateKey(new Date());

  const parsed = useMemo(() => jalaaliFromDateKey(effectiveKey), [effectiveKey]);
  const [jy, setJy] = useState(parsed.jy);
  const [jm, setJm] = useState(parsed.jm);
  const [jd, setJd] = useState(parsed.jd);

  useEffect(() => {
    if (showEmpty) return;
    setJy(parsed.jy);
    setJm(parsed.jm);
    setJd(parsed.jd);
  }, [parsed.jy, parsed.jm, parsed.jd, showEmpty]);

  const dayMax = jalaliMonthDayOptions(jy, jm);
  const safeJd = Math.min(jd, dayMax);

  const emit = (nextJy: number, nextJm: number, nextJd: number) => {
    const max = jalaliMonthDayOptions(nextJy, nextJm);
    const d = Math.min(Math.max(1, nextJd), max);
    setJy(nextJy);
    setJm(nextJm);
    setJd(d);
    onChange(dateKeyFromJalaali(nextJy, nextJm, d));
  };

  const yearOptions = useMemo(() => {
    const base = buildJalaliYearOptions(yearMin, yearMax);
    if (!base.includes(jy)) return [...base, jy].sort((a, b) => a - b);
    return base;
  }, [yearMin, yearMax, jy]);

  const base =
    'bg-gray-50 rounded-xl px-2 py-2 text-sm font-fa-num border border-transparent focus:border-nexa-accent/40 outline-none';

  if (showEmpty) {
    return (
      <button
        type="button"
        id={id}
        className={`w-full text-xs font-bold py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 ${className}`}
        onClick={() => onChange(toDateKey(new Date()))}
      >
        انتخاب تاریخ شمسی
      </button>
    );
  }

  return (
    <div id={id} className={`grid grid-cols-3 gap-2 ${className}`}>
      {allowEmpty && value ? (
        <button
          type="button"
          className="col-span-3 text-[10px] font-bold text-rose-600 text-right mb-0.5"
          onClick={() => onChange('')}
        >
          حذف تاریخ
        </button>
      ) : null}
      <select
        aria-label="روز شمسی"
        className={base}
        value={safeJd}
        onChange={(e) => emit(jy, jm, Number(e.target.value))}
      >
        {Array.from({ length: dayMax }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d.toLocaleString('fa-IR')}
          </option>
        ))}
      </select>
      <select
        aria-label="ماه شمسی"
        className={base}
        value={jm}
        onChange={(e) => emit(jy, Number(e.target.value), jd)}
      >
        {JALALI_MONTHS_FA.map((name, idx) => (
          <option key={name} value={idx + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="سال شمسی"
        className={base}
        value={jy}
        onChange={(e) => emit(Number(e.target.value), jm, jd)}
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y.toLocaleString('fa-IR', { useGrouping: false })}
          </option>
        ))}
      </select>
    </div>
  );
}
