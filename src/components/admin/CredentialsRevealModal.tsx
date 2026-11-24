'use client';

import React, { useState } from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import AdminModal from '@/src/components/admin/AdminModal';
import type { ProvisionCredentials } from '@/src/lib/admin/client';

type CredentialsRevealModalProps = {
  open: boolean;
  onClose: () => void;
  credentials: ProvisionCredentials | null;
  onCopy?: () => void | Promise<void>;
};

export default function CredentialsRevealModal({
  open,
  onClose,
  credentials,
  onCopy,
}: CredentialsRevealModalProps) {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const copyText = [
    `mobile: ${credentials.mobilePhone}`,
    `username: ${credentials.username}`,
    credentials.password ? `password: ${credentials.password}` : null,
    credentials.loginHint,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-amber-500" />
          اطلاعات ورود (یک‌بار)
        </span>
      }
      maxWidth="sm"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-nexa-accent text-white"
        >
          متوجه شدم
        </button>
      }
    >
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
        این اطلاعات فقط یک‌بار نمایش داده می‌شود. کاربر با <strong>همان موبایل</strong> کد پیامکی می‌گیرد.
      </p>
      <div className="space-y-2 text-sm bg-gray-50 rounded-xl p-4">
        <p>
          <span className="text-gray-500">موبایل:</span>{' '}
          <strong className="dir-ltr inline-block">{credentials.mobilePhone}</strong>
        </p>
        <p className="text-xs text-gray-500">{credentials.loginHint}</p>
        {credentials.password && (
          <p className="dir-ltr text-xs">
            رمز پشتیبان: <strong>{credentials.password}</strong>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`mt-4 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border ${
          copied ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-nexa-accent border-gray-200'
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'کپی شد' : 'کپی اطلاعات'}
      </button>
    </AdminModal>
  );
}
