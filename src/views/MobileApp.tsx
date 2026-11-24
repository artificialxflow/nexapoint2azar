'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Clock,
  UserCircle,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  FileText,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type MobileTab = 'home' | 'tasks' | 'orders' | 'requests' | 'profile';

type MobilePayload = {
  user: {
    id: string;
    displayName: string;
    role: string;
  };
  todayAttendance: {
    id: string;
    workDate: string;
    checkIn: string;
    checkOut: string;
    status: string;
  } | null;
  stats: {
    tasksCount: number;
    ordersCount: number;
    requestsCount: number;
    lettersCount: number;
    chatsCount: number;
  };
  tasks: {
    id: string;
    title: string;
    dueDate: string;
    starred: boolean;
    assignee: string;
    category: string;
  }[];
  orders: {
    id: string;
    orderNo: string;
    customer: string;
    status: string;
    progress: number;
    date: string;
  }[];
  requests: {
    id: string;
    title: string;
    status: string;
    priority: string;
    date: string;
  }[];
};

export default function MobileApp() {
  const business = useBusinessOptional();
  const activeBusinessId = business?.activeBusinessId ?? null;
  const activeBusinessName = business?.activeBusiness?.name ?? 'فضای کاری';

  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [data, setData] = useState<MobilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!activeBusinessId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${encodeURIComponent(activeBusinessId)}/mobile`,
        { credentials: 'include', cache: 'no-store' }
      );
      const payload = await parseApiJson<MobilePayload>(res);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleAttendance = async (action: 'check_in' | 'check_out') => {
    if (!activeBusinessId) return;
    setAttendanceSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${encodeURIComponent(activeBusinessId)}/mobile`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );
      await parseApiJson(res);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت تردد');
    } finally {
      setAttendanceSaving(false);
    }
  };

  const todayFa = new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
  }).format(new Date());

  const renderContent = () => {
    if (!activeBusinessId) {
      return (
        <div className="p-8 text-center space-y-4 pt-20">
          <p className="text-sm font-bold text-gray-700">کسب‌وکار فعالی انتخاب نشده است.</p>
          <Link
            href="/businesses"
            className="inline-block px-6 py-3 bg-nexa-primary text-white rounded-2xl text-xs font-bold"
          >
            انتخاب کسب‌وکار
          </Link>
        </div>
      );
    }

    if (loading && !data) {
      return <p className="p-10 text-center text-sm text-gray-400">در حال بارگذاری…</p>;
    }

    if (!data) {
      return (
        <div className="p-8 text-center text-xs text-gray-500 pt-20">
          {error || 'داده‌ای در دسترس نیست.'}
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between px-6 pt-8">
              <div>
                <h1 className="text-xl font-black text-gray-900">
                  سلام، {data.user.displayName || 'کاربر'}
                </h1>
                <p className="text-xs text-gray-500 font-medium font-fa-num mt-0.5">
                  {activeBusinessName} · {todayFa}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadSummary()}
                className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-100 text-gray-500"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {error && (
              <div className="mx-6 p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {/* Attendance Card */}
            <div className="px-6">
              <div className="bg-nexa-primary p-5 rounded-[2rem] text-white space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] opacity-70 font-bold">تردد امروز</p>
                    <p className="text-sm font-black font-fa-num mt-0.5">
                      ورود: {data.todayAttendance?.checkIn || '—'} · خروج: {data.todayAttendance?.checkOut || '—'}
                    </p>
                  </div>
                  <Clock size={22} className="text-nexa-accent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={attendanceSaving}
                    onClick={() => void handleAttendance('check_in')}
                    className="py-2.5 rounded-xl bg-nexa-accent text-gray-900 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <LogIn size={14} />
                    ثبت ورود
                  </button>
                  <button
                    type="button"
                    disabled={attendanceSaving}
                    onClick={() => void handleAttendance('check_out')}
                    className="py-2.5 rounded-xl bg-white/15 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <LogOut size={14} />
                    ثبت خروج
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-6 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <ClipboardList size={18} className="text-blue-600 mb-2" />
                <p className="text-[10px] text-gray-400 font-bold">وظایف فعال</p>
                <p className="text-lg font-black text-gray-900 font-fa-num">{data.stats.tasksCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <ShoppingBag size={18} className="text-emerald-600 mb-2" />
                <p className="text-[10px] text-gray-400 font-bold">سفارشات</p>
                <p className="text-lg font-black text-gray-900 font-fa-num">{data.stats.ordersCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <FileText size={18} className="text-amber-600 mb-2" />
                <p className="text-[10px] text-gray-400 font-bold">نامه‌های اداری</p>
                <p className="text-lg font-black text-gray-900 font-fa-num">{data.stats.lettersCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <MessageSquare size={18} className="text-purple-600 mb-2" />
                <p className="text-[10px] text-gray-400 font-bold">گفتگوها</p>
                <p className="text-lg font-black text-gray-900 font-fa-num">{data.stats.chatsCount}</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="px-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-sm text-gray-900">آخرین سفارشات</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-[10px] font-bold text-nexa-accent"
                >
                  مشاهده همه
                </button>
              </div>
              {data.orders.length === 0 ? (
                <p className="text-xs text-gray-400 bg-white p-4 rounded-2xl border border-gray-100 text-center">
                  سفارشی ثبت نشده است.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.orders.slice(0, 3).map((ord) => (
                    <div key={ord.id} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900">{ord.customer}</span>
                        <span className="text-[10px] font-bold text-gray-400">{ord.status}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${ord.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-black text-gray-900">وظایف و کارت‌ها</h1>
            {data.tasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">هیچ وظیفه‌ای ثبت نشده است.</p>
            ) : (
              data.tasks.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-sm font-bold text-gray-900">{t.title}</p>
                  <p className="text-[11px] text-gray-400 font-fa-num">
                    مسئول: {t.assignee || '—'} · سررسید: {t.dueDate || '—'}
                  </p>
                </div>
              ))
            )}
          </div>
        );

      case 'orders':
        return (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-black text-gray-900">سفارشات</h1>
            {data.orders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">هنوز سفارشی ثبت نشده است.</p>
            ) : (
              data.orders.map((ord) => (
                <div key={ord.id} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-black font-fa-num text-gray-400">{ord.orderNo}</span>
                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-md">{ord.status}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{ord.customer}</p>
                  <p className="text-[10px] text-gray-400 font-fa-num">{ord.date}</p>
                </div>
              ))
            )}
          </div>
        );

      case 'requests':
        return (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-black text-gray-900">درخواست‌های تدارکات</h1>
            {data.requests.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">درخواستی ثبت نشده است.</p>
            ) : (
              data.requests.map((r) => (
                <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.title}</p>
                    <p className="text-[10px] text-gray-400 font-fa-num mt-0.5">{r.date}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-nexa-accent/15 text-nexa-accent flex items-center justify-center">
                <UserCircle size={36} />
              </div>
              <h2 className="text-lg font-black text-gray-900">{data.user.displayName}</h2>
              <p className="text-xs text-gray-500">{data.user.role}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 size={13} />
                {activeBusinessName}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="block w-full text-center py-3.5 bg-nexa-primary text-white rounded-2xl text-xs font-black"
            >
              بازگشت به داشبورد دسکتاپ
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-4 shrink-0 z-50">
          {[
            { id: 'home', icon: LayoutDashboard, label: 'خانه' },
            { id: 'tasks', icon: ClipboardList, label: 'وظایف' },
            { id: 'orders', icon: ShoppingBag, label: 'سفارشات' },
            { id: 'requests', icon: FileText, label: 'درخواست‌ها' },
            { id: 'profile', icon: UserCircle, label: 'پروفایل' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as MobileTab)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`p-2 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-nexa-accent text-gray-900 shadow-lg shadow-nexa-accent/20'
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              >
                <tab.icon size={20} />
              </div>
              <span
                className={`text-[9px] font-bold ${
                  activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
