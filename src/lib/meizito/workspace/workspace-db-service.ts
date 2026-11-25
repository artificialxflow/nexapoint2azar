import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import type { WorkspaceSnapshot } from '@/src/lib/meizito/workspace/serialize';
import {
  normalizeWorkspaceBoard,
  normalizeWorkspaceCard,
  normalizeWorkspaceColumn,
} from '@/src/lib/meizito/workspace/serialize';
import {
  fieldVisitReferrerColumns,
  mergeFieldVisitFromDbRow,
} from '@/src/lib/meizito/field-visit-referrer';
import { normalizeFieldVisit } from '@/src/lib/meizito/visitHelpers';
import { syncEntityAttachmentRefs } from '@/src/lib/attachments/entity-attachment-service';
import { dueOnFromTaskCalendarStrings } from '@/src/lib/dates/business-date';
import type {
  MeizitoBoard,
  MeizitoCard,
  MeizitoColumn,
  MeizitoDailyReport,
  MeizitoFieldVisit,
  MeizitoNote,
  MeizitoNoteBoard,
  MeizitoProject,
  MeizitoRecurrence,
} from '@/src/types/meizito';

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function cardIdsForColumn(
  cards: Array<{ id: string; columnId: string; sortOrder: number }>,
  columnId: string
): string[] {
  return cards
    .filter((c) => c.columnId === columnId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((c) => c.id);
}

export async function workspaceDbHasData(businessId: string): Promise<boolean> {
  const n = await prisma.workspaceBoard.count({ where: { businessId } });
  return n > 0;
}

export async function loadWorkspaceSnapshotFromDb(businessId: string): Promise<WorkspaceSnapshot> {
  const [meta, boards, columns, labels, cards, noteBoards, notes, reports, visits, projects, projectMembers] =
    await Promise.all([
      prisma.businessMeizitoWorkspaceMeta.findUnique({ where: { businessId } }),
      prisma.workspaceBoard.findMany({ where: { businessId }, orderBy: { sortOrder: 'asc' } }),
      prisma.workspaceColumn.findMany({ where: { businessId } }),
      prisma.workspaceLabel.findMany({ where: { businessId } }),
      prisma.workspaceCard.findMany({ where: { businessId } }),
      prisma.noteBoard.findMany({ where: { businessId }, orderBy: { order: 'asc' } }),
      prisma.workspaceNote.findMany({ where: { businessId } }),
      prisma.workspaceDailyReport.findMany({ where: { businessId } }),
      prisma.workspaceFieldVisit.findMany({ where: { businessId } }),
      prisma.workspaceProject.findMany({ where: { businessId } }),
      prisma.workspaceProjectMember.findMany({ where: { businessId }, orderBy: { sortOrder: 'asc' } }),
    ]);

  const labelsByBoard = new Map<string, typeof labels>();
  for (const lb of labels) {
    const arr = labelsByBoard.get(lb.boardId) ?? [];
    arr.push(lb);
    labelsByBoard.set(lb.boardId, arr);
  }

  const meizitoBoards: MeizitoBoard[] = boards.map((b) =>
    normalizeWorkspaceBoard({
      id: b.id,
      name: b.name,
      memberNames: asStringArray(b.memberNames),
      columnIds: columns.filter((c) => c.boardId === b.id).sort((a, c) => a.order - c.order).map((c) => c.id),
      labelPalette: (labelsByBoard.get(b.id) ?? []).map((lb) => ({
        id: lb.id,
        name: lb.name,
        color: lb.color,
      })),
    })
  );

  const cardSortRows = cards.map((c) => ({
    id: c.id,
    columnId: c.columnId,
    sortOrder: c.sortOrder,
  }));

  const meizitoColumns: MeizitoColumn[] = columns.map((c) =>
    normalizeWorkspaceColumn({
      id: c.id,
      boardId: c.boardId,
      title: c.title,
      order: c.order,
      cardIds: cardIdsForColumn(cardSortRows, c.id),
    })
  );

  const meizitoCards: MeizitoCard[] = cards.map((c) =>
    normalizeWorkspaceCard({
      id: c.id,
      boardId: c.boardId,
      columnId: c.columnId,
      title: c.title,
      description: c.description,
      labelIds: asStringArray(c.labelIds),
      category: c.category,
      assignee: c.assignee,
      checklist: c.checklist as MeizitoCard['checklist'],
      attachments: c.attachments as MeizitoCard['attachments'],
      dueDate: c.dueDate,
      dueTime: c.dueTime,
      recurrence: c.recurrence as MeizitoRecurrence,
      starred: c.starred,
      calendarId: c.calendarId ?? undefined,
      calendarEventId: c.calendarEventId ?? undefined,
      addToCalendar: c.addToCalendar ?? false,
      reminderMinutes: c.reminderMinutes ?? undefined,
      assigneeUserId: c.assigneeUserId ?? undefined,
      endDueDate: c.endDueDate ?? '',
      sourceChatMessageId: c.sourceChatMessageId ?? undefined,
      sourceChatThreadId: c.sourceChatThreadId ?? undefined,
    })
  );

  const meizitoNoteBoards: MeizitoNoteBoard[] = noteBoards.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    order: b.order,
    memberUserIds: asStringArray(b.memberUserIds),
  }));

  const meizitoNotes: MeizitoNote[] = notes.map((n) => ({
    id: n.id,
    boardId: n.boardId,
    title: n.title,
    content: n.content,
    color: n.color,
    checklist: n.checklist as MeizitoNote['checklist'],
    fileAttachments: n.attachments as MeizitoNote['fileAttachments'],
    labelIds: asStringArray(n.labelIds),
    archived: n.archived,
    deletedAt: n.deletedAt?.toISOString() ?? null,
    starred: n.starred,
  }));

  const dailyReports = reports.map((r) => r.payload as unknown as MeizitoDailyReport);
  const fieldVisits = visits.map((v) =>
    normalizeFieldVisit(
      mergeFieldVisitFromDbRow(v.payload as unknown as MeizitoFieldVisit, {
        hasReferrer: v.hasReferrer,
        referrerName: v.referrerName,
        referrerTag: v.referrerTag,
      })
    )
  );

  const membersByProject = new Map<string, typeof projectMembers>();
  for (const m of projectMembers) {
    const arr = membersByProject.get(m.projectId) ?? [];
    arr.push(m);
    membersByProject.set(m.projectId, arr);
  }

  const meizitoProjects: MeizitoProject[] = projects.map((p) => {
    const junction = membersByProject.get(p.id) ?? [];
    const memberIdsFromJunction = junction
      .map((m) => m.personId ?? m.userId)
      .filter((id): id is string => Boolean(id));
    const membersFromJunction = junction
      .map((m) => m.displayName || '')
      .filter((name) => name.length > 0);
    return {
      id: p.id,
      name: p.name,
      memberIds:
        memberIdsFromJunction.length > 0 ? memberIdsFromJunction : asStringArray(p.memberIds),
      members: membersFromJunction.length > 0 ? membersFromJunction : asStringArray(p.members),
      boardId: p.boardId ?? undefined,
      phases: Array.isArray(p.phases) ? (p.phases as MeizitoProject['phases']) : [],
    };
  });

  return {
    boards: meizitoBoards,
    columns: meizitoColumns,
    cards: meizitoCards,
    projects: meizitoProjects,
    noteBoards: meizitoNoteBoards,
    notes: meizitoNotes,
    dailyReports,
    fieldVisits,
    activeBoardId: meta?.activeBoardId ?? null,
    activeNoteBoardId: meta?.activeNoteBoardId ?? null,
  };
}

async function resolveProjectMemberRef(
  tx: Prisma.TransactionClient,
  businessId: string,
  ref: string
): Promise<{ personId?: string; userId?: string; displayName: string } | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  const person = await tx.person.findUnique({
    where: { businessId_personId: { businessId, personId: trimmed } },
    select: { personId: true, displayName: true },
  });
  if (person) {
    return { personId: person.personId, displayName: person.displayName || '' };
  }

  const user = await tx.user.findUnique({
    where: { id: trimmed },
    select: { id: true, displayName: true },
  });
  if (user) {
    return { userId: user.id, displayName: user.displayName || '' };
  }

  return null;
}

export async function saveWorkspaceSnapshotToDb(
  businessId: string,
  snap: WorkspaceSnapshot
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.entityAttachment.deleteMany({
      where: {
        businessId,
        entityType: { in: ['workspace_card', 'workspace_note'] },
      },
    });
    await tx.workspaceCard.deleteMany({ where: { businessId } });
    await tx.workspaceColumn.deleteMany({ where: { businessId } });
    await tx.workspaceLabel.deleteMany({ where: { businessId } });
    await tx.workspaceBoardMember.deleteMany({ where: { businessId } });
    await tx.workspaceBoard.deleteMany({ where: { businessId } });
    await tx.workspaceNote.deleteMany({ where: { businessId } });
    await tx.noteBoard.deleteMany({ where: { businessId } });
    await tx.workspaceDailyReport.deleteMany({ where: { businessId } });
    await tx.workspaceFieldVisit.deleteMany({ where: { businessId } });
    await tx.workspaceProjectMember.deleteMany({ where: { businessId } });
    await tx.workspaceProject.deleteMany({ where: { businessId } });

    await tx.businessMeizitoWorkspaceMeta.upsert({
      where: { businessId },
      create: {
        businessId,
        activeBoardId: snap.activeBoardId,
        activeNoteBoardId: snap.activeNoteBoardId,
      },
      update: {
        activeBoardId: snap.activeBoardId,
        activeNoteBoardId: snap.activeNoteBoardId,
      },
    });

    let boardOrder = 0;
    for (const board of snap.boards) {
      await tx.workspaceBoard.create({
        data: {
          id: board.id,
          businessId,
          name: board.name,
          memberNames: board.memberNames as unknown as Prisma.InputJsonValue,
          sortOrder: boardOrder++,
        },
      });
      for (const lb of board.labelPalette ?? []) {
        await tx.workspaceLabel.create({
          data: {
            id: lb.id,
            businessId,
            boardId: board.id,
            name: lb.name,
            color: lb.color,
          },
        });
      }
      for (const name of board.memberNames ?? []) {
        await tx.workspaceBoardMember.create({
          data: { businessId, boardId: board.id, displayName: name },
        });
      }
    }

    const columnCardOrder = new Map<string, string[]>();
    for (const col of snap.columns) {
      columnCardOrder.set(col.id, Array.isArray(col.cardIds) ? col.cardIds : []);
      await tx.workspaceColumn.create({
        data: {
          id: col.id,
          businessId,
          boardId: col.boardId,
          title: col.title,
          order: col.order,
        },
      });
    }

    for (const card of snap.cards) {
      const orderList = columnCardOrder.get(card.columnId) ?? [];
      const idx = orderList.indexOf(card.id);
      const sortOrder = idx >= 0 ? idx : orderList.length;
      const { dueOn, endDueOn } = dueOnFromTaskCalendarStrings(card.dueDate, card.endDueDate);
      await tx.workspaceCard.create({
        data: {
          id: card.id,
          businessId,
          boardId: card.boardId,
          columnId: card.columnId,
          sortOrder,
          title: card.title,
          description: card.description,
          labelIds: card.labelIds as unknown as Prisma.InputJsonValue,
          category: card.category,
          assignee: card.assignee,
          checklist: card.checklist as unknown as Prisma.InputJsonValue,
          attachments: card.attachments as unknown as Prisma.InputJsonValue,
          dueDate: card.dueDate,
          dueOn,
          dueTime: card.dueTime,
          recurrence: card.recurrence,
          starred: card.starred,
          calendarId: card.calendarId ?? null,
          calendarEventId: card.calendarEventId ?? null,
          addToCalendar: card.addToCalendar ?? false,
          reminderMinutes: card.reminderMinutes ?? null,
          assigneeUserId: card.assigneeUserId ?? null,
          endDueDate: card.endDueDate ?? '',
          endDueOn: endDueOn ?? dueOn,
          sourceChatMessageId: card.sourceChatMessageId ?? null,
          sourceChatThreadId: card.sourceChatThreadId ?? null,
        },
      });
      await syncEntityAttachmentRefs(tx, businessId, 'workspace_card', card.id, card.attachments);
    }

    for (const nb of snap.noteBoards) {
      await tx.noteBoard.create({
        data: {
          id: nb.id,
          businessId,
          name: nb.name,
          color: nb.color ?? '#e5e7eb',
          order: nb.order ?? 0,
          memberUserIds: (nb.memberUserIds ?? []) as unknown as Prisma.InputJsonValue,
        },
      });
    }

    for (const note of snap.notes) {
      await tx.workspaceNote.create({
        data: {
          id: note.id,
          businessId,
          boardId: note.boardId,
          title: note.title,
          content: note.content,
          color: note.color,
          starred: note.starred ?? false,
          archived: note.archived ?? false,
          deletedAt: note.deletedAt ? new Date(note.deletedAt) : null,
          checklist: (note.checklist ?? []) as unknown as Prisma.InputJsonValue,
          attachments: (note.fileAttachments ?? []) as unknown as Prisma.InputJsonValue,
          labelIds: (note.labelIds ?? []) as unknown as Prisma.InputJsonValue,
        },
      });
      await syncEntityAttachmentRefs(tx, businessId, 'workspace_note', note.id, note.fileAttachments);
    }

    for (const rep of snap.dailyReports) {
      await tx.workspaceDailyReport.create({
        data: {
          id: rep.id,
          businessId,
          payload: rep as unknown as Prisma.InputJsonValue,
        },
      });
    }

    for (const visit of snap.fieldVisits) {
      const referrer = fieldVisitReferrerColumns(visit);
      const payload = {
        ...visit,
        hasReferrer: referrer.hasReferrer ?? visit.hasReferrer,
        referrerName: referrer.referrerName ?? visit.referrerName,
        referrerTag: referrer.referrerTag ?? visit.referrerTag,
      } satisfies MeizitoFieldVisit;
      await tx.workspaceFieldVisit.create({
        data: {
          id: visit.id,
          businessId,
          payload: payload as unknown as Prisma.InputJsonValue,
          hasReferrer: referrer.hasReferrer,
          referrerName: referrer.referrerName,
          referrerTag: referrer.referrerTag,
        },
      });
    }

    for (const proj of snap.projects) {
      await tx.workspaceProject.create({
        data: {
          id: proj.id,
          businessId,
          name: proj.name,
          memberIds: proj.memberIds as unknown as Prisma.InputJsonValue,
          members: (proj.members ?? []) as unknown as Prisma.InputJsonValue,
          boardId: proj.boardId ?? null,
          phases: (proj.phases ?? []) as unknown as Prisma.InputJsonValue,
        },
      });
      const memberRefs = proj.memberIds ?? [];
      let memberSort = 0;
      for (const ref of memberRefs) {
        const resolved = await resolveProjectMemberRef(tx, businessId, ref);
        if (!resolved) continue;
        await tx.workspaceProjectMember.create({
          data: {
            businessId,
            projectId: proj.id,
            personId: resolved.personId ?? null,
            userId: resolved.userId ?? null,
            displayName: resolved.displayName,
            sortOrder: memberSort++,
          },
        });
      }
      const names = proj.members ?? [];
      if (memberRefs.length === 0) {
        for (let i = 0; i < names.length; i++) {
          await tx.workspaceProjectMember.create({
            data: {
              businessId,
              projectId: proj.id,
              displayName: names[i],
              sortOrder: i,
            },
          });
        }
      }
    }
  }, { timeout: 60_000 });
}
