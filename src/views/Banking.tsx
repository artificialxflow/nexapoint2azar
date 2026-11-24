'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, BookOpen, Calendar, Landmark, Plus, RefreshCcw, Search, Wallet } from 'lucide-react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type BankingMode =
  | 'overview'
  | 'banks'
  | 'cashboxes'
  | 'petty-cash'
  | 'transfer-create'
  | 'transfer-list'
  | 'checks-received'
  | 'checks-paid'
  | 'cash-report';

type ApiBankAccount = {
  id: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  cardNumber: string;
  iban: string;
  currency: string;
  openingBalance: number;
  balance: number;
  isActive: boolean;
};

type ApiCashbox = {
  id: string;
  name: string;
  keeperName: string;
  currency: string;
  balance: number;
  isActive: boolean;
};

type ApiPettyCash = {
  id: string;
  title: string;
  holderName: string;
  limitAmount: number;
  balance: number;
  isActive: boolean;
};

type ApiBankTransaction = {
  id: string;
  bankAccountId: string | null;
  cashboxId: string | null;
  pettyCashId: string | null;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'fee';
  amount: number;
  date: string;
  counterpartyName: string;
  referenceNo: string;
  description: string;
};

type ApiTransfer = {
  id: string;
  fromSource: string;
  toTarget: string;
  amount: number;
  fee: number;
  date: string;
  referenceNo: string;
  description: string;
};

type ApiCheck = {
  id: string;
  bankAccountId: string | null;
  direction: 'receivable' | 'payable';
  checkNo: string;
  sayadId: string;
  bankName: string;
  counterparty: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'pending' | 'cleared' | 'bounced' | 'endorsed' | 'cancelled';
  notes: string;
};

type BankingPayload = {
  bankAccounts: ApiBankAccount[];
  cashboxes: ApiCashbox[];
  pettyCashes: ApiPettyCash[];
  transactions: ApiBankTransaction[];
  transfers: ApiTransfer[];
  checks: ApiCheck[];
  summary: {
    totalBankBalance: number;
    totalCashBalance: number;
    totalPettyCash: number;
    totalLiquidity: number;
    pendingReceivableChecks: number;
    pendingPayableChecks: number;
  };
};

const TABS: { id: BankingMode; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'داشبورد بانکداری', icon: <Landmark size={14} /> },
  { id: 'banks', label: 'بانک‌ها', icon: <Landmark size={14} /> },
  { id: 'cashboxes', label: 'صندوق‌ها', icon: <Wallet size={14} /> },
  { id: 'petty-cash', label: 'تنخواه گردان‌ها', icon: <Banknote size={14} /> },
  { id: 'transfer-create', label: 'انتقال', icon: <RefreshCcw size={14} /> },
  { id: 'transfer-list', label: 'لیست انتقال‌ها', icon: <BookOpen size={14} /> },
  { id: 'checks-received', label: 'لیست چک‌های دریافتی', icon: <BookOpen size={14} /> },
  { id: 'checks-paid', label: 'لیست چک‌های پرداختی', icon: <BookOpen size={14} /> },
  { id: 'cash-report', label: 'گزارش نقد و بانک', icon: <Calendar size={14} /> },
];

const CHECK_STATUS_LABELS: Record<ApiCheck['status'], string> = {
  pending: 'در جریان',
  cleared: 'وصول شده',
  bounced: 'برگشتی',
  endorsed: 'خرج شده',
  cancelled: 'ابطال شده',
};

const fm = (n: number) => n.toLocaleString('fa-IR');
const dateKey = (value: string) => value.replace(/[^0-9]/g, '');

const toCsv = (rows: Array<Array<string | number>>) =>
  `\uFEFF${rows.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default function Banking() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [mode, setMode] = useState<BankingMode>('overview');
  const [query, setQuery] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [activeDoc, setActiveDoc] = useState<ApiBankTransaction | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [banks, setBanks] = useState<ApiBankAccount[]>([]);
  const [cashboxes, setCashboxes] = useState<ApiCashbox[]>([]);
  const [pettyCash, setPettyCash] = useState<ApiPettyCash[]>([]);
  const [transactions, setTransactions] = useState<ApiBankTransaction[]>([]);
  const [transfers, setTransfers] = useState<ApiTransfer[]>([]);
  const [checks, setChecks] = useState<ApiCheck[]>([]);

  const [selectedBankId, setSelectedBankId] = useState('');
  const [newBank, setNewBank] = useState({
    name: '',
    branch: '',
    accountNo: '',
    cardNo: '',
    iban: '',
    currency: 'IRR',
    openingBalance: '',
  });

  const [newCashbox, setNewCashbox] = useState({
    name: '',
    currency: 'IRR',
    manager: '',
    balance: '',
  });

  const [newPettyCash, setNewPettyCash] = useState({
    holder: '',
    project: '',
    limitAmount: '',
    balance: '',
  });

  const [newTransfer, setNewTransfer] = useState({ from: '', to: '', amount: '', description: '' });
  const [newCheck, setNewCheck] = useState({
    checkNo: '',
    bankName: '',
    counterparty: '',
    amount: '',
    dueDate: '',
  });

  const loadBanking = useCallback(async () => {
    if (!activeBusinessId) {
      setBanks([]);
      setCashboxes([]);
      setPettyCash([]);
      setTransactions([]);
      setTransfers([]);
      setChecks([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/banking`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<BankingPayload>(res);
      setBanks(data.bankAccounts);
      setCashboxes(data.cashboxes);
      setPettyCash(data.pettyCashes);
      setTransactions(data.transactions);
      setTransfers(data.transfers);
      setChecks(data.checks);
      setSelectedBankId((prev) => (prev && data.bankAccounts.some((b) => b.id === prev) ? prev : data.bankAccounts[0]?.id ?? ''));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات بانکداری');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadBanking();
  }, [loadBanking]);

  const selectedBank = banks.find((b) => b.id === selectedBankId) ?? banks[0];
  const bankTxRows = useMemo(() => {
    if (!selectedBank) return [];
    const fromKey = dateKey(rangeFrom);
    const toKey = dateKey(rangeTo);
    return transactions.filter((row) => {
      if (row.bankAccountId !== selectedBank.id) return false;
      const key = dateKey(row.date);
      if (fromKey && key && key < fromKey) return false;
      if (toKey && key && key > toKey) return false;
      return true;
    });
  }, [transactions, selectedBank, rangeFrom, rangeTo]);

  const checksReceived = useMemo(() => checks.filter((c) => c.direction === 'receivable'), [checks]);
  const checksPaid = useMemo(() => checks.filter((c) => c.direction === 'payable'), [checks]);

  const filteredTransfers = useMemo(
    () =>
      transfers.filter((x) =>
        `${x.referenceNo || x.id} ${x.fromSource} ${x.toTarget}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [transfers, query],
  );

  const cashFlowSummary = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const tx of transactions) {
      if (tx.type === 'deposit' || tx.type === 'transfer_in') inflow += tx.amount;
      else outflow += tx.amount;
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [transactions]);

  const postBanking = async (payload: Record<string, unknown>) => {
    if (!activeBusinessId) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/banking`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseApiJson(res);
      await loadBanking();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در ثبت اطلاعات');
    } finally {
      setSaving(false);
    }
  };

  const addBank = async () => {
    if (!newBank.name.trim()) return;
    await postBanking({
      entity: 'bank_account',
      bankName: newBank.name.trim(),
      branchName: newBank.branch.trim(),
      accountNumber: newBank.accountNo.trim(),
      cardNumber: newBank.cardNo.trim(),
      iban: newBank.iban.trim(),
      currency: newBank.currency,
      openingBalance: Number(newBank.openingBalance) || 0,
    });
    setNewBank({ name: '', branch: '', accountNo: '', cardNo: '', iban: '', currency: 'IRR', openingBalance: '' });
  };

  const addCashbox = async () => {
    if (!newCashbox.name.trim()) return;
    await postBanking({
      entity: 'cashbox',
      name: newCashbox.name.trim(),
      keeperName: newCashbox.manager.trim(),
      currency: newCashbox.currency,
      balance: Number(newCashbox.balance) || 0,
    });
    setNewCashbox({ name: '', currency: 'IRR', manager: '', balance: '' });
  };

  const addPettyCash = async () => {
    if (!newPettyCash.project.trim() && !newPettyCash.holder.trim()) return;
    await postBanking({
      entity: 'petty_cash',
      title: newPettyCash.project.trim() || `تنخواه ${newPettyCash.holder.trim()}`,
      holderName: newPettyCash.holder.trim(),
      limitAmount: Number(newPettyCash.limitAmount) || 0,
      balance: Number(newPettyCash.balance) || 0,
    });
    setNewPettyCash({ holder: '', project: '', limitAmount: '', balance: '' });
  };

  const addTransfer = async () => {
    const amount = Number(newTransfer.amount);
    if (!newTransfer.from || !newTransfer.to || !amount || amount <= 0) return;
    await postBanking({
      entity: 'transfer',
      fromSource: newTransfer.from,
      toTarget: newTransfer.to,
      amount,
      date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
      description: newTransfer.description.trim(),
    });
    setMode('transfer-list');
    setNewTransfer({ from: '', to: '', amount: '', description: '' });
  };

  const addCheck = async (direction: 'receivable' | 'payable') => {
    const amount = Number(newCheck.amount);
    if (!newCheck.checkNo.trim() || !amount || amount <= 0) return;
    await postBanking({
      entity: 'check',
      direction,
      checkNo: newCheck.checkNo.trim(),
      bankName: newCheck.bankName.trim(),
      counterparty: newCheck.counterparty.trim(),
      amount,
      issueDate: new Intl.DateTimeFormat('fa-IR').format(new Date()),
      dueDate: newCheck.dueDate.trim(),
      status: 'pending',
    });
    setNewCheck({ checkNo: '', bankName: '', counterparty: '', amount: '', dueDate: '' });
  };

  const updateCheckStatus = async (id: string, status: ApiCheck['status']) => {
    if (!activeBusinessId) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/banking`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'check', id, status }),
      });
      await parseApiJson(res);
      await loadBanking();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در به‌روزرسانی وضعیت چک');
    } finally {
      setSaving(false);
    }
  };

  const sources = [
    ...banks.map((x) => (x.branchName ? `${x.bankName} - ${x.branchName}` : x.bankName)),
    ...cashboxes.map((x) => x.name),
    ...pettyCash.map((x) => `${x.holderName || x.title} (تنخواه)`),
  ];

  const exportBankTx = () => {
    if (!selectedBank) return;
    const rows: Array<Array<string | number>> = [
      ['بانک', selectedBank.bankName],
      ['از تاریخ', rangeFrom],
      ['تا تاریخ', rangeTo],
      [],
      ['تاریخ', 'شرح', 'مبلغ', 'نوع', 'شماره مرجع'],
      ...bankTxRows.map((row) => [
        row.date,
        row.description || row.counterpartyName || '-',
        row.amount,
        row.type === 'deposit' || row.type === 'transfer_in' ? 'دریافت' : 'پرداخت',
        row.referenceNo || row.id,
      ]),
    ];
    downloadCsv(`bank-transactions-${selectedBank.id}.csv`, rows);
  };

  const exportTransfers = () => {
    const rows: Array<Array<string | number>> = [
      ['کد', 'تاریخ', 'مبدا', 'مقصد', 'مبلغ', 'شرح'],
      ...filteredTransfers.map((x) => [x.referenceNo || x.id, x.date, x.fromSource, x.toTarget, x.amount, x.description]),
    ];
    downloadCsv('transfers.csv', rows);
  };

  const exportChecks = (kind: 'received' | 'paid') => {
    const list = kind === 'received' ? checksReceived : checksPaid;
    const rows: Array<Array<string | number>> = [
      ['شماره چک', 'بانک', 'تاریخ', 'سررسید', 'طرف حساب', 'مبلغ', 'وضعیت'],
      ...list.map((x) => [x.checkNo, x.bankName, x.issueDate, x.dueDate, x.counterparty, x.amount, CHECK_STATUS_LABELS[x.status]]),
    ];
    downloadCsv(kind === 'received' ? 'checks-received.csv' : 'checks-paid.csv', rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">بانکداری</h1>
          <p className="text-sm text-gray-500 mt-1">مدیریت بانک، صندوق، تنخواه، انتقال و چک‌ها</p>
        </div>
        {loading ? <span className="text-xs text-gray-400">در حال بارگذاری...</span> : null}
      </div>

      {errorMsg ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
          {errorMsg}
        </div>
      ) : null}

      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              mode === item.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'overview' && (
        <div className="grid md:grid-cols-4 gap-3">
          <div className="nexa-card p-4">
            <p className="text-xs text-gray-500">موجودی بانک‌ها</p>
            <p className="text-lg font-black text-gray-900 mt-2 font-fa-num">
              {fm(banks.reduce((s, b) => s + b.balance, 0))}
            </p>
          </div>
          <div className="nexa-card p-4">
            <p className="text-xs text-gray-500">موجودی صندوق‌ها</p>
            <p className="text-lg font-black text-gray-900 mt-2 font-fa-num">
              {fm(cashboxes.reduce((s, b) => s + b.balance, 0))}
            </p>
          </div>
          <div className="nexa-card p-4">
            <p className="text-xs text-gray-500">مانده تنخواه‌ها</p>
            <p className="text-lg font-black text-gray-900 mt-2 font-fa-num">
              {fm(pettyCash.reduce((s, b) => s + b.balance, 0))}
            </p>
          </div>
          <div className="nexa-card p-4">
            <p className="text-xs text-gray-500">تعداد انتقال‌ها</p>
            <p className="text-lg font-black text-gray-900 mt-2 font-fa-num">{fm(transfers.length)}</p>
          </div>
        </div>
      )}

      {mode === 'banks' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="nexa-card p-4 space-y-3">
            <h3 className="text-sm font-black text-gray-900">بانک جدید</h3>
            <input
              value={newBank.name}
              onChange={(e) => setNewBank((x) => ({ ...x, name: e.target.value }))}
              placeholder="نام بانک"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newBank.branch}
                onChange={(e) => setNewBank((x) => ({ ...x, branch: e.target.value }))}
                placeholder="شعبه"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={newBank.accountNo}
                onChange={(e) => setNewBank((x) => ({ ...x, accountNo: e.target.value }))}
                placeholder="شماره حساب"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newBank.cardNo}
                onChange={(e) => setNewBank((x) => ({ ...x, cardNo: e.target.value }))}
                placeholder="شماره کارت"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
              <input
                value={newBank.iban}
                onChange={(e) => setNewBank((x) => ({ ...x, iban: e.target.value }))}
                placeholder="شماره شبا"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={newBank.openingBalance}
                onChange={(e) => setNewBank((x) => ({ ...x, openingBalance: e.target.value }))}
                placeholder="موجودی اولیه"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
              <select
                value={newBank.currency}
                onChange={(e) => setNewBank((x) => ({ ...x, currency: e.target.value }))}
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
              >
                <option value="IRR">IRR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <button
              type="button"
              disabled={saving || !newBank.name.trim()}
              onClick={() => void addBank()}
              className="nexa-btn-primary w-full flex items-center justify-center gap-2 py-2 disabled:opacity-50"
            >
              <Plus size={14} />
              افزودن بانک
            </button>
          </div>

          <div className="nexa-card p-4 lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-gray-900">لیست بانک‌ها</h3>
              {banks.length > 0 && (
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="mr-auto bg-gray-50 rounded-xl px-3 py-2 text-xs"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branchName ? `${b.bankName} - ${b.branchName}` : b.bankName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="overflow-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-nexa-border">
                    <th className="py-2">بانک</th>
                    <th className="py-2">شماره حساب</th>
                    <th className="py-2">ارز</th>
                    <th className="py-2">موجودی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexa-border">
                  {banks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-gray-400">
                        هنوز حساب بانکی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    banks.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2">{b.branchName ? `${b.bankName} - ${b.branchName}` : b.bankName}</td>
                        <td className="py-2 font-fa-num">{b.accountNumber || '—'}</td>
                        <td className="py-2">{b.currency}</td>
                        <td className="py-2 font-fa-num">{fm(b.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-nexa-border pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-gray-700">گردش حساب بانک</h4>
                <button type="button" onClick={exportBankTx} className="text-xs font-bold text-nexa-accent">
                  خروجی CSV
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
                />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num"
                />
              </div>
              <div className="overflow-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-nexa-border">
                      <th className="py-2">تاریخ</th>
                      <th className="py-2">شرح</th>
                      <th className="py-2">مبلغ</th>
                      <th className="py-2">نوع</th>
                      <th className="py-2">مرجع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border">
                    {bankTxRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">
                          تراکنشی برای این حساب ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      bankTxRows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 font-fa-num">{row.date || '—'}</td>
                          <td className="py-2">{row.description || row.counterpartyName || '—'}</td>
                          <td className="py-2 font-fa-num">{fm(row.amount)}</td>
                          <td className="py-2">
                            {row.type === 'deposit' || row.type === 'transfer_in' ? 'دریافت' : 'پرداخت'}
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => setActiveDoc(row)}
                              className="text-nexa-accent font-bold hover:underline"
                            >
                              {row.referenceNo || row.id.slice(0, 8)}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'cashboxes' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="nexa-card p-4 space-y-3">
            <h3 className="text-sm font-black text-gray-900">صندوق جدید</h3>
            <input
              value={newCashbox.name}
              onChange={(e) => setNewCashbox((x) => ({ ...x, name: e.target.value }))}
              placeholder="نام صندوق"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={newCashbox.currency}
              onChange={(e) => setNewCashbox((x) => ({ ...x, currency: e.target.value }))}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            >
              <option value="IRR">IRR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="TRY">TRY</option>
              <option value="CNY">CNY</option>
            </select>
            <input
              value={newCashbox.manager}
              onChange={(e) => setNewCashbox((x) => ({ ...x, manager: e.target.value }))}
              placeholder="مسئول صندوق"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={newCashbox.balance}
              onChange={(e) => setNewCashbox((x) => ({ ...x, balance: e.target.value }))}
              placeholder="موجودی اولیه"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
            />
            <button
              type="button"
              disabled={saving || !newCashbox.name.trim()}
              onClick={() => void addCashbox()}
              className="nexa-btn-primary w-full py-2 disabled:opacity-50"
            >
              ثبت صندوق
            </button>
          </div>
          <div className="nexa-card p-4 lg:col-span-2">
            <h3 className="text-sm font-black text-gray-900 mb-3">لیست صندوق‌ها</h3>
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-nexa-border">
                  <th className="py-2">نام</th>
                  <th className="py-2">ارز</th>
                  <th className="py-2">مسئول</th>
                  <th className="py-2">موجودی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {cashboxes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-gray-400">
                      هنوز صندوقی تعریف نشده است.
                    </td>
                  </tr>
                ) : (
                  cashboxes.map((box) => (
                    <tr key={box.id}>
                      <td className="py-2">{box.name}</td>
                      <td className="py-2 font-bold">{box.currency}</td>
                      <td className="py-2">{box.keeperName || '—'}</td>
                      <td className="py-2 font-fa-num">{fm(box.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'petty-cash' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="nexa-card p-4 space-y-3">
            <h3 className="text-sm font-black text-gray-900">تنخواه جدید</h3>
            <input
              value={newPettyCash.holder}
              onChange={(e) => setNewPettyCash((x) => ({ ...x, holder: e.target.value }))}
              placeholder="نام تنخواه‌گردان"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={newPettyCash.project}
              onChange={(e) => setNewPettyCash((x) => ({ ...x, project: e.target.value }))}
              placeholder="عنوان / پروژه"
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={newPettyCash.limitAmount}
                onChange={(e) => setNewPettyCash((x) => ({ ...x, limitAmount: e.target.value }))}
                placeholder="سقف تنخواه"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
              <input
                type="number"
                value={newPettyCash.balance}
                onChange={(e) => setNewPettyCash((x) => ({ ...x, balance: e.target.value }))}
                placeholder="مانده اولیه"
                className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
            </div>
            <button
              type="button"
              disabled={saving || (!newPettyCash.holder.trim() && !newPettyCash.project.trim())}
              onClick={() => void addPettyCash()}
              className="nexa-btn-primary w-full py-2 disabled:opacity-50"
            >
              ثبت تنخواه
            </button>
          </div>
          <div className="nexa-card p-4 lg:col-span-2">
            <h3 className="text-sm font-black text-gray-900 mb-3">لیست و گردش تنخواه‌گردان‌ها</h3>
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-nexa-border">
                  <th className="py-2">تنخواه‌گردان</th>
                  <th className="py-2">عنوان / پروژه</th>
                  <th className="py-2">سقف تنخواه</th>
                  <th className="py-2">مانده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {pettyCash.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-gray-400">
                      هنوز تنخواهی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  pettyCash.map((x) => (
                    <tr key={x.id}>
                      <td className="py-2">{x.holderName || '—'}</td>
                      <td className="py-2">{x.title}</td>
                      <td className="py-2 font-fa-num">{fm(x.limitAmount)}</td>
                      <td className="py-2 font-fa-num">{fm(x.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'transfer-create' && (
        <div className="nexa-card p-5 max-w-3xl space-y-3">
          <h3 className="text-sm font-black text-gray-900">ثبت انتقال وجه</h3>
          {sources.length === 0 ? (
            <p className="text-xs text-gray-500">ابتدا حداقل یک بانک، صندوق یا تنخواه تعریف کنید.</p>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-2">
                <select
                  value={newTransfer.from}
                  onChange={(e) => setNewTransfer((x) => ({ ...x, from: e.target.value }))}
                  className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">مبدا</option>
                  {sources.map((x) => (
                    <option key={`f-${x}`} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <select
                  value={newTransfer.to}
                  onChange={(e) => setNewTransfer((x) => ({ ...x, to: e.target.value }))}
                  className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">مقصد</option>
                  {sources.map((x) => (
                    <option key={`t-${x}`} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newTransfer.amount}
                  onChange={(e) => setNewTransfer((x) => ({ ...x, amount: e.target.value }))}
                  placeholder="مبلغ"
                  className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
                />
              </div>
              <input
                value={newTransfer.description}
                onChange={(e) => setNewTransfer((x) => ({ ...x, description: e.target.value }))}
                placeholder="شرح انتقال (اختیاری)"
                className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={saving || !newTransfer.from || !newTransfer.to || !Number(newTransfer.amount)}
                onClick={() => void addTransfer()}
                className="nexa-btn-primary px-4 py-2 disabled:opacity-50"
              >
                ثبت انتقال
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'transfer-list' && (
        <div className="nexa-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو انتقال"
                className="w-full bg-gray-50 rounded-xl pr-8 pl-3 py-2 text-sm"
              />
            </div>
            <button type="button" onClick={exportTransfers} className="text-xs font-bold text-nexa-accent whitespace-nowrap">
              خروجی CSV
            </button>
          </div>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-nexa-border">
                <th className="py-2">تاریخ</th>
                <th className="py-2">مبدا</th>
                <th className="py-2">مقصد</th>
                <th className="py-2">مبلغ</th>
                <th className="py-2">شرح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-gray-400">
                    انتقالی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((x) => (
                  <tr key={x.id}>
                    <td className="py-2 font-fa-num">{x.date || '—'}</td>
                    <td className="py-2">{x.fromSource}</td>
                    <td className="py-2">{x.toTarget}</td>
                    <td className="py-2 font-fa-num">{fm(x.amount)}</td>
                    <td className="py-2 text-xs text-gray-500">{x.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {(mode === 'checks-received' || mode === 'checks-paid') && (
        <div className="nexa-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-gray-900">
              {mode === 'checks-received' ? 'لیست چک‌های دریافتی' : 'لیست چک‌های پرداختی'}
            </h3>
            <button
              type="button"
              onClick={() => exportChecks(mode === 'checks-received' ? 'received' : 'paid')}
              className="text-xs font-bold text-nexa-accent"
            >
              خروجی CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-gray-50 p-3 rounded-2xl">
            <input
              value={newCheck.checkNo}
              onChange={(e) => setNewCheck((x) => ({ ...x, checkNo: e.target.value }))}
              placeholder="شماره چک"
              className="bg-white rounded-xl px-3 py-2 text-xs font-fa-num"
            />
            <input
              value={newCheck.bankName}
              onChange={(e) => setNewCheck((x) => ({ ...x, bankName: e.target.value }))}
              placeholder="بانک"
              className="bg-white rounded-xl px-3 py-2 text-xs"
            />
            <input
              value={newCheck.counterparty}
              onChange={(e) => setNewCheck((x) => ({ ...x, counterparty: e.target.value }))}
              placeholder="طرف حساب"
              className="bg-white rounded-xl px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={newCheck.amount}
              onChange={(e) => setNewCheck((x) => ({ ...x, amount: e.target.value }))}
              placeholder="مبلغ"
              className="bg-white rounded-xl px-3 py-2 text-xs font-fa-num"
            />
            <input
              value={newCheck.dueDate}
              onChange={(e) => setNewCheck((x) => ({ ...x, dueDate: e.target.value }))}
              placeholder="سررسید"
              className="bg-white rounded-xl px-3 py-2 text-xs font-fa-num"
            />
            <button
              type="button"
              disabled={saving || !newCheck.checkNo.trim() || !Number(newCheck.amount)}
              onClick={() => void addCheck(mode === 'checks-received' ? 'receivable' : 'payable')}
              className="nexa-btn-primary text-xs py-2 disabled:opacity-50"
            >
              ثبت چک
            </button>
          </div>

          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-nexa-border">
                <th className="py-2">شماره چک</th>
                <th className="py-2">بانک</th>
                <th className="py-2">تاریخ</th>
                <th className="py-2">سررسید</th>
                <th className="py-2">طرف حساب</th>
                <th className="py-2">مبلغ</th>
                <th className="py-2">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border">
              {(mode === 'checks-received' ? checksReceived : checksPaid).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-gray-400">
                    چکی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                (mode === 'checks-received' ? checksReceived : checksPaid).map((x) => (
                  <tr key={x.id}>
                    <td className="py-2 font-fa-num">{x.checkNo}</td>
                    <td className="py-2">{x.bankName || '—'}</td>
                    <td className="py-2 font-fa-num">{x.issueDate || '—'}</td>
                    <td className="py-2 font-fa-num">{x.dueDate || '—'}</td>
                    <td className="py-2">{x.counterparty || '—'}</td>
                    <td className="py-2 font-fa-num">{fm(x.amount)}</td>
                    <td className="py-2">
                      <select
                        value={x.status}
                        onChange={(e) => void updateCheckStatus(x.id, e.target.value as ApiCheck['status'])}
                        className="bg-gray-50 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="pending">در جریان</option>
                        <option value="cleared">وصول شده</option>
                        <option value="bounced">برگشتی</option>
                        <option value="endorsed">خرج شده</option>
                        <option value="cancelled">ابطال شده</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {mode === 'cash-report' && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="nexa-card p-4">
            <h3 className="text-sm font-black text-gray-900 mb-2">خلاصه جریان نقد</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>دریافت‌ها</span>
                <span className="font-fa-num">{fm(cashFlowSummary.inflow)}</span>
              </li>
              <li className="flex justify-between">
                <span>پرداخت‌ها</span>
                <span className="font-fa-num">{fm(cashFlowSummary.outflow)}</span>
              </li>
              <li className="flex justify-between font-black">
                <span>خالص</span>
                <span className="font-fa-num">{fm(cashFlowSummary.net)}</span>
              </li>
            </ul>
          </div>
          <div className="nexa-card p-4">
            <h3 className="text-sm font-black text-gray-900 mb-2">تجمیع نقدینگی</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>جمع کل بانک‌ها</span>
                <span className="font-fa-num">{fm(banks.reduce((s, b) => s + b.balance, 0))}</span>
              </li>
              <li className="flex justify-between">
                <span>جمع کل صندوق‌ها و تنخواه</span>
                <span className="font-fa-num">
                  {fm(cashboxes.reduce((s, b) => s + b.balance, 0) + pettyCash.reduce((s, b) => s + b.balance, 0))}
                </span>
              </li>
              <li className="flex justify-between">
                <span>چک‌های در جریان دریافتی</span>
                <span className="font-fa-num">
                  {fm(checksReceived.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0))}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-gray-900">جزئیات تراکنش</h4>
              <button type="button" onClick={() => setActiveDoc(null)} className="text-xs text-gray-500">
                بستن
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p className="text-gray-500">شماره مرجع</p>
              <p className="font-bold">{activeDoc.referenceNo || activeDoc.id}</p>
              <p className="text-gray-500">تاریخ</p>
              <p className="font-fa-num">{activeDoc.date || '—'}</p>
              <p className="text-gray-500">شرح</p>
              <p>{activeDoc.description || activeDoc.counterpartyName || '—'}</p>
              <p className="text-gray-500">مبلغ</p>
              <p className="font-fa-num">{fm(activeDoc.amount)}</p>
              <p className="text-gray-500">نوع</p>
              <p>{activeDoc.type === 'deposit' || activeDoc.type === 'transfer_in' ? 'دریافت' : 'پرداخت'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
