'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Paperclip, Plus, X } from 'lucide-react';
import { AttachmentPickerModal } from '@/src/components/attachments/AttachmentPickerModal';
import { attachmentScopeForMeizitoRequests } from '@/src/lib/attachments/scopes';
import { openLocalAttachment } from '@/src/lib/attachments/client';
import { useMeizito } from '@/src/context/MeizitoContext';
import type { AttachmentRef } from '@/src/types/attachment';
import type {
  MeizitoInternalRequest,
  MeizitoInternalRequestPriority,
  MeizitoLetterAttachment,
  MeizitoLetterCategory,
} from '@/src/types/meizito';
import {
  MEIZITO_APPROVAL_STATE_LABELS,
  MEIZITO_INTERNAL_REQUEST_PRIORITY_LABELS,
  MEIZITO_LETTER_CATEGORY_LABELS,
} from '@/src/types/meizito';
import ApprovalTimeline from '../components/ApprovalTimeline';
import ApprovalActionsBar from '../components/ApprovalActionsBar';
import AssistantSuggestionStrip from '@/src/components/automation/AssistantSuggestionStrip';
import { MeizitoApiError } from '@/src/lib/meizito/client';
import { hintsForRequests } from '@/src/lib/automation/contextual-hints';
import {
  MAX_REFERRAL_TARGETS,
  formatReferredToDisplay,
  resolveReferralIds,
} from '@/src/lib/meizito/teamHierarchy';
import { requestBoxForViewer, requestMatchesSearch } from '@/src/lib/meizito/request-box';
import {
  HR_REQUEST_SUBTYPES,
  HR_SUBTYPE_LABELS,
  type HrRequestSubtypeId,
} from '@/src/lib/meizito/hr-request-types';
import {
  defaultHrFormPayload,
  summarizeHrFormPayload,
  validateHrFormPayload,
} from '@/src/lib/meizito/hr-form-payload';
import HrRequestFields, {
  type HrEligibilityPreview,
} from '@/src/views/meizito/components/HrRequestFields';
import { useEnabledHrSubtypes } from '@/src/views/hr/useEnabledHrSubtypes';

type FilterId =
  | 'open'
  | 'pending_me'
  | 'my_paraph'
  | 'approved'
  | 'rejected'
  | 'closed'
  | 'all';

type BoxId = 'inbox' | 'outbox' | 'archive';

function formatRequestQuote(source: MeizitoInternalRequest): string {
  return `\n\n---\nدرخواست قبلی (${source.authorName}):\n${source.body}`;
}

function buildReplyPrefill(source: MeizitoInternalRequest) {
  const subject = source.subject.startsWith('Re:') ? source.subject : `Re: ${source.subject}`;
  return {
    subject,
    body: formatRequestQuote(source),
    replyToRequestId: source.id,
    threadId: source.threadId || source.id,
  };
}

export default function RequestsPanel() {
  const {
    internalRequests,
    addInternalRequest,
    replyToInternalRequest,
    getRequestThread,
    closeInternalRequest,
    reopenInternalRequest,
    recordApprovalAction,
    currentUserId,
    currentUserName,
    listTeamDirectory,
    activeBusinessId,
  } = useMeizito();

  const teamMembers = useMemo(() => listTeamDirectory('all'), [listTeamDirectory]);

  const [box, setBox] = useState<BoxId>('outbox');
  const [filter, setFilter] = useState<FilterId>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MeizitoLetterCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [referredToUserIds, setReferredToUserIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<MeizitoInternalRequestPriority>('medium');
  const [category, setCategory] = useState<MeizitoLetterCategory>('other');
  const [hrSubtype, setHrSubtype] = useState<HrRequestSubtypeId>('leave');
  const [hrFormPayload, setHrFormPayload] = useState<Record<string, unknown>>(() =>
    defaultHrFormPayload('leave')
  );
  const [hrEligibility, setHrEligibility] = useState<HrEligibilityPreview | null>(null);
  const hrSubtypeOptions = useEnabledHrSubtypes(activeBusinessId);

  useEffect(() => {
    setHrFormPayload(defaultHrFormPayload(hrSubtype));
    setHrEligibility(null);
  }, [hrSubtype]);
  const [attachments, setAttachments] = useState<MeizitoLetterAttachment[]>([]);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [replyToRequestId, setReplyToRequestId] = useState('');
  const [threadId, setThreadId] = useState('');

  const recentForReply = useMemo(
    () =>
      [...internalRequests]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 40),
    [internalRequests]
  );

  const selected = useMemo(
    () => internalRequests.find((r) => r.id === selectedId),
    [internalRequests, selectedId]
  );

  const list = useMemo(() => {
    const sorted = [...internalRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.filter((r) => {
      if (requestBoxForViewer(r, currentUserId) !== box) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (!requestMatchesSearch(r, searchQuery)) return false;
      if (filter === 'all') return true;
      if (filter === 'closed') return r.status === 'closed';
      if (filter === 'open') return r.status === 'open' && r.approvalState !== 'rejected';
      if (filter === 'pending_me')
        return r.approvalState === 'pending' && r.currentAssigneeId === currentUserId;
      if (filter === 'my_paraph') {
        const steps = r.approvalSteps ?? [];
        return steps.some(
          (s) =>
            s.actorId === currentUserId &&
            (s.action === 'approve' ||
              s.action === 'forward' ||
              s.action === 'reject' ||
              s.action === 'comment')
        );
      }
      if (filter === 'approved') return r.approvalState === 'approved';
      if (filter === 'rejected') return r.approvalState === 'rejected';
      return true;
    });
  }, [internalRequests, filter, currentUserId, box, categoryFilter, searchQuery]);

  const openRequestCount = useMemo(
    () =>
      internalRequests.filter((r) => r.status === 'open' && r.approvalState !== 'rejected').length,
    [internalRequests]
  );
  const pendingMeCount = useMemo(
    () =>
      internalRequests.filter(
        (r) => r.approvalState === 'pending' && r.currentAssigneeId === currentUserId
      ).length,
    [internalRequests, currentUserId]
  );
  const assistantHints = useMemo(() => {
    const base = hintsForRequests(openRequestCount, pendingMeCount);
    return base.map((h) =>
      h.id === 'req-pending-me' ? { ...h, onAction: () => setFilter('pending_me') } : h
    );
  }, [openRequestCount, pendingMeCount]);

  const addFileAttachment = (ref: AttachmentRef) => {
    setAttachments((prev) => [...prev, { name: ref.name, fileRef: ref }]);
    setFilePickerOpen(false);
  };

  const toggleReferral = (userId: string) => {
    setReferredToUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= MAX_REFERRAL_TARGETS) return prev;
      return [...prev, userId];
    });
  };

  const resetFormFields = () => {
    setSubject('');
    setBody('');
    setReferredToUserIds([]);
    setAttachments([]);
    setReplyToRequestId('');
    setThreadId('');
    setPriority('medium');
    setCategory('other');
    setHrSubtype('leave');
    setHrFormPayload(defaultHrFormPayload('leave'));
    setHrEligibility(null);
    setSubmitError('');
  };

  const startReply = (r: MeizitoInternalRequest) => {
    const pre = buildReplyPrefill(r);
    setSubject(pre.subject);
    setBody(pre.body);
    setReplyToRequestId(pre.replyToRequestId);
    setThreadId(pre.threadId);
    const targets =
      r.authorId !== currentUserId
        ? [r.authorId]
        : (r.referredToUserIds ?? []).slice(0, MAX_REFERRAL_TARGETS);
    setReferredToUserIds(targets);
    if (r.priority) setPriority(r.priority);
    if (r.category) setCategory(r.category);
    if (r.hrSubtype) setHrSubtype(r.hrSubtype as HrRequestSubtypeId);
    setShowForm(true);
  };

  const onReplySelect = (requestId: string) => {
    if (!requestId) {
      setReplyToRequestId('');
      setThreadId('');
      return;
    }
    const source = internalRequests.find((req) => req.id === requestId);
    if (!source) return;
    const pre = buildReplyPrefill(source);
    setReplyToRequestId(pre.replyToRequestId);
    setThreadId(pre.threadId);
    setSubject(pre.subject);
    setBody((prev) => (prev.trim() ? prev : pre.body));
  };

  const submit = async () => {
    if (!subject.trim()) return;
  if (category === 'hr' && hrEligibility && !hrEligibility.ok) return;
    setSubmitError('');
    let normalizedHrForm: Record<string, unknown> | undefined;
    if (category === 'hr') {
      const check = validateHrFormPayload(hrSubtype, hrFormPayload);
      if (!check.ok) {
        setSubmitError(check.messageFa);
        return;
      }
      normalizedHrForm = check.data;
    }
    const referral = resolveReferralIds(referredToUserIds, teamMembers);
    const payload = {
      subject: subject.trim(),
      body: body.trim(),
      referredTo: referral.referredTo,
      referredToUserIds: referral.referredToUserIds,
      ccUserIds: referral.ccUserIds,
      authorId: currentUserId,
      authorName: currentUserName,
      attachments,
      priority,
      category,
      box: 'outbox' as const,
      requestKind: (category === 'hr' ? 'hr' : 'admin') as MeizitoInternalRequest['requestKind'],
      hrSubtype: category === 'hr' ? hrSubtype : undefined,
      hrFormPayload: normalizedHrForm,
    };
  try {
    const id = replyToRequestId
      ? await replyToInternalRequest(replyToRequestId, payload, { submitForApproval: true })
      : await addInternalRequest(
          {
            ...payload,
            ...(threadId ? { threadId } : {}),
          },
          { submitForApproval: true }
        );
    resetFormFields();
    setShowForm(false);
    setSelectedId(id);
    setBox('outbox');
    } catch (e) {
      if (e instanceof MeizitoApiError) {
        setSubmitError(
          e.message ||
            (e.status === 403
              ? 'شرایط درخواست HR برآورده نشده است.'
              : 'ثبت درخواست ناموفق بود.')
        );
      } else {
        setSubmitError(e instanceof Error ? e.message : 'ثبت درخواست ناموفق بود.');
      }
    }
  };

  const renderDetail = (r: MeizitoInternalRequest) => {
    const threadKey = r.threadId || r.id;
    const threadItems = getRequestThread(threadKey);
    const showThread = threadItems.length > 1;

    return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {r.priority && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100">
            {MEIZITO_INTERNAL_REQUEST_PRIORITY_LABELS[r.priority]}
          </span>
        )}
        {r.category && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {MEIZITO_LETTER_CATEGORY_LABELS[r.category]}
            {r.hrSubtype && HR_SUBTYPE_LABELS[r.hrSubtype]
              ? ` · ${HR_SUBTYPE_LABELS[r.hrSubtype]}`
              : ''}
          </span>
        )}
        {r.approvalState && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
            {MEIZITO_APPROVAL_STATE_LABELS[r.approvalState]}
          </span>
        )}
      </div>
      {r.sourceChatMessageId && (
        <p className="text-[10px] text-indigo-600 font-bold">
          منبع: پیام گفتگو ({r.sourceChatMessageId.slice(0, 8)}…)
        </p>
      )}
      {r.replyToRequestId && (
        <p className="text-[10px] font-bold text-blue-700 bg-blue-50 rounded-lg px-2 py-1 w-fit">پاسخ در زنجیره</p>
      )}
      {r.hrFormPayload && summarizeHrFormPayload(r.hrSubtype, r.hrFormPayload) && (
        <p className="text-xs text-gray-600 font-fa-num bg-gray-50 rounded-xl px-3 py-2">
          {summarizeHrFormPayload(r.hrSubtype, r.hrFormPayload)}
        </p>
      )}
      {r.body && <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>}
      {showThread && (
        <div className="border border-nexa-border/50 rounded-xl p-3 space-y-2 bg-gray-50/80">
          <p className="text-[10px] font-bold text-gray-500">زنجیره ({threadItems.length} درخواست)</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {threadItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-right text-xs rounded-lg px-2 py-1.5 ${
                    item.id === r.id ? 'bg-white ring-1 ring-nexa-accent/30 font-bold' : 'hover:bg-white/80'
                  }`}
                >
                  <span className="block truncate">{item.subject}</span>
                  <span className="text-[9px] text-gray-400">{item.authorName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(r.ccUserIds?.length ?? 0) > 0 && (
        <p className="text-[10px] text-gray-500">
          رونوشت:{' '}
          {r.ccUserIds!
            .map((id) => teamMembers.find((u) => u.id === id)?.name ?? id)
            .join('، ')}
        </p>
      )}
      {(r.attachments?.length ?? 0) > 0 && (
        <ul className="text-[10px] space-y-1">
          {r.attachments!.map((a, i) => (
            <li key={i}>
              <Paperclip size={10} className="inline ml-1" />
              {a.fileRef ? (
                <button
                  type="button"
                  className="text-nexa-accent font-bold hover:underline"
                  onClick={() => openLocalAttachment(a.fileRef!)}
                >
                  {a.name}
                </button>
              ) : (
                a.name
              )}
            </li>
          ))}
        </ul>
      )}
      <ApprovalTimeline steps={r.approvalSteps ?? []} approvalState={r.approvalState} />
      <ApprovalActionsBar
        approvalState={r.approvalState}
        currentAssigneeId={r.currentAssigneeId}
        currentUserId={currentUserId}
        authorId={r.authorId}
        mockUsers={teamMembers}
        onAction={(payload) => recordApprovalAction('request', r.id, payload)}
      />
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          data-testid="meizito-request-reply"
          onClick={() => startReply(r)}
          className="text-[10px] font-bold text-blue-700 hover:underline"
        >
          پاسخ به این درخواست
        </button>
        {r.status === 'open' ? (
          <button
            type="button"
            onClick={() => closeInternalRequest(r.id)}
            className="text-[10px] font-bold text-nexa-accent hover:underline"
          >
            بستن درخواست
          </button>
        ) : (
          <button
            type="button"
            onClick={() => reopenInternalRequest(r.id)}
            className="text-[10px] font-bold text-gray-500 hover:underline"
          >
            بازگشایی
          </button>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <AssistantSuggestionStrip hints={assistantHints} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-nexa-accent" size={26} />
          <div>
            <h2 className="text-lg font-black text-gray-900">درخواست‌های داخلی</h2>
            <p className="text-xs text-gray-500">درخواست‌های اداری داخلی — مثل پرینتر و هماهنگی · توضیحات · پیوست · گردش تایید</p>
          </div>
        </div>
        <button
          type="button"
          data-testid="meizito-request-new"
          onClick={() => {
            resetFormFields();
            setShowForm(true);
          }}
          className="nexa-btn-primary text-xs font-bold flex items-center gap-1 px-4 py-2"
        >
          <Plus size={14} />
          درخواست جدید
        </button>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        {(['inbox', 'outbox', 'archive'] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBox(b)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-xl ${
              box === b ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-500'
            }`}
          >
            {b === 'inbox' ? 'ورودی' : b === 'outbox' ? 'خروجی من' : 'آرشیو'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو موضوع، متن، نویسنده…"
          className="flex-1 min-w-[12rem] bg-gray-50 rounded-xl px-3 py-2 text-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as MeizitoLetterCategory | 'all')}
          className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
        >
          <option value="all">همه دسته‌ها</option>
          {(Object.keys(MEIZITO_LETTER_CATEGORY_LABELS) as MeizitoLetterCategory[]).map((c) => (
            <option key={c} value={c}>
              {MEIZITO_LETTER_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ['open', 'باز'],
            ['pending_me', 'منتظر من'],
            ['my_paraph', 'پاراف‌های من'],
            ['approved', 'تایید شده'],
            ['rejected', 'رد شده'],
            ['closed', 'بسته'],
            ['all', 'همه'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${
              filter === id ? 'bg-nexa-accent text-white' : 'bg-white border-nexa-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="nexa-card p-5 space-y-3 border-nexa-accent/30 relative z-20 isolate">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold">{replyToRequestId ? 'پاسخ درخواست' : 'درخواست جدید'}</p>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetFormFields();
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
          <select
            value={replyToRequestId}
            onChange={(e) => onReplySelect(e.target.value)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="">پاسخ به — انتخاب درخواست</option>
            {recentForReply.map((req) => (
              <option key={req.id} value={req.id}>
                {req.subject}
              </option>
            ))}
          </select>
          <input
            data-testid="meizito-request-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="موضوع (مثلاً: درخواست کامپیوتر)"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="توضیحات کامل…"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as MeizitoInternalRequestPriority)}
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
            >
              {(Object.keys(MEIZITO_INTERNAL_REQUEST_PRIORITY_LABELS) as MeizitoInternalRequestPriority[]).map(
                (p) => (
                  <option key={p} value={p}>
                    {MEIZITO_INTERNAL_REQUEST_PRIORITY_LABELS[p]}
                  </option>
                )
              )}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MeizitoLetterCategory)}
              className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
            >
              {(Object.keys(MEIZITO_LETTER_CATEGORY_LABELS) as MeizitoLetterCategory[]).map((c) => (
                <option key={c} value={c}>
                  {MEIZITO_LETTER_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {category === 'hr' && (
            <>
              <select
                value={hrSubtype}
                onChange={(e) => setHrSubtype(e.target.value as HrRequestSubtypeId)}
                className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold"
              >
                {hrSubtypeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    نوع HR: {s.label}
                  </option>
                ))}
              </select>
              <HrRequestFields
                businessId={activeBusinessId}
                hrSubtype={hrSubtype}
                value={hrFormPayload}
                onChange={setHrFormPayload}
                onEligibilityChange={setHrEligibility}
              />
              {hrEligibility && !hrEligibility.ok && (
                <p className="text-xs font-bold text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
                  {hrEligibility.messageFa}
                </p>
              )}
            </>
          )}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500">ارجاع به (حداکثر {MAX_REFERRAL_TARGETS} نفر، اختیاری)</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto border border-nexa-border/50 rounded-xl p-2">
              {teamMembers.map((u) => (
                <li key={u.id}>
                  <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={referredToUserIds.includes(u.id)}
                      onChange={() => toggleReferral(u.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="font-bold">{u.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setFilePickerOpen(true)}
            className="text-xs font-bold text-nexa-accent flex items-center gap-1"
          >
            <Paperclip size={14} />
            پیوست فایل
          </button>
          {attachments.length > 0 && (
            <ul className="text-[10px] space-y-1">
              {attachments.map((a, i) => (
                <li key={i} className="flex justify-between">
                  <span>{a.name}</span>
                  <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                    <X size={12} className="text-rose-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {submitError && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{submitError}</p>
          )}
          {category === 'hr' && (
            <p className="text-[10px] text-gray-500">
              درخواست‌های HR ممکن است توسط قوانین سازمان (مثلاً حداقل سابقه) بررسی شوند.
            </p>
          )}
          <button
            type="button"
            data-testid="meizito-request-submit"
            onClick={() => void submit()}
            disabled={category === 'hr' && hrEligibility != null && !hrEligibility.ok}
            className="w-full nexa-btn-primary py-2 text-sm font-bold disabled:opacity-50"
          >
            ثبت و ارسال برای تایید
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-right nexa-card p-4 transition-colors ${
                  selectedId === r.id ? 'ring-2 ring-nexa-accent/40' : ''
                } ${r.status === 'closed' ? 'opacity-70' : ''}`}
              >
                <div className="flex flex-wrap justify-between gap-2 mb-1">
                  <p className="font-bold text-sm text-gray-900">{r.subject}</p>
                  {r.replyToRequestId && (
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      پاسخ
                    </span>
                  )}
                  {r.approvalState && (
                    <span className="text-[9px] font-bold text-amber-700">
                      {MEIZITO_APPROVAL_STATE_LABELS[r.approvalState]}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {r.authorName}
                  {formatReferredToDisplay(r.referredTo) ? ` → ${formatReferredToDisplay(r.referredTo)}` : ''}
                </p>
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">درخواستی نیست.</p>
          )}
        </ul>
        <div className="nexa-card p-5 min-h-[200px]">
          {selected ? (
            <>
              <h3 className="font-black text-gray-900 mb-3">{selected.subject}</h3>
              {renderDetail(selected)}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">یک درخواست را انتخاب کنید.</p>
          )}
        </div>
      </div>

      <AttachmentPickerModal
        open={filePickerOpen}
        scope={attachmentScopeForMeizitoRequests(activeBusinessId)}
        onClose={() => setFilePickerOpen(false)}
        onSelect={addFileAttachment}
      />
    </div>
  );
}
