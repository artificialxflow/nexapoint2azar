'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import AdminToast, { useAdminToast } from '@/src/components/admin/AdminToast';
import type { AdminRoleRow } from '@/src/views/settings/access/types';
import {
  approveAccessRequest,
  fetchAccessRequests,
  rejectAccessRequest,
} from '@/src/lib/admin/client';

type Row = {
  id: string;
  mobilePhone: string;
  displayName: string | null;
  status: string;
  createdAt: string;
};

type Props = {
  roles: AdminRoleRow[];
  canWrite: boolean;
};

export default function PendingAccessPanel({ roles, canWrite }: Props) {
  const { message, error, toast, dismiss } = useAdminToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const defaultRole = roles.find((r) => r.slug === 'sales')?.id ?? roles[0]?.id ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAccessRequests('pending');
      setRows(list);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'بارگذاری ناموفق', true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string, systemRoleId: string) => {
    setActingId(id);
    try {
      await approveAccessRequest(id, { systemRoleId });
      toast('کاربر تأیید و فعال شد.');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا', true);
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    setActingId(id);
    try {
      await rejectAccessRequest(id);
      toast('درخواست رد شد.');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا', true);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 border border-dashed border-amber-200 rounded-2xl p-4 bg-amber-50/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-gray-800">درخواست‌های ورود (در انتظار تأیید)</h3>
        <button
          type="button"
          onClick={() => load()}
          className="p-2 rounded-xl border bg-white text-gray-500 hover:text-nexa-accent"
          aria-label="بروزرسانی"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <AdminToast message={message} error={error} onDismiss={dismiss} />
      {loading && rows.length === 0 ? (
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> در حال بارگذاری…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500">درخواستی در انتظار نیست.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 justify-between bg-white rounded-xl border px-3 py-2 text-sm"
            >
              <div>
                <span className="font-bold dir-ltr">{r.mobilePhone}</span>
                <span className="text-[10px] text-gray-400 block">
                  {new Date(r.createdAt).toLocaleString('fa-IR')}
                </span>
              </div>
              {canWrite && (
                <div className="flex items-center gap-2">
                  <select
                    defaultValue={defaultRole}
                    id={`role-${r.id}`}
                    className="text-xs bg-gray-50 rounded-lg px-2 py-1 border"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nameFa}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={actingId === r.id}
                    onClick={() => {
                      const sel = document.getElementById(`role-${r.id}`) as HTMLSelectElement;
                      approve(r.id, sel?.value || defaultRole);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <Check size={12} /> تأیید
                  </button>
                  <button
                    type="button"
                    disabled={actingId === r.id}
                    onClick={() => reject(r.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold text-red-600 disabled:opacity-50"
                  >
                    <X size={12} /> رد
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
