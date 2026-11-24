'use client';

import React, { useEffect, useState } from 'react';
import { CrmRequiredLabel } from '@/src/components/crm/CrmRequiredLabel';
import { normalizePhone } from '@/src/lib/pricing';
import type { CrmVisit } from '@/src/types/crm';

type Props = {
  open: boolean;
  visit: CrmVisit | null;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Omit<CrmVisit, 'id'>) => void;
};

export default function CrmVisitEditorModal({ open, visit, saving, onClose, onSave }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [result, setResult] = useState('خنثی');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!visit) return;
    setCustomerName(visit.customerName);
    setPhone(visit.phone);
    setSource(visit.source);
    setResult(visit.result);
    setNotice(null);
  }, [visit]);

  if (!open || !visit) return null;

  const submit = () => {
    if (!customerName.trim()) {
      setNotice('نام الزامی است.');
      return;
    }
    const p = normalizePhone(phone);
    if (p.length < 10) {
      setNotice('تلفن معتبر وارد کنید.');
      return;
    }
    onSave({
      ...visit,
      customerName: customerName.trim(),
      phone: p,
      source,
      result,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3">
        <h3 className="text-lg font-black">ویرایش بازدید</h3>
        {notice && <p className="text-xs text-rose-600">{notice}</p>}
        <div>
          <CrmRequiredLabel>نام مشتری</CrmRequiredLabel>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <CrmRequiredLabel>تلفن</CrmRequiredLabel>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mt-1 font-fa-num" />
        </div>
        <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm" placeholder="منبع" />
        <select value={result} onChange={(e) => setResult(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm">
          <option value="مثبت">مثبت</option>
          <option value="خنثی">خنثی</option>
        </select>
        <div className="flex gap-2 pt-2">
          <button type="button" disabled={saving} onClick={submit} className="flex-1 nexa-btn-primary py-2 text-sm disabled:opacity-60">
            {saving ? 'ذخیره…' : 'ذخیره'}
          </button>
          <button type="button" onClick={onClose} className="px-4 text-sm font-bold text-gray-500">انصراف</button>
        </div>
      </div>
    </div>
  );
}
