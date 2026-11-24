'use client';

import React, { useEffect, useState } from 'react';
import type { MoneyDocument } from '@/src/types/person';

type Props = {
  open: boolean;
  doc: MoneyDocument | null;
  peopleOptions: { id: string; displayName: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (doc: MoneyDocument) => void;
};

export default function MoneyDocumentEditModal({
  open,
  doc,
  peopleOptions,
  saving,
  onClose,
  onSave,
}: Props) {
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (!doc) return;
    setNumber(doc.number);
    setDate(doc.date);
    setDescription(doc.description || '');
    setPersonId(doc.lines[0]?.personId || '');
    setAmount(doc.lines[0]?.amount || 0);
  }, [doc]);

  if (!open || !doc) return null;

  const submit = () => {
    if (!number.trim()) return;
    const line = doc.lines[0] || { id: doc.id, personId: '', amount: 0, note: '' };
    onSave({
      ...doc,
      number: number.trim(),
      date,
      description: description.trim() || undefined,
      lines: [{ ...line, personId, amount: Math.max(0, amount) }],
      history: [
        ...(doc.history || []),
        {
          id: `${Date.now()}`,
          action: 'ویرایش از لیست',
          at: new Date().toISOString(),
          by: 'کاربر جاری',
        },
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" role="dialog">
        <h3 className="text-lg font-black">ویرایش سند {doc.number}</h3>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          placeholder="شماره"
        />
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
          placeholder="تاریخ"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          placeholder="شرح"
        />
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">— شخص —</option>
          {peopleOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
          placeholder="مبلغ"
        />
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="flex-1 nexa-btn-primary py-2 text-sm disabled:opacity-60"
          >
            {saving ? 'ذخیره…' : 'ذخیره'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
