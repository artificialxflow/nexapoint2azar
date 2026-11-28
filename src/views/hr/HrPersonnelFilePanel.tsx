'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { openLocalAttachment, uploadAttachment } from '@/src/lib/attachments/client';
import {
  PERSONNEL_DOC_KEYS,
  PERSONNEL_DOC_LABELS,
  incompleteDocCount,
  type PersonnelDocKey,
  type PersonnelDocRecord,
  type PersonnelFilePayload,
} from '@/src/lib/meizito/personnel-file-service';

const MAX_FILE_BYTES = 15 * 1024 * 1024;

type Props = {
  businessId: string | null;
  employees: { id: string; name: string }[];
  currentUserId?: string;
  canManage: boolean;
};

export default function HrPersonnelFilePanel({
  businessId,
  employees,
  currentUserId,
  canManage,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [payload, setPayload] = useState<PersonnelFilePayload>({});
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [loadDenied, setLoadDenied] = useState(false);

  useEffect(() => {
    if (!selectedUserId && currentUserId) setSelectedUserId(currentUserId);
    else if (!selectedUserId && employees[0]) setSelectedUserId(employees[0].id);
  }, [currentUserId, employees, selectedUserId]);

  const loadFile = useCallback(async () => {
    if (!businessId || !selectedUserId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/personnel-files/${encodeURIComponent(selectedUserId)}`,
        { credentials: 'include' }
      );
      if (res.status === 403) {
        setLoadDenied(true);
        setCanEdit(false);
        setCanReview(false);
        setPayload({});
        return;
      }
      setLoadDenied(false);
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: {
          file?: { payload?: PersonnelFilePayload };
          access?: { canEdit?: boolean; canReview?: boolean };
        };
      };
      setPayload(json.data?.file?.payload ?? {});
      setCanEdit(Boolean(json.data?.access?.canEdit));
      setCanReview(Boolean(json.data?.access?.canReview));
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedUserId]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  const persist = async (next: PersonnelFilePayload) => {
    if (!businessId || !selectedUserId) return false;
    setSaveMsg('');
    const res = await fetch(
      `/api/businesses/${encodeURIComponent(businessId)}/personnel-files/${encodeURIComponent(selectedUserId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: next }),
      }
    );
    if (res.ok) {
      setPayload(next);
      setSaveMsg('پرونده ذخیره شد.');
      return true;
    }
    setSaveMsg('ذخیره ناموفق بود.');
    return false;
  };

  const save = () => void persist(payload);

  const setDocRecord = (key: PersonnelDocKey, rec: PersonnelDocRecord | undefined) => {
    setPayload((p) => {
      const documents = { ...(p.documents ?? {}) };
      if (rec) documents[key] = rec;
      else delete documents[key];
      return { ...p, documents };
    });
  };

  const missing = incompleteDocCount(payload);
  const readOnly = !canEdit;

  if (!businessId) {
    return <p className="text-xs text-gray-500">پرونده پرسنلی به کسب‌وکار فعال نیاز دارد.</p>;
  }

  return (
    <div className="nexa-card p-6 space-y-4" data-testid="hr-personnel-file">
      <MotionTitle />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-gray-500">پرسنل:</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
          disabled={!canManage && employees.length <= 1}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {missing > 0 && <MotionBanner missing={missing} />}

      {loadDenied && (
        <p className="text-xs text-rose-700 bg-rose-50 rounded-xl px-3 py-2">دسترسی به این پرونده مجاز نیست.</p>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">بارگذاری…</p>
      ) : (
        <ul className="space-y-3">
          {PERSONNEL_DOC_KEYS.map((key) => (
            <PersonnelDocRow
              key={key}
              docKey={key}
              label={PERSONNEL_DOC_LABELS[key]}
              record={payload.documents?.[key]}
              legacyChecked={Boolean(payload[key])}
              readOnly={readOnly}
              canReview={canReview}
              onUpload={async (file) => {
                if (file.size > MAX_FILE_BYTES) {
                  setSaveMsg('حجم فایل بیش از ۱۵ مگابایت است.');
                  return;
                }
                const scope = `personnel/${businessId}/${selectedUserId}/${key}`;
                const attachment = await uploadAttachment(file, scope);
                const next: PersonnelFilePayload = {
                  ...payload,
                  documents: {
                    ...(payload.documents ?? {}),
                    [key]: { attachment, status: 'pending' },
                  },
                };
                await persist(next);
              }}
              onReview={async (status, reviewNote) => {
                const rec = payload.documents?.[key];
                if (!rec?.attachment) return;
                const next: PersonnelFilePayload = {
                  ...payload,
                  documents: {
                    ...(payload.documents ?? {}),
                    [key]: { ...rec, status, reviewNote },
                  },
                  ...(status === 'approved' ? { [key]: true } : {}),
                };
                await persist(next);
              }}
              onOpen={() => {
                const att = payload.documents?.[key]?.attachment;
                if (att) void openLocalAttachment(att);
              }}
              onLegacyToggle={() => {
                setPayload((p) => ({ ...p, [key]: !p[key] }));
              }}
            />
          ))}
        </ul>
      )}

      <textarea
        value={payload.notes ?? ''}
        onChange={(e) => setPayload((p) => ({ ...p, notes: e.target.value }))}
        rows={3}
        placeholder="یادداشت HR"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs"
        readOnly={readOnly}
      />

      <CustomFieldsBlock
        fields={payload.customFields ?? {}}
        readOnly={readOnly}
        onChange={(customFields) => setPayload((p) => ({ ...p, customFields }))}
      />

      {!readOnly && (
        <button type="button" onClick={() => void save()} className="nexa-btn-primary text-xs font-bold px-4 py-2">
          ذخیره یادداشت / فیلدهای سفارشی
        </button>
      )}
      {saveMsg && <p className="text-[10px] font-bold text-gray-600">{saveMsg}</p>}
      {(payload.approvedRequestIds?.length ?? 0) > 0 && (
        <p className="text-[10px] text-gray-600 font-fa-num">
          درخواست‌های تأییدشده در پرونده: {payload.approvedRequestIds!.length}
        </p>
      )}
      <p className="text-[9px] text-gray-400">
        مدارک روی دیسک (`NEXA_STORAGE_ROOT`) · فرمساز Settings در فاز بعد.
      </p>
    </div>
  );
}

function PersonnelDocRow({
  docKey,
  label,
  record,
  legacyChecked,
  readOnly,
  canReview,
  onUpload,
  onReview,
  onOpen,
  onLegacyToggle,
}: {
  docKey: PersonnelDocKey;
  label: string;
  record?: PersonnelDocRecord;
  legacyChecked: boolean;
  readOnly: boolean;
  canReview: boolean;
  onUpload: (file: File) => Promise<void>;
  onReview: (status: 'approved' | 'rejected', note?: string) => Promise<void>;
  onOpen: () => void;
  onLegacyToggle: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const status = record?.status;
  const statusFa =
    status === 'approved'
      ? 'تأیید شده'
      : status === 'rejected'
        ? 'رد شده'
        : status === 'pending'
          ? 'منتظر بررسی'
          : record?.attachment
            ? 'آپلود شده'
            : legacyChecked
              ? 'تیک دستی (قدیمی)'
              : 'ندارد';

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      alert('آپلود ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      className="nexa-card p-3 border border-nexa-border space-y-2"
      data-testid={`hr-personnel-doc-${docKey}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <FileText size={14} className="text-gray-400 shrink-0" />
        <span className="text-sm font-bold text-gray-900 flex-1 min-w-[8rem]">{label}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">{statusFa}</span>
      </div>
      {record?.attachment && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={onOpen}
            className="text-[10px] font-bold text-nexa-accent hover:underline truncate max-w-full text-start"
          >
            {record.attachment.name} — مشاهده / دانلود
          </button>
          {record.attachment.url &&
            (record.attachment.mimeType?.startsWith('image/') ||
              /\.(png|jpe?g|webp|gif)$/i.test(record.attachment.name)) && (
              <img
                src={record.attachment.url}
                alt={record.attachment.name}
                className="max-h-24 rounded-lg border border-nexa-border object-contain"
              />
            )}
        </div>
      )}
      {record?.reviewNote && status === 'rejected' && (
        <p className="text-[10px] text-rose-700">{record.reviewNote}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => void pickFile(e)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="text-[10px] font-bold flex items-center gap-1 text-nexa-accent"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              آپلود
            </button>
          </>
        )}
        {canReview && record?.status === 'pending' && record.attachment && (
          <>
            <button
              type="button"
              onClick={() => void onReview('approved')}
              className="text-[10px] font-bold flex items-center gap-1 text-emerald-700"
            >
              <Check size={12} />
              تأیید
            </button>
            <button
              type="button"
              onClick={() => {
                const note = window.prompt('دلیل رد (اختیاری)') ?? '';
                void onReview('rejected', note || undefined);
              }}
              className="text-[10px] font-bold flex items-center gap-1 text-rose-700"
            >
              <X size={12} />
              رد
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function MotionTitle() {
  return (
    <>
      <h3 className="text-lg font-black text-gray-900">پرونده پرسنلی</h3>
      <p className="text-xs text-gray-500">آپلود پرسنل · تأیید/رد مدیر مستقیم یا ادمین</p>
    </>
  );
}

function CustomFieldsBlock({
  fields,
  readOnly,
  onChange,
}: {
  fields: Record<string, string>;
  readOnly: boolean;
  onChange: (next: Record<string, string>) => void;
}) {
  const entries = Object.entries(fields);
  const updateKey = (oldKey: string, newKey: string, value: string) => {
    const next = { ...fields };
    delete next[oldKey];
    if (newKey.trim()) next[newKey.trim()] = value;
    onChange(next);
  };
  const updateValue = (key: string, value: string) => {
    onChange({ ...fields, [key]: value });
  };
  const remove = (key: string) => {
    const next = { ...fields };
    delete next[key];
    onChange(next);
  };
  const add = () => {
    onChange({ ...fields, [`field_${Object.keys(fields).length + 1}`]: '' });
  };

  return (
    <div className="space-y-2 pt-2 border-t border-nexa-border">
      <p className="text-xs font-black text-gray-800">فیلدهای تکمیلی (گسترش‌پذیر)</p>
      {entries.length === 0 && <p className="text-[10px] text-gray-400">فیلد سفارشی ثبت نشده.</p>}
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap gap-2 items-center">
          <input
            value={key}
            onChange={(e) => updateKey(key, e.target.value, value)}
            placeholder="نام فیلد"
            className="flex-1 min-w-[8rem] bg-gray-50 rounded-xl px-2 py-1.5 text-[10px] font-bold"
            readOnly={readOnly}
          />
          <input
            value={value}
            onChange={(e) => updateValue(key, e.target.value)}
            placeholder="مقدار"
            className="flex-[2] min-w-[10rem] bg-gray-50 rounded-xl px-2 py-1.5 text-[10px]"
            readOnly={readOnly}
          />
          {!readOnly && (
            <button type="button" onClick={() => remove(key)} className="text-[10px] text-rose-600 font-bold">
              حذف
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={add} className="text-[10px] font-bold text-nexa-accent">
          + فیلد سفارشی
        </button>
      )}
    </div>
  );
}

function MotionBanner({ missing }: { missing: number }) {
  return (
    <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
      <AlertCircle size={14} />
      {missing} مدرک هنوز تأیید نشده — پس از آپلود منتظر بررسی مدیر بمانید.
    </p>
  );
}