'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Link2, Smartphone, User } from 'lucide-react';
import Logo from '@/src/components/Logo';

type InviteInfo = {
  role: { slug: string; nameFa: string };
  expiresAt: string;
  invitedBy: string;
  displayName?: string | null;
  credentialMode: 'self' | 'manual' | 'auto';
  presetUsername?: string | null;
  presetMobile?: string | null;
};

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteId = params.token;
  const secret = searchParams.get('t');

  const inviteUrl = useMemo(() => {
    if (!inviteId || !secret) return null;
    const q = new URLSearchParams({ t: secret });
    return `/api/invite/${inviteId}?${q.toString()}`;
  }, [inviteId, secret]);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inviteUrl) {
      setLoadError('لینک دعوت ناقص است. لینک کامل را از مدیر دریافت کنید.');
      return;
    }
    fetch(inviteUrl)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setLoadError(json.error?.message ?? 'لینک نامعتبر است.');
          return;
        }
        const info = json.data.invite as InviteInfo;
        setInvite(info);
        if (info.displayName) setDisplayName(info.displayName);
        if (info.presetMobile) setMobile(info.presetMobile);
      })
      .catch(() => setLoadError('خطا در بارگذاری لینک دعوت.'));
  }, [inviteUrl]);

  const isPreset = invite?.credentialMode === 'manual' || invite?.credentialMode === 'auto';

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inviteUrl) return;
    setSubmitError(null);
    setLoading(true);

    try {
      const body = isPreset ? {} : { mobile, displayName };

      const res = await fetch(inviteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? 'ثبت‌نام ناموفق بود.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setSubmitError('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border p-8 text-center">
          <Link2 className="mx-auto text-red-400 mb-4" size={40} />
          <p className="text-red-600 font-bold">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">در حال بارگذاری…</div>;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
          <h1 className="text-lg font-black">حساب شما ساخته شد</h1>
          <p className="text-sm text-gray-500 mt-2">اکنون با همان موبایل کد پیامکی بگیرید و وارد شوید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-nexa-border shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo />
          <h1 className="mt-4 text-xl font-black">{isPreset ? 'فعال‌سازی حساب' : 'تکمیل ثبت‌نام'}</h1>
          <p className="text-sm text-gray-500 mt-2">
            نقش: <span className="font-bold text-nexa-accent">{invite.role.nameFa}</span>
          </p>
          {invite.displayName && (
            <p className="text-sm font-bold text-gray-800 mt-2">{invite.displayName}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">دعوت‌کننده: {invite.invitedBy}</p>
        </div>

        {isPreset ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3">
              حساب از قبل آماده است. پس از فعال‌سازی با موبایل تعیین‌شده وارد شوید.
            </p>
            {invite.presetUsername && (
              <p className="text-xs dir-ltr text-gray-500">
                شناسه: <strong>{invite.presetUsername}</strong>
              </p>
            )}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="w-full bg-nexa-accent text-white rounded-2xl py-3 font-bold text-sm disabled:opacity-60"
            >
              {loading ? 'در حال فعال‌سازی…' : 'فعال‌سازی حساب'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">نام نمایشی</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3 pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-nexa-accent/20"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">شماره موبایل (ورود با پیامک)</label>
              <div className="relative">
                <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-3 pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-nexa-accent/20"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="09121234567"
                  required
                />
              </div>
            </div>

            {submitError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{submitError}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-nexa-accent text-white rounded-2xl py-3 font-bold text-sm disabled:opacity-60"
            >
              {loading ? 'در حال ثبت…' : 'ساخت حساب و ورود بعدی با پیامک'}
            </button>
          </form>
        )}

        {submitError && isPreset && (
          <div className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3 mt-4">{submitError}</div>
        )}
      </div>
    </div>
  );
}
