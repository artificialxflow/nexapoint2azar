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

export async function workspaceDbHasData(businessId: string): Promise<boolean> {
  const n = await prisma.workspaceBoard.count({ where: { businessId } });
  return n > 0;
}

export async function loadWorkspaceSnapshotFromDb(businessId: string): Promise<WorkspaceSnapshot> {
  const [meta, boards, columns, labels, cards, noteBoards, notes, reports, visits, projects] =
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

  const meizitoColumns: MeizitoColumn[] = columns.map((c) =>
    normalizeWorkspaceColumn({
      id: c.id,
      boardId: c.boardId,
      title: c.title,
      order: c.order,
      cardIds: asStringArray(c.cardIds),
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

  const meizitoProjects: MeizitoProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    memberIds: asStringArray(p.memberIds),
    members: asStringArray(p.members),
    boardId: p.boardId ?? undefined,
    phases: Array.isArray(p.phases) ? (p.phases as MeizitoProject['phases']) : [],
  }));

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

export async function saveWorkspaceSnapshotToDb(
  businessId: string,
  snap: WorkspaceSnapshot
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.workspaceCard.deleteMany({ where: { businessId } });
    await tx.workspaceColumn.deleteMany({ where: { businessId } });
    await tx.workspaceLabel.deleteMany({ where: { businessId } });
    await tx.workspaceBoardMember.deleteMany({ where: { businessId } });
    await tx.workspaceBoard.deleteMany({ where: { businessId } });
    await tx.workspaceNote.deleteMany({ where: { businessId } });
    await tx.noteBoard.deleteMany({ where: { businessId } });
    await tx.workspaceDailyReport.deleteMany({ where: { businessId } });
    await tx.workspaceFieldVisit.deleteMany({ where: { businessId } });
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

    for (const col of snap.columns) {
      await tx.workspaceColumn.create({
        data: {
          id: col.id,
          businessId,
          boardId: col.boardId,
          title: col.title,
          order: col.order,
          cardIds: col.cardIds as unknown as Prisma.InputJsonValue,
        },
      });
    }

    for (const card of snap.cards) {
      await tx.workspaceCard.create({
        data: {
          id: card.id,
          businessId,
          boardId: card.boardId,
          columnId: card.columnId,
          title: card.title,
          description: card.description,
          labelIds: card.labelIds as unknown as Prisma.InputJsonValue,
          category: card.category,
          assignee: card.assignee,
          checklist: card.checklist as unknown as Prisma.InputJsonValue,
          attachments: card.attachments as unknown as Prisma.InputJsonValue,
          dueDate: card.dueDate,
          dueTime: card.dueTime,
          recurrence: card.recurrence,
          starred: card.starred,
          calendarId: card.calendarId ?? null,
          calendarEventId: card.calendarEventId ?? null,
          addToCalendar: card.addToCalendar ?? false,
          reminderMinutes: card.reminderMinutes ?? null,
          assigneeUserId: card.assigneeUserId ?? null,
          endDueDate: card.endDueDate ?? '',
          sourceChatMessageId: card.sourceChatMessageId ?? null,
          sourceChatThreadId: card.sourceChatThreadId ?? null,
        },
      });
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
    }
  }, { timeout: 60_000 });
}
