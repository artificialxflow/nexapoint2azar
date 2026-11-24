'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Cloud,
  Mail,
  Paperclip,
  Plus,
  Reply,
  Share2,
  X,
  Search,
} from 'lucide-react';
import BusinessMemberPicker from '@/src/components/BusinessMemberPicker';
import { AttachmentPickerModal } from '@/src/components/attachments/AttachmentPickerModal';
import { attachmentScopeForMeizitoLetterDrafts } from '@/src/lib/attachments/scopes';
import { openLocalAttachment } from '@/src/lib/attachments/client';
import { useMeizito } from '@/src/context/MeizitoContext';
import type { AttachmentRef } from '@/src/types/attachment';
import type {
  MeizitoLetter,
  MeizitoLetterAttachment,
  MeizitoLetterCategory,
} from '@/src/types/meizito';
import {
  MEIZITO_APPROVAL_STATE_LABELS,
  MEIZITO_LETTER_CATEGORY_LABELS,
} from '@/src/types/meizito';
import ApprovalTimeline from '../components/ApprovalTimeline';
import ApprovalActionsBar from '../components/ApprovalActionsBar';
import AssistantSuggestionStrip from '@/src/components/automation/AssistantSuggestionStrip';
import { hintsForLetters } from '@/src/lib/automation/contextual-hints';

const CATEGORY_COLORS: Record<MeizitoLetterCategory, string> = {
  financial: 'bg-emerald-100 text-emerald-800',
  administrative: 'bg-blue-100 text-blue-800',
  hr: 'bg-purple-100 text-purple-800',
  operations: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-600',
};

const LETTER_LABEL_CHIP_COLORS = [
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-teal-100 text-teal-800',
];

function letterLabelChipClass(label: string, active: boolean) {
  if (active) return 'bg-nexa-accent text-white';
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h + label.charCodeAt(i)) % LETTER_LABEL_CHIP_COLORS.length;
  return LETTER_LABEL_CHIP_COLORS[h]!;
}

function categoryBadgeClass(slug: string): string {
  return CATEGORY_COLORS[slug as MeizitoLetterCategory] ?? 'bg-slate-100 text-slate-700';
}

type LetterCategoryRow = { id: string; slug: string; labelFa: string };

type StatusFilter = 'open' | 'all' | 'closed' | 'pending_me' | 'my_paraph';

const TEMPLATES = [
  { id: 't1', label: 'درخواست جلسه', body: 'با سلام،\nبدینوسیله درخواست جلسه در تاریخ ... را اعلام می‌کنم.' },
  { id: 't2', label: 'پیگیری', body: 'با سلام،\nجهت پیگیری موضوع ... اعلام می‌گردد.' },
];

function splitList(value: string): string[] {
  return value
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatQuote(letter: MeizitoLetter): string {
  return `\n\n---\nنامه قبلی (${letter.referredFrom || 'فرستنده'}):\n${letter.body}`;
}

function buildReplyPrefill(source: MeizitoLetter) {
  const subject = source.subject.startsWith('Re:') ? source.subject : `Re: ${source.subject}`;
  return {
    subject,
    body: formatQuote(source),
    replyToLetterId: source.id,
    threadId: source.threadId,
  };
}

type LetterPriority = 'low' | 'medium' | 'high';

const LETTER_PRIORITY_LABELS: Record<LetterPriority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
};

type LetterFormState = {
  subject: string;
  to: string;
  body: string;
  labels: string;
  category: MeizitoLetterCategory;
  referredTo: string;
  referredFrom: string;
  replyToLetterId: string;
  threadId: string;
  attachments: MeizitoLetterAttachment[];
};

const emptyForm = (referredFrom = ''): LetterFormState => ({
  subject: '',
  to: '',
  body: '',
  labels: '',
  category: 'other',
  referredTo: '',
  referredFrom,
  replyToLetterId: '',
  threadId: '',
  attachments: [],
});

export default function LettersPanel() {
  const {
    letters,
    addLetter,
    replyToLetter,
    getLetterThread,
    updateLetterBox,
    closeLetter,
    reopenLetter,
    currentUserName,
    currentUserId,
    mockUsers,
    listTeamDirectory,
    submitForApproval,
    recordApprovalAction,
    activeBusinessId,
    boards,
    columns,
    activeBoardId,
    addCard,
    updateCard,
  } = useMeizito();

  const [taskFromLetterBusy, setTaskFromLetterBusy] = useState<string | null>(null);
  const [taskFromLetterNotice, setTaskFromLetterNotice] = useState<string | null>(null);

  const createTaskFromLetter = async (l: { id: string; subject: string; body: string }) => {
    const boardId = activeBoardId ?? boards[0]?.id;
    if (!boardId) {
      setTaskFromLetterNotice('ابتدا یک میز کار در بخش وظایف بسازید.');
      return;
    }
    const col = columns
      .filter((c) => c.boardId === boardId)
      .sort((a, b) => a.order - b.order)[0];
    if (!col) {
      setTaskFromLetterNotice('میز کار ستون ندارد.');
      return;
    }
    setTaskFromLetterBusy(l.id);
    setTaskFromLetterNotice(null);
    try {
      const cardId = await addCard(boardId, col.id, l.subject.trim() || 'وظیفه از نامه');
      if (cardId && typeof cardId === 'string') {
        const desc = `[منبع: نامه ${l.id.slice(0, 8)}]\n${l.body}`.slice(0, 4000);
        updateCard(cardId, { description: desc });
        setTaskFromLetterNotice('وظیفه روی میز کار ساخته شد.');
      }
    } catch {
      setTaskFromLetterNotice('ساخت وظیفه ناموفق بود.');
    } finally {
      setTaskFromLetterBusy(null);
      window.setTimeout(() => setTaskFromLetterNotice(null), 3500);
    }
  };
  const [box, setBox] = useState<MeizitoLetter['box']>('inbox');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [letterToRecipients, setLetterToRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [referredToDraft, setReferredToDraft] = useState('');
  const [form, setForm] = useState<LetterFormState>(() => emptyForm(currentUserName));
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [customCategories, setCustomCategories] = useState<LetterCategoryRow[]>([]);
  const [showCategoryAdmin, setShowCategoryAdmin] = useState(false);
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [categoryAdminError, setCategoryAdminError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [letterPriority, setLetterPriority] = useState<LetterPriority>('medium');

  const reloadCategories = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/letter-categories`);
      const json = (await res.json()) as { data?: { categories?: LetterCategoryRow[] } };
      setCustomCategories(json.data?.categories ?? []);
    } catch {
      setCustomCategories([]);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void reloadCategories();
  }, [reloadCategories]);

  const categoryLabelBySlug = useMemo(() => {
    const map: Record<string, string> = { ...MEIZITO_LETTER_CATEGORY_LABELS };
    for (const c of customCategories) map[c.slug] = c.labelFa;
    return map;
  }, [customCategories]);

  const categorySlugs = useMemo(() => {
    const slugs = new Set<string>(Object.keys(MEIZITO_LETTER_CATEGORY_LABELS));
    for (const c of customCategories) slugs.add(c.slug);
    return [...slugs];
  }, [customCategories]);

  const addCustomCategory = async () => {
    if (!activeBusinessId) return;
    setCategoryAdminError('');
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/letter-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newCatSlug.trim(), labelFa: newCatLabel.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setCategoryAdminError(
          err?.error?.message ?? 'افزودن دسته ناموفق بود (نیاز به نقش مدیر).'
        );
        return;
      }
      setNewCatSlug('');
      setNewCatLabel('');
      await reloadCategories();
    } catch {
      setCategoryAdminError('افزودن دسته ناموفق بود.');
    }
  };

  const removeCustomCategory = async (categoryId: string) => {
    if (!activeBusinessId) return;
    try {
      await fetch(`/api/businesses/${activeBusinessId}/letter-categories/${categoryId}`, {
        method: 'DELETE',
      });
      await reloadCategories();
    } catch {
      /* ignore */
    }
  };

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    for (const l of letters) {
      for (const lb of l.labels) if (lb.trim()) set.add(lb.trim());
    }
    return [...set];
  }, [letters]);

  const openLettersCount = useMemo(
    () => letters.filter((l) => l.status === 'open' && l.box !== 'archive').length,
    [letters]
  );

  const assistantHints = useMemo(() => {
    const base = hintsForLetters(openLettersCount);
    return base.map((h) =>
      h.id === 'letters-template'
        ? {
            ...h,
            onAction: () =>
              document.getElementById('meizito-letter-form')?.scrollIntoView({ behavior: 'smooth' }),
          }
        : h
    );
  }, [openLettersCount]);

  const list = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return letters.filter((l) => {
      if (l.box !== box) return false;
      if (statusFilter === 'open' && l.status !== 'open') return false;
      if (statusFilter === 'closed' && l.status !== 'closed') return false;
      if (
        statusFilter === 'pending_me' &&
        !(l.approvalState === 'pending' && l.currentAssigneeId === currentUserId)
      )
        return false;
      if (statusFilter === 'my_paraph') {
        const steps = l.approvalSteps ?? [];
        const acted = steps.some(
          (s) =>
            s.actorId === currentUserId &&
            (s.action === 'approve' ||
              s.action === 'forward' ||
              s.action === 'reject' ||
              s.action === 'comment')
        );
        if (!acted) return false;
      }
      if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
      if (labelFilter && !l.labels.includes(labelFilter)) return false;
      if (q) {
        const hay = [
          l.subject,
          l.body,
          l.referredFrom,
          ...l.to,
          ...l.referredTo,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [letters, box, statusFilter, categoryFilter, labelFilter, searchQuery, currentUserId]);

  const recentForReply = useMemo(
    () =>
      [...letters]
        .filter((l) => l.box === 'inbox' || l.box === 'outbox')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20),
    [letters]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, MeizitoLetter[]>();
    for (const l of list) {
      const key = l.threadId || l.id;
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([threadId, items]) => ({
        threadId,
        items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }))
      .sort((a, b) => b.items[0].createdAt.localeCompare(a.items[0].createdAt));
  }, [list]);

  const setField = <K extends keyof LetterFormState>(key: K, value: LetterFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm(currentUserName));
    setLetterToRecipients([]);
    setRecipientDraft('');
    setReferredToDraft('');
    setLetterPriority('medium');
    setSubmitError('');
    setComposeOpen(false);
  };

  const openCompose = () => {
    setForm(emptyForm(currentUserName));
    setLetterToRecipients([]);
    setRecipientDraft('');
    setReferredToDraft('');
    setLetterPriority('medium');
    setSubmitError('');
    setComposeOpen(true);
  };

  const addLetterRecipient = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    setLetterToRecipients((prev) => {
      const key = name.toLowerCase();
      if (prev.some((n) => n.toLowerCase() === key)) return prev;
      return [...prev, name];
    });
    setRecipientDraft('');
  };

  const removeLetterRecipient = (name: string) => {
    setLetterToRecipients((prev) => prev.filter((n) => n !== name));
  };

  const referredToNames = useMemo(() => splitList(form.referredTo), [form.referredTo]);

  const addReferredTo = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    const key = name.toLowerCase();
    const next = referredToNames.some((n) => n.toLowerCase() === key)
      ? referredToNames
      : [...referredToNames, name];
    setField('referredTo', next.join('، '));
    setReferredToDraft('');
  };

  const removeReferredTo = (name: string) => {
    setField('referredTo', referredToNames.filter((n) => n !== name).join('، '));
  };

  const startReply = (letter: MeizitoLetter) => {
    const pre = buildReplyPrefill(letter);
    setForm({
      ...emptyForm(currentUserName),
      subject: pre.subject,
      body: pre.body,
      replyToLetterId: pre.replyToLetterId,
      threadId: pre.threadId,
      to: letter.referredFrom || letter.to.join('، '),
      referredFrom: currentUserName,
    });
    setLetterToRecipients(
      letter.referredFrom
        ? [letter.referredFrom]
        : letter.to.length
          ? [...letter.to]
          : []
    );
    setComposeOpen(true);
  };

  const startRefer = (letter: MeizitoLetter) => {
    setForm({
      ...emptyForm(currentUserName),
      subject: letter.subject,
      body: letter.body,
      referredTo: letter.referredTo.join('، ') || letter.to.join('، '),
      referredFrom: currentUserName,
      labels: letter.labels.join('، '),
    });
    setComposeOpen(true);
  };

  const onReplySelect = (letterId: string) => {
    if (!letterId) {
      setField('replyToLetterId', '');
      setField('threadId', '');
      return;
    }
    const source = letters.find((l) => l.id === letterId);
    if (!source) return;
    const pre = buildReplyPrefill(source);
    setForm((prev) => ({
      ...prev,
      replyToLetterId: pre.replyToLetterId,
      threadId: pre.threadId,
      subject: pre.subject,
      body: prev.body.trim() ? prev.body : pre.body,
    }));
  };

  const addFileAttachment = (ref: AttachmentRef) => {
    const sizeKb = ref.size ? Math.max(1, Math.round(ref.size / 1024)) : 0;
    setForm((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        { name: ref.name, size: sizeKb ? `${sizeKb} KB` : undefined, fileRef: ref },
      ],
    }));
  };

  const removeFormAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const submitLetter = async () => {
    if (submitting) return;
    const toRecipients =
      letterToRecipients.length > 0
        ? letterToRecipients
        : splitList(form.to).map((s) => s.trim()).filter(Boolean);
    if (toRecipients.length === 0) {
      setSubmitError('حداقل یک گیرنده از تیم سازمان انتخاب کنید.');
      return;
    }
    const priorityLabel = `اهمیت:${LETTER_PRIORITY_LABELS[letterPriority]}`;
    const userLabels = splitList(form.labels).filter((l) => !l.startsWith('اهمیت:'));
    const payload = {
      subject: form.subject || 'بدون موضوع',
      body: form.body,
      to: toRecipients,
      labels: [priorityLabel, ...userLabels],
      category: form.category,
      status: 'open' as const,
      box: 'outbox' as const,
      referredTo: splitList(form.referredTo),
      referredFrom: form.referredFrom,
      attachments: form.attachments,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    setSubmitError('');
    try {
      let letterId: string;
      if (form.replyToLetterId) {
        letterId = await replyToLetter(form.replyToLetterId, payload);
      } else {
        letterId = await addLetter({
          ...payload,
          ...(form.threadId ? { threadId: form.threadId } : {}),
        });
      }
      if (letterId) submitForApproval('letter', letterId);
      resetForm();
      setBox('outbox');
      setStatusFilter('open');
      setSearchQuery('');
      setLabelFilter(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'ارسال نامه ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleThread = (threadId: string) => {
    setCollapsedThreads((prev) => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  return (
    <div className="space-y-6">
      <AssistantSuggestionStrip hints={assistantHints} />
      {taskFromLetterNotice && (
        <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{taskFromLetterNotice}</p>
      )}
      <p className="text-xs text-gray-500">نامه‌نگاری — ارجاع، پاسخ و زنجیره مکاتبه</p>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          data-testid="meizito-letter-new"
          onClick={() => {
            setBox('outbox');
            setStatusFilter('open');
            openCompose();
          }}
          className="text-xs font-bold text-white bg-nexa-accent px-4 py-2 rounded-xl shadow-sm"
        >
          + نامه جدید
        </button>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
          {(['inbox', 'outbox', 'archive'] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBox(b)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${
                box === b ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
              }`}
            >
              {b === 'inbox' ? 'ورودی' : b === 'outbox' ? 'خروجی' : 'آرشیو'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
          {(
            [
              { id: 'open' as const, label: 'باز' },
              { id: 'pending_me' as const, label: 'منتظر من' },
              { id: 'my_paraph' as const, label: 'پاراف‌های من' },
              { id: 'all' as const, label: 'همه' },
              { id: 'closed' as const, label: 'پایان‌یافته' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold ${
                statusFilter === f.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-gray-500 w-full sm:w-auto">دسته:</span>
        <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold ${
              categoryFilter === 'all' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
            }`}
          >
            همه
          </button>
          {categorySlugs.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold ${
                categoryFilter === c ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
              }`}
            >
              {categoryLabelBySlug[c] ?? c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCategoryAdmin((v) => !v)}
            className="px-3 py-2 rounded-xl text-[10px] font-bold text-gray-500 hover:text-nexa-accent"
          >
            {showCategoryAdmin ? 'بستن مدیریت دسته' : 'مدیریت دسته (ادمین)'}
          </button>
        </div>
      </div>
      {showCategoryAdmin && (
        <div className="nexa-card p-3 space-y-2 text-xs border border-dashed border-gray-200">
          <p className="font-bold text-gray-700">دسته‌های سفارشی کسب‌وکار</p>
          {customCategories.length === 0 && (
            <p className="text-gray-500">دستهٔ سفارشی ثبت نشده — پیش‌فرض‌های سیستم فعال‌اند.</p>
          )}
          <ul className="space-y-1">
            {customCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-mono text-[10px] text-gray-400">{c.slug}</span> — {c.labelFa}
                </span>
                <button
                  type="button"
                  onClick={() => void removeCustomCategory(c.id)}
                  className="text-[10px] font-bold text-red-600"
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 items-end">
            <input
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              placeholder="slug (مثلاً legal)"
              className="bg-gray-50 rounded-lg px-2 py-1.5 text-[11px] font-mono"
            />
            <input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="عنوان فارسی"
              className="bg-gray-50 rounded-lg px-2 py-1.5 text-[11px] flex-1 min-w-[120px]"
            />
            <button
              type="button"
              onClick={() => void addCustomCategory()}
              className="text-[10px] font-bold text-nexa-accent px-3 py-1.5 rounded-lg bg-gray-50"
            >
              افزودن
            </button>
          </div>
          {categoryAdminError && <p className="text-[10px] text-red-600">{categoryAdminError}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو: موضوع، متن، گیرنده، ارجاع…"
            className="w-full bg-gray-50 rounded-xl py-2 pr-9 pl-3 text-xs"
          />
        </div>
      </div>
      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allLabels.map((lb) => (
            <button
              key={lb}
              type="button"
              onClick={() => setLabelFilter(labelFilter === lb ? null : lb)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${letterLabelChipClass(lb, labelFilter === lb)}`}
            >
              {lb}
            </button>
          ))}
        </div>
      )}

      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-labelledby="meizito-letter-compose-title"
        >
          <div
            id="meizito-letter-form"
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3 border border-nexa-border"
          >
            <div className="flex items-center justify-between gap-2">
              <p
                id="meizito-letter-compose-title"
                className="text-sm font-black text-gray-900 flex items-center gap-2"
              >
                <Plus size={16} />
                {form.replyToLetterId ? 'پاسخ به نامه' : 'نامه جدید'}
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            data-testid="meizito-letter-subject"
            value={form.subject}
            onChange={(e) => setField('subject', e.target.value)}
            placeholder="موضوع"
            className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
          />
          <div className="md:col-span-2 space-y-2">
            <p className="text-[10px] font-bold text-gray-500">گیرندگان (چند نفر)</p>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {letterToRecipients.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-nexa-accent/10 text-nexa-accent rounded-full px-2 py-0.5"
                >
                  {name}
                  <button type="button" onClick={() => removeLetterRecipient(name)} aria-label="حذف">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <BusinessMemberPicker
              value={recipientDraft}
              allowFreeText={false}
              onChange={(name, id) => {
                if (id && name.trim()) {
                  addLetterRecipient(name);
                }
                setRecipientDraft('');
              }}
              placeholder="انتخاب گیرنده از تیم سازمان"
            />
            <button
              type="button"
              data-testid="meizito-letter-recipient-self"
              onClick={() => addLetterRecipient(currentUserName)}
              className="text-[10px] font-bold text-nexa-accent hover:underline"
            >
              گیرنده: خودم
            </button>
          </div>
          <div className="md:col-span-2 space-y-2">
            <p className="text-[10px] font-bold text-gray-500">دستهٔ نامه</p>
            <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-2xl">
              {categorySlugs.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setField('category', c as MeizitoLetterCategory)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold ${
                    form.category === c ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {categoryLabelBySlug[c] ?? c}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <p className="text-[10px] font-bold text-gray-500">رونوشت (CC)</p>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {referredToNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-700 rounded-full px-2 py-0.5"
                >
                  {name}
                  <button type="button" onClick={() => removeReferredTo(name)} aria-label="حذف">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <BusinessMemberPicker
              value={referredToDraft}
              allowFreeText={false}
              onChange={(name, id) => {
                if (id && name.trim()) {
                  addReferredTo(name);
                }
                setReferredToDraft('');
              }}
              placeholder="افزودن رونوشت از تیم"
            />
          </div>
          <input
            value={form.referredFrom}
            onChange={(e) => setField('referredFrom', e.target.value)}
            placeholder="فرستنده / ارجاع از"
            className="bg-gray-50 rounded-xl px-3 py-2 text-sm"
          />
          <label className="text-[10px] font-bold text-gray-500 block">اولویت / اهمیت</label>
          <select
            value={letterPriority}
            onChange={(e) => setLetterPriority(e.target.value as LetterPriority)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          >
            {(Object.keys(LETTER_PRIORITY_LABELS) as LetterPriority[]).map((p) => (
              <option key={p} value={p}>
                {LETTER_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        {form.replyToLetterId && (
          <p className="text-[10px] text-blue-700 bg-blue-50 rounded-lg px-2 py-1">
            پاسخ به نامهٔ انتخاب‌شده — برای نامهٔ تازه نیازی به «پاسخ به» نیست.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setField('body', t.body)}
              className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-lg"
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            data-testid="meizito-letter-attach"
            onClick={() => setFilePickerOpen(true)}
            className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1"
          >
            <Cloud size={12} />
            پیوست فایل
          </button>
        </div>
        {form.attachments.length > 0 && (
          <ul className="text-[10px] text-gray-500 space-y-1">
            {form.attachments.map((a, i) => (
              <li key={`${a.name}-${i}`} className="flex items-center gap-2">
                <Paperclip size={10} />
                {a.fileRef ? (
                  <button
                    type="button"
                    className="text-nexa-accent font-bold hover:underline"
                    onClick={() => openLocalAttachment(a.fileRef!)}
                  >
                    {a.name}
                  </button>
                ) : (
                  <span>{a.name}</span>
                )}
                <button type="button" onClick={() => removeFormAttachment(i)} aria-label="حذف">
                  <X size={12} className="text-rose-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          data-testid="meizito-letter-body"
          value={form.body}
          onChange={(e) => setField('body', e.target.value)}
          rows={4}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          placeholder="متن نامه"
        />
        <input
          value={form.labels}
          onChange={(e) => setField('labels', e.target.value)}
          placeholder="برچسب‌ها (ویرگول)"
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
        />
        <button
          type="button"
          data-testid="meizito-letter-submit"
          onClick={submitLetter}
          disabled={submitting}
          className="nexa-btn-primary py-2 px-4 text-sm font-bold disabled:opacity-60"
        >
          {submitting ? 'در حال ارسال…' : 'ارسال به خروجی'}
        </button>
        {submitError && <p className="text-xs font-bold text-red-600">{submitError}</p>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {grouped.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            {box === 'inbox' ? 'صندوق ورودی خالی است.' : box === 'outbox' ? 'نامه‌ای در خروجی نیست.' : 'آرشیو خالی است.'}
          </p>
        )}
        {grouped.map(({ threadId, items }) => {
          const collapsed = collapsedThreads[threadId] ?? false;
          const threadAll = getLetterThread(threadId);
          const showThreadBadge = threadAll.length > 1;

          return (
            <div key={threadId} className="space-y-2">
              {showThreadBadge && (
                <button
                  type="button"
                  onClick={() => toggleThread(threadId)}
                  className="flex items-center gap-2 text-[10px] font-bold text-gray-500 w-full"
                >
                  {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  زنجیره ({threadAll.length} نامه)
                </button>
              )}
              {(collapsed ? [] : items).map((l) => (
                <div key={l.id} className="nexa-card p-4 flex gap-3 items-start">
                  <Mail className="text-gray-400 shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-gray-900">{l.subject}</p>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${categoryBadgeClass(l.category)}`}
                      >
                        {categoryLabelBySlug[l.category] ?? l.category}
                      </span>
                      {l.approvalState && l.approvalState !== 'approved' && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {MEIZITO_APPROVAL_STATE_LABELS[l.approvalState]}
                        </span>
                      )}
                      {l.status === 'closed' && (
                        <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          بسته
                        </span>
                      )}
                      {l.replyToLetterId && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          پاسخ
                        </span>
                      )}
                      {l.labels.map((lb) => (
                        <span
                          key={lb}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${letterLabelChipClass(lb, false)}`}
                        >
                          {lb}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{l.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">به: {l.to.join('، ') || '—'}</p>
                    {l.referredTo.length > 0 && (
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        رونوشت: {l.referredTo.join('، ')}
                      </p>
                    )}
                    {l.referredFrom && (
                      <p className="text-[10px] text-gray-400">ارجاع از: {l.referredFrom}</p>
                    )}
                    {l.attachments.length > 0 && (
                      <p className="text-[10px] text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                        <Paperclip size={10} />
                        {l.attachments.map((a, i) =>
                          a.fileRef ? (
                            <button
                              key={i}
                              type="button"
                              className="text-nexa-accent font-bold hover:underline"
                              onClick={() => openLocalAttachment(a.fileRef!)}
                            >
                              {a.name}
                            </button>
                          ) : (
                            <span key={i}>{a.name}</span>
                          )
                        )}
                      </p>
                    )}
                    {(l.approvalSteps?.length ?? 0) > 0 && (
                      <div className="mt-3 border-t border-nexa-border pt-2">
                        <ApprovalTimeline
                          steps={l.approvalSteps ?? []}
                          approvalState={l.approvalState}
                        />
                        <ApprovalActionsBar
                          approvalState={l.approvalState}
                          currentAssigneeId={l.currentAssigneeId}
                          currentUserId={currentUserId}
                          authorId={l.referredFrom === currentUserName ? currentUserId : ''}
                          mockUsers={mockUsers}
                          onAction={(payload) => recordApprovalAction('letter', l.id, payload)}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => startReply(l)}
                        className="text-[10px] font-bold text-nexa-accent flex items-center gap-1"
                      >
                        <Reply size={10} />
                        پاسخ
                      </button>
                      <button
                        type="button"
                        onClick={() => startRefer(l)}
                        className="text-[10px] font-bold text-gray-600 flex items-center gap-1"
                      >
                        <Share2 size={10} />
                        ارجاع
                      </button>
                      <button
                        type="button"
                        disabled={taskFromLetterBusy === l.id}
                        onClick={() => void createTaskFromLetter(l)}
                        className="text-[10px] font-bold text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                      >
                        <ClipboardList size={10} />
                        وظیفه در میز کار
                      </button>
                      {l.status === 'open' ? (
                        <button
                          type="button"
                          onClick={() => closeLetter(l.id)}
                          className="text-[10px] font-bold text-gray-600"
                        >
                          پایان مکاتبه
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reopenLetter(l.id)}
                          className="text-[10px] font-bold text-nexa-accent"
                        >
                          بازگشایی
                        </button>
                      )}
                      {box !== 'archive' && l.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => updateLetterBox(l.id, 'archive')}
                          className="text-[10px] font-bold text-gray-600"
                        >
                          آرشیو
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <AttachmentPickerModal
        open={filePickerOpen}
        onClose={() => setFilePickerOpen(false)}
        onSelect={addFileAttachment}
        scope={attachmentScopeForMeizitoLetterDrafts(activeBusinessId)}
      />
    </div>
  );
}
