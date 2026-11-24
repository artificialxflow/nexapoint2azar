import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import type { LettersSnapshot } from '@/src/lib/meizito/letters/serialize';
import { serializeInternalLetterRow } from '@/src/lib/meizito/letters/serialize';
import type { CalendarSnapshot } from '@/src/lib/meizito/calendar/serialize';
import type { ChatSnapshot } from '@/src/lib/meizito/chat/serialize';
import type { RequestsSnapshot } from '@/src/lib/meizito/requests/serialize';
import type {
  MeizitoApprovalStep,
  MeizitoCalendar,
  MeizitoCalendarEvent,
  MeizitoInternalRequest,
} from '@/src/types/meizito';
import { assertPrismaOrRethrowMeizito } from '@/src/lib/meizito/comms-prisma-errors';
import { meizitoModuleLog } from '@/src/lib/meizito/logger';
import {
  loadEntityAttachmentRefsMap,
  syncEntityAttachmentRefs,
} from '@/src/lib/attachments/entity-attachment-service';
import { calendarOnFromDateKeys } from '@/src/lib/dates/business-date';

const requestsDbLog = meizitoModuleLog('requests');

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

export async function commsDbHasData(businessId: string): Promise<boolean> {
  const [a, b, c, d] = await Promise.all([
    prisma.internalLetter.count({ where: { businessId } }),
    prisma.meizitoCalendar.count({ where: { businessId } }),
    prisma.chatThread.count({ where: { businessId } }),
    prisma.internalWorkRequest.count({ where: { businessId } }),
  ]);
  return a + b + c + d > 0;
}

export async function loadLettersSnapshotFromDb(businessId: string): Promise<LettersSnapshot> {
  const rows = await prisma.internalLetter.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: { recipients: { orderBy: { sortOrder: 'asc' } } },
  });
  const steps = await prisma.meizitoApprovalStep.findMany({
    where: { businessId, entityType: 'letter' },
  });
  const stepsByLetter = new Map<string, typeof steps>();
  for (const s of steps) {
    const arr = stepsByLetter.get(s.entityId) ?? [];
    arr.push(s);
    stepsByLetter.set(s.entityId, arr);
  }

  const letters = rows.map((row) => {
    const toFromRecipients =
      row.recipients.length > 0
        ? row.recipients.map((r) => r.recipientName).filter(Boolean)
        : [];
    return serializeInternalLetterRow(
      {
        id: row.id,
        businessId: row.businessId,
        subject: row.subject,
        body: row.body,
        to: toFromRecipients,
        labels: row.labels,
        category: row.category,
        status: row.status as 'open' | 'closed',
        box: row.box as 'inbox' | 'outbox' | 'archive',
        templateId: row.templateId,
        referredTo: row.referredTo,
        referredFrom: row.referredFrom,
        authorUserId: row.authorUserId,
        replyToLetterId: row.replyToLetterId,
        threadId: row.threadId,
        attachments: row.attachments,
        approvalState: row.approvalState as never,
        currentAssigneeUserId: row.currentAssigneeUserId,
        submittedAt: row.submittedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      (stepsByLetter.get(row.id) ?? []).map((s) => ({
        id: s.id,
        actorId: s.actorUserId,
        actorName: s.actorName,
        action: s.action as never,
        comment: s.comment ?? undefined,
        at: s.createdAt.toISOString(),
      }))
    );
  });
  return { letters };
}

async function replaceApprovalStepsInTransaction(
  tx: Prisma.TransactionClient,
  businessId: string,
  entityType: 'letter' | 'request',
  entityId: string,
  steps: MeizitoApprovalStep[] = []
) {
  await tx.meizitoApprovalStep.deleteMany({
    where: { businessId, entityType, entityId },
  });
  for (const step of steps) {
    const forwardedToIds =
      step.forwardedToIds && step.forwardedToIds.length > 0
        ? step.forwardedToIds
        : step.forwardedToId
          ? [step.forwardedToId]
          : [];
    const forwardedToNames =
      step.forwardedToNames && step.forwardedToNames.length > 0
        ? step.forwardedToNames
        : step.forwardedToName
          ? [step.forwardedToName]
          : [];
    await tx.meizitoApprovalStep.create({
      data: {
        id: step.id,
        businessId,
        entityType,
        entityId,
        action: step.action,
        actorUserId: step.actorId,
        actorName: step.actorName,
        comment: step.comment ?? null,
        forwardedToIds: forwardedToIds as unknown as Prisma.InputJsonValue,
        forwardedToNames: forwardedToNames as unknown as Prisma.InputJsonValue,
        createdAt: new Date(step.at),
      },
    });
  }
}

async function createLetterInTransaction(
  tx: Prisma.TransactionClient,
  businessId: string,
  letter: LettersSnapshot['letters'][0]
) {
  await tx.internalLetter.create({
    data: {
      id: letter.id,
      businessId,
      subject: letter.subject,
      body: letter.body,
      labels: letter.labels as unknown as Prisma.InputJsonValue,
      category: letter.category,
      status: letter.status,
      box: letter.box,
      templateId: letter.templateId ?? null,
      referredTo: letter.referredTo as unknown as Prisma.InputJsonValue,
      referredFrom: letter.referredFrom,
      authorUserId: letter.approvalSteps?.[0]?.actorId ?? '',
      replyToLetterId: letter.replyToLetterId ?? null,
      threadId: letter.threadId,
      attachments: letter.attachments as unknown as Prisma.InputJsonValue,
      approvalState: letter.approvalState ?? null,
      currentAssigneeUserId: letter.currentAssigneeId ?? null,
      submittedAt: letter.submittedAt ? new Date(letter.submittedAt) : null,
      createdAt: new Date(letter.createdAt),
    },
  });
  for (let idx = 0; idx < letter.to.length; idx++) {
    await tx.internalLetterRecipient.create({
      data: {
        businessId,
        letterId: letter.id,
        recipientName: letter.to[idx],
        sortOrder: idx,
      },
    });
  }
  await replaceApprovalStepsInTransaction(tx, businessId, 'letter', letter.id, letter.approvalSteps ?? []);
  await syncEntityAttachmentRefs(tx, businessId, 'internal_letter', letter.id, letter.attachments);
}

/** به‌روزرسانی یک نامه بدون wipe کل صندوق (حالت db). */
export async function updateLetterInDb(
  businessId: string,
  letter: LettersSnapshot['letters'][0]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.internalLetter.findFirst({
      where: { id: letter.id, businessId },
    });
    if (!existing) {
      throw new Error(`letter not found: ${letter.id}`);
    }
    await tx.internalLetter.update({
      where: { id: letter.id },
      data: {
        subject: letter.subject,
        body: letter.body,
        labels: letter.labels as unknown as Prisma.InputJsonValue,
        category: letter.category,
        status: letter.status,
        box: letter.box,
        templateId: letter.templateId ?? null,
        referredTo: letter.referredTo as unknown as Prisma.InputJsonValue,
        referredFrom: letter.referredFrom,
        replyToLetterId: letter.replyToLetterId ?? null,
        threadId: letter.threadId,
        attachments: letter.attachments as unknown as Prisma.InputJsonValue,
        approvalState: letter.approvalState ?? null,
        currentAssigneeUserId: letter.currentAssigneeId ?? null,
        submittedAt: letter.submittedAt ? new Date(letter.submittedAt) : null,
      },
    });
    await replaceApprovalStepsInTransaction(tx, businessId, 'letter', letter.id, letter.approvalSteps ?? []);
    await syncEntityAttachmentRefs(tx, businessId, 'internal_letter', letter.id, letter.attachments);
  });
}

async function createRequestInTransaction(
  tx: Prisma.TransactionClient,
  businessId: string,
  request: MeizitoInternalRequest
) {
  const createdAtRaw = request.createdAt ? new Date(request.createdAt) : new Date();
  const createdAt = Number.isNaN(createdAtRaw.getTime()) ? new Date() : createdAtRaw;
  await tx.internalWorkRequest.create({
    data: {
      id: request.id,
      businessId,
      subject: request.subject,
      body: request.body ?? '',
      status: request.status ?? 'open',
      priority: request.priority ?? 'medium',
      category: request.category ?? '',
      authorUserId: request.authorId ?? '',
      authorName: request.authorName ?? '',
      referredToUserIds: (request.referredToUserIds ?? []) as unknown as Prisma.InputJsonValue,
      referredTo: (request.referredTo ?? []) as unknown as Prisma.InputJsonValue,
      ccUserIds: (request.ccUserIds ?? []) as unknown as Prisma.InputJsonValue,
      attachments: (request.attachments ?? []) as unknown as Prisma.InputJsonValue,
      threadId: request.threadId ?? null,
      replyToRequestId: request.replyToRequestId ?? null,
      sourceChatMessageId: request.sourceChatMessageId ?? null,
      requestKind: request.requestKind ?? 'admin',
      hrSubtype: request.hrSubtype ?? null,
      hrFormPayload: request.hrFormPayload
        ? (request.hrFormPayload as Prisma.InputJsonValue)
        : undefined,
      box: request.box ?? 'outbox',
      approvalState: request.approvalState ?? null,
      currentAssigneeUserId: request.currentAssigneeId ?? null,
      submittedAt: request.submittedAt ? new Date(request.submittedAt) : null,
      closedAt: request.closedAt ? new Date(request.closedAt) : null,
      createdAt,
    },
  });
  await replaceApprovalStepsInTransaction(
    tx,
    businessId,
    'request',
    request.id,
    request.approvalSteps ?? []
  );
  await syncEntityAttachmentRefs(tx, businessId, 'internal_work_request', request.id, request.attachments);
}

/** یک درخواست جدید بدون wipe کل صندوق (حالت db). */
export async function appendRequestToDb(
  businessId: string,
  request: MeizitoInternalRequest
): Promise<void> {
  const exists = await prisma.internalWorkRequest.findFirst({
    where: { id: request.id, businessId },
  });
  if (exists) {
    requestsDbLog.info('appendRequestToDb skip duplicate', { businessId, requestId: request.id });
    return;
  }
  try {
    await prisma.$transaction(async (tx) => {
      await createRequestInTransaction(tx, businessId, request);
    });
    requestsDbLog.info('appendRequestToDb ok', {
      businessId,
      requestId: request.id,
      requestKind: request.requestKind,
      category: request.category,
      attachmentsCount: request.attachments?.length ?? 0,
    });
  } catch (err) {
    assertPrismaOrRethrowMeizito(err, 'appendRequestToDb');
  }
}

/** به‌روزرسانی یک درخواست داخلی بدون wipe (حالت db). */
export async function updateRequestInDb(
  businessId: string,
  request: MeizitoInternalRequest
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.internalWorkRequest.findFirst({
      where: { id: request.id, businessId },
    });
    if (!existing) {
      throw new Error(`request not found: ${request.id}`);
    }
    await tx.internalWorkRequest.update({
      where: { id: request.id },
      data: {
        subject: request.subject,
        body: request.body,
        status: request.status,
        priority: request.priority,
        category: request.category ?? '',
        referredToUserIds: request.referredToUserIds as unknown as Prisma.InputJsonValue,
        referredTo: request.referredTo as unknown as Prisma.InputJsonValue,
        ccUserIds: (request.ccUserIds ?? []) as unknown as Prisma.InputJsonValue,
        attachments: (request.attachments ?? []) as unknown as Prisma.InputJsonValue,
        box: request.box ?? 'outbox',
        approvalState: request.approvalState ?? null,
        currentAssigneeUserId: request.currentAssigneeId ?? null,
        submittedAt: request.submittedAt ? new Date(request.submittedAt) : null,
        closedAt: request.closedAt ? new Date(request.closedAt) : null,
      },
    });
    await replaceApprovalStepsInTransaction(
      tx,
      businessId,
      'request',
      request.id,
      request.approvalSteps ?? []
    );
    await syncEntityAttachmentRefs(tx, businessId, 'internal_work_request', request.id, request.attachments);
  });
}

/** یک نامه جدید بدون wipe کل صندوق (حالت db). */
export async function appendLetterToDb(
  businessId: string,
  letter: LettersSnapshot['letters'][0]
): Promise<void> {
  const exists = await prisma.internalLetter.findFirst({
    where: { id: letter.id, businessId },
  });
  if (exists) return;
  await prisma.$transaction(async (tx) => {
    await createLetterInTransaction(tx, businessId, letter);
  });
}

export async function saveLettersSnapshotToDb(businessId: string, snap: LettersSnapshot): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.entityAttachment.deleteMany({ where: { businessId, entityType: 'internal_letter' } });
    await tx.internalLetterRecipient.deleteMany({ where: { businessId } });
    await tx.meizitoApprovalStep.deleteMany({ where: { businessId, entityType: 'letter' } });
    await tx.internalLetter.deleteMany({ where: { businessId } });

    for (const letter of snap.letters) {
      await createLetterInTransaction(tx, businessId, letter);
    }
  });
}

export async function loadCalendarSnapshotFromDb(businessId: string): Promise<CalendarSnapshot> {
  const [calendars, events] = await Promise.all([
    prisma.meizitoCalendar.findMany({ where: { businessId }, orderBy: { sortOrder: 'asc' } }),
    prisma.meizitoCalendarEvent.findMany({ where: { businessId } }),
  ]);
  const meizitoCalendars: MeizitoCalendar[] = calendars.map((c) => ({
    id: c.slug ?? c.id,
    name: c.name,
    color: c.color,
    kind: c.kind as MeizitoCalendar['kind'],
    sharedWith: asStringArray(c.sharedWith),
    ownerName: c.ownerName,
    visible: c.visible,
  }));
  const calendarEvents: MeizitoCalendarEvent[] = events.map((e) => {
    const cal = calendars.find((c) => c.id === e.calendarId);
    return {
      id: e.id,
      calendarId: cal?.slug ?? cal?.id ?? e.calendarId,
      title: e.title,
      date: e.dateKey,
      endDate: e.endDateKey ?? undefined,
      time: e.time ?? undefined,
      endTime: e.endTime ?? undefined,
      allDay: e.allDay,
      recurrence: (e.recurrence as MeizitoCalendarEvent['recurrence']) ?? undefined,
      recurrenceUntil: e.recurrenceUntil ?? undefined,
      seriesId: e.seriesId ?? undefined,
      sourceCardId: e.sourceCardId ?? undefined,
      notes: e.notes ?? undefined,
      reminderMinutes: e.reminderMinutes ?? undefined,
      attendeeIds: asStringArray(e.attendeeIds),
      rsvp: (e.rsvp as MeizitoCalendarEvent['rsvp']) ?? {},
    };
  });
  return { calendars: meizitoCalendars, events: calendarEvents };
}

export async function saveCalendarSnapshotToDb(businessId: string, snap: CalendarSnapshot): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.meizitoCalendarEvent.deleteMany({ where: { businessId } });
    await tx.meizitoCalendar.deleteMany({ where: { businessId } });

    const idBySlug = new Map<string, string>();
    let order = 0;
    for (const cal of snap.calendars) {
      const id = cal.id;
      idBySlug.set(cal.id, id);
      await tx.meizitoCalendar.create({
        data: {
          id,
          businessId,
          slug: cal.id,
          name: cal.name,
          color: cal.color,
          kind: cal.kind,
          sharedWith: cal.sharedWith as unknown as Prisma.InputJsonValue,
          ownerUserId: '',
          ownerName: cal.ownerName,
          visible: cal.visible !== false,
          sortOrder: order++,
        },
      });
    }

    for (const ev of snap.events) {
      const calId = idBySlug.get(ev.calendarId) ?? ev.calendarId;
      const endKey = ev.endDate ?? ev.date ?? null;
      const { startOn, endOn } = calendarOnFromDateKeys(ev.date, endKey);
      await tx.meizitoCalendarEvent.create({
        data: {
          id: ev.id,
          businessId,
          calendarId: calId,
          title: ev.title,
          dateKey: ev.date,
          startOn,
          endDateKey: endKey,
          endOn,
          allDay: ev.allDay ?? false,
          time: ev.time ?? null,
          endTime: ev.endTime ?? null,
          recurrence: ev.recurrence ?? 'none',
          recurrenceUntil: ev.recurrenceUntil ?? null,
          seriesId: ev.seriesId ?? null,
          sourceCardId: ev.sourceCardId ?? null,
          notes: ev.notes ?? null,
          reminderMinutes: ev.reminderMinutes ?? null,
          attendeeIds: (ev.attendeeIds ?? []) as unknown as Prisma.InputJsonValue,
          rsvp: (ev.rsvp ?? {}) as unknown as Prisma.InputJsonValue,
        },
      });
    }
  });
}

export async function loadChatSnapshotFromDb(businessId: string): Promise<ChatSnapshot> {
  const [threads, messages, participants] = await Promise.all([
    prisma.chatThread.findMany({ where: { businessId } }),
    prisma.chatMessage.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
    prisma.chatThreadParticipant.findMany({
      where: { businessId },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);
  const attachmentRefsByMessage = await loadEntityAttachmentRefsMap(
    businessId,
    'chat_message',
    messages.map((m) => m.id)
  );
  const participantsByThread = new Map<string, typeof participants>();
  for (const p of participants) {
    const arr = participantsByThread.get(p.threadId) ?? [];
    arr.push(p);
    participantsByThread.set(p.threadId, arr);
  }
  return {
    threads: threads.map((t) => {
      const junction = participantsByThread.get(t.id) ?? [];
      const namesFromJunction = junction.map((p) => p.displayName).filter(Boolean);
      return {
        id: t.id,
        title: t.title,
        threadType: t.threadType as ChatSnapshot['threads'][0]['threadType'],
        participantNames:
          namesFromJunction.length > 0 ? namesFromJunction : asStringArray(t.participantNames),
        pinned: t.pinned,
        starred: t.starred,
        messageIds: messages.filter((m) => m.threadId === t.id).map((m) => m.id),
      };
    }),
    messages: messages.map((m) => {
      const fromJunction = attachmentRefsByMessage.get(m.id);
      const attachmentRefs =
        fromJunction && fromJunction.length > 0
          ? fromJunction
          : (m.attachmentRefs as ChatSnapshot['messages'][0]['attachmentRefs']);
      return {
        id: m.id,
        threadId: m.threadId,
        author: m.author,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        type: m.messageType as ChatSnapshot['messages'][0]['type'],
        attachmentNames: asStringArray(m.attachmentNames),
        attachmentRefs,
        voiceDurationSec: m.voiceDurationSec ?? undefined,
        editedAt: m.editedAt?.toISOString(),
      };
    }),
  };
}

/** Insert یک پیام بدون wipe کل چت (حالت db production). */
export async function updateChatThreadInDb(
  businessId: string,
  threadId: string,
  patch: Partial<Pick<ChatSnapshot['threads'][0], 'title' | 'starred' | 'pinned' | 'participantNames'>>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.chatThread.updateMany({
      where: { id: threadId, businessId },
      data: {
        title: patch.title,
        starred: patch.starred,
        pinned: patch.pinned,
        participantNames:
          patch.participantNames !== undefined
            ? (patch.participantNames as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
    if (patch.participantNames !== undefined) {
      await tx.chatThreadParticipant.deleteMany({ where: { businessId, threadId } });
      for (let i = 0; i < patch.participantNames.length; i++) {
        const displayName = patch.participantNames[i];
        await tx.chatThreadParticipant.create({
          data: {
            businessId,
            threadId,
            displayName,
            sortOrder: i,
          },
        });
      }
    }
  });
}

export async function updateChatMessageInDb(
  businessId: string,
  messageId: string,
  patch: Partial<Pick<ChatSnapshot['messages'][0], 'body' | 'editedAt'>>
): Promise<void> {
  await prisma.chatMessage.updateMany({
    where: { id: messageId, businessId },
    data: {
      body: patch.body,
      editedAt:
        patch.editedAt !== undefined
          ? patch.editedAt
            ? new Date(patch.editedAt)
            : null
          : undefined,
    },
  });
}

export async function deleteChatMessageInDb(businessId: string, messageId: string): Promise<void> {
  await prisma.chatMessage.deleteMany({ where: { id: messageId, businessId } });
}

export async function appendChatMessageToDb(
  businessId: string,
  message: ChatSnapshot['messages'][0]
): Promise<void> {
  const thread = await prisma.chatThread.findFirst({
    where: { id: message.threadId, businessId },
  });
  if (!thread) {
    throw new Error(`chat thread not found: ${message.threadId}`);
  }
  const existing = await prisma.chatMessage.findFirst({
    where: { id: message.id, businessId },
  });
  if (existing) return;
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.create({
      data: {
        id: message.id,
        businessId,
        threadId: message.threadId,
        author: message.author,
        body: message.body,
        messageType: message.type ?? 'text',
        attachmentNames: message.attachmentNames as unknown as Prisma.InputJsonValue,
        attachmentRefs: (message.attachmentRefs ?? []) as unknown as Prisma.InputJsonValue,
        voiceDurationSec: message.voiceDurationSec ?? null,
        editedAt: message.editedAt ? new Date(message.editedAt) : null,
        createdAt: new Date(message.createdAt),
      },
    });
    await syncEntityAttachmentRefs(tx, businessId, 'chat_message', message.id, message.attachmentRefs);
  });
}

export async function saveChatSnapshotToDb(businessId: string, snap: ChatSnapshot): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.entityAttachment.deleteMany({ where: { businessId, entityType: 'chat_message' } });
    await tx.chatMessage.deleteMany({ where: { businessId } });
    await tx.chatThreadParticipant.deleteMany({ where: { businessId } });
    await tx.chatThread.deleteMany({ where: { businessId } });
    for (const t of snap.threads) {
      await tx.chatThread.create({
        data: {
          id: t.id,
          businessId,
          title: t.title,
          threadType: t.threadType ?? 'direct',
          participantNames: t.participantNames as unknown as Prisma.InputJsonValue,
          participantIds: [] as unknown as Prisma.InputJsonValue,
          pinned: t.pinned ?? false,
          starred: t.starred ?? false,
        },
      });
      const names = t.participantNames ?? [];
      for (let i = 0; i < names.length; i++) {
        await tx.chatThreadParticipant.create({
          data: {
            businessId,
            threadId: t.id,
            displayName: names[i],
            sortOrder: i,
          },
        });
      }
    }
    for (const m of snap.messages) {
      await tx.chatMessage.create({
        data: {
          id: m.id,
          businessId,
          threadId: m.threadId,
          author: m.author,
          body: m.body,
          messageType: m.type ?? 'text',
          attachmentNames: m.attachmentNames as unknown as Prisma.InputJsonValue,
          attachmentRefs: (m.attachmentRefs ?? []) as unknown as Prisma.InputJsonValue,
          voiceDurationSec: m.voiceDurationSec ?? null,
          editedAt: m.editedAt ? new Date(m.editedAt) : null,
          createdAt: new Date(m.createdAt),
        },
      });
      await syncEntityAttachmentRefs(tx, businessId, 'chat_message', m.id, m.attachmentRefs);
    }
  });
}

export async function loadRequestsSnapshotFromDb(businessId: string): Promise<RequestsSnapshot> {
  const rows = await prisma.internalWorkRequest.findMany({ where: { businessId } });
  return {
    requests: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      status: r.status as RequestsSnapshot['requests'][0]['status'],
      priority: r.priority as RequestsSnapshot['requests'][0]['priority'],
      category: r.category as RequestsSnapshot['requests'][0]['category'],
      authorId: r.authorUserId,
      authorName: r.authorName,
      referredToUserIds: asStringArray(r.referredToUserIds),
      referredTo: asStringArray(r.referredTo),
      ccUserIds: asStringArray(r.ccUserIds),
      attachments: r.attachments as RequestsSnapshot['requests'][0]['attachments'],
      threadId: r.threadId ?? undefined,
      replyToRequestId: r.replyToRequestId ?? undefined,
      sourceChatMessageId: r.sourceChatMessageId ?? undefined,
      requestKind: (r.requestKind as 'admin' | 'hr') ?? 'admin',
      hrSubtype: r.hrSubtype ?? undefined,
      hrFormPayload: (r.hrFormPayload as Record<string, unknown> | null) ?? undefined,
      box: (r.box as 'inbox' | 'outbox' | 'archive') ?? 'outbox',
      approvalState: r.approvalState as RequestsSnapshot['requests'][0]['approvalState'],
      currentAssigneeId: r.currentAssigneeUserId ?? undefined,
      submittedAt: r.submittedAt?.toISOString(),
      closedAt: r.closedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function saveRequestsSnapshotToDb(businessId: string, snap: RequestsSnapshot): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.entityAttachment.deleteMany({ where: { businessId, entityType: 'internal_work_request' } });
      await tx.internalWorkRequest.deleteMany({ where: { businessId } });
      for (const req of snap.requests) {
        const createdAtRaw = req.createdAt ? new Date(req.createdAt) : new Date();
        const createdAt = Number.isNaN(createdAtRaw.getTime()) ? new Date() : createdAtRaw;
        await tx.internalWorkRequest.create({
          data: {
            id: req.id,
            businessId,
            subject: req.subject,
            body: req.body ?? '',
            status: req.status ?? 'open',
            priority: req.priority ?? 'medium',
            category: req.category ?? '',
            authorUserId: req.authorId ?? '',
            authorName: req.authorName ?? '',
            referredToUserIds: (req.referredToUserIds ?? []) as unknown as Prisma.InputJsonValue,
            referredTo: (req.referredTo ?? []) as unknown as Prisma.InputJsonValue,
            ccUserIds: (req.ccUserIds ?? []) as unknown as Prisma.InputJsonValue,
            attachments: (req.attachments ?? []) as unknown as Prisma.InputJsonValue,
            threadId: req.threadId ?? null,
            replyToRequestId: req.replyToRequestId ?? null,
            sourceChatMessageId: req.sourceChatMessageId ?? null,
            requestKind: req.requestKind ?? 'admin',
            hrSubtype: req.hrSubtype ?? null,
            hrFormPayload: req.hrFormPayload
              ? (req.hrFormPayload as Prisma.InputJsonValue)
              : undefined,
            box: req.box ?? 'outbox',
            approvalState: req.approvalState ?? null,
            currentAssigneeUserId: req.currentAssigneeId ?? null,
            submittedAt: req.submittedAt ? new Date(req.submittedAt) : null,
            closedAt: req.closedAt ? new Date(req.closedAt) : null,
            createdAt,
          },
        });
        await syncEntityAttachmentRefs(tx, businessId, 'internal_work_request', req.id, req.attachments);
      }
    });
  } catch (err) {
    assertPrismaOrRethrowMeizito(err, 'saveRequestsSnapshotToDb');
  }
}
