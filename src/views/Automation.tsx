'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Zap,
  Plus,
  Play,
  Settings,
  Bell,
  Activity,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ACTION_LABELS, TRIGGER_LABELS, type NexaEventType } from '@/src/lib/automation/types';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiRule = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: unknown[];
  actions: { type?: string; messageTemplate?: string }[];
  active: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
};

type ApiLog = {
  id: string;
  ruleId: string | null;
  ruleName: string;
  trigger: string;
  status: string;
  summary: string;
  executedAt: string;
};

const tabs = [
  { id: 'workflows', label: 'قوانین اتوماسیون', icon: Zap },
  { id: 'logs', label: 'تاریخچه اجرا', icon: Activity },
  { id: 'triggers', label: 'محرک‌های سیستم', icon: Play },
];

function formatLastRun(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} دقیقه پیش`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} ساعت پیش`;
  return d.toLocaleDateString('fa-IR');
}

function getTriggerLabel(trigger: string): string {
  return (TRIGGER_LABELS as Record<string, string>)[trigger] ?? trigger;
}

function getActionLabel(actionType?: string): string {
  if (!actionType) return 'ثبت رویداد';
  return (ACTION_LABELS as Record<string, string>)[actionType] ?? actionType;
}

export default function Automation() {
  const business = useBusinessOptional();
  const businessId = business?.activeBusinessId ?? null;

  const [activeTab, setActiveTab] = useState('workflows');
  const [rules, setRules] = useState<ApiRule[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftTrigger, setDraftTrigger] = useState<NexaEventType>('sales.invoice.created');
  const [draftAction, setDraftAction] = useState<'notify_in_app' | 'log_only'>('notify_in_app');
  const [draftMessage, setDraftMessage] = useState('{{title}}');

  const loadData = useCallback(async () => {
    if (!businessId) {
      setRules([]);
      setLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/automation`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await parseApiJson<{ rules: ApiRule[]; logs: ApiLog[] }>(res);
      setRules(payload.rules);
      setLogs(payload.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRules = useMemo(
    () =>
      rules.filter(
        (r) =>
          r.name.includes(searchQuery) ||
          getTriggerLabel(r.trigger).includes(searchQuery) ||
          r.description.includes(searchQuery)
      ),
    [rules, searchQuery]
  );

  const activeCount = rules.filter((r) => r.active).length;
  const successLogs = logs.filter((l) => l.status === 'success').length;

  const toggleRule = async (rule: ApiRule) => {
    if (!businessId) return;
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/automation`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      });
      await parseApiJson<{ updated: boolean }>(res);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت قانون');
    }
  };

  const removeRule = async (id: string) => {
    if (!businessId) return;
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/automation`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseApiJson<{ deleted: boolean }>(res);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف قانون');
    }
  };

  const triggerRuleRun = async (rule: ApiRule) => {
    if (!businessId) return;
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/automation`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'log',
          ruleId: rule.id,
          ruleName: rule.name,
          trigger: rule.trigger,
          status: 'success',
          summary: `اجرای دستی قانون «${rule.name}» برای محرک ${getTriggerLabel(rule.trigger)}`,
          payload: { triggeredManually: true },
        }),
      });
      await parseApiJson<ApiLog>(res);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت اجرای قانون');
    }
  };

  const saveNewRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    const name = draftName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/automation`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'rule',
          name,
          description: draftDescription.trim(),
          trigger: draftTrigger,
          actions: [{ type: draftAction, messageTemplate: draftMessage.trim() || '{{title}}' }],
          active: true,
        }),
      });
      await parseApiJson<ApiRule>(res);
      setIsModalOpen(false);
      setDraftName('');
      setDraftDescription('');
      setDraftMessage('{{title}}');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت قانون اتوماسیون');
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'logs':
        return (
          <div className="nexa-card overflow-hidden">
            <div className="p-4 border-b border-nexa-border bg-gray-50/50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-500">تاریخچه اجرای قوانین اتوماسیون</h4>
              <button
                type="button"
                onClick={() => void loadData()}
                className="text-[10px] text-nexa-accent flex items-center gap-1 font-bold"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                بروزرسانی
              </button>
            </div>
            <div className="divide-y divide-nexa-border max-h-[460px] overflow-auto">
              {logs.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">هنوز لاگی برای این کسب‌وکار ثبت نشده است.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50/30 gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {log.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{log.ruleName || getTriggerLabel(log.trigger)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{log.summary}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-fa-num shrink-0">
                      {new Date(log.executedAt).toLocaleString('fa-IR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'triggers':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(TRIGGER_LABELS) as NexaEventType[]).map((key) => (
              <div key={key} className="nexa-card p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{TRIGGER_LABELS[key]}</p>
                  <p className="text-[10px] text-gray-400 mt-1 dir-ltr">{key}</p>
                </div>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-fa-num">
                  {rules.filter((r) => r.trigger === key && r.active).length} قانون فعال
                </span>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="nexa-card overflow-hidden">
            <div className="p-6 border-b border-nexa-border flex items-center justify-between bg-gray-50/50 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در قوانین اتوماسیون..."
                  className="w-full bg-white border border-nexa-border rounded-xl py-2 pr-10 pl-4 text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                className="text-xs text-gray-500 hover:text-nexa-accent flex items-center gap-1"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                تازه‌سازی
              </button>
            </div>
            <div className="divide-y divide-nexa-border">
              {loading && rules.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">در حال بارگذاری قوانین…</p>
              ) : filteredRules.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">
                  {searchQuery.trim()
                    ? 'قانونی با این جستجو یافت نشد.'
                    : 'هنوز قانونی تعریف نشده است. از دکمه «قانون جدید» اولین قانون اتوماسیون را ایجاد کنید.'}
                </p>
              ) : (
                filteredRules.map((flow) => (
                  <div key={flow.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          flow.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Zap size={24} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 mb-1">{flow.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Play size={12} />
                            {getTriggerLabel(flow.trigger)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Settings size={12} />
                            {flow.actions.length > 0
                              ? flow.actions.map((a) => getActionLabel(a.type)).join('، ')
                              : 'ثبت در تاریخچه'}
                          </span>
                          <span className="flex items-center gap-1 font-fa-num">
                            <Clock size={12} />
                            {formatLastRun(flow.lastRunAt)} ({flow.runCount} بار)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => void triggerRuleRun(flow)}
                        className="text-[10px] font-bold bg-gray-100 hover:bg-nexa-accent/15 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        اجرای آزمایشی
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleRule(flow)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${flow.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      >
                        <motion.div
                          animate={{ x: flow.active ? -20 : 0 }}
                          className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeRule(flow.id)}
                        className="text-[10px] text-rose-600 font-bold hover:underline"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">اتومیشن و گردش‌کارها</h1>
          <p className="text-gray-500 mt-1">مدیریت قوانین خودکارسازی فرآیندها و تاریخچه اجراها</p>
        </div>
        <button
          type="button"
          disabled={!businessId}
          onClick={() => setIsModalOpen(true)}
          className="nexa-btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          قانون جدید
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="nexa-card p-6 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-3 mb-4">
            <Activity size={20} className="text-indigo-700" />
            <h4 className="text-sm font-bold text-indigo-900">قوانین فعال</h4>
          </div>
          <p className="text-3xl font-black text-indigo-700 font-fa-num">{activeCount}</p>
        </div>
        <div className="nexa-card p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={20} className="text-emerald-700" />
            <h4 className="text-sm font-bold text-emerald-900">اجراهای موفق</h4>
          </div>
          <p className="text-3xl font-black text-emerald-700 font-fa-num">{successLogs}</p>
        </div>
        <div className="nexa-card p-6 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-3 mb-4">
            <Bell size={20} className="text-amber-700" />
            <h4 className="text-sm font-bold text-amber-900">کل قوانین ثبت‌شده</h4>
          </div>
          <p className="text-3xl font-black text-amber-800 font-fa-num">{rules.length}</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-black">ایجاد قانون اتوماسیون</h3>
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={(e) => void saveNewRule(e)} className="p-6 space-y-4">
                <input
                  required
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="نام قانون (مثال: اعلان ثبت فاکتور جدید)"
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm outline-none"
                />
                <input
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="توضیحات اختیاری"
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm outline-none"
                />
                <select
                  value={draftTrigger}
                  onChange={(e) => setDraftTrigger(e.target.value as NexaEventType)}
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm outline-none"
                >
                  {(Object.keys(TRIGGER_LABELS) as NexaEventType[]).map((k) => (
                    <option key={k} value={k}>
                      {TRIGGER_LABELS[k]}
                    </option>
                  ))}
                </select>
                <select
                  value={draftAction}
                  onChange={(e) => setDraftAction(e.target.value as typeof draftAction)}
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm outline-none"
                >
                  <option value="notify_in_app">{ACTION_LABELS.notify_in_app}</option>
                  <option value="log_only">{ACTION_LABELS.log_only}</option>
                </select>
                <textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={2}
                  placeholder="قالب پیام — {{title}}, {{customer}}, {{item}}"
                  className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-sm resize-none outline-none"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full nexa-btn-primary py-3 text-sm font-bold disabled:opacity-50"
                >
                  {saving ? 'در حال ذخیره…' : 'ذخیره و فعال‌سازی'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
