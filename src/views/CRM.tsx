'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import {
  createCrmLeadApi,
  createCrmOpportunityApi,
  createCrmVisitApi,
  deleteCrmClubMemberApi,
  deleteCrmLeadApi,
  deleteCrmVisitApi,
  fetchCrmClubMembers,
  fetchCrmLeads,
  fetchCrmPipelineBoard,
  fetchCrmStats,
  fetchCrmVisits,
  updateCrmLeadApi,
  updateCrmVisitApi,
} from '@/src/lib/erp/crm-client';
import CrmKanbanBoard from '@/src/components/crm/CrmKanbanBoard';
import CrmLeadCreateModal from '@/src/components/crm/CrmLeadCreateModal';
import CrmVisitEditorModal from '@/src/components/crm/CrmVisitEditorModal';
import {
  filterCrmLeads,
  formatVisitDate,
  LEAD_STATUS_OPTIONS,
} from '@/src/lib/erp/crm-ui';
import { normalizePhone } from '@/src/lib/pricing';
import CrmLeadEditorModal from '@/src/components/crm/CrmLeadEditorModal';
import { CrmRequiredLabel } from '@/src/components/crm/CrmRequiredLabel';
import type { CrmClubMember, CrmLead, CrmVisit } from '@/src/types/crm';
import {
  UserPlus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Star,
  Calendar,
  ChevronLeft,
  Users,
  PieChart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mockClubMembers: CrmClubMember[] = [
  {
    id: '1',
    name: 'سارا احمدی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    level: 'برلیان',
    score: 950,
    lastVisit: '۲ روز پیش',
    status: 'فعال',
    source: 'اینستاگرام',
  },
  {
    id: '2',
    name: 'محمد رضایی',
    phone: '۰۹۱۸۷۶۵۴۳۲۱',
    level: 'گلد',
    score: 720,
    lastVisit: '۱ هفته پیش',
    status: 'در انتظار',
    source: 'سایت',
  },
  {
    id: '3',
    name: 'نیلوفر کریمی',
    phone: '۰۹۳۵۱۱۱۴۴۵۵',
    level: 'سیلور',
    score: 450,
    lastVisit: '۳ هفته پیش',
    status: 'غیرفعال',
    source: 'معرفی',
  },
  {
    id: '4',
    name: 'علی حسینی',
    phone: '۰۹۱۲۹۹۹۸۸۷۷',
    level: 'برلیان',
    score: 880,
    lastVisit: 'امروز',
    status: 'فعال',
    source: 'تبلیغات محیطی',
  },
];

const mockLeads: CrmLead[] = [
  {
    id: 'L1',
    name: 'رضا مرادی',
    source: 'اینستاگرام',
    interest: 'مبلمان ال',
    registeredDate: '۱۴۰۴/۱۱/۳۰',
    status: 'جدید',
  },
  {
    id: 'L2',
    name: 'مریم سعیدی',
    source: 'سایت',
    interest: 'سرویس خواب',
    registeredDate: '۱۴۰۴/۱۱/۲۹',
    status: 'در حال پیگیری',
  },
  {
    id: 'L3',
    name: 'حسین نوری',
    source: 'معرفی',
    interest: 'نهارخوری',
    registeredDate: '۱۴۰۴/۱۱/۲۸',
    status: 'تماس ناموفق',
  },
];

const mockVisits: CrmVisit[] = [
  {
    id: 'V1',
    customerName: 'خانم علوی',
    phone: '09121234567',
    source: 'اینستاگرام',
    companions: 1,
    withDesigner: true,
    gender: 'female',
    buyProbability: 70,
    visitedAt: new Date().toISOString(),
    result: 'مثبت',
    designerName: 'مهندس سمیعی',
    durationMinutes: 45,
  },
  {
    id: 'V2',
    customerName: 'آقای تهرانی',
    phone: '09129876543',
    source: 'سایت',
    companions: 0,
    withDesigner: false,
    gender: 'male',
    buyProbability: 40,
    visitedAt: new Date().toISOString(),
    result: 'خنثی',
    designerName: '',
    durationMinutes: 20,
  },
];

const tabs = [
  { id: 'leads', label: 'سرنخ‌ها', icon: Users },
  { id: 'visits', label: 'بازدید مشتری (CRM)', icon: Calendar },
  { id: 'opportunities', label: 'فرصت‌ها (کانبان)', icon: Filter },
  { id: 'club', label: 'باشگاه مشتریان', icon: Star },
  { id: 'reports', label: 'گزارشات CRM', icon: PieChart },
];

export default function CRM() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId;
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [clubMembers, setClubMembers] = useState<CrmClubMember[]>([]);
  const [visitName, setVisitName] = useState('');
  const [visitPhone, setVisitPhone] = useState('');
  const [visitSource, setVisitSource] = useState('اینستاگرام');
  const [visitCompanions, setVisitCompanions] = useState(0);
  const [visitWithDesigner, setVisitWithDesigner] = useState('no');
  const [visitGender, setVisitGender] = useState<'female' | 'male'>('female');
  const [visitProbability, setVisitProbability] = useState(60);
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitNotice, setVisitNotice] = useState<string | null>(null);
  const [visitSuccess, setVisitSuccess] = useState<string | null>(null);
  const [visitVisitedAt, setVisitVisitedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [visits, setVisits] = useState<CrmVisit[]>([]);
  const [crmLoading, setCrmLoading] = useState(true);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [showLeadFilters, setShowLeadFilters] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [leadEditorSaving, setLeadEditorSaving] = useState(false);
  const [crmNotice, setCrmNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showLeadCreate, setShowLeadCreate] = useState(false);
  const [leadCreateSaving, setLeadCreateSaving] = useState(false);
  const [editingVisit, setEditingVisit] = useState<CrmVisit | null>(null);
  const [visitEditorSaving, setVisitEditorSaving] = useState(false);
  const [quickVisitInput, setQuickVisitInput] = useState('');
  const [quickVisitSaving, setQuickVisitSaving] = useState(false);
  const [crmStats, setCrmStats] = useState({
    leadCount: 0,
    visitCount: 0,
    opportunityCount: 0,
    convertedLeads: 0,
    clubMemberCount: 0,
    personCount: 0,
    visitConversionRate: 0,
  });

  const filteredLeads = useMemo(
    () => filterCrmLeads(leads, leadSearch, leadStatusFilter),
    [leads, leadSearch, leadStatusFilter]
  );

  const refreshLeads = useCallback(async () => {
    if (FRONTEND_ONLY || !activeBusinessId) {
      setLeads(mockLeads);
      return;
    }
    const rows = await fetchCrmLeads(activeBusinessId);
    setLeads(rows);
  }, [activeBusinessId]);

  const refreshVisits = useCallback(async () => {
    if (FRONTEND_ONLY || !activeBusinessId) {
      setVisits(mockVisits);
      return;
    }
    const rows = await fetchCrmVisits(activeBusinessId);
    setVisits(rows);
  }, [activeBusinessId]);

  useEffect(() => {
    if (FRONTEND_ONLY || !activeBusinessId) {
      setLeads(mockLeads);
      setClubMembers(mockClubMembers);
      setVisits(mockVisits);
      setCrmLoading(false);
      return;
    }
    setCrmLoading(true);
    void (async () => {
      try {
        const [leadRows, clubRows, visitRows] = await Promise.all([
          fetchCrmLeads(activeBusinessId),
          fetchCrmClubMembers(activeBusinessId),
          fetchCrmVisits(activeBusinessId),
        ]);
        setLeads(leadRows);
        setClubMembers(clubRows);
        setVisits(visitRows);
      } catch {
        setLeads([]);
        setClubMembers([]);
        setVisits([]);
      } finally {
        setCrmLoading(false);
      }
    })();
  }, [activeBusinessId]);

  useEffect(() => {
    if (FRONTEND_ONLY || !activeBusinessId) return;
    void fetchCrmStats(activeBusinessId)
      .then(setCrmStats)
      .catch(() => undefined);
  }, [activeBusinessId, leads.length, visits.length, activeTab]);

  const resetVisitForm = useCallback(() => {
    setVisitName('');
    setVisitPhone('');
    setVisitSource('اینستاگرام');
    setVisitCompanions(0);
    setVisitWithDesigner('no');
    setVisitGender('female');
    setVisitProbability(60);
    setVisitVisitedAt(new Date().toISOString().slice(0, 16));
    setVisitNotice(null);
    setVisitSuccess(null);
  }, []);

  const submitVisit = useCallback(async () => {
    const name = visitName.trim();
    const phoneRaw = visitPhone.trim();
    if (!name) {
      setVisitNotice('نام مشتری الزامی است.');
      return;
    }
    if (!phoneRaw) {
      setVisitNotice('شماره تماس الزامی است.');
      return;
    }
    const phoneNorm = normalizePhone(phoneRaw);
    if (phoneNorm.length < 10) {
      setVisitNotice('شماره تماس معتبر وارد کنید (حداقل ۱۰ رقم).');
      return;
    }
    if (!visitSource.trim()) {
      setVisitNotice('منبع آشنایی الزامی است.');
      return;
    }
    const visitedAtIso = visitVisitedAt ? new Date(visitVisitedAt).toISOString() : new Date().toISOString();
    const payload = {
      customerName: name,
      phone: phoneNorm,
      source: visitSource,
      companions: visitCompanions,
      withDesigner: visitWithDesigner === 'yes',
      gender: visitGender,
      buyProbability: visitProbability,
      visitedAt: visitedAtIso,
      result: visitProbability >= 60 ? 'مثبت' : 'خنثی',
      designerName: visitWithDesigner === 'yes' ? 'دیزاینر همراه' : '',
      durationMinutes: 30,
    };
    setVisitSaving(true);
    setVisitNotice(null);
    setVisitSuccess(null);
    try {
      if (FRONTEND_ONLY || !activeBusinessId) {
        setVisits((prev) => [{ id: `local-v-${Date.now()}`, ...payload }, ...prev]);
        setShowVisitForm(false);
        resetVisitForm();
        setVisitSuccess('بازدید ثبت شد.');
        setActiveTab('visits');
        return;
      }
      const created = await createCrmVisitApi(activeBusinessId, payload);
      setVisits((prev) => [created, ...prev]);
      setShowVisitForm(false);
      resetVisitForm();
      setVisitSuccess('بازدید با موفقیت در سرور ثبت شد.');
      setActiveTab('visits');
    } catch {
      setVisitNotice('ثبت بازدید در سرور ناموفق بود.');
    } finally {
      setVisitSaving(false);
    }
  }, [
    activeBusinessId,
    resetVisitForm,
    visitCompanions,
    visitGender,
    visitName,
    visitPhone,
    visitProbability,
    visitSource,
    visitVisitedAt,
    visitWithDesigner,
  ]);

  const saveLeadEdit = useCallback(
    async (patch: Omit<CrmLead, 'id'>) => {
      if (!editingLead) return;
      setLeadEditorSaving(true);
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? { ...l, ...patch } : l)));
        } else {
          const updated = await updateCrmLeadApi(activeBusinessId, editingLead.id, patch);
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        }
        setEditingLead(null);
        setCrmNotice({ type: 'ok', text: 'سرنخ به‌روزرسانی شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'ذخیره سرنخ ناموفق بود.' });
      } finally {
        setLeadEditorSaving(false);
      }
    },
    [activeBusinessId, editingLead]
  );

  const deleteLead = useCallback(
    async (lead: CrmLead) => {
      if (!window.confirm(`سرنخ «${lead.name}» حذف شود؟`)) return;
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        } else {
          await deleteCrmLeadApi(activeBusinessId, lead.id);
          setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        }
        setCrmNotice({ type: 'ok', text: 'سرنخ حذف شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'حذف سرنخ ناموفق بود.' });
      }
    },
    [activeBusinessId]
  );

  const convertLeadToOpportunity = useCallback(
    async (lead: CrmLead) => {
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setLeads((prev) =>
            prev.map((l) => (l.id === lead.id ? { ...l, status: 'تبدیل‌شده' } : l))
          );
          setCrmNotice({ type: 'ok', text: 'سرنخ به فرصت (محلی) تبدیل شد.' });
          return;
        }
        const board = await fetchCrmPipelineBoard(activeBusinessId);
        const stageId = board.stages[0]?.id;
        if (!stageId) {
          setCrmNotice({ type: 'err', text: 'مرحله کانبان موجود نیست.' });
          return;
        }
        await createCrmOpportunityApi(activeBusinessId, {
          stageId,
          title: lead.name,
          leadId: lead.id,
          expectedClose: lead.registeredDate,
          sortOrder: board.opportunities.filter((o) => o.stageId === stageId).length,
        });
        const updated = await updateCrmLeadApi(activeBusinessId, lead.id, { status: 'تبدیل‌شده' });
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        setCrmNotice({ type: 'ok', text: 'فرصت در کانبان ایجاد و سرنخ تبدیل‌شده شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'تبدیل به فرصت ناموفق بود.' });
      }
    },
    [activeBusinessId]
  );

  const createLead = useCallback(
    async (payload: Omit<CrmLead, 'id'>) => {
      setLeadCreateSaving(true);
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setLeads((prev) => [{ id: `local-${Date.now()}`, ...payload }, ...prev]);
        } else {
          const created = await createCrmLeadApi(activeBusinessId, payload);
          setLeads((prev) => [created, ...prev]);
        }
        setShowLeadCreate(false);
        setCrmNotice({ type: 'ok', text: 'سرنخ ثبت شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'ثبت سرنخ ناموفق بود.' });
      } finally {
        setLeadCreateSaving(false);
      }
    },
    [activeBusinessId]
  );

  const saveVisitEdit = useCallback(
    async (patch: Omit<CrmVisit, 'id'>) => {
      if (!editingVisit) return;
      setVisitEditorSaving(true);
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setVisits((prev) =>
            prev.map((v) => (v.id === editingVisit.id ? { ...editingVisit, ...patch } : v))
          );
        } else {
          const updated = await updateCrmVisitApi(activeBusinessId, editingVisit.id, patch);
          setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        }
        setEditingVisit(null);
        setCrmNotice({ type: 'ok', text: 'بازدید به‌روزرسانی شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'ویرایش بازدید ناموفق بود.' });
      } finally {
        setVisitEditorSaving(false);
      }
    },
    [activeBusinessId, editingVisit]
  );

  const submitQuickVisit = useCallback(async () => {
    const raw = quickVisitInput.trim();
    if (!raw) return;
    setQuickVisitSaving(true);
    const phoneNorm = normalizePhone(raw);
    const isPhone = phoneNorm.length >= 10;
    const payload = {
      customerName: isPhone ? 'مراجع' : raw,
      phone: isPhone ? phoneNorm : '09000000000',
      source: 'ثبت آنی',
      companions: 0,
      withDesigner: false,
      gender: 'female' as const,
      buyProbability: 50,
      visitedAt: new Date().toISOString(),
      result: 'خنثی',
      designerName: '',
      durationMinutes: 15,
    };
    try {
      if (FRONTEND_ONLY || !activeBusinessId) {
        setVisits((prev) => [{ id: `local-q-${Date.now()}`, ...payload }, ...prev]);
      } else {
        const created = await createCrmVisitApi(activeBusinessId, payload);
        setVisits((prev) => [created, ...prev]);
      }
      setQuickVisitInput('');
      setCrmNotice({ type: 'ok', text: 'بازدید سریع ثبت شد.' });
    } catch {
      setCrmNotice({ type: 'err', text: 'ثبت آنی ناموفق بود.' });
    } finally {
      setQuickVisitSaving(false);
    }
  }, [activeBusinessId, quickVisitInput]);

  const deleteClubMember = useCallback(
    async (member: CrmClubMember) => {
      if (!window.confirm(`عضو «${member.name}» حذف شود؟`)) return;
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setClubMembers((prev) => prev.filter((m) => m.id !== member.id));
        } else {
          await deleteCrmClubMemberApi(activeBusinessId, member.id);
          setClubMembers((prev) => prev.filter((m) => m.id !== member.id));
        }
        setCrmNotice({ type: 'ok', text: 'عضو حذف شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'حذف عضو ناموفق بود.' });
      }
    },
    [activeBusinessId]
  );

  const deleteVisit = useCallback(
    async (visit: CrmVisit) => {
      if (!window.confirm(`بازدید «${visit.customerName}» حذف شود؟`)) return;
      try {
        if (FRONTEND_ONLY || !activeBusinessId) {
          setVisits((prev) => prev.filter((v) => v.id !== visit.id));
        } else {
          await deleteCrmVisitApi(activeBusinessId, visit.id);
          setVisits((prev) => prev.filter((v) => v.id !== visit.id));
        }
        setCrmNotice({ type: 'ok', text: 'بازدید حذف شد.' });
      } catch {
        setCrmNotice({ type: 'err', text: 'حذف بازدید ناموفق بود.' });
      }
    },
    [activeBusinessId]
  );

  const todayVisitStats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const today = visits.filter((v) => {
      const t = new Date(v.visitedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const positive = today.filter((v) => v.result === 'مثبت').length;
    const durations = today.map((v) => v.durationMinutes).filter((m) => m > 0);
    const avg =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
    return { count: today.length, positive, avg };
  }, [visits]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'leads':
        return (
          <motion.div 
            key="leads"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="nexa-card overflow-hidden">
              <div className="p-4 border-b border-nexa-border flex flex-col gap-3 bg-gray-50/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900">لیست سرنخ‌های ورودی (Leads)</h3>
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={() => setShowLeadCreate(true)}
                      className="nexa-btn-primary text-xs px-3 py-2"
                    >
                      سرنخ جدید
                    </button>
                    <button
                      type="button"
                      aria-label="نمایش فیلتر وضعیت"
                      aria-expanded={showLeadFilters}
                      onClick={() => setShowLeadFilters((v) => !v)}
                      className="p-2 text-gray-500 hover:bg-white rounded-lg border border-transparent hover:border-nexa-border transition-all"
                    >
                      <Filter size={18} />
                    </button>
                  </div>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="search"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="جستجو نام، منبع، علاقمندی…"
                    className="w-full bg-white rounded-xl py-2 pr-9 pl-3 text-xs border border-nexa-border"
                    aria-label="جستجو در سرنخ‌ها"
                  />
                </div>
                {showLeadFilters && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-gray-500">وضعیت:</span>
                    <select
                      value={leadStatusFilter}
                      onChange={(e) => setLeadStatusFilter(e.target.value)}
                      className="text-xs bg-white border border-nexa-border rounded-lg px-2 py-1"
                      aria-label="فیلتر وضعیت سرنخ"
                    >
                      <option value="all">همه</option>
                      {LEAD_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 border-b border-nexa-border">
                      <th className="px-6 py-4">نام سرنخ</th>
                      <th className="px-6 py-4">منبع ورودی</th>
                      <th className="px-6 py-4">علاقمندی</th>
                      <th className="px-6 py-4">تاریخ ثبت</th>
                      <th className="px-6 py-4">وضعیت</th>
                      <th className="px-6 py-4">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border">
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-400">
                          سرنخی با این فیلتر پیدا نشد.
                        </td>
                      </tr>
                    )}
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{lead.name}</td>
                        <td className="px-6 py-4 text-gray-500">{lead.source}</td>
                        <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{lead.interest}</td>
                        <td className="px-6 py-4 font-fa-num text-gray-400">{lead.registeredDate}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            lead.status === 'جدید' ? 'bg-blue-50 text-blue-600' :
                            lead.status === 'در حال پیگیری' ? 'bg-amber-50 text-amber-600' :
                            lead.status === 'تبدیل‌شده' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2 justify-end items-center">
                            <button
                              type="button"
                              onClick={() => void convertLeadToOpportunity(lead)}
                              className="text-nexa-accent font-bold text-xs hover:underline"
                            >
                              تبدیل به فرصت
                            </button>
                            <button
                              type="button"
                              aria-label={`ویرایش ${lead.name}`}
                              onClick={() => setEditingLead(lead)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`حذف ${lead.name}`}
                              onClick={() => void deleteLead(lead)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        );

      case 'visits':
        return (
          <motion.div 
            key="visits"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <a
              href="/dashboard/tasks?tab=reports&section=visits"
              className="text-xs font-bold text-nexa-accent hover:underline inline-block"
            >
              ثبت و مدیریت بازدید در میز کار ←
            </a>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="nexa-card p-6 border-nexa-accent/20 bg-nexa-accent/5">
                <h4 className="text-sm font-bold text-gray-900 mb-4">آمار بازدیدهای امروز</h4>
                <div className="flex items-center justify-around py-4">
                  <div className="text-center">
                    <p className="text-2xl font-black text-nexa-accent font-fa-num">{todayVisitStats.count}</p>
                    <p className="text-[10px] text-gray-500">کل بازدیدها</p>
                  </div>
                  <div className="w-[1px] h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-600 font-fa-num">{todayVisitStats.positive}</p>
                    <p className="text-[10px] text-gray-500">نتیجه مثبت</p>
                  </div>
                  <div className="w-[1px] h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-blue-600 font-fa-num">{todayVisitStats.avg}</p>
                    <p className="text-[10px] text-gray-500">میانگین زمان (دقیقه)</p>
                  </div>
                </div>
              </div>
              <div className="nexa-card p-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4">ثبت سریع بازدید</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={quickVisitInput}
                    onChange={(e) => setQuickVisitInput(e.target.value)}
                    placeholder="نام مشتری یا شماره تماس..."
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 text-sm"
                  />
                  <button
                    type="button"
                    disabled={quickVisitSaving}
                    onClick={() => void submitQuickVisit()}
                    className="nexa-btn-primary py-2 px-6 text-xs disabled:opacity-60"
                  >
                    {quickVisitSaving ? '…' : 'ثبت آنی'}
                  </button>
                </div>
              </div>
            </div>

            <div className="nexa-card overflow-hidden">
              <div className="p-4 border-b border-nexa-border font-bold text-xs text-gray-500">گزارش بازدیدهای اخیر</div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 border-b border-nexa-border">
                      <th className="px-6 py-4">مشتری</th>
                      <th className="px-6 py-4">دیزاینر همراه</th>
                      <th className="px-6 py-4">مدت زمان</th>
                      <th className="px-6 py-4">تاریخ و ساعت</th>
                      <th className="px-6 py-4">نتیجه اولیه</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border">
                    {visits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{visit.customerName}</td>
                        <td className="px-6 py-4 text-gray-500">{visit.designerName || '—'}</td>
                        <td className="px-6 py-4 text-gray-500 font-fa-num">{visit.durationMinutes} دقیقه</td>
                        <td className="px-6 py-4 font-fa-num text-gray-400">{formatVisitDate(visit.visitedAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            visit.result === 'مثبت' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {visit.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              aria-label={`ویرایش بازدید ${visit.customerName}`}
                              onClick={() => setEditingVisit(visit)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={`حذف بازدید ${visit.customerName}`}
                              onClick={() => void deleteVisit(visit)}
                              className="p-2 hover:bg-rose-50 rounded-lg text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        );

      case 'opportunities':
        return (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CrmKanbanBoard
              businessId={activeBusinessId}
              onNotice={(text, ok) => setCrmNotice({ type: ok ? 'ok' : 'err', text })}
            />
          </motion.div>
        );

      case 'club':
        return (
          <motion.div 
            key="club"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="nexa-card p-8 bg-gradient-to-br from-nexa-primary to-gray-800 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-12">
                      <div>
                        <h3 className="text-2xl font-black">NEXA CLUB</h3>
                        <p className="text-white/40 text-xs mt-1">برنامه وفاداری مشتریان هوشمند</p>
                      </div>
                      <div className="px-4 py-2 bg-nexa-accent text-white rounded-xl text-xs font-black">سطح برلیان</div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">مجموع امتیازات</p>
                        <p className="text-4xl font-black font-fa-num">۱۲,۴۵۰</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-white/40 mb-1">کد عضویت</p>
                        <p className="text-sm font-bold font-fa-num tracking-widest">NX-8842-99</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-nexa-accent/10 rounded-full blur-3xl"></div>
                </div>

                <div className="nexa-card overflow-hidden">
                  <div className="p-6 border-b border-nexa-border font-bold text-sm">مشتریان برتر (Top Tier)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="text-xs font-bold text-gray-400 border-b border-nexa-border">
                          <th className="px-6 py-4">مشتری</th>
                          <th className="px-6 py-4">امتیاز</th>
                          <th className="px-6 py-4">تعداد خرید</th>
                          <th className="px-6 py-4">آخرین پاداش</th>
                          <th className="px-6 py-4">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nexa-border">
                        {clubMembers.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold">{c.name}</td>
                            <td className="px-6 py-4 font-fa-num text-nexa-accent font-bold">{c.score}</td>
                            <td className="px-6 py-4 font-fa-num text-gray-500">{c.level}</td>
                            <td className="px-6 py-4 text-xs text-emerald-600">{c.status}</td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                aria-label={`حذف ${c.name}`}
                                onClick={() => void deleteClubMember(c)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="nexa-card p-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-6">جوایز قابل فعال‌سازی</h4>
                  <div className="space-y-4">
                    {[
                      { title: 'ارسال رایگان سراسری', points: 500, icon: '🚚' },
                      { title: 'کارت هدیه ۵ میلیونی', points: 2500, icon: '🎁' },
                      { title: 'مشاوره دیزاین رایگان', points: 1200, icon: '📐' },
                    ].map((reward, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-nexa-accent/20 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{reward.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{reward.title}</p>
                            <p className="text-[10px] text-gray-500 font-fa-num">{reward.points} امتیاز</p>
                          </div>
                        </div>
                        <ChevronLeft size={16} className="text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'reports':
        return (
          <motion.div 
            key="reports"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: 'تعداد سرنخ',
                  value: String(crmStats.leadCount),
                  trend: `${crmStats.convertedLeads} تبدیل‌شده`,
                  color: 'text-emerald-600',
                },
                {
                  label: 'بازدید ثبت‌شده',
                  value: String(crmStats.visitCount),
                  trend: 'از DB',
                  color: 'text-blue-600',
                },
                {
                  label: 'فرصت‌های باز',
                  value: String(crmStats.opportunityCount),
                  trend: 'کانبان',
                  color: 'text-amber-600',
                },
                {
                  label: 'نرخ تبدیل سرنخ',
                  value:
                    crmStats.leadCount > 0
                      ? `${Math.round((crmStats.convertedLeads / crmStats.leadCount) * 100)}٪`
                      : '—',
                  trend: 'زنده',
                  color: 'text-purple-600',
                },
              ].map((stat, idx) => (
                <div key={idx} className="nexa-card p-6">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-2xl font-black text-gray-900 font-fa-num">{stat.value}</p>
                    <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="nexa-card p-8">
                <h4 className="text-sm font-bold text-gray-900 mb-8">منابع ورودی مشتریان (Lead Sources)</h4>
                <div className="space-y-6">
                  {[
                    { label: 'اینستاگرام', value: 45, color: 'bg-pink-500' },
                    { label: 'سایت مستقیم', value: 25, color: 'bg-blue-500' },
                    { label: 'تبلیغات محیطی', value: 15, color: 'bg-amber-500' },
                    { label: 'معرفی دوستان', value: 15, color: 'bg-emerald-500' },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-medium text-gray-600">{item.label}</span>
                        <span className="font-bold text-gray-900 font-fa-num">{item.value}٪</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className={`h-full ${item.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="nexa-card p-8 flex flex-col items-center justify-center text-center">
                <div className="w-48 h-48 rounded-full border-[12px] border-gray-50 border-t-nexa-accent flex flex-col items-center justify-center mb-6">
                  <p className="text-4xl font-black text-gray-900 font-fa-num">۷۸٪</p>
                  <p className="text-[10px] text-gray-500">هدف ماهانه</p>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">تحقق اهداف فروش CRM</h4>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                  شما در حال حاضر ۷۸٪ از هدف جذب مشتری وفادار در این ماه را محقق کرده‌اید. فقط ۲۲ مشتری دیگر تا پاداش تیمی فاصله دارید.
                </p>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">مدیریت مشتریان (CRM)</h1>
          <p className="text-sm text-gray-500 mt-1">مدیریت روابط، وفاداری و پیگیری بازدیدها</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowVisitForm(true)}
            className="flex-1 md:flex-none nexa-btn-primary flex items-center justify-center gap-2 py-3 md:py-2"
          >
            <UserPlus size={18} />
            ثبت بازدید جدید
          </button>
        </div>
      </div>

      {crmNotice && (
        <p
          role="status"
          className={`text-xs font-bold px-4 py-2 rounded-xl ${
            crmNotice.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {crmNotice.text}
        </p>
      )}
      {visitSuccess && activeTab === 'visits' && (
        <p role="status" className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700">
          {visitSuccess}
        </p>
      )}

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-white text-nexa-accent shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CRM Stats - Only show on main list or reports */}
      {(activeTab === 'leads' || activeTab === 'reports') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="nexa-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">کل مشتریان</p>
              <p className="text-xl font-black text-gray-900 font-fa-num">
                {FRONTEND_ONLY
                  ? '۱,۲۸۴'
                  : crmLoading
                    ? '…'
                    : crmStats.personCount.toLocaleString('fa-IR')}
              </p>
            </div>
          </div>
          <div className="nexa-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Star size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">مشتریان وفادار (VIP)</p>
              <p className="text-xl font-black text-gray-900 font-fa-num">
                {FRONTEND_ONLY
                  ? '۱۵۶'
                  : crmLoading
                    ? '…'
                    : crmStats.clubMemberCount.toLocaleString('fa-IR')}
              </p>
            </div>
          </div>
          <div className="nexa-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PieChart size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">نرخ تبدیل بازدید</p>
              <p className="text-xl font-black text-gray-900 font-fa-num">
                {FRONTEND_ONLY
                  ? '۳۲٪'
                  : crmLoading
                    ? '…'
                    : `${crmStats.visitConversionRate.toLocaleString('fa-IR')}٪`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {renderTabContent()}
      </AnimatePresence>

      {/* Visit Form Modal (Simplified) */}
      {showVisitForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-nexa-border flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">ثبت بازدید حضوری جدید</h3>
              <button
                type="button"
                onClick={() => {
                  setShowVisitForm(false);
                  resetVisitForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {visitNotice && <p className="text-xs font-bold text-rose-600" role="alert">{visitNotice}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <CrmRequiredLabel>نام و نام خانوادگی مشتری</CrmRequiredLabel>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    value={visitName}
                    onChange={(e) => setVisitName(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    placeholder="مثلاً: علی محمدی"
                  />
                </div>
                <div className="space-y-2">
                  <CrmRequiredLabel>شماره تماس</CrmRequiredLabel>
                  <input
                    type="tel"
                    required
                    aria-required="true"
                    value={visitPhone}
                    onChange={(e) => setVisitPhone(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 font-fa-num"
                    placeholder="۰۹..."
                  />
                </div>
                <div className="space-y-2">
                  <CrmRequiredLabel>نحوه آشنایی</CrmRequiredLabel>
                  <select
                    required
                    aria-required="true"
                    value={visitSource}
                    onChange={(e) => setVisitSource(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                  >
                    <option value="اینستاگرام">اینستاگرام</option>
                    <option value="تبلیغات محیطی">تبلیغات محیطی</option>
                    <option value="معرفی دوستان">معرفی دوستان</option>
                    <option value="سایت">سایت</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-1">تعداد همراهان</label>
                  <input
                    type="number"
                    min={0}
                    value={visitCompanions}
                    onChange={(e) => setVisitCompanions(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20 font-fa-num"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-1">همراهی دیزاینر</label>
                  <select
                    value={visitWithDesigner}
                    onChange={(e) => setVisitWithDesigner(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                  >
                    <option value="no">خیر (بدون دیزاینر)</option>
                    <option value="yes">بله (همراه با دیزاینر)</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <CrmRequiredLabel>تاریخ و ساعت بازدید</CrmRequiredLabel>
                  <input
                    type="datetime-local"
                    required
                    aria-required="true"
                    value={visitVisitedAt}
                    onChange={(e) => setVisitVisitedAt(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-fa-num"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-1">جنسیت مراجع</label>
                  <div className="flex gap-4 p-1 bg-gray-50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVisitGender('female')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg ${visitGender === 'female' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      خانم
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitGender('male')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg ${visitGender === 'male' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      آقا
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 mr-1">
                  احتمال خرید (۰ تا ۱۰۰٪) — <span className="font-fa-num">{visitProbability}</span>
                </label>
                <input
                  type="range"
                  className="w-full accent-nexa-accent"
                  min={0}
                  max={100}
                  value={visitProbability}
                  onChange={(e) => setVisitProbability(Number(e.target.value))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={visitSaving}
                  onClick={() => void submitVisit()}
                  className="flex-1 nexa-btn-primary py-4 disabled:opacity-60"
                >
                  {visitSaving ? 'در حال ذخیره…' : 'ثبت و ذخیره اطلاعات'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVisitForm(false);
                    resetVisitForm();
                  }}
                  className="px-8 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <CrmLeadEditorModal
        open={Boolean(editingLead)}
        lead={editingLead}
        saving={leadEditorSaving}
        onClose={() => setEditingLead(null)}
        onSave={(patch) => void saveLeadEdit(patch)}
      />
      <CrmLeadCreateModal
        open={showLeadCreate}
        saving={leadCreateSaving}
        onClose={() => setShowLeadCreate(false)}
        onCreate={(p) => void createLead(p)}
      />
      <CrmVisitEditorModal
        open={Boolean(editingVisit)}
        visit={editingVisit}
        saving={visitEditorSaving}
        onClose={() => setEditingVisit(null)}
        onSave={(p) => void saveVisitEdit(p)}
      />
    </div>
  );
}
