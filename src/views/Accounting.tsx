'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calculator,
  ChevronLeft,
  X,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

type ApiAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentCode: string;
  balance: number;
};

type ApiJournalLine = {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  account: { id: string; code: string; name: string; type: AccountType };
};

type ApiJournal = {
  id: string;
  entryNo: string;
  date: string;
  description: string;
  status: 'draft' | 'posted' | 'cancelled';
  totalDebit: number;
  totalCredit: number;
  lines: ApiJournalLine[];
};

type ApiTrialRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  netBalance: number;
};

type AccountingPayload = {
  accounts: ApiAccount[];
  journals: ApiJournal[];
  trialBalance: ApiTrialRow[];
  summary: {
    accountsCount: number;
    journalsCount: number;
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  };
};

const tabs = [
  { id: 'entries', label: 'لیست اسناد' },
  { id: 'opening', label: 'تراز افتتاحیه' },
  { id: 'closing', label: 'بستن سال مالی' },
  { id: 'chart', label: 'جدول حساب‌ها' },
  { id: 'consolidation', label: 'تجمیع اسناد' },
];

const ACCOUNT_TYPE_LABELS: Record<AccountType, { label: string; nature: 'بدهکار' | 'بستانکار' }> = {
  asset: { label: 'دارایی', nature: 'بدهکار' },
  expense: { label: 'هزینه', nature: 'بدهکار' },
  liability: { label: 'بدهی', nature: 'بستانکار' },
  equity: { label: 'سرمایه', nature: 'بستانکار' },
  revenue: { label: 'درآمد', nature: 'بستانکار' },
};

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function Accounting() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [activeTab, setActiveTab] = useState('entries');
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [journals, setJournals] = useState<ApiJournal[]>([]);
  const [trialBalance, setTrialBalance] = useState<ApiTrialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrialBalanceOpen, setIsTrialBalanceOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    amount: '',
    debitAccountId: '',
    creditAccountId: '',
    status: 'draft' as 'draft' | 'posted',
  });
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'asset' as AccountType,
    balance: '',
  });
  const [consolidationNotice, setConsolidationNotice] = useState<string | null>(null);

  const loadAccounting = useCallback(async () => {
    if (!activeBusinessId) {
      setAccounts([]);
      setJournals([]);
      setTrialBalance([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/accounting`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<AccountingPayload>(res);
      setAccounts(data.accounts);
      setJournals(data.journals);
      setTrialBalance(data.trialBalance);
      setNewEntry((prev) => ({
        ...prev,
        debitAccountId: prev.debitAccountId || data.accounts[0]?.id || '',
        creditAccountId: prev.creditAccountId || data.accounts[1]?.id || data.accounts[0]?.id || '',
      }));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات حسابداری');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadAccounting();
  }, [loadAccounting]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newAccount.code.trim() || !newAccount.name.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/accounting`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'account',
          code: newAccount.code.trim(),
          name: newAccount.name.trim(),
          type: newAccount.type,
          balance: Number(newAccount.balance) || 0,
        }),
      });
      await parseApiJson(res);
      setNewAccount({ code: '', name: '', type: 'asset', balance: '' });
      await loadAccounting();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت سرفصل حساب');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId) return;
    const amount = Number(String(newEntry.amount).replace(/,/g, ''));
    if (!newEntry.title.trim() || !amount || amount <= 0 || !newEntry.debitAccountId || !newEntry.creditAccountId) {
      setErrorMsg('لطفاً شرح، مبلغ معتبر و حساب‌های بدهکار و بستانکار را مشخص کنید.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/accounting`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'journal',
          date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
          description: newEntry.title.trim(),
          status: newEntry.status,
          lines: [
            { accountId: newEntry.debitAccountId, description: newEntry.title.trim(), debit: amount, credit: 0 },
            { accountId: newEntry.creditAccountId, description: newEntry.title.trim(), debit: 0, credit: amount },
          ],
        }),
      });
      await parseApiJson(res);
      setIsModalOpen(false);
      setNewEntry((prev) => ({ ...prev, title: '', amount: '', status: 'draft' }));
      await loadAccounting();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت سند حسابداری');
    } finally {
      setSaving(false);
    }
  };

  const filteredEntries = useMemo(
    () =>
      journals.filter(
        (entry) =>
          entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.entryNo.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [journals, searchQuery],
  );

  const openingStats = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const acc of accounts) {
      if (acc.type === 'asset' || acc.type === 'expense') debit += acc.balance;
      else credit += acc.balance;
    }
    return { debit, credit };
  }, [accounts]);

  const closingStats = useMemo(() => {
    const draftCount = journals.filter((j) => j.status === 'draft').length;
    const revenue = trialBalance.filter((r) => r.type === 'revenue').reduce((s, r) => s + Math.abs(r.netBalance), 0);
    const expense = trialBalance.filter((r) => r.type === 'expense').reduce((s, r) => s + Math.abs(r.netBalance), 0);
    return { draftCount, netProfit: revenue - expense };
  }, [journals, trialBalance]);

  const trialTotals = useMemo(() => {
    const debitTurnover = trialBalance.reduce((s, r) => s + r.debit, 0);
    const creditTurnover = trialBalance.reduce((s, r) => s + r.credit, 0);
    const debitRemain = trialBalance.reduce((s, r) => s + (r.netBalance > 0 ? r.netBalance : 0), 0);
    const creditRemain = trialBalance.reduce((s, r) => s + (r.netBalance < 0 ? Math.abs(r.netBalance) : 0), 0);
    return { debitTurnover, creditTurnover, debitRemain, creditRemain };
  }, [trialBalance]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'entries':
        return (
          <motion.div
            key="entries"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nexa-card overflow-hidden"
          >
            <div className="p-6 border-b border-nexa-border flex items-center justify-between bg-gray-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در اسناد..."
                  className="w-full bg-white border border-nexa-border rounded-xl py-2 pr-10 pl-4 text-sm"
                />
              </div>
              <button
                type="button"
                className="p-2 text-gray-500 hover:bg-white rounded-lg border border-transparent hover:border-nexa-border transition-all"
              >
                <Filter size={18} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-nexa-border">
                    <th className="px-6 py-4">شماره سند</th>
                    <th className="px-6 py-4">شرح سند</th>
                    <th className="px-6 py-4">تاریخ</th>
                    <th className="px-6 py-4">مبلغ کل (تومان)</th>
                    <th className="px-6 py-4">وضعیت</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexa-border">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-xs text-gray-400">
                        {loading ? 'در حال بارگذاری اسناد...' : 'سند حسابداری ثبت نشده است.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 font-fa-num">{entry.entryNo}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{entry.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-fa-num">{entry.date}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900 font-fa-num">{fm(entry.totalDebit)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              entry.status === 'posted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {entry.status === 'posted' ? 'قطعی شده' : 'پیش‌نویس'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <button type="button" className="p-1.5 text-gray-400 hover:text-nexa-accent transition-all">
                            <ChevronLeft size={18} />
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
      case 'chart':
        return (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <form onSubmit={handleAddAccount} className="nexa-card p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                required
                value={newAccount.code}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="کد حساب (مثلاً 101)"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
              <input
                required
                value={newAccount.name}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="عنوان سرفصل حساب"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={newAccount.type}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, type: e.target.value as AccountType }))}
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
              >
                <option value="asset">دارایی (بدهکار)</option>
                <option value="liability">بدهی (بستانکار)</option>
                <option value="equity">سرمایه (بستانکار)</option>
                <option value="revenue">درآمد (بستانکار)</option>
                <option value="expense">هزینه (بدهکار)</option>
              </select>
              <input
                type="number"
                value={newAccount.balance}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, balance: e.target.value }))}
                placeholder="مانده افتتاحیه"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
              <button type="submit" disabled={saving} className="nexa-btn-primary py-2 text-xs disabled:opacity-50">
                افزودن حساب
              </button>
            </form>

            {accounts.length === 0 ? (
              <div className="nexa-card p-8 text-center text-xs text-gray-400">
                هنوز سرفصل حسابی تعریف نشده است. از فرم بالا اولین سرفصل را ثبت کنید.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accounts.map((item) => {
                  const meta = ACCOUNT_TYPE_LABELS[item.type];
                  return (
                    <div
                      key={item.id}
                      className="nexa-card p-6 flex justify-between items-center group hover:border-nexa-accent transition-colors"
                    >
                      <div>
                        <p className="text-[10px] font-bold text-nexa-accent mb-1 font-fa-num">کد حساب: {item.code}</p>
                        <h4 className="text-sm font-black text-gray-900">{item.name}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded mt-2 inline-block ${
                            meta.nature === 'بدهکار' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {meta.label} — ماهیت {meta.nature}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 mb-1">مانده افتتاحیه</p>
                        <p className="text-sm font-black text-gray-900 font-fa-num">{fm(item.balance)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      case 'opening':
        return (
          <motion.div
            key="opening"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="nexa-card p-8 text-center bg-blue-50/30 border-blue-100">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen size={32} />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">تراز افتتاحیه دوره جاری</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                مجموع مانده‌های افتتاحیه ثبت‌شده در جدول سرفصل حساب‌های کسب‌وکار جاری
              </p>
              <div className="flex justify-center gap-4">
                <div className="px-6 py-3 bg-white rounded-xl border border-nexa-border">
                  <p className="text-[10px] text-gray-400 mb-1">جمع بدهکار</p>
                  <p className="text-sm font-black text-gray-900 font-fa-num">{fm(openingStats.debit)}</p>
                </div>
                <div className="px-6 py-3 bg-white rounded-xl border border-nexa-border">
                  <p className="text-[10px] text-gray-400 mb-1">جمع بستانکار</p>
                  <p className="text-sm font-black text-gray-900 font-fa-num">{fm(openingStats.credit)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'closing':
        return (
          <motion.div
            key="closing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto nexa-card p-8 border-rose-100"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <X size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">بستن سال مالی</h3>
                <p className="text-xs text-gray-500">انتقال مانده‌ها به حساب‌های دائمی و صدور سند اختتامیه</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                <p className="text-xs text-amber-700 leading-relaxed">
                  قبل از بستن سال مالی، اطمینان حاصل کنید که تمامی اسناد موقت تایید شده و مغایرت‌های بانکی رفع شده باشند. این عملیات غیرقابل بازگشت است.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">تعداد اسناد تایید نشده (پیش‌نویس):</span>
                  <span className="text-sm font-bold text-rose-500 font-fa-num">{fm(closingStats.draftCount)} عدد</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">سود/زیان خالص دوره:</span>
                  <span className="text-sm font-bold text-emerald-600 font-fa-num">
                    {closingStats.netProfit >= 0 ? '+' : ''}
                    {fm(closingStats.netProfit)} تومان
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={closingStats.draftCount > 0}
                onClick={() => setActiveTab('entries')}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
              >
                {closingStats.draftCount > 0 ? 'ابتدا اسناد پیش‌نویس را قطعی کنید' : 'بررسی اسناد پیش از بستن سال مالی'}
              </button>
            </div>
          </motion.div>
        );
      case 'consolidation':
        return (
          <motion.div
            key="consolidation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="nexa-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-900">تجمیع اسناد روزانه</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">از تاریخ</label>
                  <input
                    type="text"
                    placeholder="۱۴۰۵/۰۱/۰۱"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-fa-num"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">تا تاریخ</label>
                  <input
                    type="text"
                    placeholder="۱۴۰۵/۱۲/۲۹"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-fa-num"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setConsolidationNotice(
                        `در حال حاضر ${fm(journals.length)} سند ثبت‌شده با جمع گردش ${fm(trialTotals.debitTurnover)} تومان آماده گزارش‌گیری است.`,
                      )
                    }
                    className="w-full nexa-btn-primary py-3"
                  >
                    محاسبه تجمیع
                  </button>
                </div>
              </div>
              {consolidationNotice ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  {consolidationNotice}
                </p>
              ) : null}
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">حسابداری و تراز مالی</h1>
          <p className="text-gray-500 mt-1">مدیریت اسناد حسابداری، سرفصل‌ها و گزارشات قانونی</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsTrialBalanceOpen(true)}
            className="bg-white border border-nexa-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Calculator size={18} />
            تراز آزمایشی
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="nexa-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            ثبت سند جدید
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
          {errorMsg}
        </div>
      ) : null}

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
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

      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>

      {/* Trial Balance Modal */}
      <AnimatePresence>
        {isTrialBalanceOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTrialBalanceOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-nexa-accent/10 text-nexa-accent rounded-xl">
                    <Calculator size={20} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">گزارش تراز آزمایشی</h3>
                </div>
                <button type="button" onClick={() => setIsTrialBalanceOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-nexa-border">
                      <th rowSpan={2} className="px-4 py-4 border-l border-nexa-border">
                        نام حساب
                      </th>
                      <th colSpan={2} className="px-4 py-2 text-center border-l border-nexa-border">
                        گردش دوره
                      </th>
                      <th colSpan={2} className="px-4 py-2 text-center">
                        مانده نهایی
                      </th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-nexa-border">
                      <th className="px-4 py-2 border-l border-nexa-border">بدهکار</th>
                      <th className="px-4 py-2 border-l border-nexa-border">بستانکار</th>
                      <th className="px-4 py-2 border-l border-nexa-border">بدهکار</th>
                      <th className="px-4 py-2">بستانکار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border font-fa-num">
                    {trialBalance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          اطلاعاتی برای نمایش در تراز آزمایشی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      trialBalance.map((row) => (
                        <tr key={row.accountId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-bold border-l border-nexa-border">
                            {row.code} — {row.name}
                          </td>
                          <td className="px-4 py-3 border-l border-nexa-border">{fm(row.debit)}</td>
                          <td className="px-4 py-3 border-l border-nexa-border">{fm(row.credit)}</td>
                          <td className="px-4 py-3 border-l border-nexa-border">
                            {row.netBalance > 0 ? fm(row.netBalance) : '۰'}
                          </td>
                          <td className="px-4 py-3">
                            {row.netBalance < 0 ? fm(Math.abs(row.netBalance)) : '۰'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-black text-gray-900 border-t-2 border-nexa-border font-fa-num">
                      <td className="px-4 py-4 border-l border-nexa-border">جمع کل:</td>
                      <td className="px-4 py-4 border-l border-nexa-border">{fm(trialTotals.debitTurnover)}</td>
                      <td className="px-4 py-4 border-l border-nexa-border">{fm(trialTotals.creditTurnover)}</td>
                      <td className="px-4 py-4 border-l border-nexa-border">{fm(trialTotals.debitRemain)}</td>
                      <td className="px-4 py-4">{fm(trialTotals.creditRemain)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="p-6 bg-gray-50 border-t border-nexa-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-white border border-nexa-border rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  چاپ گزارش
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrialBalanceOpen(false)}
                  className="px-6 py-2 bg-nexa-accent text-white rounded-xl text-xs font-bold hover:bg-nexa-accent/90 transition-colors"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Entry Modal */}
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
                <h3 className="text-lg font-black text-gray-900">ثبت سند حسابداری جدید</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              {accounts.length < 2 ? (
                <div className="p-6 space-y-4 text-center">
                  <p className="text-sm text-gray-600">
                    برای ثبت سند دوطرفه متوازن، ابتدا حداقل دو سرفصل حساب در تب «جدول حساب‌ها» تعریف کنید.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setActiveTab('chart');
                    }}
                    className="nexa-btn-primary px-6 py-2.5 text-sm"
                  >
                    رفتن به جدول حساب‌ها
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddEntry} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">شرح سند</label>
                    <input
                      required
                      type="text"
                      value={newEntry.title}
                      onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                      placeholder="مثال: سند حقوق فروردین"
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">حساب بدهکار</label>
                      <select
                        required
                        value={newEntry.debitAccountId}
                        onChange={(e) => setNewEntry({ ...newEntry, debitAccountId: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm"
                      >
                        {accounts.map((a) => (
                          <option key={`d-${a.id}`} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">حساب بستانکار</label>
                      <select
                        required
                        value={newEntry.creditAccountId}
                        onChange={(e) => setNewEntry({ ...newEntry, creditAccountId: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm"
                      >
                        {accounts.map((a) => (
                          <option key={`c-${a.id}`} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">مبلغ کل (تومان)</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={newEntry.amount}
                        onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num focus:ring-2 focus:ring-nexa-accent/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">وضعیت</label>
                      <select
                        value={newEntry.status}
                        onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value as 'draft' | 'posted' })}
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                      >
                        <option value="draft">پیش‌نویس</option>
                        <option value="posted">قطعی شده</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                      ثبت سند
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
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
