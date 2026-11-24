'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  TrendingUp,
  Users,
  Award,
  Globe,
  X,
  BarChart3,
  Clock,
  Briefcase,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiMember = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  region: string;
  tier: string;
  commissionRate: number;
  totalSales: number;
  active: boolean;
};

type ApiCommission = {
  id: string;
  memberId: string;
  periodLabel: string;
  salesAmount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  member: { id: string; fullName: string; region: string };
};

type SalesNetworkPayload = {
  members: ApiMember[];
  commissions: ApiCommission[];
  summary: {
    activeMembers: number;
    totalSales: number;
    totalCommissions: number;
  };
};

const tabs = [
  { id: 'all', label: 'همه اعضا' },
  { id: 'نمایندگی', label: 'نمایندگی‌ها' },
  { id: 'عاملیت فروش', label: 'عاملیت‌های فروش' },
  { id: 'کارشناس فروش', label: 'کارشناسان فروش' },
  { id: 'بازاریاب بیرونی', label: 'بازاریابان بیرونی' },
  { id: 'commissions', label: 'کمیسیون‌ها' },
  { id: 'reports', label: 'گزارشات' },
];

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function SalesNetwork() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [activeTab, setActiveTab] = useState('all');
  const [networkList, setNetworkList] = useState<ApiMember[]>([]);
  const [commissionsList, setCommissionsList] = useState<ApiCommission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    fullName: '',
    phone: '',
    tier: 'نمایندگی',
    region: '',
    commissionRate: '5',
  });
  const [newCommission, setNewCommission] = useState({
    memberId: '',
    periodLabel: '',
    salesAmount: '',
    commissionAmount: '',
  });

  const loadNetwork = useCallback(async () => {
    if (!activeBusinessId) {
      setNetworkList([]);
      setCommissionsList([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/sales-network`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<SalesNetworkPayload>(res);
      setNetworkList(data.members);
      setCommissionsList(data.commissions);
      setNewCommission((prev) => ({ ...prev, memberId: prev.memberId || data.members[0]?.id || '' }));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات شبکه فروش');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadNetwork();
  }, [loadNetwork]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newMember.fullName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/sales-network`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'member',
          fullName: newMember.fullName.trim(),
          phone: newMember.phone.trim(),
          region: newMember.region.trim(),
          tier: newMember.tier,
          commissionRate: Number(newMember.commissionRate) || 5,
        }),
      });
      await parseApiJson(res);
      setIsAddModalOpen(false);
      setNewMember({ fullName: '', phone: '', tier: 'نمایندگی', region: '', commissionRate: '5' });
      await loadNetwork();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت عضو جدید');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: ApiMember) => {
    if (!activeBusinessId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/sales-network`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'member', id: member.id, active: !member.active }),
      });
      await parseApiJson(res);
      await loadNetwork();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در تغییر وضعیت');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newCommission.memberId || !newCommission.periodLabel.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/sales-network`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'commission',
          memberId: newCommission.memberId,
          periodLabel: newCommission.periodLabel.trim(),
          salesAmount: Number(newCommission.salesAmount) || 0,
          commissionAmount: Number(newCommission.commissionAmount) || 0,
        }),
      });
      await parseApiJson(res);
      setNewCommission((prev) => ({ ...prev, periodLabel: '', salesAmount: '', commissionAmount: '' }));
      await loadNetwork();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت کمیسیون');
    } finally {
      setSaving(false);
    }
  };

  const handlePayCommission = async (id: string) => {
    if (!activeBusinessId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/sales-network`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'commission', id, status: 'پرداخت شده' }),
      });
      await parseApiJson(res);
      await loadNetwork();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در تسویه کمیسیون');
    } finally {
      setSaving(false);
    }
  };

  const filteredNetwork = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return networkList.filter(
      (item) =>
        (activeTab === 'all' || activeTab === 'reports' || activeTab === 'commissions' || item.tier === activeTab) &&
        (item.fullName.toLowerCase().includes(q) ||
          item.region.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q)),
    );
  }, [networkList, activeTab, searchQuery]);

  const topMember = useMemo(() => {
    if (networkList.length === 0) return '—';
    const sorted = [...networkList].sort((a, b) => b.totalSales - a.totalSales);
    return sorted[0]?.fullName || '—';
  }, [networkList]);

  const tierBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of networkList) {
      map.set(m.tier, (map.get(m.tier) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({
      label,
      count,
      percent: networkList.length > 0 ? Math.round((count / networkList.length) * 100) : 0,
    }));
  }, [networkList]);

  const regionBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of networkList) {
      const key = m.region || 'نامشخص';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [networkList]);

  const renderTabContent = () => {
    if (activeTab === 'commissions') {
      return (
        <motion.div
          key="commissions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {networkList.length > 0 && (
            <form onSubmit={handleAddCommission} className="nexa-card p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={newCommission.memberId}
                onChange={(e) => setNewCommission((p) => ({ ...p, memberId: e.target.value }))}
                className="bg-gray-50 rounded-xl px-3 py-2 text-xs"
              >
                {networkList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <input
                required
                value={newCommission.periodLabel}
                onChange={(e) => setNewCommission((p) => ({ ...p, periodLabel: e.target.value }))}
                placeholder="دوره (مثلاً فروردین ۱۴۰۵)"
                className="bg-gray-50 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="number"
                value={newCommission.salesAmount}
                onChange={(e) => setNewCommission((p) => ({ ...p, salesAmount: e.target.value }))}
                placeholder="فروش دوره (ریال)"
                className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
              />
              <input
                type="number"
                value={newCommission.commissionAmount}
                onChange={(e) => setNewCommission((p) => ({ ...p, commissionAmount: e.target.value }))}
                placeholder="مبلغ پورسانت (ریال)"
                className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
              />
              <button type="submit" disabled={saving} className="nexa-btn-primary py-2 text-xs disabled:opacity-50">
                ثبت کمیسیون
              </button>
            </form>
          )}

          <div className="nexa-card overflow-hidden">
            <div className="p-6 border-b border-nexa-border bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">لیست پرداخت‌های کمیسیون</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <Clock size={14} />
                {fm(commissionsList.length)} رکورد
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">نام ذینفع</th>
                    <th className="px-6 py-4">دوره</th>
                    <th className="px-6 py-4">مبلغ (ریال)</th>
                    <th className="px-6 py-4">وضعیت</th>
                    <th className="px-6 py-4">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexa-border">
                  {commissionsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-xs text-gray-400">
                        کمیسیونی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    commissionsList.map((comm) => (
                      <tr key={comm.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">{comm.member?.fullName || '—'}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{comm.periodLabel}</td>
                        <td className="px-6 py-4 text-xs font-black text-emerald-600 font-fa-num">
                          {fm(comm.commissionAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                              comm.status === 'پرداخت شده' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {comm.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {comm.status !== 'پرداخت شده' ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handlePayCommission(comm.id)}
                              className="text-xs font-bold text-nexa-accent hover:underline"
                            >
                              ثبت پرداخت
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600">تسویه شده</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      );
    }

    if (activeTab === 'reports') {
      return (
        <motion.div
          key="reports"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div className="nexa-card p-6">
            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-nexa-accent" />
              پراکندگی استانی / شهری اعضا
            </h3>
            {regionBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">داده‌ای برای نمایش ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {regionBreakdown.map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-xs">
                    <span className="font-bold text-gray-800">{region}</span>
                    <span className="font-fa-num text-gray-600">{fm(count)} عضو</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="nexa-card p-6">
            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-nexa-accent" />
              ترکیب اعضا به تفکیک نوع همکاری
            </h3>
            {tierBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">عضوی در شبکه فروش ثبت نشده است.</p>
            ) : (
              <div className="space-y-4">
                {tierBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-fa-num">
                        {fm(item.percent)}٪ ({fm(item.count)})
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        className="h-full bg-nexa-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="list"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="nexa-card overflow-hidden"
      >
        <div className="p-6 border-b border-nexa-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام، کد یا شهر..."
              className="w-full bg-white border border-nexa-border rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">کد / نام عضو</th>
                <th className="px-6 py-4">نوع همکاری</th>
                <th className="px-6 py-4">شهر / منطقه</th>
                <th className="px-6 py-4">نرخ کمیسیون</th>
                <th className="px-6 py-4">فروش کل (ریال)</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border">
              {filteredNetwork.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-xs text-gray-400">
                    {loading ? 'در حال بارگذاری...' : 'عضوی در این بخش ثبت نشده است.'}
                  </td>
                </tr>
              ) : (
                filteredNetwork.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                          {item.tier === 'نمایندگی' ? <Building2 size={16} /> : <Briefcase size={16} />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">{item.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-fa-num">{item.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{item.tier}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{item.region || '—'}</td>
                    <td className="px-6 py-4 text-xs font-fa-num">{fm(item.commissionRate)}٪</td>
                    <td className="px-6 py-4 text-xs font-black text-emerald-600 font-fa-num">{fm(item.totalSales)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                          item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {item.active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleToggleActive(item)}
                        className="text-xs font-bold text-nexa-accent hover:underline"
                      >
                        {item.active ? 'غیرفعال' : 'فعال‌سازی'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">شبکه فروش و نمایندگان</h1>
          <p className="text-gray-500 mt-1">مدیریت شعب، نمایندگی‌ها، عاملیت‌های فروش و بازاریابان</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="bg-white border border-nexa-border px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Globe size={18} className="text-blue-600" />
            پراکندگی جغرافیایی
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="nexa-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            افزودن عضو جدید
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">{errorMsg}</div>
      ) : null}

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
            }}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'اعضای فعال شبکه', value: fm(networkList.filter((m) => m.active).length), icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'فروش کل شبکه', value: fm(networkList.reduce((s, m) => s + m.totalSales, 0)), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'کل اعضای ثبت‌شده', value: fm(networkList.length), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'رتبه برتر فروش', value: topMember, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <div key={idx} className="nexa-card p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 font-fa-num">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">افزودن عضو جدید به شبکه</h3>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">نام واحد / نماینده</label>
                  <input
                    required
                    type="text"
                    value={newMember.fullName}
                    onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                    placeholder="مثال: نمایندگی شمال تهران"
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">تلفن تماس</label>
                    <input
                      type="text"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      placeholder="0912..."
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">شهر / منطقه</label>
                    <input
                      required
                      type="text"
                      value={newMember.region}
                      onChange={(e) => setNewMember({ ...newMember, region: e.target.value })}
                      placeholder="مثال: تهران"
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">نوع همکاری</label>
                    <select
                      value={newMember.tier}
                      onChange={(e) => setNewMember({ ...newMember, tier: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                    >
                      <option value="نمایندگی">نمایندگی</option>
                      <option value="عاملیت فروش">عاملیت فروش</option>
                      <option value="کارشناس فروش">کارشناس فروش</option>
                      <option value="بازاریاب بیرونی">بازاریاب بیرونی</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">نرخ کمیسیون (٪)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newMember.commissionRate}
                      onChange={(e) => setNewMember({ ...newMember, commissionRate: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ثبت در شبکه
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
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

      {/* Regional Distribution Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMapOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900">پراکندگی جغرافیایی شبکه فروش</h3>
                  <p className="text-xs text-gray-500 mt-1">توزیع شهرها و مناطق ثبت‌شده در سیستم</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {regionBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">هنوز منطقه‌ای ثبت نشده است.</p>
                ) : (
                  regionBreakdown.map(([region, count]) => (
                    <div key={region} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-nexa-accent" />
                        <span className="font-bold text-sm text-gray-900">{region}</span>
                      </div>
                      <span className="text-xs font-black font-fa-num text-gray-700">{fm(count)} نقطه فروش</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
