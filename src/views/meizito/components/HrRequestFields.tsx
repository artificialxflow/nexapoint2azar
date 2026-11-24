'use client';

import React, { useEffect, useState } from 'react';
import { HR_LEAVE_KINDS, type HrLeaveKindId } from '@/src/lib/meizito/hr-form-payload';
import type { HrRequestSubtypeId } from '@/src/lib/meizito/hr-request-types';

export type HrEligibilityPreview = { ok: true; tenureMonths?: number } | { ok: false; messageFa: string };

type Props = {
  businessId: string | null;
  hrSubtype: HrRequestSubtypeId;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onEligibilityChange?: (state: HrEligibilityPreview | null) => void;
};

export default function HrRequestFields({
  businessId,
  hrSubtype,
  value,
  onChange,
  onEligibilityChange,
}: Props) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!businessId) {
      onEligibilityChange?.(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setChecking(true);
        try {
          const res = await fetch(
            `/api/businesses/${encodeURIComponent(businessId)}/hr-eligibility/check`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hrSubtype, payload: value }),
            }
          );
          const json = (await res.json()) as {
            data?: { ok?: boolean; tenureMonths?: number };
            error?: { message?: string };
          };
          if (cancelled) return;
          if (res.ok && json.data?.ok) {
            onEligibilityChange?.({ ok: true, tenureMonths: json.data.tenureMonths });
          } else {
            const msg = json.error?.message || 'در حال حاضر امکان ثبت این درخواست وجود ندارد.';
            onEligibilityChange?.({ ok: false, messageFa: msg });
          }
        } catch {
          if (!cancelled) onEligibilityChange?.(null);
        } finally {
          if (!cancelled) setChecking(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [businessId, hrSubtype, value, onEligibilityChange]);

  if (hrSubtype === 'leave') {
    const leaveKind = (value.leaveKind as HrLeaveKindId) ?? 'annual';
    return (
      <div className="space-y-2 rounded-xl border border-nexa-border/60 p-3 bg-white">
        <p className="text-[10px] font-bold text-gray-500">فرم مرخصی</p>
        <select
          value={leaveKind}
          onChange={(e) => onChange({ ...value, leaveKind: e.target.value })}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
        >
          {HR_LEAVE_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={String(value.startDate ?? '')}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
            aria-label="از تاریخ"
          />
          <input
            type="date"
            value={String(value.endDate ?? '')}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
            aria-label="تا تاریخ"
          />
        </div>
        {checking && <p className="text-[9px] text-gray-400">بررسی شرایط…</p>}
      </div>
    );
  }

  if (hrSubtype === 'advance') {
    return (
      <div className="space-y-2 rounded-xl border border-nexa-border/60 p-3 bg-white">
        <p className="text-[10px] font-bold text-gray-500">فرم مساعده</p>
        <input
          type="number"
          min={0}
          value={Number(value.amount ?? 0) || ''}
          onChange={(e) => onChange({ ...value, amount: Number(e.target.value) || 0 })}
          placeholder="مبلغ (ریال)"
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
        />
        <input
          value={String(value.reason ?? '')}
          onChange={(e) => onChange({ ...value, reason: e.target.value })}
          placeholder="علت (اختیاری)"
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs"
        />
        {checking && <p className="text-[9px] text-gray-400">بررسی شرایط…</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-nexa-border/60 p-3 bg-white">
      <p className="text-[10px] font-bold text-gray-500">فرم وام</p>
      <input
        type="number"
        min={0}
        value={Number(value.amount ?? 0) || ''}
        onChange={(e) => onChange({ ...value, amount: Number(e.target.value) || 0 })}
        placeholder="مبلغ (ریال)"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
      />
      <input
        type="number"
        min={1}
        max={60}
        value={Number(value.termMonths ?? 6)}
        onChange={(e) => onChange({ ...value, termMonths: Number(e.target.value) || 6 })}
        placeholder="مدت (ماه)"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
      />
      <input
        value={String(value.reason ?? '')}
        onChange={(e) => onChange({ ...value, reason: e.target.value })}
        placeholder="توضیح (اختیاری)"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs"
      />
      {checking && <p className="text-[9px] text-gray-400">بررسی شرایط…</p>}
    </div>
  );
}
