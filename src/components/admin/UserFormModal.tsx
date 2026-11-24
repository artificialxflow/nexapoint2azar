'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles, UserPlus } from 'lucide-react';
import AdminModal from '@/src/components/admin/AdminModal';

type RoleOption = { id: string; nameFa: string; slug: string };

type CredentialMode = 'manual' | 'auto' | 'self';
type DeliveryMode = 'direct' | 'invite';

type UserFormModalProps = {
  open: boolean;
  onClose: () => void;
  roles: RoleOption[];
  canInvite: boolean;
  onSubmit: (data: {
    displayName: string;
    systemRoleId: string;
    credentialMode: CredentialMode;
    delivery: DeliveryMode;
    mobilePhone: string;
    password?: string;
  }) => Promise<void>;
};

export default function UserFormModal({ open, onClose, roles, canInvite, onSubmit }: UserFormModalProps) {
  const defaultRole = roles.find((r) => r.slug === 'sales')?.id ?? roles[0]?.id ?? '';
  const [displayName, setDisplayName] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [systemRoleId, setSystemRoleId] = useState(defaultRole);
  const [credentialMode, setCredentialMode] = useState<CredentialMode>('manual');
  const [delivery, setDelivery] = useState<DeliveryMode>('direct');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDisplayName('');
    setMobilePhone('');
    setSystemRoleId(defaultRole);
    setCredentialMode('manual');
    setDelivery('direct');
    setPassword('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError('نام نمایشی الزامی است.');
      return;
    }
    if (!mobilePhone.trim()) {
      setError('شماره موبایل الزامی است (ورود با پیامک).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        displayName: displayName.trim(),
        systemRoleId,
        credentialMode: delivery === 'invite' ? 'self' : credentialMode,
        delivery,
        mobilePhone: mobilePhone.trim(),
        password: password || undefined,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <UserPlus size={20} className="text-nexa-accent" />
          افزودن کاربر
        </span>
      }
      maxWidth="lg"
      footer={
        <>
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl text-xs font-bold border">
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-nexa-accent text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {delivery === 'invite' ? 'ساخت لینک' : 'ذخیره کاربر'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
          ورود کاربران با <strong>کد پیامکی</strong> به همان شماره موبایل است. رمز فقط در صورت نیاز پشتیبان است.
        </p>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">نام و نام‌خانوادگی</label>
          <input
            placeholder="مثلاً علی رضایی"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">شماره موبایل (ورود با OTP)</label>
          <input
            placeholder="09121234567"
            dir="ltr"
            inputMode="tel"
            value={mobilePhone}
            onChange={(e) => setMobilePhone(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">نقش سیستمی</label>
          <select
            value={systemRoleId || defaultRole}
            onChange={(e) => setSystemRoleId(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nameFa}
              </option>
            ))}
          </select>
        </div>

        {delivery === 'direct' && (
          <div>
            <p className="text-xs font-bold text-gray-600 mb-2">رمز پشتیبان (اختیاری)</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(
                [
                  ['manual', 'بدون رمز / دستی'],
                  ['auto', 'ساخت خودکار رمز'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCredentialMode(mode)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                    credentialMode === mode ? 'bg-nexa-accent text-white border-nexa-accent' : 'bg-white'
                  }`}
                >
                  {mode === 'auto' && <Sparkles size={12} className="inline ml-1" />}
                  {label}
                </button>
              ))}
            </div>
            {credentialMode === 'manual' && (
              <input
                type="password"
                placeholder="رمز پشتیبان (اختیاری)"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-sm"
              />
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-gray-600 mb-2">تحویل</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['direct', 'ساخت فوری (بدون لینک)'],
                ['invite', 'ارسال لینک دعوت'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                disabled={!canInvite && mode === 'invite'}
                onClick={() => setDelivery(mode)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border disabled:opacity-40 ${
                  delivery === mode ? 'bg-nexa-primary text-white border-nexa-primary' : 'bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {delivery === 'invite' && (
            <p className="text-[10px] text-gray-500 mt-2">
              کاربر با لینک، موبایل خود را تأیید می‌کند و حساب فعال می‌شود.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      </div>
    </AdminModal>
  );
}
