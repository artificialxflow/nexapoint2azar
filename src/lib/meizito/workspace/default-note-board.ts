import type { MeizitoNoteBoard } from '@/src/types/meizito';
import type { WorkspaceSnapshot } from '@/src/lib/meizito/workspace/serialize';

/** Legacy global id — collides in DB `NoteBoard.id` across businesses. */
export const LEGACY_DEFAULT_NOTE_BOARD_ID = 'notes-default';

export function defaultNoteBoardIdForBusiness(businessId: string): string {
  return `nb-default-${businessId}`;
}

export function defaultNoteBoardForBusiness(businessId: string): MeizitoNoteBoard {
  return {
    id: defaultNoteBoardIdForBusiness(businessId),
    name: 'یادداشت‌ها',
    order: 0,
    color: '#fef08a',
  };
}

/** Ensures note board ids are unique per business before persisting to PostgreSQL. */
export function ensureBusinessScopedNoteBoards(
  snap: WorkspaceSnapshot,
  businessId: string
): void {
  const scopedId = defaultNoteBoardIdForBusiness(businessId);
  const legacy = LEGACY_DEFAULT_NOTE_BOARD_ID;

  snap.noteBoards = snap.noteBoards ?? [];
  snap.notes = snap.notes ?? [];

  if (snap.noteBoards.length === 0) {
    snap.noteBoards = [defaultNoteBoardForBusiness(businessId)];
  } else {
    const deduped = new Map<string, MeizitoNoteBoard>();
    for (const board of snap.noteBoards) {
      const id = board.id === legacy ? scopedId : board.id;
      deduped.set(id, id === board.id ? board : { ...board, id: scopedId });
    }
    snap.noteBoards = Array.from(deduped.values());
    if (!snap.noteBoards.some((b) => b.id === scopedId)) {
      snap.noteBoards.unshift(defaultNoteBoardForBusiness(businessId));
    }
  }

  if (
    !snap.activeNoteBoardId ||
    snap.activeNoteBoardId === legacy ||
    !snap.noteBoards.some((b) => b.id === snap.activeNoteBoardId)
  ) {
    snap.activeNoteBoardId = scopedId;
  }

  for (const note of snap.notes) {
    if (
      note.boardId === legacy ||
      !snap.noteBoards.some((b) => b.id === note.boardId)
    ) {
      note.boardId = scopedId;
    }
  }
}

/** Mock-bootstrap ids are global strings — remap before DB persist (multi-tenant). */
const LEGACY_KANBAN_ENTITY_IDS = new Set([
  'board-demo',
  'col-todo',
  'col-doing',
  'col-done',
  'card-demo-1',
  'lbl-1',
]);

function scopedLegacyKanbanId(rawId: string, businessId: string): string {
  if (!LEGACY_KANBAN_ENTITY_IDS.has(rawId)) return rawId;
  const suffix = `-${businessId}`;
  if (rawId.endsWith(suffix)) return rawId;
  return `${rawId}${suffix}`;
}

export function remapLegacyDemoKanbanIds(snap: WorkspaceSnapshot, businessId: string): void {
  const idMap = new Map<string, string>();
  const mapId = (id: string) => {
    const next = scopedLegacyKanbanId(id, businessId);
    if (next !== id) idMap.set(id, next);
    return next;
  };

  for (const board of snap.boards ?? []) {
    mapId(board.id);
    for (const lid of board.labelPalette ?? []) {
      mapId(lid.id);
    }
  }
  for (const col of snap.columns ?? []) {
    mapId(col.id);
    mapId(col.boardId);
  }
  for (const card of snap.cards ?? []) {
    mapId(card.id);
    mapId(card.boardId);
    mapId(card.columnId);
    for (const lid of card.labelIds ?? []) {
      mapId(lid);
    }
  }
  if (idMap.size === 0) return;

  const resolve = (id: string) => idMap.get(id) ?? id;

  snap.boards = (snap.boards ?? []).map((b) => ({
    ...b,
    id: resolve(b.id),
    columnIds: (b.columnIds ?? []).map(resolve),
    labelPalette: (b.labelPalette ?? []).map((lb) => ({
      ...lb,
      id: resolve(lb.id),
    })),
  }));
  snap.columns = (snap.columns ?? []).map((c) => ({
    ...c,
    id: resolve(c.id),
    boardId: resolve(c.boardId),
    cardIds: (c.cardIds ?? []).map(resolve),
  }));
  snap.cards = (snap.cards ?? []).map((c) => ({
    ...c,
    id: resolve(c.id),
    boardId: resolve(c.boardId),
    columnId: resolve(c.columnId),
    labelIds: (c.labelIds ?? []).map(resolve),
  }));
  snap.projects = (snap.projects ?? []).map((p) =>
    p.boardId ? { ...p, boardId: resolve(p.boardId) } : p
  );
  if (snap.activeBoardId) {
    snap.activeBoardId = resolve(snap.activeBoardId);
  }
}

/** Note boards + legacy demo kanban ids — call before persisting workspace to PostgreSQL. */
export function ensureBusinessScopedWorkspaceSnapshot(
  snap: WorkspaceSnapshot,
  businessId: string
): void {
  ensureBusinessScopedNoteBoards(snap, businessId);
  remapLegacyDemoKanbanIds(snap, businessId);
}

export function emptyWorkspacePayloadForBusiness(businessId: string): Pick<
  WorkspaceSnapshot,
  | 'boards'
  | 'columns'
  | 'cards'
  | 'projects'
  | 'noteBoards'
  | 'notes'
  | 'dailyReports'
  | 'fieldVisits'
  | 'activeBoardId'
  | 'activeNoteBoardId'
> {
  const nb = defaultNoteBoardForBusiness(businessId);
  return {
    boards: [],
    columns: [],
    cards: [],
    projects: [],
    noteBoards: [nb],
    notes: [],
    dailyReports: [],
    fieldVisits: [],
    activeBoardId: '',
    activeNoteBoardId: nb.id,
  };
}
