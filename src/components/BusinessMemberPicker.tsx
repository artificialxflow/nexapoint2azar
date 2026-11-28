'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import EntityAvatar from '@/src/components/media/EntityAvatar';
import { useMeizito } from '@/src/context/MeizitoContext';

type Props = {
  value: string;
  userId?: string;
  onChange: (displayName: string, userId?: string) => void;
  placeholder?: string;
  className?: string;
  /** اگر false باشد فقط انتخاب از لیست تیم */
  allowFreeText?: boolean;
  /** محدود به نام‌های مشخص (مثلاً اعضای همان میز کار) */
  restrictToMemberNames?: string[];
};

/** انتخاب عضو از team-directory (نه CRM Catalog). */
export default function BusinessMemberPicker({
  value,
  userId,
  onChange,
  placeholder = 'جستجوی عضو تیم…',
  className = '',
  allowFreeText = true,
  restrictToMemberNames,
}: Props) {
  const { listTeamDirectory } = useMeizito();
  const members = useMemo(() => {
    const all = listTeamDirectory('all');
    if (!restrictToMemberNames?.length) return all;
    const allowed = new Set(restrictToMemberNames.map((n) => n.trim()).filter(Boolean));
    return all.filter((m) => allowed.has(m.name));
  }, [listTeamDirectory, restrictToMemberNames]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const query = allowFreeText ? value : open ? draft : value;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (term
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(term) ||
            (m.jobTitle?.toLowerCase().includes(term) ?? false) ||
            (m.department?.toLowerCase().includes(term) ?? false)
        )
      : members
    ).slice(0, 16);
  }, [members, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (name: string, id: string) => {
    onChange(name, id);
    setDraft('');
    setOpen(false);
  };

  const showList = open && filtered.length > 0;

  return (
    <div ref={rootRef} className={`relative isolate ${className}`}>
      <div className="relative z-0">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            if (allowFreeText) {
              onChange(next, undefined);
            } else {
              setDraft(next);
            }
            setOpen(true);
          }}
          onFocus={() => {
            if (!allowFreeText) setDraft(value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder={placeholder}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 pr-9 text-sm"
        />
      </div>
      {userId && (
        <p className="text-[10px] text-gray-400 mt-1 font-fa-num">شناسه عضو تیم ثبت شد</p>
      )}
      {showList && (
        <ul
          className="absolute z-20 top-full mt-1 w-full bg-white border border-nexa-border rounded-xl shadow-lg max-h-40 overflow-y-auto overscroll-contain"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full flex items-center gap-2 text-right px-3 py-2 text-xs hover:bg-gray-50"
                onClick={() => pick(m.name, m.id)}
              >
                <EntityAvatar
                  imageUrl={m.avatarUrl}
                  label={m.name}
                  className="w-7 h-7"
                  rounded="full"
                />
                <span className="font-bold text-gray-800">{m.name}</span>
                {(m.jobTitle || m.department) && (
                  <span className="text-gray-400 mr-2">
                    {' '}
                    · {[m.jobTitle, m.department].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showList && <div className="h-2 shrink-0" aria-hidden />}
    </div>
  );
}