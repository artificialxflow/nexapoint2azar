'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Headset, Clock, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiEstimate = {
  id: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  approvedByCustomer: boolean;
  notes: string;
};

type ApiTicket = {
  id: string;
  ticketNo: string;
  customerName: string;
  phone: string;
  productName: string;
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'open' | 'diagnosing' | 'waiting_part' | 'repairing' | 'resolved' | 'closed';
  technician: string;
  createdAt: string;
  estimates: ApiEstimate[];
};

type ApiWarranty = {
  id: string;
  warrantyNo: string;
  customerName: string;
  productName: string;
  serialNumber: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'void';
  notes: string;
};

type AfterSalesPayload = {
  tickets: ApiTicket[];
  warranties: ApiWarranty[];
  summary: {
    openTickets: number;
    resolvedTickets: number;
    activeWarranties: number;
  };
};

const tabs = [
  { id: 'tickets', label: 'تیکت‌های خدمات' },
  { id: 'warranty', label: 'گارانتی‌ها' },
];

const STATUS_LABELS: Record<ApiTicket['status'], string> = {
  open: 'باز / در انتظار تماس',
  diagnosing: 'در حال عیب‌یابی',
  waiting_part: 'منتظر قطعه',
  repairing: 'در حال تعمیر',
  resolved: 'رفع شده',
  closed: 'بسته شده',
};

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function AfterSales() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [showSLAInfo, setShowSLAInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [warranties, setWarranties] = useState<ApiWarranty[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [warrantySearch, setWarrantySearch] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    customerName: '',
    phone: '',
    productName: '',
    subject: '',
    priority: 'normal' as ApiTicket['priority'],
  });
  const [newWarranty, setNewWarranty] = useState({
    customerName: '',
    productName: '',
    serialNumber: '',
    startDate: '',
    endDate: '',
  });
  const [estimateForm, setEstimateForm] = useState({
    ticketId: '',
    partsNotes: '',
    partsCost: '',
    laborCost: '',
  });

  const loadAfterSales = useCallback(async () => {
    if (!activeBusinessId) {
      setTickets([]);
      setWarranties([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/after-sales`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<AfterSalesPayload>(res);
      setTickets(data.tickets);
      setWarranties(data.warranties);
      setEstimateForm((prev) => ({ ...prev, ticketId: prev.ticketId || data.tickets[0]?.id || '' }));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات خدمات پس از فروش');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadAfterSales();
  }, [loadAfterSales]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newTicket.customerName.trim() || !newTicket.subject.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/after-sales`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'ticket',
          customerName: newTicket.customerName.trim(),
          phone: newTicket.phone.trim(),
          productName: newTicket.productName.trim(),
          subject: newTicket.subject.trim(),
          priority: newTicket.priority,
        }),
      });
      await parseApiJson(res);
      setIsTicketModalOpen(false);
      setNewTicket({ customerName: '', phone: '', productName: '', subject: '', priority: 'normal' });
      await loadAfterSales();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت تیکت');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTicketStatus = async (id: string, status: ApiTicket['status']) => {
    if (!activeBusinessId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/after-sales`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'ticket', id, status }),
      });
      await parseApiJson(res);
      await loadAfterSales();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در تغییر وضعیت تیکت');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !estimateForm.ticketId) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/after-sales`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'estimate',
          ticketId: estimateForm.ticketId,
          partsCost: Number(estimateForm.partsCost) || 0,
          laborCost: Number(estimateForm.laborCost) || 0,
          notes: estimateForm.partsNotes.trim(),
        }),
      });
      await parseApiJson(res);
      setEstimateForm((prev) => ({ ...prev, partsNotes: '', partsCost: '', laborCost: '' }));
      await loadAfterSales();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت برآورد تعمیر');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newWarranty.customerName.trim() || !newWarranty.productName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/after-sales`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'warranty',
          customerName: newWarranty.customerName.trim(),
          productName: newWarranty.productName.trim(),
          serialNumber: newWarranty.serialNumber.trim(),
          startDate: newWarranty.startDate.trim(),
          endDate: newWarranty.endDate.trim(),
          status: 'active',
        }),
      });
      await parseApiJson(res);
      setNewWarranty({ customerName: '', productName: '', serialNumber: '', startDate: '', endDate: '' });
      await loadAfterSales();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت کارت گارانتی');
    } finally {
      setSaving(false);
    }
  };

  const filteredTickets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.ticketNo.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }, [tickets, searchQuery]);

  const matchedWarranty = useMemo(() => {
    const q = warrantySearch.trim().toLowerCase();
    if (!q) return null;
    return (
      warranties.find(
        (w) => w.serialNumber.toLowerCase().includes(q) || w.warrantyNo.toLowerCase().includes(q),
      ) ?? null
    );
  }, [warranties, warrantySearch]);

  const totalEstimateCost = useMemo(
    () =>
      tickets.reduce(
        (sum, t) => sum + (t.estimates || []).reduce((es, e) => es + e.totalCost, 0),
        0,
      ),
    [tickets],
  );

  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedTicketsCount / tickets.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">خدمات پس از فروش (AS)</h1>
          <p className="text-gray-500 mt-1">مدیریت گارانتی، تیکت‌های تعمیرات و برآورد هزینه خدمات</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowSLAInfo(!showSLAInfo)}
            className="bg-white border border-nexa-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Clock size={18} />
            تحلیل SLA
          </button>
          <button
            type="button"
            onClick={() => setIsTicketModalOpen(true)}
            className="nexa-btn-primary text-sm flex items-center gap-2"
          >
            <Plus size={18} />
            ثبت تیکت خدمات جدید
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">{errorMsg}</div>
      ) : null}

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SLA Dashboard (Expandable) */}
      <AnimatePresence>
        {showSLAInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="nexa-card p-8 bg-nexa-primary text-white mb-4">
              <h3 className="text-lg font-bold mb-6">نمای کلی سطح خدمات (SLA)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs opacity-70">
                    <span>نرخ رفع تیکت‌ها</span>
                    <span className="font-fa-num">{fm(resolutionRate)}٪</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${resolutionRate}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs opacity-70">تیکت‌های باز</p>
                  <p className="text-2xl font-black font-fa-num">{fm(openTicketsCount)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs opacity-70">گارانتی‌های فعال</p>
                  <p className="text-2xl font-black font-fa-num">
                    {fm(warranties.filter((w) => w.status === 'active').length)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="nexa-card p-6">
          <p className="text-xs font-bold text-gray-400 mb-1">کل تیکت‌ها</p>
          <p className="text-2xl font-black text-gray-900 font-fa-num">{fm(tickets.length)}</p>
        </div>
        <div className="nexa-card p-6">
          <p className="text-xs font-bold text-gray-400 mb-1">تیکت‌های باز</p>
          <p className="text-2xl font-black text-amber-600 font-fa-num">{fm(openTicketsCount)}</p>
        </div>
        <div className="nexa-card p-6">
          <p className="text-xs font-bold text-gray-400 mb-1">گارانتی‌های فعال</p>
          <p className="text-2xl font-black text-emerald-600 font-fa-num">
            {fm(warranties.filter((w) => w.status === 'active').length)}
          </p>
        </div>
        <div className="nexa-card p-6">
          <p className="text-xs font-bold text-gray-400 mb-1">جمع برآورد تعمیرات (تومان)</p>
          <p className="text-2xl font-black text-rose-600 font-fa-num">{fm(totalEstimateCost)}</p>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ticket List */}
          <div className="lg:col-span-2 nexa-card overflow-hidden">
            <div className="p-6 border-b border-nexa-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">لیست تیکت‌های خدمات</h3>
              <div className="relative w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی تیکت..."
                  className="w-full bg-gray-50 border-none rounded-xl py-1.5 pr-9 pl-3 text-xs"
                />
              </div>
            </div>
            <div className="divide-y divide-nexa-border">
              {filteredTickets.length === 0 ? (
                <div className="p-10 text-center text-xs text-gray-400">
                  {loading ? 'در حال بارگذاری تیکت‌ها...' : 'تیکت خدماتی ثبت نشده است.'}
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            ticket.priority === 'high' || ticket.priority === 'critical'
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Headset size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-gray-400 font-fa-num">{ticket.ticketNo}</span>
                            <h4 className="text-sm font-bold text-gray-900">{ticket.customerName}</h4>
                          </div>
                          <p className="text-xs text-gray-600">{ticket.subject}</p>
                          {ticket.productName && (
                            <p className="text-[10px] text-gray-400 mt-1">محصول: {ticket.productName}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left space-y-2">
                        <select
                          value={ticket.status}
                          disabled={saving}
                          onChange={(e) => void handleUpdateTicketStatus(ticket.id, e.target.value as ApiTicket['status'])}
                          className="bg-gray-50 border border-nexa-border rounded-lg px-2 py-1 text-[11px] font-bold"
                        >
                          {Object.entries(STATUS_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-400 font-fa-num">
                          {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AS Tools */}
          <div className="space-y-6">
            <form onSubmit={handleSaveEstimate} className="nexa-card p-6 bg-nexa-primary text-white space-y-4">
              <h4 className="text-sm font-bold">برآورد هزینه تعمیرات</h4>
              <div className="space-y-2">
                <label className="text-[10px] opacity-60">انتخاب تیکت</label>
                <select
                  value={estimateForm.ticketId}
                  onChange={(e) => setEstimateForm((p) => ({ ...p, ticketId: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-xs text-white"
                >
                  <option value="" className="text-gray-900">
                    انتخاب تیکت...
                  </option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id} className="text-gray-900">
                      {t.ticketNo} — {t.customerName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] opacity-60">قطعات تعویضی / توضیحات</label>
                <input
                  type="text"
                  value={estimateForm.partsNotes}
                  onChange={(e) => setEstimateForm((p) => ({ ...p, partsNotes: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs"
                  placeholder="مثلاً: لولا، پایه..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={estimateForm.partsCost}
                  onChange={(e) => setEstimateForm((p) => ({ ...p, partsCost: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-fa-num"
                  placeholder="هزینه قطعات"
                />
                <input
                  type="number"
                  min={0}
                  value={estimateForm.laborCost}
                  onChange={(e) => setEstimateForm((p) => ({ ...p, laborCost: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-fa-num"
                  placeholder="اجرت تعمیر"
                />
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs font-bold mb-4">
                  <span>جمع کل:</span>
                  <span className="font-fa-num text-nexa-accent">
                    {fm((Number(estimateForm.partsCost) || 0) + (Number(estimateForm.laborCost) || 0))} تومان
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={saving || !estimateForm.ticketId}
                  className="w-full py-3 bg-nexa-accent text-white rounded-xl font-bold text-xs disabled:opacity-50"
                >
                  ثبت برآورد تعمیر
                </button>
              </div>
            </form>

            <div className="nexa-card p-6 space-y-3">
              <h4 className="text-sm font-bold text-gray-900">استعلام وضعیت گارانتی</h4>
              <input
                type="text"
                value={warrantySearch}
                onChange={(e) => setWarrantySearch(e.target.value)}
                placeholder="شماره سریال یا کد گارانتی..."
                className="w-full bg-gray-50 border border-nexa-border rounded-xl py-3 px-4 text-xs font-fa-num"
              />
              {warrantySearch.trim() ? (
                matchedWarranty ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <ShieldCheck size={16} />
                      <span>{matchedWarranty.warrantyNo} — {matchedWarranty.productName}</span>
                    </div>
                    <p className="text-emerald-700">مشتری: {matchedWarranty.customerName}</p>
                    <p className="text-emerald-600 font-fa-num">
                      اعتبار: {matchedWarranty.startDate || '—'} تا {matchedWarranty.endDate || '—'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-rose-500">گارانتی با این شماره یافت نشد.</p>
                )
              ) : (
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  با وارد کردن شماره سریال یا کد گارانتی، وضعیت اعتبار آن بررسی می‌شود.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleCreateWarranty} className="nexa-card p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              required
              value={newWarranty.customerName}
              onChange={(e) => setNewWarranty((p) => ({ ...p, customerName: e.target.value }))}
              placeholder="نام مشتری"
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs"
            />
            <input
              required
              value={newWarranty.productName}
              onChange={(e) => setNewWarranty((p) => ({ ...p, productName: e.target.value }))}
              placeholder="نام محصول"
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs"
            />
            <input
              value={newWarranty.serialNumber}
              onChange={(e) => setNewWarranty((p) => ({ ...p, serialNumber: e.target.value }))}
              placeholder="شماره سریال"
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
            />
            <input
              value={newWarranty.startDate}
              onChange={(e) => setNewWarranty((p) => ({ ...p, startDate: e.target.value }))}
              placeholder="تاریخ شروع"
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
            />
            <input
              value={newWarranty.endDate}
              onChange={(e) => setNewWarranty((p) => ({ ...p, endDate: e.target.value }))}
              placeholder="تاریخ پایان"
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
            />
            <button type="submit" disabled={saving} className="nexa-btn-primary py-2 text-xs disabled:opacity-50">
              ثبت گارانتی
            </button>
          </form>

          <div className="nexa-card overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-nexa-border text-xs text-gray-500">
                  <th className="px-6 py-4">کد گارانتی</th>
                  <th className="px-6 py-4">مشتری</th>
                  <th className="px-6 py-4">محصول</th>
                  <th className="px-6 py-4">سریال</th>
                  <th className="px-6 py-4">بازه اعتبار</th>
                  <th className="px-6 py-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {warranties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-xs text-gray-400">
                      کارت گارانتی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  warranties.map((w) => (
                    <tr key={w.id}>
                      <td className="px-6 py-4 font-bold font-fa-num">{w.warrantyNo}</td>
                      <td className="px-6 py-4">{w.customerName}</td>
                      <td className="px-6 py-4">{w.productName}</td>
                      <td className="px-6 py-4 font-fa-num">{w.serialNumber || '—'}</td>
                      <td className="px-6 py-4 font-fa-num text-xs text-gray-500">
                        {w.startDate || '—'} تا {w.endDate || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600">
                          {w.status === 'active' ? 'فعال' : w.status === 'expired' ? 'منقضی' : 'باطل'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">ثبت تیکت خدمات جدید</h3>
                <button type="button" onClick={() => setIsTicketModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    value={newTicket.customerName}
                    onChange={(e) => setNewTicket((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="نام مشتری"
                    className="bg-gray-50 rounded-2xl py-3 px-4 text-sm"
                  />
                  <input
                    value={newTicket.phone}
                    onChange={(e) => setNewTicket((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="شماره تماس"
                    className="bg-gray-50 rounded-2xl py-3 px-4 text-sm font-fa-num"
                  />
                </div>
                <input
                  value={newTicket.productName}
                  onChange={(e) => setNewTicket((p) => ({ ...p, productName: e.target.value }))}
                  placeholder="نام محصول"
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm"
                />
                <input
                  required
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="شرح مشکل یا درخواست خدمات"
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm"
                />
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value as ApiTicket['priority'] }))}
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm"
                >
                  <option value="low">اولویت پایین</option>
                  <option value="normal">اولویت عادی</option>
                  <option value="high">اولویت بالا</option>
                  <option value="critical">اضطراری</option>
                </select>
                <div className="pt-2 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ثبت تیکت
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(false)}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
