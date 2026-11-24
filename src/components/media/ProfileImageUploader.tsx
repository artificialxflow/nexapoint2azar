'use client';

import React, { useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import type { ImageUploadPurpose } from '@/src/lib/media/validate-upload-image';
import { uploadBrandingImage } from '@/src/lib/attachments/client';
import EntityAvatar from '@/src/components/media/EntityAvatar';

type Props = {
  purpose: ImageUploadPurpose;
  label: string;
  imageUrl?: string | null;
  onSaved: (fileKey: string | null, previewUrl: string | null) => void | Promise<void>;
  disabled?: boolean;
  hint?: string;
  avatarSize?: string;
  /** فقط دکمه‌ها — بدون پیش‌نمایش جدا (کنار آواتار دیگری) */
  compact?: boolean;
};

export default function ProfileImageUploader({
  purpose,
  label,
  imageUrl,
  onSaved,
  disabled,
  hint = 'JPG، PNG، WebP — حداکثر ۵ مگابایت',
  avatarSize = 'w-16 h-16',
  compact = false,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async (file: File | null) => {
    if (!file || disabled) return;
    setUploading(true);
    setError(null);
    try {
      const ref = await uploadBrandingImage(file, purpose);
      const fileKey = ref.fileKey ?? ref.id;
      const previewUrl = ref.url ?? URL.createObjectURL(file);
      await onSaved(fileKey, previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'آپلود ناموفق بود.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (disabled || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await onSaved(null, null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف ناموفق بود.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-4 ${compact ? '' : ''}`}>
      {!compact ? (
        <EntityAvatar imageUrl={imageUrl} label={label} className={avatarSize} rounded="xl" />
      ) : null}
      <div className="space-y-2 min-w-0">
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-nexa-border hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {imageUrl ? 'تغییر تصویر' : 'انتخاب تصویر'}
          </button>
          {imageUrl ? (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => void remove()}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={14} />
              حذف
            </button>
          ) : null}
        </div>
        <p className="text-[10px] text-gray-400">{hint}</p>
        {error ? <p className="text-[10px] text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}