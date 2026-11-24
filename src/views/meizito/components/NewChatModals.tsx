'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BusinessMemberPicker from '@/src/components/BusinessMemberPicker';
import { validateChatTitle } from '@/src/lib/meizito/chat-title';
import type { MeizitoThreadType } from '@/src/types/meizito';

type BaseProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, participants: string[]) => void;
};

function ModalShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl p-6 w-full max-w-md border border-nexa-border shadow-xl space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{title}</h3>
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function NewDirectChatModal({ open, onClose, onSubmit }: BaseProps) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState<string | undefined>();

  const submit = () => {
    if (!name.trim() || !userId) return;
    onSubmit(name.trim(), [name.trim()]);
    setName('');
    setUserId(undefined);
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="گفتگوی جدید (شخصی)">
      <BusinessMemberPicker
        value={name}
        userId={userId}
        onChange={(n, id) => {
          setName(n);
          setUserId(id);
        }}
        placeholder="انتخاب از تیم سازمان"
        allowFreeText={false}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!userId}
        className="w-full nexa-btn-primary py-2.5 text-sm font-bold disabled:opacity-50"
      >
        شروع گفتگو
      </button>
    </ModalShell>
  );
}

export function NewGroupChatModal({ open, onClose, onSubmit }: BaseProps) {
  const [title, setTitle] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [memberDraft, setMemberDraft] = useState('');
  const [titleError, setTitleError] = useState('');

  const submit = () => {
    const v = validateChatTitle(title);
    if (!v.ok) {
      setTitleError(v.message);
      return;
    }
    setTitleError('');
    onSubmit(v.title, memberNames);
    setTitle('');
    setMemberNames([]);
    setMemberDraft('');
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="گروه جدید">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setTitleError('');
        }}
        placeholder="نام گروه"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
      />
      {titleError && <p className="text-[10px] font-bold text-rose-600">{titleError}</p>}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-500">اعضای گروه</p>
        <div className="flex flex-wrap gap-1 min-h-[28px]">
          {memberNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-[10px] font-bold bg-nexa-accent/10 text-nexa-accent rounded-full px-2 py-0.5"
            >
              {name}
              <button
                type="button"
                onClick={() => setMemberNames((prev) => prev.filter((n) => n !== name))}
                aria-label="حذف"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <BusinessMemberPicker
          value={memberDraft}
          onChange={(name, id) => {
            setMemberDraft(name);
            if (!id || !name.trim()) return;
            setMemberNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
            setMemberDraft('');
          }}
          placeholder="افزودن عضو از تیم"
          allowFreeText={false}
        />
      </div>
      <button type="button" onClick={submit} className="w-full nexa-btn-primary py-2.5 text-sm font-bold">
        ساخت گروه
      </button>
    </ModalShell>
  );
}

export function NewChannelModal({ open, onClose, onSubmit }: BaseProps) {
  const [title, setTitle] = useState('');
  const [adminNames, setAdminNames] = useState<string[]>([]);
  const [adminDraft, setAdminDraft] = useState('');
  const [titleError, setTitleError] = useState('');

  const submit = () => {
    const v = validateChatTitle(title);
    if (!v.ok) {
      setTitleError(v.message);
      return;
    }
    setTitleError('');
    onSubmit(v.title, adminNames);
    setTitle('');
    setAdminNames([]);
    setAdminDraft('');
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="کانال جدید">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setTitleError('');
        }}
        placeholder="نام کانال"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
      />
      {titleError && <p className="text-[10px] font-bold text-rose-600">{titleError}</p>}
      <p className="text-[10px] text-gray-500">کانال برای اطلاع‌رسانی به تیم است؛ مدیران را از لیست تیم انتخاب کنید.</p>
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-500">مدیران کانال (اختیاری)</p>
        <div className="flex flex-wrap gap-1 min-h-[28px]">
          {adminNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-700 rounded-full px-2 py-0.5"
            >
              {name}
              <button
                type="button"
                onClick={() => setAdminNames((prev) => prev.filter((n) => n !== name))}
                aria-label="حذف"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <BusinessMemberPicker
          value={adminDraft}
          onChange={(name, id) => {
            setAdminDraft(name);
            if (!id || !name.trim()) return;
            setAdminNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
            setAdminDraft('');
          }}
          placeholder="افزودن مدیر از تیم"
          allowFreeText={false}
        />
      </div>
      <button type="button" onClick={submit} className="w-full nexa-btn-primary py-2.5 text-sm font-bold">
        ساخت کانال
      </button>
    </ModalShell>
  );
}

export function ThreadSettingsModal({
  open,
  onClose,
  threadType,
  initialTitle,
  initialParticipants,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  threadType: 'group' | 'channel';
  initialTitle: string;
  initialParticipants: string[];
  onSave: (title: string, participants: string[]) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [memberNames, setMemberNames] = useState<string[]>(initialParticipants);
  const [memberDraft, setMemberDraft] = useState('');
  const [titleError, setTitleError] = useState('');

  const submit = () => {
    const v = validateChatTitle(title);
    if (!v.ok) {
      setTitleError(v.message);
      return;
    }
    setTitleError('');
    onSave(v.title, memberNames);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={threadType === 'group' ? 'تنظیمات گروه' : 'تنظیمات کانال'}
    >
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setTitleError('');
        }}
        placeholder="عنوان"
        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
      />
      {titleError && <p className="text-[10px] font-bold text-rose-600">{titleError}</p>}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-500">
          {threadType === 'group' ? 'اعضا' : 'مدیران'}
        </p>
        <div className="flex flex-wrap gap-1 min-h-[28px]">
          {memberNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-[10px] font-bold bg-nexa-accent/10 text-nexa-accent rounded-full px-2 py-0.5"
            >
              {name}
              <button
                type="button"
                onClick={() => setMemberNames((prev) => prev.filter((n) => n !== name))}
                aria-label="حذف"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <BusinessMemberPicker
          value={memberDraft}
          onChange={(name, id) => {
            setMemberDraft(name);
            if (!id || !name.trim()) return;
            setMemberNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
            setMemberDraft('');
          }}
          placeholder="افزودن از تیم"
          allowFreeText={false}
        />
      </div>
      <button type="button" onClick={submit} className="w-full nexa-btn-primary py-2.5 text-sm font-bold">
        ذخیره
      </button>
    </ModalShell>
  );
}

export type NewChatModalKind = MeizitoThreadType | null;
