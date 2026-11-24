'use client';

import { useCallback, useState } from 'react';
import type { MoneyDocument } from '@/src/types/person';

type Kind = 'receipt' | 'payment';

export function useMoneyDocumentListActions(
  kind: Kind,
  docs: MoneyDocument[],
  replace: (doc: MoneyDocument) => void,
  remove: (id: string) => void,
  flush: (patch: { receipts?: MoneyDocument[]; payments?: MoneyDocument[] }) => Promise<boolean>
) {
  const [editing, setEditing] = useState<MoneyDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const patchKey = kind === 'receipt' ? 'receipts' : 'payments';

  const deleteDoc = useCallback(
    async (doc: MoneyDocument) => {
      if (!window.confirm(`سند «${doc.number}» حذف شود؟`)) return;
      const next = docs.filter((d) => d.id !== doc.id);
      remove(doc.id);
      setSaving(true);
      const ok = await flush({ [patchKey]: next });
      setSaving(false);
      setNotice(ok ? 'سند حذف شد.' : 'حذف در سرور ناموفق بود.');
    },
    [docs, flush, patchKey, remove]
  );

  const saveEdit = useCallback(
    async (updated: MoneyDocument) => {
      const next = docs.map((d) => (d.id === updated.id ? updated : d));
      replace(updated);
      setSaving(true);
      const ok = await flush({ [patchKey]: next });
      setSaving(false);
      if (ok) {
        setEditing(null);
        setNotice('سند به‌روزرسانی شد.');
      } else {
        setNotice('ذخیره در سرور ناموفق بود.');
      }
    },
    [docs, flush, patchKey, replace]
  );

  return { editing, setEditing, saving, notice, setNotice, deleteDoc, saveEdit };
}
