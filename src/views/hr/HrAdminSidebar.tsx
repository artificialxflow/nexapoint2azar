'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, ShieldCheck, Users } from 'lucide-react';
import { HR_REQUEST_SUBTYPES, HR_SUBTYPE_LABELS } from '@/src/lib/meizito/hr-request-types';
import type { MeizitoMockUser } from '@/src/types/meizito';
import type { HrEligibilityRuleRow, HrEmployeeRow } from './useHrLiveData';

type Props = {
  businessId: string;
  canManage: boolean;
  rules: HrEligibilityRuleRow[];
  employees: HrEmployeeRow[];
  teamMembers: MeizitoMockUser[];
  onReload: () => void;
};

export default function HrAdminSidebar({
  businessId,
  canManage,
  rules,
  employees,
  teamMembers,
  onReload,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [managerDraft, setManagerDraft] = useState<Record<string, string>>({});
  const [adminMsg, setAdminMsg] = useState('');
  const [requestTypes, setRequestTypes] = useState<
    { id: string; slug: string; labelFa: string; enabled: boolean }[]
  >([]);

  const loadRequestTypes = useCallback(async () => {
    const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr-request-types`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      data?: { types?: { id: string; slug: string; labelFa: string; enabled: boolean }[] };
    };
    setRequestTypes(json.data?.types ?? []);
  }, [businessId]);

  useEffect(() => {
    void loadRequestTypes();
  }, [loadRequestTypes]);

  const toggleRequestType = async (typeId: string, enabled: boolean) => {
    setBusy(true);
    try {
      await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/hr-request-types/${encodeURIComponent(typeId)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        }
      );
      await loadRequestTypes();
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) return null;

  const addLoanRule = async () => {
    setBusy(true);
    setAdminMsg('');
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr-eligibility-rules`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hrSubtype: 'loan',
          conditionJson: { minTenureMonths: 6 },
          userMessageFa: 'برای درخواست وام حداقل ۶ ماه سابقه کار در سازمان لازم است.',
          enabled: true,
          sortOrder: 0,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setAdminMsg(err?.error?.message ?? 'ثبت قانون ناموفق بود.');
        return;
      }
      setAdminMsg('قانون نمونهٔ وام (۶ ماه) ثبت شد.');
      onReload();
    } finally {
      setBusy(false);
    }
  };

  const saveManager = async (userId: string) => {
    const managerUserId = managerDraft[userId];
    if (managerUserId === undefined) return;
    setBusy(true);
    setAdminMsg('');
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/org-assignments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          managerUserId: managerUserId || null,
        }),
      });
      if (!res.ok) {
        setAdminMsg('ذخیرهٔ مدیر مستقیم ناموفق بود.');
        return;
      }
      setAdminMsg('سلسله‌مراتب به‌روز شد — بازخورد گزارش روز از مدیر جدید استفاده می‌کند.');
      onReload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="nexa-card p-6 border border-indigo-100">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600" />
          قوانین eligibility HR
        </h4>
        {rules.length === 0 ? (
          <p className="text-[10px] text-gray-500 mb-3">هنوز قانونی ثبت نشده.</p>
        ) : (
          <ul className="text-[10px] space-y-2 mb-3">
            {rules.map((r) => (
              <li key={r.id} className="bg-gray-50 rounded-lg px-2 py-1.5">
                <span className="font-bold text-gray-700">
                  {r.hrSubtype ? (HR_SUBTYPE_LABELS[r.hrSubtype] ?? r.hrSubtype) : 'همهٔ HR'}
                </span>
                <p className="text-gray-600 mt-0.5">{r.userMessageFa}</p>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void addLoanRule()}
          className="w-full py-2 text-[10px] font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          افزودن قانون نمونه: وام ۶ ماه
        </button>
        <p className="text-[9px] text-gray-400 mt-2">
          انواع: {HR_REQUEST_SUBTYPES.map((s) => s.label).join('، ')}
        </p>
      </div>

      <div className="nexa-card p-6 border border-violet-100">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ClipboardList size={16} className="text-violet-600" />
          انواع درخواست HR
        </h4>
        <ul className="space-y-1.5 mb-2">
          {requestTypes.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-[10px] gap-2">
              <span className="font-bold text-gray-800">{t.labelFa}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleRequestType(t.id, !t.enabled)}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  t.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.enabled ? 'فعال' : 'خاموش'}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[9px] text-gray-400">انواع خاموش در فرم ثبت درخواست نمایش داده نمی‌شوند.</p>
      </div>

      <div className="nexa-card p-6 border border-emerald-100">
        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Users size={16} className="text-emerald-600" />
          مدیر مستقیم (UAT گزارش)
        </h4>
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {employees.filter((e) => e.fromLive).slice(0, 8).map((emp) => (
            <li key={emp.id} className="text-[10px] space-y-1">
              <p className="font-bold text-gray-800 truncate">{emp.name}</p>
              <div className="flex gap-1">
                <select
                  value={managerDraft[emp.id] ?? emp.managerId ?? ''}
                  onChange={(e) =>
                    setManagerDraft((prev) => ({ ...prev, [emp.id]: e.target.value }))
                  }
                  className="flex-1 bg-gray-50 rounded-lg px-1 py-1 text-[10px]"
                >
                  <option value="">بدون مدیر</option>
                  {teamMembers
                    .filter((m) => m.id !== emp.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveManager(emp.id)}
                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold"
                >
                  ذخیره
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {adminMsg && <p className="text-[10px] font-bold text-gray-600 bg-gray-50 rounded-xl px-3 py-2">{adminMsg}</p>}
    </div>
  );
}
