'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  History,
  User,
  MapPin,
  Building2,
  ShieldCheck,
  Clock,
  CreditCard,
  Phone,
  Car,
  X,
  FileText,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { useAuth } from '@/src/context/AuthContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiInquiry = {
  id: string;
  inquiryNo: string;
  subject: string;
  requesterName: string;
  requesterPhone: string;
  source: string;
  category: string;
  status: 'new' | 'in_review' | 'quoted' | 'closed';
  responseNote: string;
  createdAt: string;
};

type InquiriesPayload = {
  inquiries: ApiInquiry[];
  summary: { total: number; open: number; quoted: number; totalValue: number };
};

const inquiryTypes = [
  { id: 'postal', label: 'کد پستی', icon: MapPin, color: 'bg-blue-50 text-blue-600', placeholder: 'کد پستی ۱۰ رقمی...' },
  { id: 'national_id', label: 'کد ملی', icon: User, color: 'bg-emerald-50 text-emerald-600', placeholder: 'کد ملی ۱۰ رقمی...' },
  { id: 'company_id', label: 'شناسه ملی شرکت', icon: Building2, color: 'bg-purple-50 text-purple-600', placeholder: 'شناسه ملی ۱۱ رقمی...' },
  { id: 'bank_account', label: 'شماره شبا', icon: CreditCard, color: 'bg-amber-50 text-amber-600', placeholder: 'شماره شبا ۲۴ رقمی بدون IR...' },
  { id: 'mobile', label: 'مالکیت موبایل', icon: Phone, color: 'bg-rose-50 text-rose-600', placeholder: 'شماره موبایل با 09...' },
  { id: 'plate', label: 'پلاک خودرو', icon: Car, color: 'bg-indigo-50 text-indigo-600', placeholder: 'شماره پلاک...' },
];

function validateInquiryInput(typeId: string, raw: string): { valid: boolean; message: string } {
  const digits = raw.replace(/\D/g, '');
  if (typeId === 'national_id') {
    if (digits.length !== 10 || /^(\d)\1{9}$/.test(digits)) {
      return { valid: false, message: 'فرمت کد ملی ۱۰ رقمی نامعتبر است.' };
    }
    const check = Number(digits[9]);
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
    const rem = sum % 11;
    const ok = (rem < 2 && check === rem) || (rem >= 2 && check === 11 - rem);
    return ok
      ? { valid: true, message: 'ساختار و رقم کنترلی کد ملی معتبر است و در تاریخچه ثبت شد.' }
      : { valid: false, message: 'رقم کنترلی کد ملی نادرست است.' };
  }
  if (typeId === 'postal') {
    return digits.length === 10
      ? { valid: true, message: 'ساختار کد پستی ۱۰ رقمی معتبر است و در تاریخچه ثبت شد.' }
      : { valid: false, message: 'کد پستی باید دقیقاً ۱۰ رقم باشد.' };
  }
  if (typeId === 'company_id') {
    return digits.length === 11
      ? { valid: true, message: 'ساختار شناسه ملی ۱۱ رقمی معتبر است و در تاریخچه ثبت شد.' }
      : { valid: false, message: 'شناسه ملی شرکت باید دقیقاً ۱۱ رقم باشد.' };
  }
  if (typeId === 'bank_account') {
    return digits.length === 24
      ? { valid: true, message: 'ساختار شماره شبا ۲۴ رقمی معتبر است و در تاریخچه ثبت شد.' }
      : { valid: false, message: 'شماره شبا (بدون IR) باید ۲۴ رقم باشد.' };
  }
  if (typeId === 'mobile') {
    return /^09\d{9}$/.test(digits)
      ? { valid: true, message: 'ساختار شماره موبایل معتبر است و در تاریخچه ثبت شد.' }
      : { valid: false, message: 'شماره موبایل باید ۱۱ رقم و با 09 شروع شود.' };
  }
  return raw.trim().length >= 4
    ? { valid: true, message: 'استعلام ثبت و در تاریخچه ذخیره شد.' }
    : { valid: false, message: 'لطفاً مقدار کامل‌تری وارد کنید.' };
}

export default function Inquiries() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;
  const { user } = useAuth();

  const [activeType, setActiveType] = useState('postal');
  const [inputValue, setInputValue] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<ApiInquiry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<null | { status: 'success' | 'error'; title: string; desc: string }>(null);

  const loadHistory = useCallback(async () => {
    if (!activeBusinessId) {
      setHistoryList([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/inquiries`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<InquiriesPayload>(res);
      setHistoryList(data.inquiries);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'خطا در دریافت تاریخچه استعلام‌ها');
    } finally {
      setHistoryLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const activeTypeData = inquiryTypes.find((t) => t.id === activeType);

  const handleInquiry = async () => {
    if (!inputValue.trim() || !activeBusinessId) return;
    setIsLoading(true);
    setResult(null);
    setErrorMsg(null);
    try {
      const check = validateInquiryInput(activeType, inputValue.trim());
      const res = await fetch(`/api/businesses/${activeBusinessId}/inquiries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: inputValue.trim(),
          requesterName: user?.displayName || user?.username || 'کاربر سیستم',
          category: activeTypeData?.label || activeType,
          source: 'سامانه استعلام',
          responseNote: check.valid ? 'معتبر' : 'نامعتبر',
        }),
      });
      await parseApiJson(res);
      setResult({
        status: check.valid ? 'success' : 'error',
        title: check.valid ? 'نتیجه بررسی: معتبر' : 'نتیجه بررسی: نامعتبر',
        desc: check.message,
      });
      await loadHistory();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت استعلام');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">استعلام‌های هوشمند</h1>
          <p className="text-gray-500 mt-1">بررسی صحت ساختار اطلاعات هویتی، پستی و بانکی و ثبت تاریخچه</p>
        </div>
        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="bg-white border border-nexa-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <History size={18} />
          تاریخچه کامل ({historyList.length.toLocaleString('fa-IR')})
        </button>
      </div>

      {errorMsg ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">{errorMsg}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="nexa-card p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {inquiryTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setActiveType(type.id);
                    setResult(null);
                    setInputValue('');
                  }}
                  className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all border-2 ${
                    activeType === type.id
                      ? 'border-nexa-accent bg-nexa-accent/5'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type.color}`}>
                    <type.icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-900">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 mr-1">{activeTypeData?.label} را وارد کنید</label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pr-4 pl-28 text-lg font-black font-fa-num focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                    placeholder={activeTypeData?.placeholder}
                  />
                  <button
                    type="button"
                    onClick={() => void handleInquiry()}
                    disabled={isLoading || !inputValue.trim()}
                    className="absolute left-2 top-2 bottom-2 px-6 bg-nexa-primary text-white rounded-xl font-bold text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : null}
                    استعلام
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-6 border rounded-2xl flex items-center gap-4 ${
                      result.status === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        result.status === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {result.status === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-bold ${
                          result.status === 'success' ? 'text-emerald-900' : 'text-rose-900'
                        }`}
                      >
                        {result.title}
                      </p>
                      <p
                        className={`text-[10px] ${
                          result.status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {result.desc}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="nexa-card p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock size={18} className="text-nexa-accent" />
              آخرین استعلام‌ها
            </h3>
            <div className="space-y-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  {historyLoading ? 'در حال بارگذاری...' : 'هنوز استعلامی ثبت نشده است.'}
                </p>
              ) : (
                historyList.slice(0, 6).map((item) => {
                  const isOk = item.responseNote === 'معتبر';
                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50 rounded-2xl border border-nexa-border/50 hover:border-nexa-accent transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-gray-400">{item.category}</span>
                        <span className={`text-[10px] font-bold ${isOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.responseNote || item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-gray-900 font-fa-num">{item.subject}</p>
                        <ChevronLeft size={14} className="text-gray-300 group-hover:text-nexa-accent transition-colors" />
                      </div>
                      <p className="text-[9px] text-gray-400 font-fa-num mt-1">
                        {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
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
                  <History className="text-nexa-accent" size={20} />
                  <h3 className="text-lg font-black text-gray-900">تاریخچه کامل استعلام‌ها</h3>
                </div>
                <button type="button" onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {historyList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">تاریخچه استعلام‌ها خالی است.</p>
                ) : (
                  <div className="space-y-3">
                    {historyList.map((item) => {
                      const isOk = item.responseNote === 'معتبر';
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-nexa-border/50"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                isOk ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{item.category}</p>
                              <p className="text-sm font-black text-gray-900 font-fa-num">{item.subject}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-bold ${isOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {item.responseNote || item.status}
                            </p>
                            <p className="text-[10px] text-gray-400 font-fa-num">
                              {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-6 bg-gray-50 border-t border-nexa-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-8 py-2 bg-nexa-accent text-white rounded-xl text-sm font-bold hover:bg-nexa-accent/90 transition-colors"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
