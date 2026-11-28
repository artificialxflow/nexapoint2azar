'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/src/context/BusinessContext';
import { useHrLiveData, type HrEmployeeRow } from '@/src/views/hr/useHrLiveData';
import HrAdminSidebar from '@/src/views/hr/HrAdminSidebar';
import HrOrgUnitsPanel from '@/src/views/hr/HrOrgUnitsPanel';
import HrPersonnelFilePanel from '@/src/views/hr/HrPersonnelFilePanel';
import HrRequestsPanel from '@/src/views/hr/HrRequestsPanel';
import HrTimePayrollPanel, {
  type HrAttendanceRow,
  type HrPayrollRow,
} from '@/src/views/hr/HrTimePayrollPanel';
import { parseApiJson } from '@/src/lib/http/parse-api-response';
import {
  UserCircle,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Search,
  X,
  GraduationCap,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type HrTrainingCourseRow = {
  id: string;
  title: string;
  instructor: string;
  category: string;
  durationHours: number;
  startDate: string;
  capacity: number;
  status: string;
  enrollments: { id: string; participantName: string; progressPercent: number }[];
};

const tabs = [
  { id: 'personnel', label: 'مدیریت پرسنل' },
  { id: 'org', label: 'چارت سازمانی' },
  { id: 'files', label: 'پرونده پرسنلی' },
  { id: 'requests', label: 'درخواست‌ها' },
  { id: 'performance', label: 'ساعت و حقوق' },
  { id: 'training', label: 'آموزش و رشد' },
];

const HR_TAB_IDS = new Set(tabs.map((t) => t.id));

const HR_STAFF_TAB_IDS = new Set(['files', 'requests', 'performance', 'training']);

export default function HR() {
  const { activeBusinessId, activeBusiness } = useBusiness();
  const canManage = activeBusiness?.role === 'owner' || activeBusiness?.role === 'admin';
  const liveData = useHrLiveData(activeBusinessId);
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('personnel');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionUserId, setSessionUserId] = useState<string | undefined>();
  const [sessionUserName, setSessionUserName] = useState('کاربر');

  const [attendanceLogs, setAttendanceLogs] = useState<HrAttendanceRow[]>([]);
  const [payrollSummaries, setPayrollSummaries] = useState<HrPayrollRow[]>([]);
  const [trainingCourses, setTrainingCourses] = useState<HrTrainingCourseRow[]>([]);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    instructor: '',
    category: 'عمومی',
    durationHours: '8',
    startDate: '',
  });
  const [opsError, setOpsError] = useState<string | null>(null);

  const visibleTabs = useMemo(
    () => (canManage ? tabs : tabs.filter((t) => HR_STAFF_TAB_IDS.has(t.id))),
    [canManage]
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && HR_TAB_IDS.has(tab)) {
      if (canManage || HR_STAFF_TAB_IDS.has(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab('files');
      }
    } else if (!canManage) {
      setActiveTab((prev) => (HR_STAFF_TAB_IDS.has(prev) ? prev : 'files'));
    }
  }, [searchParams, canManage]);

  const loadHrOperations = useCallback(async () => {
    if (!activeBusinessId) {
      setAttendanceLogs([]);
      setPayrollSummaries([]);
      setTrainingCourses([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/businesses/${encodeURIComponent(activeBusinessId)}/hr/operations`,
        { credentials: 'include', cache: 'no-store' }
      );
      const payload = await parseApiJson<{
        attendanceLogs: HrAttendanceRow[];
        payrollSummaries: HrPayrollRow[];
        trainingCourses: HrTrainingCourseRow[];
      }>(res);
      setAttendanceLogs(payload.attendanceLogs);
      setPayrollSummaries(payload.payrollSummaries);
      setTrainingCourses(payload.trainingCourses);
      setOpsError(null);
    } catch {
      setOpsError('خطا در دریافت داده‌های تردد و آموزش');
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadHrOperations();
  }, [loadHrOperations]);

  useEffect(() => {
    void fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (json: {
          data?: { user?: { id?: string; displayName?: string | null; mobilePhone?: string } };
        } | null) => {
          setSessionUserId(json?.data?.user?.id);
          const u = json?.data?.user;
          const label = u?.displayName?.trim() || u?.mobilePhone || 'کاربر';
          setSessionUserName(label);
        }
      )
      .catch(() => {
        setSessionUserId(undefined);
        setSessionUserName('کاربر');
      });
  }, []);

  const assignEmployeeUnit = useCallback(
    async (userId: string, unitId: string) => {
      if (!activeBusinessId) return;
      await fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/org-assignments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, unitId }),
      });
      void liveData.reload();
    },
    [activeBusinessId, liveData]
  );

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newCourse.title.trim()) return;
    try {
      const res = await fetch(
        `/api/businesses/${encodeURIComponent(activeBusinessId)}/hr/operations`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'course',
            title: newCourse.title.trim(),
            instructor: newCourse.instructor.trim(),
            category: newCourse.category.trim() || 'عمومی',
            durationHours: Math.max(0, Number(newCourse.durationHours) || 0),
            startDate: newCourse.startDate.trim(),
          }),
        }
      );
      await parseApiJson(res);
      setIsCourseModalOpen(false);
      setNewCourse({ title: '', instructor: '', category: 'عمومی', durationHours: '8', startDate: '' });
      await loadHrOperations();
    } catch (err) {
      setOpsError(err instanceof Error ? err.message : 'خطا در ثبت دوره آموزشی');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!activeBusinessId) return;
    await fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/hr/operations`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'course', id }),
    });
    await loadHrOperations();
  };

  const displayEmployees = liveData.live ? liveData.employees : [];
  const hrDataPending = Boolean(activeBusinessId) && liveData.loading && !liveData.live;
  const personnelFileEmployees = useMemo(() => {
    if (canManage) return displayEmployees;
    if (!sessionUserId) return displayEmployees;
    return displayEmployees.filter((e) => {
      const row = e as HrEmployeeRow;
      return row.id === sessionUserId || row.managerId === sessionUserId;
    });
  }, [canManage, displayEmployees, sessionUserId]);
  const displayRequests = liveData.live ? liveData.requests : [];

  const filteredEmployees = displayEmployees.filter(
    (emp) =>
      emp.name.includes(searchQuery) ||
      emp.role.includes(searchQuery) ||
      emp.department.includes(searchQuery)
  );

  const payrollBarSummary = useMemo(() => {
    const byPeriod = new Map<string, number>();
    for (const p of payrollSummaries) {
      byPeriod.set(p.periodLabel, (byPeriod.get(p.periodLabel) ?? 0) + p.netPay);
    }
    const entries = [...byPeriod.entries()].slice(0, 7).reverse();
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([label, value]) => ({
      label,
      value,
      heightPercent: Math.max(12, Math.round((value / max) * 100)),
    }));
  }, [payrollSummaries]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personnel':
        return (
          <motion.div
            key="personnel"
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
                  placeholder="جستجو در نام، نقش یا واحد..."
                  className="w-full bg-white border border-nexa-border rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                  {displayEmployees.filter((e) => e.status === 'حاضر').length} نفر حاضر
                </span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                  {displayEmployees.filter((e) => e.status === 'مرخصی').length} نفر مرخصی
                </span>
              </div>
            </div>
            <div className="divide-y divide-nexa-border">
              {hrDataPending && (
                <div className="p-6 space-y-4" data-testid="hr-personnel-skeleton">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-2xl bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-2 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!hrDataPending && filteredEmployees.length === 0 && (
                <p className="p-8 text-sm text-center text-gray-500">
                  {searchQuery.trim()
                    ? 'نتیجه‌ای برای جستجو یافت نشد.'
                    : activeBusinessId
                      ? liveData.loadError
                        ? 'پرسنل بارگذاری نشد — صفحه را تازه کنید.'
                        : 'پرسنلی در فهرست تیم این کسب‌وکار ثبت نشده است.'
                      : 'کسب‌وکار را انتخاب کنید تا پرسنل نمایش داده شود.'}
                </p>
              )}
              {!hrDataPending &&
                filteredEmployees.map((emp) => (
                  <div key={emp.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-nexa-accent/10 group-hover:text-nexa-accent transition-colors">
                        <UserCircle size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{emp.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500">{emp.role}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="text-[10px] text-gray-400">{emp.department}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="hidden md:block text-center">
                        <p className="text-[10px] text-gray-400 mb-1">تاریخ ورود</p>
                        <p className="text-xs font-bold text-gray-700 font-fa-num">{emp.joinDate}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-1">عملکرد</p>
                        <p className="text-xs font-black text-emerald-600 font-fa-num">
                          {emp.performance > 0 ? `${emp.performance}٪` : '—'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-1">وضعیت</p>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            emp.status === 'حاضر' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('files')}
                        className="p-2 text-gray-400 hover:text-nexa-accent transition-colors"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        );
      case 'org':
        return (
          <motion.div key="org" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <HrOrgUnitsPanel
              businessId={activeBusinessId}
              canManage={canManage}
              employees={displayEmployees.map((e) => ({ id: e.id, name: e.name }))}
              teamMembers={liveData.live ? liveData.teamMembers : []}
              onAssignUnit={liveData.live ? assignEmployeeUnit : undefined}
            />
          </motion.div>
        );
      case 'requests':
        return (
          <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <HrRequestsPanel
              businessId={activeBusinessId}
              requests={liveData.live ? liveData.requests : displayRequests}
              currentUserId={sessionUserId}
              currentUserName={sessionUserName}
              live={liveData.live}
              onReload={() => void liveData.reload()}
            />
          </motion.div>
        );
      case 'training':
        return (
          <motion.div
            key="training"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">دوره‌های آموزشی سازمان</h3>
              <button
                type="button"
                disabled={!activeBusinessId}
                onClick={() => setIsCourseModalOpen(true)}
                className="nexa-btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={15} />
                دوره جدید
              </button>
            </div>
            {trainingCourses.length === 0 ? (
              <div className="nexa-card p-10 text-center text-sm text-gray-400">
                هنوز دوره آموزشی برای این کسب‌وکار ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trainingCourses.map((course) => {
                  const avgProgress =
                    course.enrollments.length > 0
                      ? Math.round(
                          course.enrollments.reduce((s, e) => s + e.progressPercent, 0) /
                            course.enrollments.length
                        )
                      : 0;
                  return (
                    <div key={course.id} className="nexa-card p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                          <GraduationCap size={20} />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCourse(course.id)}
                          className="text-gray-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 mb-1">{course.title}</h4>
                      <p className="text-[10px] text-gray-500 mb-4">
                        مدرس: {course.instructor || '—'} · مدت: {course.durationHours} ساعت ·{' '}
                        {course.enrollments.length} شرکت‌کننده
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-400">میانگین پیشرفت</span>
                          <span className="text-nexa-accent font-fa-num">{avgProgress}٪</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-nexa-accent" style={{ width: `${avgProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      case 'performance':
        return (
          <motion.div key="performance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <HrTimePayrollPanel
              businessId={activeBusinessId}
              employeeCount={displayEmployees.length}
              attendanceLogs={attendanceLogs}
              payrollSummaries={payrollSummaries}
              onReload={loadHrOperations}
            />
          </motion.div>
        );
      case 'files':
        return (
          <motion.div key="files" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <HrPersonnelFilePanel
              businessId={activeBusinessId}
              employees={personnelFileEmployees.map((e) => ({ id: e.id, name: e.name }))}
              currentUserId={sessionUserId}
              canManage={canManage || personnelFileEmployees.length > 1}
            />
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
          <h1 className="text-3xl font-black text-gray-900">منابع انسانی (HR)</h1>
          <p className="text-gray-500 mt-1">مدیریت پرسنل، حضور و غیاب، حقوق و آموزش</p>
        </div>
      </div>

      <div className="nexa-card p-4 border border-indigo-100 bg-indigo-50/60 text-sm text-gray-800">
        <p className="font-bold text-indigo-900">درخواست‌های رسمی HR (وام، مرخصی، …)</p>
        <p className="text-xs text-gray-600 mt-1">
          ثبت و پیگیری در تب «درخواست‌ها» همین صفحه است. صندوق اداری عمومی در{' '}
          <Link href="/dashboard/work-requests" className="text-nexa-accent font-bold hover:underline">
            صندوق درخواست اداری
          </Link>{' '}
          باز می‌شود.
        </p>
      </div>

      {!activeBusinessId && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          کسب‌وکار فعال انتخاب نشده است.
        </p>
      )}
      {(liveData.loadError || opsError) && (
        <p className="text-xs text-red-700 bg-red-50 rounded-xl px-4 py-2">
          {liveData.loadError || opsError}
        </p>
      )}

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
            }}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
        </div>

        <div className="space-y-6">
          {activeBusinessId && (
            <HrAdminSidebar
              businessId={activeBusinessId}
              canManage={canManage}
              rules={liveData.rules}
              employees={liveData.employees}
              teamMembers={liveData.teamMembers}
              onReload={() => void liveData.reload()}
            />
          )}

          <div className="nexa-card p-6">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-nexa-accent" />
              آخرین ترددهای ثبت‌شده
            </h4>
            <div className="space-y-3">
              {attendanceLogs.length === 0 ? (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  هنوز ترددی در این کسب‌وکار ثبت نشده است.
                </p>
              ) : (
                attendanceLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-bold">{log.employeeName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-fa-num text-gray-400">{log.checkIn || log.workDate}</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('performance')}
              className="w-full mt-5 py-2.5 border border-nexa-border rounded-xl text-[10px] font-black text-gray-500 hover:bg-gray-50 transition-colors"
            >
              مدیریت کامل تردد و حقوق
            </button>
          </div>

          <div className="nexa-card p-6">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-nexa-accent" />
              جمع پرداختی دوره‌های حقوق
            </h4>
            {payrollBarSummary.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-8">
                پس از ثبت فیش حقوقی، نمودار دوره‌ها نمایش داده می‌شود.
              </p>
            ) : (
              <div className="h-32 flex items-end gap-2 px-2">
                {payrollBarSummary.map((bar) => (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full bg-nexa-accent rounded-t-md"
                      style={{ height: `${bar.heightPercent}%` }}
                      title={`${bar.label}: ${bar.value.toLocaleString('fa-IR')}`}
                    />
                    <span className="text-[9px] text-gray-400 font-fa-num truncate max-w-full">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Course Modal */}
      <AnimatePresence>
        {isCourseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCourseModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">افزودن دوره آموزشی</h3>
                <button type="button" onClick={() => setIsCourseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={(e) => void handleCreateCourse(e)} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">عنوان دوره</label>
                  <input
                    required
                    type="text"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">مدرس</label>
                    <input
                      type="text"
                      value={newCourse.instructor}
                      onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">مدت (ساعت)</label>
                    <input
                      type="number"
                      min={0}
                      value={newCourse.durationHours}
                      onChange={(e) => setNewCourse({ ...newCourse, durationHours: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" className="flex-1 nexa-btn-primary py-3">
                    ثبت دوره
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCourseModalOpen(false)}
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
