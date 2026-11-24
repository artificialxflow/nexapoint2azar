'use client';

import React, { useState } from 'react';
import { LEAD_STATUS_OPTIONS } from '@/src/lib/erp/crm-ui';
import type { CrmLead } from '@/src/types/crm';

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<CrmLead, 'id'>) => void;
};

export default function CrmLeadCreateModal({ open, saving, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('اینستاگرام');
  const [interest, setInterest] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    if (!name.trim()) {
      setError('نام سرنخ الزامی است.');
      return;
    }
    onCreate({
      name: name.trim(),
      source,
      interest: interest.trim(),
      registeredDate: new Date().toLocaleDateString('fa-IR'),
      status: LEAD_STATUS_OPTIONS[0],
    });
    setName('');
    setInterest('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" role="dialog">
        <h3 className="text-lg font-black">سرنخ جدید</h3>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <input
          required
          aria-required="true"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام *"
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm">
          <option value="اینستاگرام">اینستاگرام</option>
          <option value="سایت">سایت</option>
          <option value="معرفی">معرفی</option>
        </select>
        <input
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          placeholder="علاقمندی"
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="button" disabled={saving} onClick={submit} className="flex-1 nexa-btn-primary py-2 text-sm disabled:opacity-60">
            {saving ? 'ذخیره…' : 'ثبت'}
          </button>
          <button type="button" onClick={onClose} className="px-4 text-sm font-bold text-gray-500">انصراف</button>
        </div>
      </div>
    </div>
  );
}
