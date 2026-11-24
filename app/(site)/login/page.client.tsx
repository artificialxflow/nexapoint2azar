'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn, MessageSquare, Smartphone, User } from 'lucide-react';
import Logo from '@/src/components/Logo';
import { useAuth } from '@/src/context/AuthContext';
import {
  FRONTEND_ONLY,
  MOCK_DEMO_PASSWORD,
  MOCK_DEMO_USERNAME,
} from '@/src/lib/frontend-config';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, loginWithCredentials, requestOtp, verifyOtp } = useAuth();
  const next = searchParams.get('next') || '/businesses';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInfo, setPendingInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<'otp' | 'password'>('otp');

  useEffect(() => {
    if (loading) return;
    if (user) router.replace(next);
  }, [loading, user, next, router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginWithCredentials(username, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(next);
    } catch {
      setError('خطا در ورود.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingInfo(null);
    setSubmitting(true);
    try {
      const result = await requestOtp(mobile);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if ('pending' in result && result.pending && result.message) {
        setPendingInfo(result.message);
        return;
      }
      setOtpSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyOtp(mobile, otpCode);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(next);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        در حال بررسی ورود…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-nexa-border shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <Logo />
          <h1 className="mt-6 text-xl font-black text-gray-900">ورود به NEXA</h1>
          <p className="text-sm text-gray-500 mt-2 text-center">
            {FRONTEND_ONLY
              ? 'نام کاربری و رمز عبور (نمایشی)'
              : loginMode === 'otp'
                ? 'ورود با کد یک‌بارمصرف پیامکی'
                : 'ورود با موبایل یا نام کاربری و رمز پشتیبان'}
          </p>
        </div>

        {!FRONTEND_ONLY && (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode('otp');
                setError(null);
                setPendingInfo(null);
                setOtpSent(false);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                loginMode === 'otp' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400'
              }`}
            >
              پیامک
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setError(null);
                setPendingInfo(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                loginMode === 'password' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400'
              }`}
            >
              رمز عبور
            </button>
          </div>
        )}

        {FRONTEND_ONLY || loginMode === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">
                {FRONTEND_ONLY ? 'نام کاربری' : 'موبایل یا نام کاربری'}
              </label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3 pr-11 pl-4 text-sm border border-transparent focus:border-nexa-accent/30 focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                  placeholder={FRONTEND_ONLY ? 'username' : '09121234567'}
                  dir="ltr"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3 pr-11 pl-4 text-sm border border-transparent focus:border-nexa-accent/30 focus:ring-2 focus:ring-nexa-accent/20 outline-none"
                  placeholder="••••••••"
                  dir="ltr"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-nexa-accent text-white rounded-2xl py-3 font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              <LogIn size={18} />
              {submitting ? 'در حال ورود…' : 'ورود'}
            </button>
            {FRONTEND_ONLY && (
              <p className="text-center text-xs text-gray-400 mt-2">
                برای تست: {MOCK_DEMO_USERNAME} / {MOCK_DEMO_PASSWORD}
              </p>
            )}
            {!FRONTEND_ONLY && (
              <p className="text-center text-xs text-gray-400 mt-2">
                فقط اگر مدیر برای شما رمز پشتیبان تعریف کرده است.
              </p>
            )}
          </form>
        ) : !otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">شماره موبایل</label>
              <div className="relative">
                <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3 pr-11 pl-4 text-sm border border-transparent focus:border-nexa-accent/30 focus:ring-2 focus:ring-nexa-accent/20 outline-none font-fa-num"
                  placeholder="09121234567"
                  dir="ltr"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}
            {pendingInfo && (
              <div className="text-sm text-sky-800 bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3">
                {pendingInfo}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-nexa-accent text-white rounded-2xl py-3 font-bold text-sm hover:opacity-90 disabled:opacity-60"
            >
              <MessageSquare size={18} />
              {submitting ? 'در حال ارسال…' : 'دریافت کد پیامکی'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-gray-500 text-center font-fa-num">کد به {mobile} ارسال شد</p>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">کد تأیید</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full bg-gray-50 rounded-2xl py-3 px-4 text-center text-lg tracking-widest font-fa-num border border-transparent focus:border-nexa-accent/30 outline-none"
                placeholder="------"
                dir="ltr"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-nexa-accent text-white rounded-2xl py-3 font-bold text-sm hover:opacity-90 disabled:opacity-60"
            >
              <LogIn size={18} />
              {submitting ? 'در حال ورود…' : 'تأیید و ورود'}
            </button>
            <button
              type="button"
              className="w-full text-xs text-nexa-accent font-bold"
              onClick={() => {
                setOtpSent(false);
                setOtpCode('');
                setError(null);
              }}
            >
              تغییر شماره یا ارسال مجدد
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
