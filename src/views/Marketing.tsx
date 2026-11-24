'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Plus,
  Target,
  Users,
  BarChart,
  Star,
  MessageSquare,
  Search,
  X,
  TrendingUp,
  PieChart,
  Award,
  Gift,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiCampaign = {
  id: string;
  name: string;
  channel: string;
  budget: number;
  spent: number;
  leadsCount: number;
  conversionsCount: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  notes: string;
};

type ApiSurveyResponse = {
  id: string;
  respondentName: string;
  score: number;
  comment: string;
  createdAt: string;
};

type ApiSurvey = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  responses: ApiSurveyResponse[];
};

type ApiClubMember = {
  id: string;
  fullName?: string;
  name?: string;
  tier?: string;
  level?: string;
  points?: number;
  lastVisit?: string;
  createdAt?: string;
};

type MarketingPayload = {
  campaigns: ApiCampaign[];
  surveys: ApiSurvey[];
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalLeads: number;
    totalConversions: number;
  };
};

const tabs = [
  { id: 'overview', label: 'مرور مارکتینگ' },
  { id: 'campaigns', label: 'کمپین‌ها' },
  { id: 'club', label: 'باشگاه مشتریان' },
  { id: 'surveys', label: 'نظرسنجی' },
  { id: 'results', label: 'گزارش نتایج' },
];

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function Marketing() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [activeTab, setActiveTab] = useState('overview');
  const [campaignsList, setCampaignsList] = useState<ApiCampaign[]>([]);
  const [clubMembers, setClubMembers] = useState<ApiClubMember[]>([]);
  const [surveysList, setSurveysList] = useState<ApiSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', type: 'شبکه‌های اجتماعی', budget: '' });
  const [newSurvey, setNewSurvey] = useState({ title: '', description: '' });

  const loadMarketing = useCallback(async () => {
    if (!activeBusinessId) {
      setCampaignsList([]);
      setSurveysList([]);
      setClubMembers([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const [mktRes, clubRes] = await Promise.all([
        fetch(`/api/businesses/${activeBusinessId}/marketing`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/businesses/${activeBusinessId}/crm/club-members`, { credentials: 'include', cache: 'no-store' }),
      ]);
      const mktData = await parseApiJson<MarketingPayload>(mktRes);
      setCampaignsList(mktData.campaigns);
      setSurveysList(mktData.surveys);

      if (clubRes.ok) {
        const clubJson = await clubRes.json();
        const rows = Array.isArray(clubJson?.data)
          ? clubJson.data
          : Array.isArray(clubJson?.data?.members)
            ? clubJson.data.members
            : [];
        setClubMembers(rows);
      } else {
        setClubMembers([]);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات مارکتینگ');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadMarketing();
  }, [loadMarketing]);

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newCampaign.name.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const budgetNum = Number(String(newCampaign.budget).replace(/,/g, '')) || 0;
      const res = await fetch(`/api/businesses/${activeBusinessId}/marketing`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'campaign',
          name: newCampaign.name.trim(),
          channel: newCampaign.type,
          budget: budgetNum,
          status: 'active',
        }),
      });
      await parseApiJson(res);
      setIsCampaignModalOpen(false);
      setNewCampaign({ name: '', type: 'شبکه‌های اجتماعی', budget: '' });
      await loadMarketing();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت کمپین');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCampaignStatus = async (camp: ApiCampaign) => {
    if (!activeBusinessId) return;
    const nextStatus = camp.status === 'active' ? 'completed' : 'active';
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/marketing`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'campaign', id: camp.id, status: nextStatus }),
      });
      await parseApiJson(res);
      await loadMarketing();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در تغییر وضعیت کمپین');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newSurvey.title.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/marketing`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'survey',
          title: newSurvey.title.trim(),
          description: newSurvey.description.trim(),
          status: 'active',
        }),
      });
      await parseApiJson(res);
      setIsSurveyModalOpen(false);
      setNewSurvey({ title: '', description: '' });
      await loadMarketing();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ایجاد نظرسنجی');
    } finally {
      setSaving(false);
    }
  };

  const filteredCampaigns = useMemo(
    () => campaignsList.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [campaignsList, searchQuery],
  );

  const filteredMembers = useMemo(
    () =>
      clubMembers.filter((m) => {
        const label = `${m.fullName || m.name || ''} ${m.tier || m.level || ''}`.toLowerCase();
        return label.includes(searchQuery.toLowerCase());
      }),
    [clubMembers, searchQuery],
  );

  const metrics = useMemo(() => {
    const totalBudget = campaignsList.reduce((s, c) => s + c.budget, 0);
    const totalLeads = campaignsList.reduce((s, c) => s + c.leadsCount, 0);
    const totalConv = campaignsList.reduce((s, c) => s + c.conversionsCount, 0);
    const convRate = totalLeads > 0 ? Math.round((totalConv / totalLeads) * 1000) / 10 : 0;
    const allResponses = surveysList.flatMap((s) => s.responses || []);
    const avgScore =
      allResponses.length > 0
        ? (allResponses.reduce((s, r) => s + r.score, 0) / allResponses.length).toFixed(1)
        : '۰';

    const byChannel = new Map<string, number>();
    for (const c of campaignsList) {
      byChannel.set(c.channel, (byChannel.get(c.channel) ?? 0) + 1);
    }
    const channelStats = Array.from(byChannel.entries()).map(([label, count]) => ({
      label,
      count,
      percent: campaignsList.length > 0 ? Math.round((count / campaignsList.length) * 100) : 0,
    }));

    return { totalBudget, totalLeads, totalConv, convRate, avgScore, channelStats };
  }, [campaignsList, surveysList]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'بودجه کل کمپین‌ها', value: fm(metrics.totalBudget), icon: Wallet, color: 'text-blue-600' },
                { label: 'اعضای باشگاه مشتریان', value: fm(clubMembers.length), icon: Users, color: 'text-emerald-600' },
                { label: 'نرخ تبدیل میانگین', value: `${fm(metrics.convRate)}٪`, icon: Target, color: 'text-amber-600' },
                { label: 'امتیاز رضایت', value: `${metrics.avgScore} / ۵`, icon: Star, color: 'text-rose-600' },
              ].map((stat, idx) => (
                <div key={idx} className="nexa-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-xl bg-gray-50 ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-gray-900 font-fa-num">{stat.value}</p>
                  <p className="text-xs font-bold text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="nexa-card p-6">
                <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-nexa-accent" />
                  عملکرد کمپین‌های ثبت‌شده
                </h3>
                {campaignsList.length === 0 ? (
                  <p className="text-xs text-gray-400 py-10 text-center">
                    هنوز کمپینی ثبت نشده است.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {campaignsList.slice(0, 6).map((c) => {
                      const pct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
                      return (
                        <div key={c.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-gray-800">{c.name}</span>
                            <span className="font-fa-num text-gray-500">
                              {fm(c.leadsCount)} سرنخ / {fm(c.conversionsCount)} تبدیل
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-nexa-accent" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="nexa-card p-6">
                <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2">
                  <PieChart size={18} className="text-nexa-accent" />
                  توزیع کانال‌های مارکتینگ
                </h3>
                {metrics.channelStats.length === 0 ? (
                  <p className="text-xs text-gray-400 py-10 text-center">
                    کانال فعالی برای نمایش وجود ندارد.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {metrics.channelStats.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-fa-num">{fm(item.percent)}٪ ({fm(item.count)})</span>
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
            </div>
          </motion.div>
        );
      case 'campaigns':
        return (
          <motion.div
            key="campaigns"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در کمپین‌ها..."
                  className="w-full bg-white border border-nexa-border rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(true)}
                className="nexa-btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                ایجاد کمپین جدید
              </button>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="nexa-card p-10 text-center text-xs text-gray-400">
                {loading ? 'در حال بارگذاری کمپین‌ها...' : 'هنوز کمپینی ثبت نشده است.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((camp) => {
                  const conv =
                    camp.leadsCount > 0 ? `${((camp.conversionsCount / camp.leadsCount) * 100).toFixed(1)}٪` : '—';
                  return (
                    <div key={camp.id} className="nexa-card p-6 group hover:border-nexa-accent transition-all relative">
                      <div className="flex items-start justify-between mb-6">
                        <div
                          className={`p-3 rounded-2xl ${
                            camp.status === 'active'
                              ? 'bg-blue-50 text-blue-600'
                              : camp.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Megaphone size={24} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              camp.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : camp.status === 'completed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {camp.status === 'active'
                              ? 'در حال اجرا'
                              : camp.status === 'completed'
                                ? 'پایان یافته'
                                : 'پیش‌نویس'}
                          </span>
                          <span className="text-[8px] font-bold text-gray-400">{camp.channel}</span>
                        </div>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 mb-4">{camp.name}</h3>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">تعداد سرنخ</p>
                          <p className="text-xs font-black text-gray-700 font-fa-num">{fm(camp.leadsCount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">نرخ تبدیل</p>
                          <p className="text-xs font-black text-emerald-600 font-fa-num">{conv}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-nexa-border flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-fa-num">
                          <Wallet size={12} />
                          {fm(camp.budget)} ریال
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleToggleCampaignStatus(camp)}
                          className="text-[11px] font-bold text-nexa-accent hover:underline"
                        >
                          {camp.status === 'active' ? 'پایان دادن' : 'فعال‌سازی'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      case 'club':
        return (
          <motion.div
            key="club"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: 'اعضای طلایی / پلاتینیوم',
                  value: fm(
                    clubMembers.filter((m) =>
                      ['gold', 'platinum', 'طلایی', 'پلاتینیوم'].includes(String(m.tier || m.level || '').toLowerCase()),
                    ).length,
                  ),
                  icon: Award,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50',
                },
                {
                  label: 'امتیازات ثبت‌شده',
                  value: fm(clubMembers.reduce((s, m) => s + (Number(m.points) || 0), 0)),
                  icon: Gift,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50',
                },
                {
                  label: 'کل اعضای باشگاه',
                  value: fm(clubMembers.length),
                  icon: TrendingUp,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                },
              ].map((item, idx) => (
                <div key={idx} className="nexa-card p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900 font-fa-num">{item.value}</p>
                    <p className="text-xs font-bold text-gray-400">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="nexa-card overflow-hidden">
              <div className="p-6 border-b border-nexa-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                <h3 className="text-sm font-black text-gray-900">لیست اعضای باشگاه</h3>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو در اعضا..."
                    className="w-full bg-white border border-nexa-border rounded-xl py-2 pr-9 pl-4 text-xs focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">نام مشتری</th>
                      <th className="px-6 py-4">سطح عضویت</th>
                      <th className="px-6 py-4">امتیاز فعلی</th>
                      <th className="px-6 py-4">آخرین فعالیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-xs text-gray-400">
                          هنوز عضوی در باشگاه مشتریان ثبت نشده است. از بخش CRM می‌توانید اعضا را ثبت کنید.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <Users size={16} />
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {member.fullName || member.name || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600">
                              {member.tier || member.level || 'عادی'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-gray-700 font-fa-num">
                            {fm(Number(member.points) || 0)}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-fa-num">
                            {member.lastVisit ||
                              (member.createdAt ? new Date(member.createdAt).toLocaleDateString('fa-IR') : '—')}
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
      case 'surveys':
        return (
          <motion.div
            key="surveys"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-900">نظرسنجی‌های فعال و آرشیو شده</h3>
              <button
                type="button"
                onClick={() => setIsSurveyModalOpen(true)}
                className="nexa-btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                ایجاد نظرسنجی جدید
              </button>
            </div>

            {surveysList.length === 0 ? (
              <div className="nexa-card p-10 text-center text-xs text-gray-400">
                هنوز نظرسنجی ایجاد نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {surveysList.map((survey) => (
                  <div
                    key={survey.id}
                    className="nexa-card p-6 flex items-center justify-between group hover:border-nexa-accent transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          survey.status === 'active' || survey.status === 'فعال'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <MessageSquare size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{survey.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-fa-num">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {fm(survey.responses?.length ?? 0)} پاسخ ثبت شده
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span>{new Date(survey.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          survey.status === 'active' || survey.status === 'فعال'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {survey.status === 'active' || survey.status === 'فعال' ? 'در حال اجرا' : 'بسته شده'}
                      </span>
                      <ArrowUpRight size={18} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      case 'results':
        return (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nexa-card p-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart size={24} className="text-nexa-accent" />
                <h3 className="text-lg font-black text-gray-900">خلاصه نتایج مارکتینگ</h3>
              </div>
              <button type="button" onClick={() => window.print()} className="nexa-btn-primary px-6 py-2 text-xs">
                چاپ گزارش
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-500">تعداد کل کمپین‌ها</p>
                <p className="text-xl font-black font-fa-num mt-1">{fm(campaignsList.length)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-500">مجموع سرنخ‌های جذب‌شده</p>
                <p className="text-xl font-black font-fa-num mt-1">{fm(metrics.totalLeads)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-500">مجموع تبدیل‌ها</p>
                <p className="text-xl font-black font-fa-num mt-1">{fm(metrics.totalConv)}</p>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">مارکتینگ و تبلیغات</h1>
          <p className="text-gray-500 mt-1">مدیریت کمپین‌ها، باشگاه مشتریان و نظرسنجی‌ها</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsCampaignModalOpen(true)}
            className="nexa-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            ایجاد کمپین جدید
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

      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>

      {/* Campaign Modal */}
      <AnimatePresence>
        {isCampaignModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCampaignModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">ایجاد کمپین جدید</h3>
                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCampaign} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">نام کمپین</label>
                  <input
                    required
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="مثال: جشنواره تابستانه ۱۴۰۵"
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">کانال تبلیغاتی</label>
                    <select
                      value={newCampaign.type}
                      onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                    >
                      <option value="شبکه‌های اجتماعی">شبکه‌های اجتماعی</option>
                      <option value="پیامکی">پیامکی</option>
                      <option value="ایمیل مارکتینگ">ایمیل مارکتینگ</option>
                      <option value="تبلیغات محیطی">تبلیغات محیطی</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">بودجه تقریبی (ریال)</label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                      placeholder="50000000"
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none font-fa-num"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ثبت کمپین
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCampaignModalOpen(false)}
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

      {/* Survey Modal */}
      <AnimatePresence>
        {isSurveyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSurveyModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">ایجاد نظرسنجی جدید</h3>
                <button type="button" onClick={() => setIsSurveyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddSurvey} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">عنوان نظرسنجی</label>
                  <input
                    required
                    type="text"
                    value={newSurvey.title}
                    onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                    placeholder="مثال: نظرسنجی کیفیت خدمات پس از فروش"
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">توضیحات</label>
                  <textarea
                    value={newSurvey.description}
                    onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                    placeholder="توضیحات نظرسنجی..."
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm h-20 resize-none outline-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ایجاد و انتشار
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSurveyModalOpen(false)}
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
