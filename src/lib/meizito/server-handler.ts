import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import {
  loadWorkspaceSnapshot,
  persistWorkspaceSnapshot,
} from '@/src/lib/meizito/workspace/workspace-storage';
import {
  loadLettersSnapshot,
  persistLettersSnapshot,
  appendLetter,
  replaceLetter,
  replaceRequest,
  loadCalendarSnapshot,
  persistCalendarSnapshot,
  loadChatSnapshot,
  persistChatSnapshot,
  appendChatMessage,
  appendRequest,
  patchChatMessage,
  patchChatThread,
  removeChatMessage,
  loadRequestsSnapshot,
} from '@/src/lib/meizito/comms-storage';
import { prepareRequestForPersist } from '@/src/lib/meizito/request-prepare';
import { meizitoModuleLog } from '@/src/lib/meizito/logger';
import { getTeamDirectoryForBusiness } from '@/src/lib/meizito/team-directory-service';
import type { WorkspaceSnapshot } from '@/src/lib/meizito/workspace/serialize';
import type { LettersSnapshot } from '@/src/lib/meizito/letters/serialize';
import type { ChatSnapshot } from '@/src/lib/meizito/chat/serialize';
import type { CalendarSnapshot } from '@/src/lib/meizito/calendar/serialize';
import type { RequestsSnapshot } from '@/src/lib/meizito/requests/serialize';
import type {
  MeizitoBoard,
  MeizitoCalendar,
  MeizitoCalendarEvent,
  MeizitoCalendarKind,
  MeizitoCard,
  MeizitoColumn,
  MeizitoDailyReport,
  MeizitoFieldVisit,
  MeizitoNote,
  MeizitoProject,
} from '@/src/types/meizito';
import { normalizeFieldVisit } from '@/src/lib/meizito/visitHelpers';
import { normalizeWorkspaceBoard, normalizeWorkspaceCard } from '@/src/lib/meizito/workspace/serialize';
import { defaultNoteBoardIdForBusiness } from '@/src/lib/meizito/workspace/default-note-board';
import {
  appendCardIdToColumn,
  createBoardWithDefaultColumns,
  deleteBoardFromWorkspace,
  deleteColumnFromWorkspace,
  deleteCardFromWorkspace,
  prepareWorkspaceSnapshot,
  removeCardIdFromAllColumns,
} from '@/src/lib/meizito/workspace/workspace-prepare';
import { evaluateHrEligibility } from '@/src/lib/meizito/hr-eligibility';
import { validateHrFormPayload } from '@/src/lib/meizito/hr-form-payload';
import { recordApprovedHrRequest } from '@/src/lib/meizito/personnel-file-service';
import { cardShouldSyncToCalendar, eventPatchFromCard } from '@/src/lib/meizito/card-calendar-sync';
import { MeizitoHttpError } from '@/src/lib/meizito/meizito-http-error';
import { upsertCalendarEventForCard } from '@/src/lib/meizito/upsert-calendar-for-card';
import { letterHasRecipients, normalizeLetterRecipients } from '@/src/lib/meizito/letter-recipients';
import { applyLetterApprovalMutation } from '@/src/lib/meizito/letter-approval-mutation';
import {
  applyApprovalAction,
  applySubmitForApproval,
  type RecordApprovalPayload,
} from '@/src/lib/meizito/approval';
import type { MeizitoApprovalAction, MeizitoInternalRequest, MeizitoLetter } from '@/src/types/meizito';
import { normalizeIncomingChatMessage } from '@/src/lib/meizito/chat-message-normalize';
import { ensureDefaultCalendarInSnapshot } from '@/src/lib/meizito/ensure-default-calendar';
import { requireSessionUser } from '@/src/lib/auth/session';
import { canRecordFieldVisits } from '@/src/lib/meizito/field-visit-access';
import {
  canReviewDailyReport,
  getReviewerRoleLabel,
  primaryAssigneeFromReferrals,
} from '@/src/lib/meizito/teamHierarchy';
import {
  calendarEventWriteSchema,
  unwrapMeizitoBody,
  workspaceCardWriteSchema,
} from '@/src/lib/meizito/workspace-api-schemas';
import { z } from 'zod';

const requestsLog = meizitoModuleLog('requests');
const chatLog = meizitoModuleLog('chat');

function pathKey(segments: string[]): string {
  return segments.join('/');
}

function parseZodOr400<T>(result: z.SafeParseReturnType<unknown, T>, fallback: string): T {
  if (!result.success) {
    throw new MeizitoHttpError(400, result.error.issues[0]?.message ?? fallback);
  }
  return result.data;
}

function createCardFromRequest(
  body: Record<string, unknown>,
  raw: Partial<MeizitoCard> & Record<string, unknown>
): MeizitoCard {
  const merged = unwrapMeizitoBody({ ...body, ...raw }, 'card');
  const parsed = parseZodOr400(workspaceCardWriteSchema.safeParse(merged), 'بدنه کارت نامعتبر است');
  const id = String(parsed.id ?? raw.id ?? '') || randomUUID();
  const title = String(parsed.title ?? '').trim();
  return normalizeWorkspaceCard({
    id,
    boardId: parsed.boardId,
    columnId: parsed.columnId,
    title: title || 'وظیفه بدون عنوان',
    description: String(parsed.description ?? ''),
    labelIds: parsed.labelIds ?? [],
    category: String(parsed.category ?? ''),
    assignee: String(parsed.assignee ?? ''),
    checklist: parsed.checklist ?? [],
    attachments: (parsed.attachments ?? []) as MeizitoCard['attachments'],
    dueDate: String(parsed.dueDate ?? ''),
    dueTime: String(parsed.dueTime ?? ''),
    recurrence: (parsed.recurrence ?? 'none') as MeizitoCard['recurrence'],
    starred: Boolean(parsed.starred ?? false),
    calendarId: parsed.calendarId,
    calendarEventId: parsed.calendarEventId,
    addToCalendar: Boolean(parsed.addToCalendar ?? false),
    reminderMinutes: parsed.reminderMinutes,
    assigneeUserId: parsed.assigneeUserId,
    endDueDate: String(parsed.endDueDate ?? ''),
    sourceChatMessageId: parsed.sourceChatMessageId,
    sourceChatThreadId: parsed.sourceChatThreadId,
  });
}

async function assertCanMutateFieldVisit(businessId: string, userId: string) {
  const { allMembers } = await getTeamDirectoryForBusiness(businessId);
  const viewer = allMembers.find((m) => m.id === userId);
  if (!canRecordFieldVisits(viewer)) {
    throw new MeizitoHttpError(403, 'ثبت بازدید حضوری فقط برای تیم فروش و مارکتینگ مجاز است.');
  }
}

export async function handleMeizitoRequest(
  req: NextRequest,
  businessId: string,
  segments: string[]
): Promise<unknown> {
  const method = req.method;
  const key = pathKey(segments);
  const body =
    method !== 'GET' && method !== 'HEAD'
      ? ((await req.json().catch(() => ({}))) as Record<string, unknown>)
      : {};

  if (key === 'team-directory' && method === 'GET') {
    return getTeamDirectoryForBusiness(businessId);
  }

  if (key === 'workspace' && method === 'GET') {
    const snap = await loadWorkspaceSnapshot(businessId);
    prepareWorkspaceSnapshot(snap, businessId);
    return snap;
  }

  if (key === 'workspace' && method === 'PATCH') {
    const snap = await loadWorkspaceSnapshot(businessId);
    const nextNoteBoard = body.activeNoteBoardId;
    if (nextNoteBoard !== undefined) {
      const id = String(nextNoteBoard);
      if (snap.noteBoards.some((b) => b.id === id)) {
        snap.activeNoteBoardId = id;
        prepareWorkspaceSnapshot(snap, businessId);
        await persistWorkspaceSnapshot(businessId, snap);
      } else {
        throw new MeizitoHttpError(400, 'بورد یادداشت یافت نشد.');
      }
    }
    return { activeNoteBoardId: snap.activeNoteBoardId };
  }

  if (key === 'chat' && method === 'GET') {
    return loadChatSnapshot(businessId);
  }

  if (key === 'calendar' && method === 'GET') {
    const snap = await loadCalendarSnapshot(businessId);
    if (ensureDefaultCalendarInSnapshot(snap)) {
      await persistCalendarSnapshot(businessId, snap);
    }
    return snap;
  }

  if (key.startsWith('letters') && method === 'GET') {
    return loadLettersSnapshot(businessId);
  }

  if (key === 'requests' && method === 'GET') {
    return loadRequestsSnapshot(businessId);
  }

  // Mutations — optimistic merge / echo body for UI continuity
  if (key === 'letters' && method === 'POST') {
    const snap = await loadLettersSnapshot(businessId);
    const raw = (body.letter ?? body) as LettersSnapshot['letters'][0];
    const letter = normalizeLetterRecipients(raw);
    if (!letterHasRecipients(letter)) {
      throw new MeizitoHttpError(400, 'حداقل یک گیرنده برای نامه لازم است.');
    }
    letter.id = letter.id || randomUUID();
    snap.letters = [letter, ...snap.letters];
    await appendLetter(businessId, letter, snap);
    return { letter };
  }

  if (key === 'letter-reply' && method === 'POST') {
    const snap = await loadLettersSnapshot(businessId);
    const sourceId = String((body as { sourceLetterId?: string }).sourceLetterId ?? '');
    const source = sourceId ? snap.letters.find((l) => l.id === sourceId) : undefined;
    const raw = (body.letter ?? body) as LettersSnapshot['letters'][0];
    const letter = normalizeLetterRecipients(raw);
    if (!letterHasRecipients(letter)) {
      throw new MeizitoHttpError(400, 'حداقل یک گیرنده برای نامه لازم است.');
    }
    if (source) {
      letter.replyToLetterId = sourceId;
      letter.threadId = source.threadId || source.id;
    }
    letter.id = letter.id || randomUUID();
    snap.letters = [letter, ...snap.letters];
    await appendLetter(businessId, letter, snap);
    return { letter };
  }

  if (key === 'letter-update' && (method === 'PATCH' || method === 'POST')) {
    const snap = await loadLettersSnapshot(businessId);
    const raw = body.letter ?? body;
    const letterId = String(
      (body.letterId as string | undefined) ??
        (raw as { letterId?: string; id?: string }).letterId ??
        (raw as { id?: string }).id ??
        ''
    );
    if (!letterId) throw new MeizitoHttpError(400, 'letterId الزامی است.');
    const existing = snap.letters.find((l) => l.id === letterId);
    if (!existing) throw new MeizitoHttpError(404, 'نامه یافت نشد.');
    const patch = raw as Partial<MeizitoLetter>;
    const updated = normalizeLetterRecipients({
      ...existing,
      ...(patch.box !== undefined ? { box: patch.box } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.subject !== undefined ? { subject: String(patch.subject) } : {}),
      ...(patch.body !== undefined ? { body: String(patch.body) } : {}),
      ...(patch.labels !== undefined ? { labels: patch.labels } : {}),
    });
    await replaceLetter(businessId, updated);
    return { letter: updated };
  }

  if (key === 'letter-approval' && method === 'POST') {
    const letterId = String(body.letterId ?? '');
    if (!letterId) throw new MeizitoHttpError(400, 'letterId الزامی است.');
    const sessionUser = await requireSessionUser(req);
    const snap = await loadLettersSnapshot(businessId);
    const existing = snap.letters.find((l) => l.id === letterId);
    if (!existing) throw new MeizitoHttpError(404, 'نامه یافت نشد.');
    const directory = await getTeamDirectoryForBusiness(businessId);
    const actorName = sessionUser.displayName?.trim() || sessionUser.mobilePhone || 'کاربر';
    const action = String(body.action ?? 'submit') as MeizitoApprovalAction;
    const extra = body as Omit<RecordApprovalPayload, 'actorId' | 'actorName' | 'action'>;
    const updated = applyLetterApprovalMutation(
      existing,
      action,
      sessionUser.id,
      actorName,
      directory.members,
      extra
    );
    await replaceLetter(businessId, updated);
    return { letter: updated };
  }

  if (key === 'requests' && method === 'POST') {
    const sessionUser = await requireSessionUser(req);
    const directory = await getTeamDirectoryForBusiness(businessId);
    const actorName = sessionUser.displayName?.trim() || sessionUser.mobilePhone || 'کاربر';
    const rawBody = body as Record<string, unknown> & {
      request?: Partial<MeizitoInternalRequest>;
      options?: { submitForApproval?: boolean };
    };
    const { options, request: wrapped, ...rest } = rawBody;
    const raw = (wrapped ?? rest) as Partial<MeizitoInternalRequest>;
    if (!String(raw.subject ?? '').trim()) {
      throw new MeizitoHttpError(400, 'موضوع درخواست الزامی است.');
    }
    let request = prepareRequestForPersist(
      {
        ...raw,
        subject: String(raw.subject).trim(),
        authorId: raw.authorId ?? sessionUser.id,
        authorName: raw.authorName ?? actorName,
      },
      directory.members
    );
    if (request.requestKind === 'hr' && request.hrSubtype && request.authorId) {
      const authorId = request.authorId;
      const hrSubtype = request.hrSubtype;
      const formCheck = validateHrFormPayload(hrSubtype, request.hrFormPayload);
      if (!formCheck.ok) {
        throw new MeizitoHttpError(400, formCheck.messageFa);
      }
      request = { ...request, hrFormPayload: formCheck.data };
      const gate = await evaluateHrEligibility(businessId, authorId, hrSubtype, formCheck.data);
      if (!gate.ok) {
        throw new MeizitoHttpError(403, gate.messageFa);
      }
    }
    if (options?.submitForApproval !== false) {
      const assigneeId =
        primaryAssigneeFromReferrals(request.referredToUserIds) ?? request.currentAssigneeId;
      const approval = applySubmitForApproval(
        request,
        sessionUser.id,
        actorName,
        assigneeId,
        directory.members
      );
      request = { ...request, ...approval };
    }
    requestsLog.info('POST /requests', {
      businessId,
      requestId: request.id,
      requestKind: request.requestKind,
      category: request.category,
      hasCreatedAt: Boolean(request.createdAt),
      attachmentsCount: request.attachments?.length ?? 0,
    });
    await appendRequest(businessId, request);
    return { request };
  }

  if (key === 'request-reply' && method === 'POST') {
    const sessionUser = await requireSessionUser(req);
    const directory = await getTeamDirectoryForBusiness(businessId);
    const actorName = sessionUser.displayName?.trim() || sessionUser.mobilePhone || 'کاربر';
    const snap = await loadRequestsSnapshot(businessId);
    const sourceId = String((body as { sourceRequestId?: string }).sourceRequestId ?? '');
    if (!sourceId) throw new MeizitoHttpError(400, 'sourceRequestId الزامی است.');
    const source = snap.requests.find((r) => r.id === sourceId);
    if (!source) throw new MeizitoHttpError(404, 'درخواست مبدأ یافت نشد.');
    const rawBody = body as Record<string, unknown> & {
      request?: Partial<MeizitoInternalRequest>;
      options?: { submitForApproval?: boolean };
    };
    const { options, request: wrapped, sourceRequestId: _src, ...rest } = rawBody;
    const raw = { ...(wrapped ?? rest) } as Partial<MeizitoInternalRequest>;
    if (!String(raw.subject ?? '').trim()) {
      throw new MeizitoHttpError(400, 'موضوع درخواست الزامی است.');
    }
    let request = prepareRequestForPersist(
      {
        ...raw,
        subject: String(raw.subject).trim(),
        authorId: raw.authorId ?? sessionUser.id,
        authorName: raw.authorName ?? actorName,
        replyToRequestId: sourceId,
        threadId: source.threadId || source.id,
      },
      directory.members
    );
    if (request.requestKind === 'hr' && request.hrSubtype && request.authorId) {
      const authorId = request.authorId;
      const hrSubtype = request.hrSubtype;
      const formCheck = validateHrFormPayload(hrSubtype, request.hrFormPayload);
      if (!formCheck.ok) {
        throw new MeizitoHttpError(400, formCheck.messageFa);
      }
      request = { ...request, hrFormPayload: formCheck.data };
      const gate = await evaluateHrEligibility(businessId, authorId, hrSubtype, formCheck.data);
      if (!gate.ok) {
        throw new MeizitoHttpError(403, gate.messageFa);
      }
    }
    if (options?.submitForApproval !== false) {
      const assigneeId =
        primaryAssigneeFromReferrals(request.referredToUserIds) ?? request.currentAssigneeId;
      const approval = applySubmitForApproval(
        request,
        sessionUser.id,
        actorName,
        assigneeId,
        directory.members
      );
      request = { ...request, ...approval };
    }
    requestsLog.info('POST /request-reply', {
      businessId,
      requestId: request.id,
      sourceRequestId: sourceId,
    });
    await appendRequest(businessId, request);
    return { request };
  }

  if (key === 'request-update' && (method === 'PATCH' || method === 'POST')) {
    const snap = await loadRequestsSnapshot(businessId);
    const raw = body.request ?? body;
    const requestId = String(
      (body.requestId as string | undefined) ??
        (raw as { requestId?: string; id?: string }).requestId ??
        (raw as { id?: string }).id ??
        ''
    );
    if (!requestId) throw new MeizitoHttpError(400, 'requestId الزامی است.');
    const existing = snap.requests.find((r) => r.id === requestId);
    if (!existing) throw new MeizitoHttpError(404, 'درخواست یافت نشد.');
    const patch = raw as Partial<MeizitoInternalRequest>;
    const updated: MeizitoInternalRequest = {
      ...existing,
      ...(patch.box !== undefined ? { box: patch.box } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
    };
    await replaceRequest(businessId, updated);
    return { request: updated };
  }

  if (key === 'request-approval' && method === 'POST') {
    const requestId = String(body.requestId ?? '');
    if (!requestId) throw new MeizitoHttpError(400, 'requestId الزامی است.');
    const sessionUser = await requireSessionUser(req);
    const snap = await loadRequestsSnapshot(businessId);
    const existing = snap.requests.find((r) => r.id === requestId);
    if (!existing) throw new MeizitoHttpError(404, 'درخواست یافت نشد.');
    const directory = await getTeamDirectoryForBusiness(businessId);
    const actorName = sessionUser.displayName?.trim() || sessionUser.mobilePhone || 'کاربر';
    const action = String(body.action ?? 'submit') as MeizitoApprovalAction;
    const extra = body as Omit<RecordApprovalPayload, 'actorId' | 'actorName' | 'action'>;
    const fields =
      action === 'submit'
        ? applySubmitForApproval(
            existing,
            sessionUser.id,
            actorName,
            existing.referredToUserIds?.[0] ?? existing.currentAssigneeId,
            directory.members
          )
        : applyApprovalAction(existing, {
            actorId: sessionUser.id,
            actorName,
            action,
            comment: extra.comment,
            forwardToUserId: extra.forwardToUserId,
            forwardToUserName: extra.forwardToUserName,
            forwardToUserIds: extra.forwardToUserIds,
            forwardToUserNames: extra.forwardToUserNames,
          });
    const updated: MeizitoInternalRequest = { ...existing, ...fields };
    await replaceRequest(businessId, updated);
    if (
      action === 'approve' &&
      updated.approvalState === 'approved' &&
      updated.requestKind === 'hr' &&
      updated.authorId
    ) {
      await recordApprovedHrRequest(businessId, updated.authorId, updated.id);
    }
    return { request: updated };
  }

  if (key === 'chat-threads' && method === 'POST') {
    const snap = await loadChatSnapshot(businessId);
    const thread = (body.thread ?? body) as ChatSnapshot['threads'][0];
    thread.id = thread.id || randomUUID();
    snap.threads = [thread, ...snap.threads];
    await persistChatSnapshot(businessId, snap);
    return { thread };
  }

  if (key === 'chat-message-to-card' && method === 'POST') {
    const messageId = String(body.messageId ?? '');
    if (!messageId) throw new MeizitoHttpError(400, 'messageId الزامی است.');
    const [ws, chat] = await Promise.all([
      loadWorkspaceSnapshot(businessId),
      loadChatSnapshot(businessId),
    ]);
    const existing = ws.cards.find((c) => c.sourceChatMessageId === messageId);
    if (existing) {
      return { card: normalizeWorkspaceCard(existing), duplicate: true };
    }
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) throw new MeizitoHttpError(404, 'پیام یافت نشد.');
    const boardId = String(body.boardId ?? ws.boards[0]?.id ?? '');
    const board = ws.boards.find((b) => b.id === boardId);
    const columnId =
      String(body.columnId ?? '') || board?.columnIds?.[0] || ws.columns.find((c) => c.boardId === boardId)?.id || '';
    if (!boardId || !columnId) {
      throw new MeizitoHttpError(400, 'میز کار یا ستون یافت نشد.');
    }
    const title = String(body.title ?? message.body ?? '').trim().slice(0, 200) || 'وظیفه از گفتگو';
    const card = createCardFromRequest(body, {
      boardId,
      columnId,
      title,
      description: String(body.description ?? message.body ?? ''),
      sourceChatMessageId: messageId,
      sourceChatThreadId: message.threadId,
    });
    ws.cards.push(card);
    appendCardIdToColumn(ws, columnId, card.id);
    prepareWorkspaceSnapshot(ws, businessId);
    await persistWorkspaceSnapshot(businessId, ws);
    await upsertCalendarEventForCard(businessId, card);
    return { card };
  }

  if (key === 'chat-messages' && method === 'POST') {
    const snap = await loadChatSnapshot(businessId);
    const input = normalizeIncomingChatMessage(
      (body.message ?? body) as Record<string, unknown>
    );
    if (!input.threadId) {
      throw new MeizitoHttpError(400, 'threadId الزامی است.');
    }
    if (!input.author) {
      throw new MeizitoHttpError(400, 'نویسنده پیام الزامی است.');
    }
    const threadIdx = snap.threads.findIndex((t) => t.id === input.threadId);
    if (threadIdx < 0) {
      throw new MeizitoHttpError(404, 'گفتگو یافت نشد.');
    }
    const message: ChatSnapshot['messages'][0] = {
      ...input,
      id: input.id ?? randomUUID(),
    };
    snap.messages = [...snap.messages, message];
    const thread = snap.threads[threadIdx];
    const ids = new Set(thread.messageIds ?? []);
    ids.add(message.id);
    snap.threads[threadIdx] = { ...thread, messageIds: [...ids] };
    await appendChatMessage(businessId, message, snap);
    chatLog.debug('POST /chat-messages', {
      businessId,
      threadId: message.threadId,
      messageId: message.id,
    });
    return { message };
  }

  if (key === 'chat-thread-update' && method === 'PATCH') {
    const threadId = String(body.threadId ?? '');
    if (!threadId) throw new MeizitoHttpError(400, 'threadId الزامی است.');
    const snap = await loadChatSnapshot(businessId);
    const idx = snap.threads.findIndex((t) => t.id === threadId);
    if (idx < 0) throw new MeizitoHttpError(404, 'گفتگو یافت نشد.');
    const patch: Partial<ChatSnapshot['threads'][0]> = {};
    if (body.title !== undefined) patch.title = String(body.title);
    if (body.starred !== undefined) patch.starred = Boolean(body.starred);
    if (body.pinned !== undefined) patch.pinned = Boolean(body.pinned);
    if (Array.isArray(body.participantNames)) {
      patch.participantNames = body.participantNames as string[];
    }
    snap.threads[idx] = { ...snap.threads[idx], ...patch };
    await patchChatThread(businessId, threadId, patch);
    return { thread: snap.threads[idx] };
  }

  if (key === 'chat-message-update' && method === 'PATCH') {
    const messageId = String(body.messageId ?? '');
    if (!messageId) throw new MeizitoHttpError(400, 'messageId الزامی است.');
    const snap = await loadChatSnapshot(businessId);
    const idx = snap.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) throw new MeizitoHttpError(404, 'پیام یافت نشد.');
    const patch: Partial<ChatSnapshot['messages'][0]> = {};
    if (body.body !== undefined) patch.body = String(body.body);
    if (body.editedAt !== undefined) {
      patch.editedAt = body.editedAt ? String(body.editedAt) : undefined;
    }
    if (!patch.editedAt && patch.body !== undefined) {
      patch.editedAt = new Date().toISOString();
    }
    snap.messages[idx] = { ...snap.messages[idx], ...patch };
    await patchChatMessage(businessId, messageId, patch);
    return { message: snap.messages[idx] };
  }

  if (key === 'chat-message-delete' && method === 'DELETE') {
    const messageId = String(body.messageId ?? '');
    if (!messageId) throw new MeizitoHttpError(400, 'messageId الزامی است.');
    const snap = await loadChatSnapshot(businessId);
    if (!snap.messages.some((m) => m.id === messageId)) {
      throw new MeizitoHttpError(404, 'پیام یافت نشد.');
    }
    await removeChatMessage(businessId, messageId);
    return { ok: true, messageId };
  }

  if (key === 'boards' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    const raw = (body.board ?? body) as Partial<MeizitoBoard> & Record<string, unknown>;
    const name = String(raw.name ?? body.name ?? '').trim();
    const hasStructure =
      Array.isArray(raw.columnIds) && raw.columnIds.length > 0 && Array.isArray(raw.labelPalette);
    if (name && !hasStructure) {
      const created = createBoardWithDefaultColumns(name);
      snap.boards.push(created.board);
      snap.columns.push(...created.columns);
      snap.activeBoardId = created.board.id;
      prepareWorkspaceSnapshot(snap, businessId);
      await persistWorkspaceSnapshot(businessId, snap);
      return { board: created.board, columns: created.columns };
    }
    const board = normalizeWorkspaceBoard({
      id: String(raw.id ?? '') || randomUUID(),
      name: name || 'میز جدید',
      memberNames: Array.isArray(raw.memberNames) ? raw.memberNames : [],
      columnIds: Array.isArray(raw.columnIds) ? raw.columnIds : [],
      labelPalette: Array.isArray(raw.labelPalette) ? raw.labelPalette : [],
    });
    snap.boards.push(board);
    prepareWorkspaceSnapshot(snap, businessId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { board };
  }

  if (segments[0] === 'boards' && segments.length === 2 && method === 'PATCH') {
    const boardId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.board ?? body) as Partial<WorkspaceSnapshot['boards'][0]>;
    const idx = snap.boards.findIndex((b) => b.id === boardId);
    if (idx < 0) return { board: patch };
    snap.boards[idx] = { ...snap.boards[idx], ...patch, id: boardId };
    await persistWorkspaceSnapshot(businessId, snap);
    return { board: snap.boards[idx] };
  }

  if (segments[0] === 'boards' && segments.length === 2 && method === 'DELETE') {
    const boardId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    deleteBoardFromWorkspace(snap, boardId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { ok: true };
  }

  if (segments[0] === 'boards' && segments[2] === 'columns' && method === 'POST') {
    const boardId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const raw = (body.column ?? body) as Partial<WorkspaceSnapshot['columns'][0]> &
      Record<string, unknown>;
    const title = String(raw.title ?? body.title ?? '').trim() || 'ستون';
    const order =
      typeof raw.order === 'number'
        ? raw.order
        : snap.columns.filter((c) => c.boardId === boardId).length;
    const column: WorkspaceSnapshot['columns'][0] = {
      id: String(raw.id ?? '') || randomUUID(),
      boardId,
      title,
      order,
      cardIds: Array.isArray(raw.cardIds) ? raw.cardIds : [],
    };
    snap.columns.push(column);
    const board = snap.boards.find((b) => b.id === boardId);
    if (board) {
      board.columnIds = [...(board.columnIds ?? []), column.id];
    }
    prepareWorkspaceSnapshot(snap, businessId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { column };
  }

  if (key === 'cards' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    const raw = (body.card ?? body) as Partial<MeizitoCard> & Record<string, unknown>;
    const card = createCardFromRequest(body, raw);
    snap.cards.push(card);
    appendCardIdToColumn(snap, card.columnId, card.id);
    prepareWorkspaceSnapshot(snap, businessId);
    await persistWorkspaceSnapshot(businessId, snap);
    await upsertCalendarEventForCard(businessId, card);
    return { card };
  }

  if (segments[0] === 'columns' && segments.length === 2 && method === 'PATCH') {
    const columnId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.column ?? body) as Partial<WorkspaceSnapshot['columns'][0]>;
    const idx = snap.columns.findIndex((c) => c.id === columnId);
    if (idx < 0) return { column: patch };
    snap.columns[idx] = { ...snap.columns[idx], ...patch, id: columnId };
    await persistWorkspaceSnapshot(businessId, snap);
    return { column: snap.columns[idx] };
  }

  if (segments[0] === 'columns' && segments.length === 2 && method === 'DELETE') {
    const columnId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    deleteColumnFromWorkspace(snap, columnId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { ok: true };
  }

  if (segments[0] === 'cards' && segments.length === 2 && method === 'DELETE') {
    const cardId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    deleteCardFromWorkspace(snap, cardId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { ok: true };
  }

  if (segments[0] === 'cards' && method === 'PATCH') {
    const cardId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.card ?? body) as Partial<MeizitoCard>;
    const idx = snap.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return { card: patch };
    const prevColumnId = snap.cards[idx].columnId;
    snap.cards[idx] = normalizeWorkspaceCard({
      ...snap.cards[idx],
      ...patch,
      id: cardId,
    });
    const nextColumnId = snap.cards[idx].columnId;
    if (nextColumnId !== prevColumnId) {
      removeCardIdFromAllColumns(snap, cardId);
      appendCardIdToColumn(snap, nextColumnId, cardId);
    }
    prepareWorkspaceSnapshot(snap, businessId);
    await persistWorkspaceSnapshot(businessId, snap);
    await upsertCalendarEventForCard(businessId, snap.cards[idx]);
    return { card: snap.cards[idx] };
  }

  if (key === 'card-move' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    const cardId = String(body.cardId ?? '');
    const columnId = String(body.columnId ?? '');
    const card = snap.cards.find((c) => c.id === cardId);
    if (card) {
      removeCardIdFromAllColumns(snap, cardId);
      card.columnId = columnId;
      appendCardIdToColumn(snap, columnId, cardId);
      prepareWorkspaceSnapshot(snap, businessId);
      await persistWorkspaceSnapshot(businessId, snap);
    }
    return { card: card ?? body };
  }

  if (key === 'projects' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    const raw = (body.project ?? body) as Partial<MeizitoProject> & Record<string, unknown>;
    const project: MeizitoProject = {
      id: String(raw.id ?? '') || randomUUID(),
      name: String(raw.name ?? body.name ?? '').trim() || 'پروژه',
      memberIds: Array.isArray(raw.memberIds)
        ? raw.memberIds
        : Array.isArray(body.memberIds)
          ? (body.memberIds as string[])
          : [],
      boardId: raw.boardId != null ? String(raw.boardId) : undefined,
      members: Array.isArray(raw.members) ? raw.members : undefined,
      phases: Array.isArray(raw.phases) ? raw.phases : [],
    };
    snap.projects.push(project);
    await persistWorkspaceSnapshot(businessId, snap);
    return { project };
  }

  if (segments[0] === 'projects' && method === 'PATCH') {
    const projectId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.project ?? body) as Partial<MeizitoProject>;
    const idx = snap.projects.findIndex((p) => p.id === projectId);
    if (idx < 0) return { project: patch };
    snap.projects[idx] = { ...snap.projects[idx], ...patch, id: projectId };
    await persistWorkspaceSnapshot(businessId, snap);
    return { project: snap.projects[idx] };
  }

  if (key === 'note-boards' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    prepareWorkspaceSnapshot(snap, businessId);
    const name = String((body.noteBoard as { name?: string })?.name ?? body.name ?? '').trim();
    const noteBoard = {
      id: randomUUID(),
      name: name || 'بورد یادداشت',
      order: snap.noteBoards.length,
      color: String((body.noteBoard as { color?: string })?.color ?? '#fef08a'),
    };
    snap.noteBoards.push(noteBoard);
    await persistWorkspaceSnapshot(businessId, snap);
    return { noteBoard };
  }

  if (segments[0] === 'note-boards' && segments.length === 2 && method === 'PATCH') {
    const boardId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    prepareWorkspaceSnapshot(snap, businessId);
    const patch = (body.noteBoard ?? body) as Partial<{
      name: string;
      color: string;
      memberUserIds: string[];
    }>;
    const idx = snap.noteBoards.findIndex((b) => b.id === boardId);
    if (idx < 0) throw new MeizitoHttpError(404, 'بورد یادداشت یافت نشد');
    snap.noteBoards[idx] = {
      ...snap.noteBoards[idx],
      ...patch,
      id: boardId,
      memberUserIds: Array.isArray(patch.memberUserIds)
        ? patch.memberUserIds
        : snap.noteBoards[idx].memberUserIds,
    };
    await persistWorkspaceSnapshot(businessId, snap);
    return { noteBoard: snap.noteBoards[idx] };
  }

  if (key === 'notes' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    prepareWorkspaceSnapshot(snap, businessId);
    const raw = (body.note ?? body) as Partial<MeizitoNote> & Record<string, unknown>;
    const defaultBoardId =
      snap.noteBoards[0]?.id ?? defaultNoteBoardIdForBusiness(businessId);
    let boardId = String(raw.boardId ?? body.boardId ?? defaultBoardId);
    if (!snap.noteBoards.some((b) => b.id === boardId)) boardId = defaultBoardId;
    const note: MeizitoNote = {
      id: randomUUID(),
      boardId,
      title: String(raw.title ?? body.title ?? '').trim() || 'بدون عنوان',
      content: String(raw.content ?? body.content ?? ''),
      color: String(raw.color ?? body.color ?? '#fef08a'),
      checklist: Array.isArray(raw.checklist) ? raw.checklist : [],
      fileAttachments: Array.isArray(raw.fileAttachments)
        ? raw.fileAttachments
        : Array.isArray(body.fileAttachments)
          ? (body.fileAttachments as MeizitoNote['fileAttachments'])
          : [],
      archived: Boolean(raw.archived ?? false),
      deletedAt: raw.deletedAt ?? null,
      starred: Boolean(raw.starred ?? false),
      labelIds: Array.isArray(raw.labelIds) ? (raw.labelIds as string[]) : [],
    };
    snap.notes.push(note);
    prepareWorkspaceSnapshot(snap, businessId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { note };
  }

  if (segments[0] === 'notes' && method === 'PATCH') {
    const noteId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.note ?? body) as Partial<MeizitoNote>;
    const idx = snap.notes.findIndex((n) => n.id === noteId);
    if (idx < 0) return { note: patch };
    snap.notes[idx] = { ...snap.notes[idx], ...patch, id: noteId };
    await persistWorkspaceSnapshot(businessId, snap);
    return { note: snap.notes[idx] };
  }

  if (key === 'daily-reports' && method === 'POST') {
    const snap = await loadWorkspaceSnapshot(businessId);
    const raw = (body.report ?? body) as Partial<MeizitoDailyReport> & Record<string, unknown>;
    const now = new Date().toISOString();
    const report = {
      id: randomUUID(),
      authorId: String(raw.authorId ?? body.authorId ?? ''),
      authorName: String(raw.authorName ?? body.authorName ?? ''),
      date: String(raw.date ?? body.date ?? now.slice(0, 10)),
      title: String(raw.title ?? body.title ?? '').trim() || 'گزارش روز',
      body: String(raw.body ?? body.body ?? ''),
      status: (raw.status ?? body.status ?? 'draft') as MeizitoDailyReport['status'],
      managerApproved: Boolean(raw.managerApproved ?? false),
      managerApprovedAt: raw.managerApprovedAt,
      feedbackEntries: Array.isArray(raw.feedbackEntries) ? raw.feedbackEntries : [],
      dayChecklist: Array.isArray(raw.dayChecklist) ? raw.dayChecklist : [],
      createdAt: now,
      updatedAt: now,
    } as MeizitoDailyReport;
    snap.dailyReports.push(report);
    await persistWorkspaceSnapshot(businessId, snap);
    return { report };
  }

  if (segments[0] === 'daily-reports' && method === 'PATCH') {
    const reportId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.report ?? body) as Partial<MeizitoDailyReport>;
    const idx = snap.dailyReports.findIndex((r) => r.id === reportId);
    if (idx < 0) return { report: patch };
    const now = new Date().toISOString();
    snap.dailyReports[idx] = {
      ...snap.dailyReports[idx],
      ...patch,
      id: reportId,
      updatedAt: now,
    };
    await persistWorkspaceSnapshot(businessId, snap);
    return { report: snap.dailyReports[idx] };
  }

  if (segments[0] === 'daily-reports' && segments[2] === 'feedback' && method === 'POST') {
    const reportId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const idx = snap.dailyReports.findIndex((r) => r.id === reportId);
    if (idx < 0) return { report: body };
    const sessionUser = await requireSessionUser(req);
    const report = snap.dailyReports[idx];
    if (report.status !== 'submitted') {
      throw new MeizitoHttpError(400, 'فقط گزارش ارسال‌شده قابل بازخورد است.');
    }
    const { allMembers } = await getTeamDirectoryForBusiness(businessId);
    if (!canReviewDailyReport(report, sessionUser.id, allMembers)) {
      throw new MeizitoHttpError(403, 'اجازه بازخورد این گزارش را ندارید.');
    }
    const roleLabel = getReviewerRoleLabel(report.authorId, sessionUser.id, allMembers);
    const now = new Date().toISOString();
    const entry = {
      id: randomUUID(),
      authorId: sessionUser.id,
      authorName: sessionUser.displayName,
      roleLabel,
      text: String(body.feedback ?? ''),
      kind: (body.kind ?? 'feedback') as 'feedback' | 'approve',
      at: now,
    };
    report.feedbackEntries = [...(report.feedbackEntries ?? []), entry];
    if (body.kind === 'approve') {
      report.managerApproved = true;
      report.managerApprovedAt = now;
    }
    report.updatedAt = now;
    await persistWorkspaceSnapshot(businessId, snap);
    return { report };
  }

  if (key === 'field-visits' && method === 'POST') {
    const sessionUser = await requireSessionUser(req);
    await assertCanMutateFieldVisit(businessId, sessionUser.id);
    const snap = await loadWorkspaceSnapshot(businessId);
    const raw = (body.visit ?? body) as Partial<MeizitoFieldVisit> & Record<string, unknown>;
    const now = new Date().toISOString();
    const visit = normalizeFieldVisit({
      ...raw,
      id: randomUUID(),
      createdAt: now,
    } as MeizitoFieldVisit);
    snap.fieldVisits = [...(snap.fieldVisits ?? []), visit];
    await persistWorkspaceSnapshot(businessId, snap);
    return { visit };
  }

  if (segments[0] === 'field-visits' && segments.length === 2 && method === 'DELETE') {
    const sessionUser = await requireSessionUser(req);
    await assertCanMutateFieldVisit(businessId, sessionUser.id);
    const visitId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    snap.fieldVisits = (snap.fieldVisits ?? []).filter((v) => v.id !== visitId);
    await persistWorkspaceSnapshot(businessId, snap);
    return { ok: true };
  }

  if (segments[0] === 'field-visits' && segments.length === 2 && method === 'PATCH') {
    const sessionUser = await requireSessionUser(req);
    await assertCanMutateFieldVisit(businessId, sessionUser.id);
    const visitId = segments[1];
    const snap = await loadWorkspaceSnapshot(businessId);
    const patch = (body.visit ?? body) as Partial<MeizitoFieldVisit>;
    const idx = (snap.fieldVisits ?? []).findIndex((v) => v.id === visitId);
    if (idx < 0) return { visit: patch };
    const merged = normalizeFieldVisit({
      ...snap.fieldVisits[idx],
      ...patch,
      id: visitId,
    } as MeizitoFieldVisit);
    snap.fieldVisits[idx] = merged;
    await persistWorkspaceSnapshot(businessId, snap);
    return { visit: merged };
  }

  if (key === 'calendars' && method === 'POST') {
    const snap = await loadCalendarSnapshot(businessId);
    const raw = (body.calendar ?? body) as Record<string, unknown>;
    const calendar: MeizitoCalendar = {
      id: randomUUID(),
      name: String(raw.name ?? '').trim() || 'تقویم جدید',
      kind: (raw.kind ?? 'custom') as MeizitoCalendarKind,
      color: String(raw.color ?? '#3b82f6'),
      sharedWith: Array.isArray(raw.sharedWith) ? (raw.sharedWith as string[]) : [],
      ownerName: String(raw.ownerName ?? ''),
    };
    snap.calendars = [...(snap.calendars ?? []), calendar];
    await persistCalendarSnapshot(businessId, snap);
    return { calendar };
  }

  if (key === 'calendar-update' && (method === 'POST' || method === 'PATCH')) {
    const snap = await loadCalendarSnapshot(businessId);
    const calendarId = String(body.calendarId ?? '');
    const patch = (body.calendar ?? body) as Partial<MeizitoCalendar>;
    const idx = (snap.calendars ?? []).findIndex((c) => c.id === calendarId);
    if (idx < 0) return { calendar: patch };
    snap.calendars[idx] = { ...snap.calendars[idx], ...patch, id: calendarId };
    await persistCalendarSnapshot(businessId, snap);
    return { calendar: snap.calendars[idx] };
  }

  if (key === 'calendar-events-sync-from-cards' && method === 'POST') {
    const ws = await loadWorkspaceSnapshot(businessId);
    const calSnap = await loadCalendarSnapshot(businessId);
    const defaultCalId = calSnap.calendars?.[0]?.id ?? '';
    const syncable = (ws.cards ?? []).map(normalizeWorkspaceCard).filter(cardShouldSyncToCalendar);
    const rest = (calSnap.events ?? []).filter((e) => !e.sourceCardId);
    const synced: MeizitoCalendarEvent[] = syncable.map((card) => {
      const calendarId = card.calendarId || defaultCalId;
      const base = eventPatchFromCard(card, calendarId);
      return { ...base, id: card.calendarEventId || `sync-${card.id}` };
    });
    calSnap.events = [...rest, ...synced];
    await persistCalendarSnapshot(businessId, calSnap);
    return { events: synced };
  }

  if (key === 'calendar-events' && method === 'POST') {
    const snap = await loadCalendarSnapshot(businessId);
    const merged = unwrapMeizitoBody(body as Record<string, unknown>, 'event');
    const raw = parseZodOr400(
      calendarEventWriteSchema.safeParse(merged),
      'بدنه رویداد نامعتبر است'
    );
    const fallbackCalendarId = snap.calendars?.[0]?.id ?? '';
    const event: MeizitoCalendarEvent = {
      id: randomUUID(),
      calendarId: String(raw.calendarId ?? '') || fallbackCalendarId,
      title: String(raw.title ?? '').trim() || 'رویداد',
      date: raw.date,
      endDate: raw.endDate,
      time: raw.time,
      endTime: raw.endTime,
      allDay: raw.allDay === true,
      recurrence: raw.recurrence,
      recurrenceUntil: raw.recurrenceUntil,
      seriesId: raw.seriesId,
      sourceCardId: raw.sourceCardId,
      notes: raw.notes,
      reminderMinutes: raw.reminderMinutes,
      attendeeIds: raw.attendeeIds,
      rsvp: raw.rsvp,
    };
    snap.events = [...(snap.events ?? []), event];
    await persistCalendarSnapshot(businessId, snap);
    return { event };
  }

  if (key === 'calendar-event-update' && method === 'PATCH') {
    const snap = await loadCalendarSnapshot(businessId);
    const eventId = String(body.eventId ?? '');
    if (body.delete === true) {
      snap.events = (snap.events ?? []).filter((e) => e.id !== eventId);
      await persistCalendarSnapshot(businessId, snap);
      return { ok: true };
    }
    const patch = (body.event ?? body) as Record<string, unknown>;
    const idx = (snap.events ?? []).findIndex((e) => e.id === eventId);
    if (idx < 0) return { event: patch };
    snap.events[idx] = { ...snap.events[idx], ...patch, id: eventId };
    await persistCalendarSnapshot(businessId, snap);
    return { event: snap.events[idx] };
  }

  if (key === 'calendar-event-update' && method === 'DELETE') {
    const snap = await loadCalendarSnapshot(businessId);
    const eventId = String(body.eventId ?? '');
    snap.events = (snap.events ?? []).filter((e) => e.id !== eventId);
    await persistCalendarSnapshot(businessId, snap);
    return { ok: true };
  }

  if (key === 'calendar-event-rsvp' && method === 'POST') {
    const snap = await loadCalendarSnapshot(businessId);
    const eventId = String(body.eventId ?? '');
    const userId = String(body.userId ?? '');
    const status = String(body.status ?? 'pending') as 'accepted' | 'declined' | 'pending';
    const idx = (snap.events ?? []).findIndex((e) => e.id === eventId);
    if (idx < 0) return { event: body.event ?? body };
    const prev = snap.events[idx];
    snap.events[idx] = {
      ...prev,
      rsvp: { ...(prev.rsvp ?? {}), [userId]: status },
    };
    await persistCalendarSnapshot(businessId, snap);
    return { event: snap.events[idx] };
  }

  if (segments[0] === 'calendar' && segments[1] === 'events' && method === 'GET') {
    const snap = await loadCalendarSnapshot(businessId);
    return { events: snap.events };
  }

  if (key === 'pending-approvals' && method === 'GET') {
    const letters = await loadLettersSnapshot(businessId);
    const requests = await loadRequestsSnapshot(businessId);
    return {
      requests: requests.requests.filter((r) => r.status === 'open'),
      letters: letters.letters.filter((l) => l.approvalState === 'pending'),
    };
  }

  if (key === 'inbox' && method === 'GET') {
    const letters = await loadLettersSnapshot(businessId);
    const requests = await loadRequestsSnapshot(businessId);
    return { requests: requests.requests, letters: letters.letters };
  }

  throw new Error('NOT_FOUND');
}
