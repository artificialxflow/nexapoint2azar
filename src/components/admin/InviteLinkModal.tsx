'use client';

import React, { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import AdminModal from '@/src/components/admin/AdminModal';

type InviteLinkModalProps = {
  open: boolean;
  onClose: () => void;
  url: string | null;
  onCopy?: () => void;
};

export default function InviteLinkModal({ open, onClose, url, onCopy }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
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
          <Link2 size={20} className="text-nexa-accent" />
          لینک دعوت
        </span>
      }
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${
              copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'کپی شد' : 'کپی لینک'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-nexa-accent text-white"
          >
            بستن
          </button>
        </>
      }
    >
      <p className="text-xs text-gray-500 mb-2">لینک را برای کاربر ارسال کنید. اعتبار محدود دارد.</p>
      <p className="text-xs text-gray-500 break-all dir-ltr bg-gray-50 rounded-xl p-4">{url}</p>
    </AdminModal>
  );
}
