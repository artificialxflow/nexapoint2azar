import { meizitoFetch } from '@/src/lib/meizito/client';
import type { WorkspaceSnapshot } from '@/src/lib/meizito/workspace/serialize';
import type {
  MeizitoBoard,
  MeizitoCard,
  MeizitoColumn,
  MeizitoDailyReport,
  MeizitoFieldVisit,
  MeizitoNote,
  MeizitoProject,
} from '@/src/types/meizito';

export async function fetchWorkspaceSnapshot(businessId: string): Promise<WorkspaceSnapshot> {
  return meizitoFetch<WorkspaceSnapshot>(businessId, '/workspace');
}

export async function apiPatchWorkspacePrefs(
  businessId: string,
  patch: { activeNoteBoardId?: string }
) {
  return meizitoFetch<{ activeNoteBoardId: string | null }>(businessId, '/workspace', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiCreateBoard(businessId: string, name: string) {
  return meizitoFetch<{ board: MeizitoBoard; columns?: MeizitoColumn[] }>(businessId, '/boards', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function apiUpdateBoard(
  businessId: string,
  boardId: string,
  patch: { name?: string; memberNames?: string[]; labelPalette?: MeizitoBoard['labelPalette'] }
) {
  return meizitoFetch<{ board: MeizitoBoard }>(businessId, `/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiAddColumn(businessId: string, boardId: string, title: string) {
  return meizitoFetch<{ column: MeizitoColumn }>(businessId, `/boards/${boardId}/columns`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function apiCreateCard(
  businessId: string,
  input: {
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
    assignee?: string;
    assigneeUserId?: string;
    dueDate?: string;
    dueTime?: string;
    recurrence?: string;
    category?: string;
    labelIds?: string[];
    checklist?: MeizitoCard['checklist'];
    attachments?: MeizitoCard['attachments'];
    calendarId?: string;
    calendarEventId?: string;
    addToCalendar?: boolean;
    reminderMinutes?: number;
    endDueDate?: string;
    sourceChatMessageId?: string;
    sourceChatThreadId?: string;
  }
) {
  return meizitoFetch<{ card: MeizitoCard }>(businessId, '/cards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateCard(
  businessId: string,
  cardId: string,
  patch: Partial<MeizitoCard>
) {
  return meizitoFetch<{ card: MeizitoCard }>(businessId, `/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiMoveCard(
  businessId: string,
  cardId: string,
  columnId: string,
  index?: number
) {
  return meizitoFetch<{ card: MeizitoCard }>(businessId, '/card-move', {
    method: 'POST',
    body: JSON.stringify({
      cardId,
      columnId,
      ...(index !== undefined ? { index } : {}),
    }),
  });
}

export async function apiDeleteCard(businessId: string, cardId: string) {
  return meizitoFetch<{ ok: boolean }>(businessId, `/cards/${cardId}`, {
    method: 'DELETE',
  });
}

export async function apiUpdateColumn(
  businessId: string,
  columnId: string,
  patch: Partial<Pick<MeizitoColumn, 'title' | 'order'>>
) {
  return meizitoFetch<{ column: MeizitoColumn }>(businessId, `/columns/${columnId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiDeleteColumn(businessId: string, columnId: string) {
  return meizitoFetch<{ ok: boolean }>(businessId, `/columns/${columnId}`, {
    method: 'DELETE',
  });
}

export async function apiDeleteBoard(businessId: string, boardId: string) {
  return meizitoFetch<{ ok: boolean }>(businessId, `/boards/${boardId}`, {
    method: 'DELETE',
  });
}

export async function apiCreateProject(
  businessId: string,
  input: { name: string; memberIds: string[]; boardId?: string }
) {
  return meizitoFetch<{ project: MeizitoProject }>(businessId, '/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateProject(
  businessId: string,
  projectId: string,
  patch: Partial<MeizitoProject>
) {
  return meizitoFetch<{ project: MeizitoProject }>(businessId, `/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiCreateNoteBoard(businessId: string, name: string) {
  return meizitoFetch<{ noteBoard: { id: string; name: string; color?: string; order: number } }>(
    businessId,
    '/note-boards',
    { method: 'POST', body: JSON.stringify({ name }) }
  );
}

export async function apiUpdateNoteBoard(
  businessId: string,
  boardId: string,
  patch: Partial<{ name: string; color: string; memberUserIds: string[] }>
) {
  return meizitoFetch<{ noteBoard: { id: string; name: string; color?: string; memberUserIds?: string[] } }>(
    businessId,
    `/note-boards/${boardId}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
}

export async function apiCreateNote(
  businessId: string,
  input: {
    title: string;
    content: string;
    color: string;
    boardId?: string;
    fileAttachments?: unknown;
    labelIds?: string[];
  }
) {
  return meizitoFetch<{ note: MeizitoNote }>(businessId, '/notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateNote(businessId: string, noteId: string, patch: Partial<MeizitoNote>) {
  return meizitoFetch<{ note: MeizitoNote }>(businessId, `/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiCreateDailyReport(
  businessId: string,
  input: Omit<MeizitoDailyReport, 'id' | 'createdAt' | 'updatedAt'>
) {
  return meizitoFetch<{ report: MeizitoDailyReport }>(businessId, '/daily-reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiUpdateDailyReport(
  businessId: string,
  reportId: string,
  patch: Partial<Pick<MeizitoDailyReport, 'title' | 'body' | 'status' | 'dayChecklist'>>
) {
  return meizitoFetch<{ report: MeizitoDailyReport }>(businessId, `/daily-reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiDailyReportFeedback(
  businessId: string,
  reportId: string,
  feedback: string,
  kind: 'feedback' | 'approve' = 'feedback'
) {
  return meizitoFetch<{ report: MeizitoDailyReport }>(
    businessId,
    `/daily-reports/${reportId}/feedback`,
    { method: 'POST', body: JSON.stringify({ feedback, kind }) }
  );
}

export async function apiCreateFieldVisit(
  businessId: string,
  visit: Omit<MeizitoFieldVisit, 'id' | 'createdAt'>
) {
  return meizitoFetch<{ visit: MeizitoFieldVisit }>(businessId, '/field-visits', {
    method: 'POST',
    body: JSON.stringify(visit),
  });
}

export async function apiUpdateFieldVisit(
  businessId: string,
  visitId: string,
  patch: Partial<Omit<MeizitoFieldVisit, 'id' | 'createdAt'>>
) {
  return meizitoFetch<{ visit: MeizitoFieldVisit }>(businessId, `/field-visits/${visitId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiDeleteFieldVisit(businessId: string, visitId: string) {
  return meizitoFetch<{ ok: boolean }>(businessId, `/field-visits/${visitId}`, {
    method: 'DELETE',
  });
}
