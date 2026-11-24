'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  Download,
  RefreshCw,
  Users,
  FileText,
  DollarSign,
  Calculator,
  Factory,
  Landmark,
  AlertCircle,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Pie,
  PieChart as RePieChart,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ReportsPayload = {
  kpis: {
    peopleCount: number;
    productsCount: number;
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    totalIncome: number;
    netProfit: number;
    totalLiquidity: number;
    crmLeadsCount: number;
    crmPipelineValue: number;
    crmVisitsCount: number;
    ordersCount: number;
    productionOrdersCount: number;
    openTicketsCount: number;
  };
  leadSources: { name: string; value: number }[];
  orderDistribution: { name: string; value: number }[];
  liquidityBreakdown: { name: string; value: number }[];
  campaignPerformance: {
    name: string;
    budget: number;
    spent: number;
    leads: number;
    conversions: number;
  }[];
};

const CHART_COLORS = ['#FFCD11', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#f59e0b'];

const tabs = [
  { id: 'sales', label: 'گزارش فروش و CRM' },
  { id: 'financial', label: 'گزارشات مالی' },
  { id: 'bank', label: 'گزارش بانکی و نقدینگی' },
  { id: 'orders', label: 'سفارشات و تولید' },
  { id: 'marketing', label: 'عملکرد کمپین‌ها' },
];

const formatNum = (n: number) => Math.round(n).toLocaleString('fa-IR');

export default function Reports() {
  const activeBusinessId = useBusinessOptional()?.activeBusinessId ?? null;
  const [activeTab, setActiveTab] = useState('sales');
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!activeBusinessId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/reports`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await parseApiJson<ReportsPayload>(res);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور برای بارگذاری گزارشات');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['شاخص', 'مقدار'],
      ['تعداد اشخاص و مشتریان', String(data.kpis.peopleCount)],
      ['تعداد کالاها', String(data.kpis.productsCount)],
      ['فروش کل', String(data.kpis.totalSales)],
      ['خرید کل', String(data.kpis.totalPurchases)],
      ['درآمدها', String(data.kpis.totalIncome)],
      ['هزینه‌ها', String(data.kpis.totalExpenses)],
      ['سود خالص', String(data.kpis.netProfit)],
      ['مجموع نقدینگی', String(data.kpis.totalLiquidity)],
      ['تعداد سرنخ‌های CRM', String(data.kpis.crmLeadsCount)],
      ['ارزش پایپ‌لاین فروش', String(data.kpis.crmPipelineValue)],
      ['تعداد سفارشات', String(data.kpis.ordersCount)],
      ['سفارشات تولید', String(data.kpis.productionOrdersCount)],
      ['تیکت‌های باز پشتیبانی', String(data.kpis.openTicketsCount)],
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = data?.kpis;

  const financialChartData = kpis
    ? [
        { name: 'فروش', value: kpis.totalSales, color: '#10b981' },
        { name: 'سایر درآمدها', value: kpis.totalIncome, color: '#3b82f6' },
        { name: 'خرید', value: kpis.totalPurchases, color: '#f59e0b' },
        { name: 'هزینه‌ها', value: kpis.totalExpenses, color: '#f43f5e' },
      ]
    : [];

  const renderTabContent = () => {
    if (!activeBusinessId) {
      return (
        <div className="nexa-card p-10 text-center text-sm text-gray-500">
          برای مشاهده گزارشات تحلیلی، ابتدا یک کسب‌وکار فعال انتخاب کنید.
        </div>
      );
    }

    if (loading && !data) {
      return (
        <div className="nexa-card p-10 text-center text-sm text-gray-400">
          در حال دریافت گزارشات زنده از پایگاه داده…
        </div>
      );
    }

    if (!kpis || !data) {
      return (
        <div className="nexa-card p-10 text-center text-sm text-gray-500">
          داده‌ای برای نمایش گزارش یافت نشد.
        </div>
      );
    }

    switch (activeTab) {
      case 'sales':
        return (
          <motion.div
            key="sales"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'فروش خالص ثبت‌شده', value: formatNum(kpis.totalSales), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'ارزش پایپ‌لاین CRM', value: formatNum(kpis.crmPipelineValue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'تعداد سرنخ‌ها (Leads)', value: formatNum(kpis.crmLeadsCount), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'ویزیت‌های ثبت‌شده', value: formatNum(kpis.crmVisitsCount), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((item, idx) => (
                <div key={idx} className="nexa-card p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold">{item.label}</p>
                    <p className="text-base font-black text-gray-900 font-fa-num truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="nexa-card p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-6">منابع ورودی سرنخ‌های فروش</h3>
                {data.leadSources.length === 0 ? (
                  <p className="py-16 text-center text-xs text-gray-400">هنوز سرنخی در ماژول CRM ثبت نشده است.</p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.leadSources}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" name="تعداد سرنخ" fill="#FFCD11" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="nexa-card p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-6">شاخص‌های کلیدی پایگاه داده</h3>
                <div className="space-y-4">
                  {[
                    { label: 'کل اشخاص و مشتریان', value: formatNum(kpis.peopleCount) },
                    { label: 'تعداد کالاها و خدمات کاتالوگ', value: formatNum(kpis.productsCount) },
                    { label: 'کل سفارشات مشتریان', value: formatNum(kpis.ordersCount) },
                    { label: 'تیکت‌های باز خدمات پس از فروش', value: formatNum(kpis.openTicketsCount) },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <span className="text-xs font-bold text-gray-600">{row.label}</span>
                      <span className="text-sm font-black text-gray-900 font-fa-num">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'financial':
        return (
          <motion.div
            key="financial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'فروش خالص', value: formatNum(kpis.totalSales), color: 'text-emerald-600' },
                { label: 'خرید خالص', value: formatNum(kpis.totalPurchases), color: 'text-amber-600' },
                { label: 'هزینه‌های ثبت‌شده', value: formatNum(kpis.totalExpenses), color: 'text-rose-600' },
                { label: 'سود (زیان) خالص', value: formatNum(kpis.netProfit), color: kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' },
              ].map((stat, idx) => (
                <div key={idx} className="nexa-card p-5">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-lg font-black font-fa-num ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="nexa-card p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-6">مقایسه جریان درآمد و هزینه</h3>
              {financialChartData.every((d) => d.value === 0) ? (
                <p className="py-16 text-center text-xs text-gray-400">هنوز سند خرید، فروش، درآمد یا هزینه‌ای ثبت نشده است.</p>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="value" name="مبلغ" radius={[6, 6, 0, 0]}>
                        {financialChartData.map((entry, idx) => (
                          <Cell key={`fin-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'bank':
        return (
          <motion.div
            key="bank"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="nexa-card p-6 flex items-center justify-between bg-nexa-primary text-white">
              <div>
                <p className="text-xs opacity-70 mb-1">مجموع نقدینگی (حساب‌های بانکی و صندوق‌ها)</p>
                <p className="text-3xl font-black font-fa-num">{formatNum(kpis.totalLiquidity)} ریال</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Landmark size={24} className="text-nexa-accent" />
              </div>
            </div>

            <div className="nexa-card p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-6">توزیع موجودی حساب‌های بانکی و صندوق‌ها</h3>
              {data.liquidityBreakdown.length === 0 ? (
                <p className="py-16 text-center text-xs text-gray-400">هیچ حساب بانکی یا صندوقی در بخش بانکداری تعریف نشده است.</p>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.liquidityBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="value" name="موجودی" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'orders':
        return (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="nexa-card p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-6">توزیع وضعیت سفارشات</h3>
              {data.orderDistribution.length === 0 ? (
                <p className="py-16 text-center text-xs text-gray-400">هنوز سفارشی ثبت نشده است.</p>
              ) : (
                <>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={data.orderDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.orderDistribution.map((_, index) => (
                            <Cell key={`ord-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {data.orderDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-black text-gray-900 font-fa-num">{formatNum(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="nexa-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Factory size={18} className="text-nexa-accent" />
                خلاصه عملیات تولید و پشتیبانی
              </h3>
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">سفارشات تولید ثبت‌شده</span>
                <span className="text-lg font-black text-gray-900 font-fa-num">{formatNum(kpis.productionOrdersCount)}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">کل سفارشات مشتریان</span>
                <span className="text-lg font-black text-gray-900 font-fa-num">{formatNum(kpis.ordersCount)}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">تیکت‌های باز خدمات پس از فروش</span>
                <span className="text-lg font-black text-rose-600 font-fa-num">{formatNum(kpis.openTicketsCount)}</span>
              </div>
            </div>
          </motion.div>
        );

      case 'marketing':
        return (
          <motion.div
            key="marketing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nexa-card p-6"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-6">عملکرد کمپین‌های بازاریابی</h3>
            {data.campaignPerformance.length === 0 ? (
              <p className="py-16 text-center text-xs text-gray-400">هنوز کمپین بازاریابی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-gray-50/70 text-[10px] font-black text-gray-400 border-b border-nexa-border">
                      <th className="px-6 py-4">نام کمپین</th>
                      <th className="px-6 py-4">بودجه</th>
                      <th className="px-6 py-4">هزینه‌شده</th>
                      <th className="px-6 py-4">سرنخ</th>
                      <th className="px-6 py-4">تبدیل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border">
                    {data.campaignPerformance.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">{c.name}</td>
                        <td className="px-6 py-4 text-xs font-fa-num text-gray-600">{formatNum(c.budget)}</td>
                        <td className="px-6 py-4 text-xs font-fa-num text-gray-600">{formatNum(c.spent)}</td>
                        <td className="px-6 py-4 text-xs font-black font-fa-num text-blue-600">{formatNum(c.leads)}</td>
                        <td className="px-6 py-4 text-xs font-black font-fa-num text-emerald-600">{formatNum(c.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          <h1 className="text-3xl font-black text-gray-900">گزارشات و تحلیل‌ها</h1>
          <p className="text-gray-500 mt-1">مانیتورینگ زنده شاخص‌های کلیدی عملکرد (KPI) از پایگاه داده</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void loadReports()}
            disabled={loading}
            className="bg-white border border-nexa-border px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            بروزرسانی
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data}
            className="nexa-btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Download size={18} />
            خروجی CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-nexa-accent shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
    </div>
  );
}
