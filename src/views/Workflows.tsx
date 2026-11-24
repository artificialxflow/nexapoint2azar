'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitBranch,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  ChevronLeft,
  X,
  Activity,
  Package,
  ShoppingCart,
  Headphones,
  Users,
  FileText,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiWorkflowStep = {
  id: string;
  stepOrder: number;
  title: string;
  approverRoleKey: string;
  slaHours: number;
};

type ApiWorkflowDefinition = {
  id: string;
  name: string;
  module: string;
  description: string;
  isActive: boolean;
  steps: ApiWorkflowStep[];
};

type ApiWorkflowRun = {
  id: string;
  workflowId: string;
  title: string;
  status: 'running' | 'approved' | 'rejected' | 'completed';
  currentStepOrder: number;
  initiatedBy: string;
  createdAt: string;
  workflow: { id: string; name: string; module: string };
};

type WorkflowsPayload = {
  definitions: ApiWorkflowDefinition[];
  runs: ApiWorkflowRun[];
};

const tabs = [
  { id: 'all', label: 'همه گردشکارها', icon: GitBranch },
  { id: 'orders', label: 'مدیریت سفارش', icon: ShoppingCart },
  { id: 'inventory', label: 'مدیریت موجودی', icon: Package },
  { id: 'after-sales', label: 'خدمات پس از فروش', icon: Headphones },
  { id: 'agents', label: 'مدیریت نمایندگان', icon: Users },
  { id: 'auto-reporting', label: 'گزارش‌گیری خودکار', icon: FileText },
];

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function Workflows() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApiWorkflowDefinition | null>(null);
  const [definitions, setDefinitions] = useState<ApiWorkflowDefinition[]>([]);
  const [runs, setRuns] = useState<ApiWorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newWf, setNewWf] = useState({
    name: '',
    module: 'orders',
    description: '',
    stepsText: 'ثبت درخواست\nبررسی مدیر واحد\nتایید نهایی',
  });
  const [runTitle, setRunTitle] = useState('');

  const loadWorkflows = useCallback(async () => {
    if (!activeBusinessId) {
      setDefinitions([]);
      setRuns([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/workflows`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<WorkflowsPayload>(res);
      setDefinitions(data.definitions);
      setRuns(data.runs);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت گردشکارها');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  const filteredWorkflows = useMemo(
    () => (activeTab === 'all' ? definitions : definitions.filter((w) => w.module === activeTab)),
    [definitions, activeTab],
  );

  const toggleStatus = async (wf: ApiWorkflowDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBusinessId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/workflows`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'definition', id: wf.id, isActive: !wf.isActive }),
      });
      await parseApiJson(res);
      await loadWorkflows();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در تغییر وضعیت');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newWf.name.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const steps = newWf.stepsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title) => ({ title, approverRoleKey: 'manager', slaHours: 24 }));
      const res = await fetch(`/api/businesses/${activeBusinessId}/workflows`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'definition',
          name: newWf.name.trim(),
          module: newWf.module,
          description: newWf.description.trim(),
          steps,
        }),
      });
      await parseApiJson(res);
      setIsModalOpen(false);
      setNewWf({ name: '', module: 'orders', description: '', stepsText: 'ثبت درخواست\nبررسی مدیر واحد\nتایید نهایی' });
      await loadWorkflows();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ایجاد گردشکار');
    } finally {
      setSaving(false);
    }
  };

  const handleStartRun = async () => {
    if (!activeBusinessId || !selectedWorkflow || !runTitle.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/workflows`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'run',
          workflowId: selectedWorkflow.id,
          title: runTitle.trim(),
        }),
      });
      await parseApiJson(res);
      setRunTitle('');
      await loadWorkflows();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در اجرای گردشکار');
    } finally {
      setSaving(false);
    }
  };

  const runningCount = runs.filter((r) => r.status === 'running').length;
  const completedCount = runs.filter((r) => r.status === 'completed' || r.status === 'approved').length;
  const successRate = runs.length > 0 ? Math.round((completedCount / runs.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">گردشکارها (Workflows)</h1>
          <p className="text-gray-500 mt-1">مدیریت زنجیره عملیات و فرآیندهای چندمرحله‌ای کسب‌وکار</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="nexa-btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          ایجاد گردشکار جدید
        </button>
      </div>

      {errorMsg ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">{errorMsg}</div>
      ) : null}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="nexa-card p-6 border-r-4 border-r-nexa-accent">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-nexa-accent" size={20} />
            <span className="text-xs font-bold text-gray-500">اجراهای در جریان</span>
          </div>
          <p className="text-2xl font-black text-gray-900 font-fa-num">{fm(runningCount)}</p>
        </div>
        <div className="nexa-card p-6 border-r-4 border-r-emerald-500">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <span className="text-xs font-bold text-gray-500">نرخ تکمیل اجراها</span>
          </div>
          <p className="text-2xl font-black text-gray-900 font-fa-num">{fm(successRate)}٪</p>
        </div>
        <div className="nexa-card p-6 border-r-4 border-r-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-amber-500" size={20} />
            <span className="text-xs font-bold text-gray-500">کل گردشکارهای تعریف‌شده</span>
          </div>
          <p className="text-2xl font-black text-gray-900 font-fa-num">{fm(definitions.length)}</p>
        </div>
      </div>

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

      {/* Workflows Grid */}
      {filteredWorkflows.length === 0 ? (
        <div className="nexa-card p-10 text-center text-xs text-gray-400">
          {loading ? 'در حال بارگذاری گردشکارها...' : 'هنوز گردشکاری در این دسته‌بندی تعریف نشده است.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredWorkflows.map((wf) => {
              const wfRuns = runs.filter((r) => r.workflowId === wf.id);
              const wfDone = wfRuns.filter((r) => r.status === 'completed' || r.status === 'approved').length;
              const wfRate = wfRuns.length > 0 ? Math.round((wfDone / wfRuns.length) * 100) : 0;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={wf.id}
                  onClick={() => setSelectedWorkflow(wf)}
                  className="nexa-card p-6 group cursor-pointer hover:border-nexa-accent transition-all relative overflow-hidden"
                >
                  {wf.isActive && <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />}
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`p-3 rounded-2xl ${
                        wf.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <GitBranch size={24} />
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={(e) => void toggleStatus(wf, e)}
                        className={`p-2 rounded-lg transition-colors ${
                          wf.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Play size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 mb-4">{wf.name}</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Activity size={12} />
                        {fm(wfRuns.length)} اجرا
                      </span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <GitBranch size={12} />
                        {fm(wf.steps.length)} مرحله
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${wfRate}%` }}
                        className={`h-full ${wf.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-nexa-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${wf.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}
                      />
                      <span className={`text-[10px] font-bold ${wf.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                        {wf.isActive ? 'فعال' : 'متوقف شده'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-nexa-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold">جزئیات</span>
                      <ChevronLeft size={14} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Workflow Detail Modal */}
      <AnimatePresence>
        {selectedWorkflow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWorkflow(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <GitBranch className="text-nexa-accent" size={20} />
                  <h3 className="text-lg font-black text-gray-900">{selectedWorkflow.name}</h3>
                </div>
                <button type="button" onClick={() => setSelectedWorkflow(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex flex-wrap gap-3">
                  {selectedWorkflow.steps.map((step) => (
                    <div key={step.id} className="px-4 py-2 rounded-xl bg-gray-50 border border-nexa-border text-xs">
                      <span className="font-black text-nexa-accent font-fa-num ml-1">{fm(step.stepOrder)}.</span>
                      <span className="font-bold text-gray-800">{step.title}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={runTitle}
                    onChange={(e) => setRunTitle(e.target.value)}
                    placeholder="عنوان اجرای جدید (مثلاً سفارش ۱۰۴۵)..."
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={saving || !runTitle.trim()}
                    onClick={() => void handleStartRun()}
                    className="nexa-btn-primary px-5 py-2.5 text-xs disabled:opacity-50"
                  >
                    شروع اجرا
                  </button>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border border-nexa-border/50">
                  <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-nexa-accent" />
                    اجراهای ثبت‌شده
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {runs.filter((r) => r.workflowId === selectedWorkflow.id).length === 0 ? (
                      <p className="text-xs text-gray-400">هنوز اجرایی برای این گردشکار ثبت نشده است.</p>
                    ) : (
                      runs
                        .filter((r) => r.workflowId === selectedWorkflow.id)
                        .map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl">
                            <span className="font-bold text-gray-800">{r.title}</span>
                            <span className="text-gray-500 font-fa-num">
                              مرحله {fm(r.currentStepOrder)} — {r.initiatedBy}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
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
                <h3 className="text-lg font-black text-gray-900">طراحی گردشکار جدید</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateWorkflow} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">نام گردشکار</label>
                  <input
                    required
                    type="text"
                    value={newWf.name}
                    onChange={(e) => setNewWf((p) => ({ ...p, name: e.target.value }))}
                    placeholder="مثال: فرآیند تایید مرخصی"
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">دسته‌بندی</label>
                  <select
                    value={newWf.module}
                    onChange={(e) => setNewWf((p) => ({ ...p, module: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                  >
                    {tabs
                      .filter((t) => t.id !== 'all')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">مراحل (هر مرحله در یک خط)</label>
                  <textarea
                    value={newWf.stepsText}
                    onChange={(e) => setNewWf((p) => ({ ...p, stepsText: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm h-24 resize-none outline-none"
                  />
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <Zap className="text-amber-500 shrink-0" size={20} />
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    مراحل تعریف‌شده به ترتیب در پایگاه‌داده ذخیره شده و در اجراهای آتی دنبال می‌شوند.
                  </p>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ثبت گردشکار
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
