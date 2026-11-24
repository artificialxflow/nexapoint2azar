'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Wrench,
  User,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { useAuth } from '@/src/context/AuthContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiRequest = {
  id: string;
  title: string;
  type: string;
  requester: string;
  requesterId: string | null;
  date: string;
  status: string;
  priority: string;
  description: string;
};

type RequestsPayload = {
  requests: ApiRequest[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

const tabs = [
  { id: 'all', label: 'همه درخواست‌ها', icon: History },
  { id: 'goods', label: 'درخواست کالا', icon: Package },
  { id: 'services', label: 'درخواست خدمات', icon: Wrench },
  { id: 'my_requests', label: 'درخواست‌های من', icon: User },
];

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function RequestsView() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;
  const { user } = useAuth();

  const [requestsList, setRequestsList] = useState<ApiRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newRequest, setNewRequest] = useState({ title: '', type: 'کالا', priority: 'medium', description: '' });

  const loadRequests = useCallback(async () => {
    if (!activeBusinessId) {
      setRequestsList([]);
      return;
    }
    setLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/procurement-requests`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<RequestsPayload>(res);
      setRequestsList(data.requests);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'خطا در دریافت درخواست‌ها');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newRequest.title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/procurement-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRequest.title.trim(),
          type: newRequest.type,
          priority: newRequest.priority,
          description: newRequest.description.trim(),
          date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        }),
      });
      await parseApiJson(res);
      setIsModalOpen(false);
      setNewRequest({ title: '', type: 'کالا', priority: 'medium', description: '' });
      await loadRequests();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'خطا در ثبت درخواست');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (!activeBusinessId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/procurement-requests`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      await parseApiJson(res);
      await loadRequests();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت درخواست');
    } finally {
      setSaving(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const meName = user?.displayName || user?.username || '';
    const q = searchQuery.toLowerCase();
    return requestsList.filter((r) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'goods' && r.type === 'کالا') ||
        (activeTab === 'services' && r.type === 'خدمات') ||
        (activeTab === 'my_requests' && ((user?.id && r.requesterId === user.id) || (meName && r.requester === meName)));
      const matchesSearch = r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [requestsList, activeTab, searchQuery, user]);

  const stats = useMemo(
    () => [
      { label: 'کل درخواست‌ها', value: fm(requestsList.length), icon: FileText, color: 'text-blue-600' },
      {
        label: 'در انتظار تایید',
        value: fm(requestsList.filter((r) => r.status.includes('انتظار')).length),
        icon: Clock,
        color: 'text-amber-600',
      },
      {
        label: 'تایید شده / در جریان',
        value: fm(requestsList.filter((r) => r.status.includes('تایید شده') || r.status.includes('ارسال')).length),
        icon: CheckCircle2,
        color: 'text-emerald-600',
      },
      {
        label: 'نیاز به اقدام فوری',
        value: fm(requestsList.filter((r) => r.priority === 'high' && r.status.includes('انتظار')).length),
        icon: AlertCircle,
        color: 'text-rose-600',
      },
    ],
    [requestsList],
  );

  return (
    <div className="space-y-8">
      {saveError ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2">
          {saveError}
        </p>
      ) : null}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">درخواست کالا و خدمات</h1>
          <p className="text-sm text-gray-500 mt-1">مدیریت درخواست‌های داخلی کالا، ملزومات و خدمات فنی</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 md:flex-none bg-white border border-nexa-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            گزارش درخواست‌ها
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none nexa-btn-primary flex items-center justify-center gap-2 py-3 md:py-2"
          >
            <Plus size={18} />
            ثبت درخواست جدید
          </button>
        </div>
      </div>

      {/* New Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">ثبت درخواست جدید</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">عنوان درخواست</label>
                  <input
                    required
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    placeholder="مثلاً: خرید لپ‌تاپ واحد فنی"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">نوع درخواست</label>
                    <select
                      value={newRequest.type}
                      onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    >
                      <option value="کالا">کالا</option>
                      <option value="خدمات">خدمات</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">اولویت</label>
                    <select
                      value={newRequest.priority}
                      onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    >
                      <option value="low">معمولی</option>
                      <option value="medium">متوسط</option>
                      <option value="high">فوری / بالا</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">توضیحات تکمیلی</label>
                  <textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 h-24 resize-none"
                    placeholder="جزئیات درخواست خود را اینجا بنویسید..."
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ثبت نهایی درخواست
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="nexa-card p-6">
            <div className="flex items-center justify-between mb-2">
              <stat.icon size={20} className={stat.color} />
              <span className="text-2xl font-black text-gray-900 font-fa-num">{stat.value}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="nexa-card overflow-hidden">
        <div className="p-6 border-b border-nexa-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان یا کد درخواست..."
              className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
            />
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold">
              <Filter size={16} />
              {fm(filteredRequests.length)} مورد
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/50 border-b border-nexa-border">
                <th className="px-6 py-4 text-xs font-black text-gray-400">کد درخواست</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">عنوان درخواست</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">نوع</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">درخواست دهنده</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">تاریخ</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">وضعیت</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border">
              <AnimatePresence mode="popLayout">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-xs text-gray-400">
                      {loading ? 'در حال بارگذاری درخواست‌ها...' : 'درخواستی ثبت نشده است.'}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 text-sm font-black text-gray-900 font-fa-num">{req.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{req.title}</span>
                          <span className={`text-[9px] font-bold ${req.priority === 'high' ? 'text-rose-500' : 'text-gray-400'}`}>
                            اولویت: {req.priority === 'high' ? 'بالا' : req.priority === 'medium' ? 'متوسط' : 'معمولی'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            req.type === 'کالا' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          {req.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 font-bold">{req.requester}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-fa-num">{req.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            req.status === 'تایید شده'
                              ? 'bg-emerald-50 text-emerald-600'
                              : req.status === 'رد شده'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {req.status !== 'تایید شده' && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void updateStatus(req.id, 'تایید شده')}
                              className="text-xs font-bold text-emerald-600 hover:underline"
                            >
                              تایید
                            </button>
                          )}
                          {req.status !== 'رد شده' && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void updateStatus(req.id, 'رد شده')}
                              className="text-xs font-bold text-rose-600 hover:underline"
                            >
                              رد
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
