'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarRange, Loader2, Network } from 'lucide-react';
import { useBusiness } from '@/src/context/BusinessContext';
import type { BusinessProfile, FiscalYearSettings } from '@/src/types/settings';
import {
  fetchBusinessProfile,
  fetchFiscalYears,
  patchBusinessProfile,
  saveFiscalYear,
} from '@/src/lib/settings/business-client';
import AssistantSuggestionStrip from '@/src/components/automation/AssistantSuggestionStrip';
import ProfileImageUploader from '@/src/components/media/ProfileImageUploader';
import { hintsForBusinessProfile } from '@/src/lib/automation/contextual-hints';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';

const emptyProfile = (): BusinessProfile => ({
  legalName: '',
  tradeName: '',
  nationalId: '',
  economicCode: '',
  regNo: '',
  phone: '',
  fax: '',
  address: '',
  postalCode: '',
  city: '',
  website: '',
  email: '',
});

const emptyFiscal = (): FiscalYearSettings => ({
  label: '',
  startDate: '',
  endDate: '',
});

export default function BusinessFiscalSection() {
  const { activeBusiness, refreshBusinesses } = useBusiness();
  const [bizTab, setBizTab] = useState<'general' | 'contact'>('general');
  const [business, setBusiness] = useState<BusinessProfile>(emptyProfile);
  const [fiscalYear, setFiscalYear] = useState<FiscalYearSettings>(emptyFiscal);
  const [fiscalYearId, setFiscalYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fiscalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const businessId = activeBusiness?.id;

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [p, fiscalJson] = await Promise.all([
          fetchBusinessProfile(businessId),
          fetchFiscalYears(businessId),
        ]);
        if (cancelled) return;
        setBusiness({
          legalName: p.legalName ?? '',
          tradeName: p.tradeName ?? '',
          nationalId: p.nationalId ?? '',
          economicCode: p.economicCode ?? '',
          regNo: p.regNo ?? '',
          phone: p.phone ?? '',
          fax: p.fax ?? '',
          address: p.address ?? '',
          postalCode: p.postalCode ?? '',
          city: p.city ?? '',
          website: p.website ?? '',
          email: p.email ?? '',
        });
        setLogoUrl(p.logoUrl ?? null);

        const active = fiscalJson.active;
        if (active) {
          setFiscalYearId(active.id);
          setFiscalYear({
            label: active.label,
            startDate: active.startDate,
            endDate: active.endDate,
          });
        } else {
          setFiscalYearId(null);
          setFiscalYear(emptyFiscal());
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'خطای نامشخص');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const saveProfile = useCallback(
    async (patch: Partial<BusinessProfile>) => {
      if (!businessId) return;
      setSaving(true);
      setError(null);
      try {
        await patchBusinessProfile(businessId, patch);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطای ذخیره');
      } finally {
        setSaving(false);
      }
    },
    [businessId]
  );

  const saveFiscal = useCallback(
    async (next: FiscalYearSettings) => {
      if (!businessId) return;
      setSaving(true);
      setError(null);
      try {
        const fy = await saveFiscalYear(businessId, fiscalYearId, { ...next, isActive: true });
        if (fy?.id) setFiscalYearId(fy.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطای ذخیره');
      } finally {
        setSaving(false);
      }
    },
    [businessId, fiscalYearId]
  );

  const emptyProfileFields = useMemo(() => {
    const keys = Object.keys(business) as (keyof BusinessProfile)[];
    return keys.filter((k) => !String(business[k] ?? '').trim()).length;
  }, [business]);

  const patchBusiness = (patch: Partial<BusinessProfile>) => {
    setBusiness((prev) => ({ ...prev, ...patch }));
    if (profileTimer.current) clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(() => void saveProfile(patch), 600);
  };

  const patchFiscal = (patch: Partial<FiscalYearSettings>) => {
    setFiscalYear((prev) => {
      const next = { ...prev, ...patch };
      if (fiscalTimer.current) clearTimeout(fiscalTimer.current);
      fiscalTimer.current = setTimeout(() => void saveFiscal(next), 600);
      return next;
    });
  };

  if (!businessId) {
    return <p className="text-sm text-gray-500">ابتدا یک کسب‌وکار انتخاب کنید.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 size={18} className="animate-spin" />
        بارگذاری…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="nexa-card p-4 flex flex-wrap items-center justify-between gap-3 border border-nexa-border">
        <div className="flex items-center gap-2">
          <Network size={18} className="text-nexa-accent" />
          <div>
            <p className="text-sm font-black text-gray-900">چارت سازمانی</p>
            <p className="text-[10px] text-gray-500">تعریف واحدها اینجا؛ HR و میز کار همان داده را مصرف می‌کنند.</p>
          </div>
        </div>
        <Link
          href="/dashboard/hr?tab=org"
          className="text-xs font-bold text-nexa-accent hover:underline whitespace-nowrap"
        >
          مدیریت واحدها در پرسنل ←
        </Link>
      </div>
      <AssistantSuggestionStrip hints={hintsForBusinessProfile(emptyProfileFields)} />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {saving ? (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          در حال ذخیره…
        </p>
      ) : null}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="text-nexa-accent" size={22} />
          <h2 className="text-lg font-black text-gray-900">اطلاعات کسب‌وکار</h2>
        </div>
        {activeBusiness && (activeBusiness.role === 'owner' || activeBusiness.role === 'admin') ? (
          <div className="nexa-card p-4 mb-4">
            <p className="text-xs font-bold text-gray-700 mb-3">لوگوی کسب‌وکار</p>
            <ProfileImageUploader
              purpose="business-logo"
              label={activeBusiness.name}
              imageUrl={logoUrl ?? activeBusiness.logoUrl}
              onSaved={async (fileKey, previewUrl) => {
                const patch: Partial<BusinessProfile> = { logoFileKey: fileKey };
                if (FRONTEND_ONLY && previewUrl) patch.logoUrl = previewUrl;
                await patchBusinessProfile(businessId!, patch);
                setLogoUrl(previewUrl ?? null);
                await refreshBusinesses();
              }}
            />
          </div>
        ) : null}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit mb-4">
          <button
            type="button"
            onClick={() => setBizTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              bizTab === 'general' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
            }`}
          >
            عمومی و ثبت
          </button>
          <button
            type="button"
            onClick={() => setBizTab('contact')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              bizTab === 'contact' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
            }`}
          >
            تماس و نشانی
          </button>
        </div>
        <div className="nexa-card p-6 grid md:grid-cols-2 gap-4">
          {bizTab === 'general' ? (
            <>
              <Field label="نام حقوقی" value={business.legalName} onChange={(v) => patchBusiness({ legalName: v })} />
              <Field label="نام تجاری" value={business.tradeName} onChange={(v) => patchBusiness({ tradeName: v })} />
              <Field label="شناسه ملی" value={business.nationalId} onChange={(v) => patchBusiness({ nationalId: v })} />
              <Field label="کد اقتصادی" value={business.economicCode} onChange={(v) => patchBusiness({ economicCode: v })} />
              <Field label="شماره ثبت" value={business.regNo} onChange={(v) => patchBusiness({ regNo: v })} />
            </>
          ) : (
            <>
              <Field label="تلفن" value={business.phone} onChange={(v) => patchBusiness({ phone: v })} />
              <Field label="فکس" value={business.fax} onChange={(v) => patchBusiness({ fax: v })} />
              <Field label="ایمیل" value={business.email} onChange={(v) => patchBusiness({ email: v })} className="md:col-span-2" />
              <Field label="وب‌سایت" value={business.website} onChange={(v) => patchBusiness({ website: v })} className="md:col-span-2" />
              <Field label="شهر" value={business.city} onChange={(v) => patchBusiness({ city: v })} />
              <Field label="کد پستی" value={business.postalCode} onChange={(v) => patchBusiness({ postalCode: v })} />
              <Field
                label="آدرس"
                value={business.address}
                onChange={(v) => patchBusiness({ address: v })}
                className="md:col-span-2"
                multiline
              />
            </>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="text-nexa-accent" size={22} />
          <h2 className="text-lg font-black text-gray-900">تنظیم سال مالی</h2>
        </div>
        <div className="nexa-card p-6 grid md:grid-cols-3 gap-4">
          <Field label="عنوان سال مالی" value={fiscalYear.label} onChange={(v) => patchFiscal({ label: v })} />
          <Field label="تاریخ شروع" value={fiscalYear.startDate} onChange={(v) => patchFiscal({ startDate: v })} />
          <Field label="تاریخ پایان" value={fiscalYear.endDate} onChange={(v) => patchFiscal({ endDate: v })} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className = '',
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-bold text-gray-500">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
