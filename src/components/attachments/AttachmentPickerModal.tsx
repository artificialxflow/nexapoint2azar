'use client';

import React, { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { uploadAttachment } from '@/src/lib/attachments/client';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import type { AttachmentRef } from '@/src/types/attachment';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (ref: AttachmentRef) => void;
  scope?: string;
  title?: string;
};

export function AttachmentPickerModal({
  open,
  onClose,
  onSelect,
  scope,
  title = 'پیوست فایل',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ref = await uploadAttachment(file, scope);
      onSelect(ref);
      onClose();
    } catch {
      window.alert('آپلود ناموفق — فایل کوچک‌تری امتحان کنید.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-gray-900">{title}</p>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {FRONTEND_ONLY
            ? 'فایل در IndexedDB مرورگر (حالت نمایشی) ذخیره می‌شود.'
            : 'فایل روی سرور (دیسک NEXA_STORAGE_ROOT) ذخیره می‌شود.'}
        </p>
        {scope ? (
          <p className="text-[10px] text-gray-400 dir-ltr truncate" title={scope}>
            {scope}
          </p>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          data-testid="attachment-file-input"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          data-testid="attachment-upload-trigger"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 nexa-btn-primary py-3 text-sm disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'در حال ذخیره…' : 'انتخاب و آپلود فایل'}
        </button>
      </div>
    </div>
  );
}
