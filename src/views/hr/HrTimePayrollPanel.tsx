'use client';

import React, { useMemo, useState } from 'react';
import { Wallet, Plus, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

export type HrAttendanceRow = {
  id: string;
  employeeName: string;
  workDate: string;
  checkIn: string;
  checkOut: string;
  workedMinutes: number;
  overtimeMinutes: number;
  status: string;
  note: string;
};

export type HrPayrollRow = {
  id: string;
  employeeName: string;
  periodLabel: string;
  baseSalary: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  status: string;
};

type Props = {
  businessId: string | null;
  employeeCount: number;
  attendanceLogs: HrAttendanceRow[];
  payrollSummaries: HrPayrollRow[];
  onReload: () => Promise<void>;
};

const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  present: 'حاضر',
  absent: 'غایب',
  leave: 'مرخصی',
  remote: 'دورکار',
  late: 'تأخیر',
};

export default function HrTimePayrollPanel({
  businessId,
  employeeCount,
  attendanceLogs,
  payrollSummaries,
  onReload,
}: Props) {
  const [periodFilter, setPeriodFilter] = useState('');
  const [attForm, setAttForm] = useState({
    employeeName: '',
    workDate: new Date().toISOString().slice(0, 10),
    checkIn: '08:30',
    checkOut: '17:00',
    workedMinutes: '480',
    overtimeMinutes: '0',
    status: 'present' as 'present' | 'absent' | 'leave' | 'remote' | 'late',
  });
  const [payForm, setPayForm] = useState({
    employeeName: '',
    periodLabel: '۱۴۰۴/۱۲',
    baseSalary: '',
    overtimePay: '0',
    bonuses: '0',
    deductions: '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPayrolls = useMemo(() => {
    const q = periodFilter.trim();
    if (!q) return payrollSummaries;
    return payrollSummaries.filter((p) => p.periodLabel.includes(q) || p.employeeName.includes(q));
  }, [payrollSummaries, periodFilter]);

  const totals = useMemo(() => {
    const totalWorkedHours = Math.round(
      attendanceLogs.reduce((acc, a) => acc + (a.workedMinutes || 0), 0) / 60
    );
    const totalOvertimeHours = Math.round(
      attendanceLogs.reduce((acc, a) => acc + (a.overtimeMinutes || 0), 0) / 60
    );
    const lateCount = attendanceLogs.filter((a) => a.status === 'late').length;
    const absentCount = attendanceLogs.filter((a) => a.status === 'absent').length;
    const leaveCount = attendanceLogs.filter((a) => a.status === 'leave').length;
    const totalNetPay = filteredPayrolls.reduce((acc, p) => acc + (p.netPay || 0), 0);
    return {
      totalWorkedHours,
      totalOvertimeHours,
      lateCount,
      absentCount,
      leaveCount,
      totalNetPay,
    };
  }, [attendanceLogs, filteredPayrolls]);

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !attForm.employeeName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr/operations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'attendance',
          employeeName: attForm.employeeName.trim(),
          workDate: attForm.workDate,
          checkIn: attForm.checkIn,
          checkOut: attForm.checkOut,
          workedMinutes: Math.max(0, Number(attForm.workedMinutes) || 0),
          overtimeMinutes: Math.max(0, Number(attForm.overtimeMinutes) || 0),
          status: attForm.status,
        }),
      });
      await parseApiJson(res);
      setAttForm((prev) => ({ ...prev, employeeName: '' }));
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت تردد');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !payForm.employeeName.trim() || !payForm.periodLabel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr/operations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'payroll',
          employeeName: payForm.employeeName.trim(),
          periodLabel: payForm.periodLabel.trim(),
          baseSalary: Math.max(0, Number(payForm.baseSalary) || 0),
          overtimePay: Math.max(0, Number(payForm.overtimePay) || 0),
          bonuses: Math.max(0, Number(payForm.bonuses) || 0),
          deductions: Math.max(0, Number(payForm.deductions) || 0),
        }),
      });
      await parseApiJson(res);
      setPayForm((prev) => ({ ...prev, employeeName: '', baseSalary: '', bonuses: '0', deductions: '0', overtimePay: '0' }));
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت لیست حقوق');
    } finally {
      setSaving(false);
    }
  };

  const markPayrollPaid = async (id: string) => {
    if (!businessId) return;
    await fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr/operations`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'payroll', id, status: 'پرداخت شده' }),
    });
    await onReload();
  };

  const deleteItem = async (entity: 'attendance' | 'payroll', id: string) => {
    if (!businessId) return;
    await fetch(`/api/businesses/${encodeURIComponent(businessId)}/hr/operations`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id }),
    });
    await onReload();
  };

  return (
    <div className="space-y-6" data-testid="hr-time-payroll">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-gray-900">ساعت کاری، تردد و حقوق</h3>
          <p className="text-xs text-gray-500 mt-1">
            تعداد پرسنل فعال: <span className="font-fa-num font-bold">{employeeCount}</span> نفر
          </p>
        </div>
        <input
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          placeholder="فیلتر دوره یا نام پرسنل..."
          className="bg-white border border-nexa-border rounded-xl px-3 py-2 text-xs outline-none w-56"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'مجموع ساعات حضور', value: `${totals.totalWorkedHours.toLocaleString('fa-IR')} ساعت` },
          { label: 'اضافه‌کار ثبت‌شده', value: `${totals.totalOvertimeHours.toLocaleString('fa-IR')} ساعت` },
          { label: 'تأخیر / غیبت / مرخصی', value: `${totals.lateCount} / ${totals.absentCount} / ${totals.leaveCount}` },
        ].map((kpi) => (
          <div key={kpi.label} className="nexa-card p-4">
            <p className="text-[10px] text-gray-400 font-bold">{kpi.label}</p>
            <p className="text-sm font-black text-gray-900 mt-1 font-fa-num">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Add Attendance Form */}
      <form onSubmit={(e) => void handleAddAttendance(e)} className="nexa-card p-5 space-y-4">
        <h4 className="text-xs font-black text-gray-800 flex items-center gap-2">
          <Clock size={15} className="text-nexa-accent" />
          ثبت تردد روزانه
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            required
            value={attForm.employeeName}
            onChange={(e) => setAttForm({ ...attForm, employeeName: e.target.value })}
            placeholder="نام پرسنل"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none"
          />
          <input
            type="date"
            value={attForm.workDate}
            onChange={(e) => setAttForm({ ...attForm, workDate: e.target.value })}
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num outline-none"
          />
          <select
            value={attForm.status}
            onChange={(e) => setAttForm({ ...attForm, status: e.target.value as typeof attForm.status })}
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none"
          >
            <option value="present">حاضر</option>
            <option value="late">تأخیر</option>
            <option value="leave">مرخصی</option>
            <option value="remote">دورکار</option>
            <option value="absent">غایب</option>
          </select>
          <button
            type="submit"
            disabled={saving || !businessId}
            className="nexa-btn-primary text-xs py-2 flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Plus size={14} />
            ثبت تردد
          </button>
        </div>
      </form>

      {/* Attendance Table */}
      <div className="nexa-card overflow-hidden">
        <div className="px-5 py-3 bg-gray-50/60 border-b border-nexa-border text-xs font-black text-gray-700">
          فهرست ترددها ({attendanceLogs.length})
        </div>
        {attendanceLogs.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-400">هنوز رکورد ترددی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3">پرسنل</th>
                  <th className="px-4 py-3">تاریخ</th>
                  <th className="px-4 py-3">ورود / خروج</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border/40">
                {attendanceLogs.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-bold text-gray-800">{a.employeeName}</td>
                    <td className="px-4 py-3 text-gray-500 font-fa-num">{a.workDate}</td>
                    <td className="px-4 py-3 text-gray-600 font-fa-num">
                      {a.checkIn || '—'} تا {a.checkOut || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[10px]">
                        {ATTENDANCE_STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button
                        type="button"
                        onClick={() => void deleteItem('attendance', a.id)}
                        className="text-gray-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payroll Form */}
      <form onSubmit={(e) => void handleAddPayroll(e)} className="nexa-card p-5 space-y-4">
        <h4 className="text-xs font-black text-gray-800 flex items-center gap-2">
          <Wallet size={15} className="text-emerald-600" />
          ثبت فیش حقوقی دوره
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            required
            value={payForm.employeeName}
            onChange={(e) => setPayForm({ ...payForm, employeeName: e.target.value })}
            placeholder="نام پرسنل"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs outline-none"
          />
          <input
            required
            value={payForm.periodLabel}
            onChange={(e) => setPayForm({ ...payForm, periodLabel: e.target.value })}
            placeholder="دوره (مثال: ۱۴۰۴/۱۲)"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num outline-none"
          />
          <input
            required
            type="number"
            min={0}
            value={payForm.baseSalary}
            onChange={(e) => setPayForm({ ...payForm, baseSalary: e.target.value })}
            placeholder="حقوق پایه (ریال)"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num outline-none"
          />
          <input
            type="number"
            min={0}
            value={payForm.bonuses}
            onChange={(e) => setPayForm({ ...payForm, bonuses: e.target.value })}
            placeholder="پاداش و مزایا"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num outline-none"
          />
          <input
            type="number"
            min={0}
            value={payForm.deductions}
            onChange={(e) => setPayForm({ ...payForm, deductions: e.target.value })}
            placeholder="کسورات"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num outline-none"
          />
          <button
            type="submit"
            disabled={saving || !businessId}
            className="nexa-btn-primary text-xs py-2 flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Plus size={14} />
            ثبت حقوق
          </button>
        </div>
      </form>

      {/* Payroll Table */}
      <div className="nexa-card overflow-hidden">
        <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
          <span className="text-xs font-black text-emerald-900">فهرست حقوق و دستمزد</span>
          <span className="text-xs font-black text-emerald-700 font-fa-num">
            جمع خالص پرداختی: {totals.totalNetPay.toLocaleString('fa-IR')} ریال
          </span>
        </div>
        {filteredPayrolls.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-400">هنوز فیش حقوقی برای این کسب‌وکار ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3">پرسنل</th>
                  <th className="px-4 py-3">دوره</th>
                  <th className="px-4 py-3">خالص پرداختی</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border/40">
                {filteredPayrolls.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-bold text-gray-800">{p.employeeName}</td>
                    <td className="px-4 py-3 text-gray-500 font-fa-num">{p.periodLabel}</td>
                    <td className="px-4 py-3 font-black text-gray-900 font-fa-num">
                      {p.netPay.toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          p.status === 'پرداخت شده'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {p.status !== 'پرداخت شده' && (
                        <button
                          type="button"
                          onClick={() => void markPayrollPaid(p.id)}
                          className="text-emerald-600 hover:underline flex items-center gap-1 text-[10px] font-bold"
                        >
                          <CheckCircle2 size={13} />
                          تسویه
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteItem('payroll', p.id)}
                        className="text-gray-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
