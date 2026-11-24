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
import { normalizeDailyReport } from '@/src/lib/meizito/teamHierarchy';
import { normalizeFieldVisit } from '@/src/lib/meizito/visitHelpers';

type WorkspaceBoardRow = {
  id: string;
  name: string;
  memberNames: unknown;
  labelPalette: unknown;
};

type WorkspaceColumnRow = {
  id: string;
  boardId: string;
  title: string;
  order: number;
  cardIds: unknown;
};

type WorkspaceCardRow = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  labelIds: unknown;
  category: string;
  assignee: string;
  checklist: unknown;
  attachments: unknown;
  dueDate: string;
  dueTime: string;
  recurrence: string;
  starred: boolean;
  calendarId?: string | null;
  calendarEventId?: string | null;
  addToCalendar?: boolean;
  reminderMinutes?: number | null;
  assigneeUserId?: string | null;
  endDueDate?: string;
  sourceChatMessageId?: string | null;
  sourceChatThreadId?: string | null;
};

type WorkspaceProjectRow = {
  id: string;
  name: string;
  memberIds: unknown;
  boardId: string | null;
  phases?: unknown;
};

type NoteBoardRow = {
  id: string;
  name: string;
  color: string;
  order: number;
  memberUserIds?: unknown;
};

type WorkspaceNoteRow = {
  id: string;
  boardId: string;
  title: string;
  content: string;
  color: string;
  checklist: unknown;
  fileAttachments: unknown;
  ncAttachments?: unknown;
  labelIds?: unknown;
  starred: boolean;
  archived: boolean;
  deletedAt: string | null;
};

type DailyReportRow = {
  id: string;
  authorUserId: string;
  authorName: string;
  dateKey: string;
  title: string;
  body: string;
  status: MeizitoDailyReport['status'];
  managerApproved: boolean;
  managerApprovedAt: Date | null;
  feedbackEntries: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type FieldVisitRow = {
  id: string;
  authorUserId: string;
  authorName: string;
  dateKey: string;
  details: unknown;
  createdAt: Date;
};
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function asJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value as T;
}

export function serializeWorkspaceBoard(
  board: WorkspaceBoardRow,
  columns: WorkspaceColumnRow[]
): MeizitoBoard {
  return {
    id: board.id,
    name: board.name,
    memberNames: asStringArray(board.memberNames),
    columnIds: columns.sort((a, b) => a.order - b.order).map((c) => c.id),
    labelPalette: asJson(board.labelPalette, []),
  };
}

export function serializeWorkspaceColumn(column: WorkspaceColumnRow): MeizitoColumn {
  return {
    id: column.id,
    boardId: column.boardId,
    title: column.title,
    order: column.order,
    cardIds: asStringArray(column.cardIds),
  };
}

export function normalizeWorkspaceBoard(board: MeizitoBoard): MeizitoBoard {
  return {
    ...board,
    name: board.name ?? 'میز کار',
    memberNames: Array.isArray(board.memberNames) ? board.memberNames : [],
    columnIds: Array.isArray(board.columnIds) ? board.columnIds : [],
    labelPalette: Array.isArray(board.labelPalette) ? board.labelPalette : [],
  };
}

/** عنوان‌های عددی کوتاه (خرابی داده) را در صورت امکان از توضیح/چک‌لیست بازیابی می‌کند. */
export function coerceWorkspaceCardTitle(card: MeizitoCard): string {
  const raw = card.title;
  const title =
    typeof raw === 'string'
      ? raw.trim()
      : raw != null && raw !== ''
        ? String(raw).trim()
        : '';
  if (title && !/^\d{1,3}$/.test(title)) return title;
  const fromDesc = (card.description ?? '').trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (fromDesc.length >= 2) return fromDesc.slice(0, 200);
  const fromChecklist = card.checklist?.find((item) => String(item.title ?? '').trim().length >= 2);
  if (fromChecklist?.title) return String(fromChecklist.title).trim().slice(0, 200);
  if (title && /^\d{1,3}$/.test(title)) return 'وظیفه بدون عنوان';
  return title || 'وظیفه بدون عنوان';
}

export function normalizeWorkspaceColumn(column: MeizitoColumn): MeizitoColumn {
  return {
    ...column,
    title: column.title ?? 'ستون',
    order: typeof column.order === 'number' ? column.order : 0,
    cardIds: Array.isArray(column.cardIds) ? column.cardIds : [],
  };
}

export function normalizeWorkspaceCard(card: MeizitoCard): MeizitoCard {
  return {
    ...card,
    title: coerceWorkspaceCardTitle(card),
    description: card.description ?? '',
    labelIds: card.labelIds ?? [],
    category: card.category ?? '',
    assignee: card.assignee ?? '',
    checklist: card.checklist ?? [],
    attachments: card.attachments ?? [],
    dueDate: card.dueDate ?? '',
    dueTime: card.dueTime ?? '',
    recurrence: (card.recurrence ?? 'none') as MeizitoRecurrence,
    starred: Boolean(card.starred),
    calendarId: card.calendarId ?? undefined,
    calendarEventId: card.calendarEventId ?? undefined,
    addToCalendar: card.addToCalendar ?? false,
    reminderMinutes: card.reminderMinutes ?? undefined,
    assigneeUserId: card.assigneeUserId ?? undefined,
    endDueDate: card.endDueDate ?? '',
    sourceChatMessageId: card.sourceChatMessageId ?? undefined,
    sourceChatThreadId: card.sourceChatThreadId ?? undefined,
  };
}

export function serializeWorkspaceCard(card: WorkspaceCardRow): MeizitoCard {
  return normalizeWorkspaceCard({
    id: card.id,
    boardId: card.boardId,
    columnId: card.columnId,
    title: card.title,
    description: card.description,
    labelIds: asStringArray(card.labelIds),
    category: card.category,
    assignee: card.assignee,
    checklist: asJson(card.checklist, []),
    attachments: asJson(card.attachments, []),
    dueDate: card.dueDate,
    dueTime: card.dueTime,
    recurrence: card.recurrence as MeizitoRecurrence,
    starred: card.starred,
    calendarId: card.calendarId ?? undefined,
    calendarEventId: card.calendarEventId ?? undefined,
    addToCalendar: card.addToCalendar ?? false,
    reminderMinutes: card.reminderMinutes ?? undefined,
    assigneeUserId: card.assigneeUserId ?? undefined,
    endDueDate: card.endDueDate ?? '',
    sourceChatMessageId: card.sourceChatMessageId ?? undefined,
    sourceChatThreadId: card.sourceChatThreadId ?? undefined,
  });
}

export function serializeWorkspaceProject(project: WorkspaceProjectRow): MeizitoProject {
  return {
    id: project.id,
    name: project.name,
    memberIds: asStringArray(project.memberIds),
    boardId: project.boardId ?? undefined,
    phases: Array.isArray(project.phases) ? project.phases : [],
  };
}

export function serializeNoteBoard(board: NoteBoardRow): MeizitoNoteBoard {
  return {
    id: board.id,
    name: board.name,
    color: board.color,
    order: board.order,
    memberUserIds: asStringArray(board.memberUserIds),
  };
}

export function serializeWorkspaceNote(note: WorkspaceNoteRow): MeizitoNote {
  return {
    id: note.id,
    boardId: note.boardId,
    title: note.title,
    content: note.content,
    color: note.color,
    checklist: asJson(note.checklist, []),
    fileAttachments: asJson(note.fileAttachments ?? note.ncAttachments, undefined),
    labelIds: asStringArray(note.labelIds),
    archived: note.archived,
    deletedAt: note.deletedAt,
    starred: note.starred,
  };
}

export function serializeDailyReportRow(row: DailyReportRow): MeizitoDailyReport {
  return normalizeDailyReport({
    id: row.id,
    authorId: row.authorUserId,
    authorName: row.authorName,
    date: row.dateKey,
    title: row.title,
    body: row.body,
    status: row.status,
    managerApproved: row.managerApproved,
    managerApprovedAt: row.managerApprovedAt?.toISOString(),
    feedbackEntries: asJson(row.feedbackEntries, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function serializeFieldVisitRow(row: FieldVisitRow): MeizitoFieldVisit {
  const details = asJson<Partial<MeizitoFieldVisit>>(row.details, {});
  return normalizeFieldVisit({
    ...details,
    id: row.id,
    date: row.dateKey,
    authorId: row.authorUserId,
    authorName: row.authorName,
    createdAt: row.createdAt.toISOString(),
  } as MeizitoFieldVisit);
}

export type WorkspaceSnapshot = {
  boards: MeizitoBoard[];
  columns: MeizitoColumn[];
  cards: MeizitoCard[];
  projects: MeizitoProject[];
  noteBoards: MeizitoNoteBoard[];
  notes: MeizitoNote[];
  dailyReports: MeizitoDailyReport[];
  fieldVisits: MeizitoFieldVisit[];
  activeBoardId: string | null;
  activeNoteBoardId: string | null;
};
