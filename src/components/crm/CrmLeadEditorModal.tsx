'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { LEAD_STATUS_OPTIONS } from '@/src/lib/erp/crm-ui';
import type { CrmLead } from '@/src/types/crm';

type Props = {
  open: boolean;
  lead: CrmLead | null;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Omit<CrmLead, 'id'>) => void;
};

export default function CrmLeadEditorModal({ open, lead, saving, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [interest, setInterest] = useState('');
  const [registeredDate, setRegisteredDate] = useState('');
  const [status, setStatus] = useState<string>(LEAD_STATUS_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lead) return;
    setName(lead.name);
    setSource(lead.source);
    setInterest(lead.interest);
    setRegisteredDate(lead.registeredDate);
    setStatus(lead.status);
    setError(null);
  }, [lead]);

  if (!open || !lead) return null;

  const submit = () => {
    if (!name.trim()) {
      setError('نام سرنخ الزامی است.');
      return;
    }
    onSave({
      name: name.trim(),
      source: source.trim(),
      interest: interest.trim(),
      registeredDate: registeredDate.trim(),
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="crm-lead-editor-title"
      >
        <div className="p-6 border-b border-nexa-border flex items-center justify-between">
          <h3 id="crm-lead-editor-title" className="text-lg font-black text-gray-900">ویرایش سرنخ</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl" aria-label="بستن">
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-xs font-bold text-rose-600" role="alert">{error}</p>}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">
              <span className="text-rose-500">*</span> نام سرنخ
            </label>
            <input
              required
              aria-required="true"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">منبع</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">علاقمندی</label>
            <input value={interest} onChange={(e) => setInterest(e.target.value)} className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">تاریخ ثبت</label>
            <input value={registeredDate} onChange={(e) => setRegisteredDate(e.target.value)} className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm font-fa-num" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-1">وضعیت</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm">
              {LEAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" disabled={saving} onClick={submit} className="flex-1 nexa-btn-primary py-3 disabled:opacity-60">
              {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500">انصراف</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
