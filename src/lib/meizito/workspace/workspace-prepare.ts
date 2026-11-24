import { randomUUID } from 'crypto';
import {
  coerceWorkspaceCardTitle,
  normalizeWorkspaceBoard,
  normalizeWorkspaceCard,
  normalizeWorkspaceColumn,
  type WorkspaceSnapshot,
} from '@/src/lib/meizito/workspace/serialize';
import {
  defaultNoteBoardIdForBusiness,
  ensureBusinessScopedWorkspaceSnapshot,
} from '@/src/lib/meizito/workspace/default-note-board';
import type { MeizitoBoard, MeizitoColumn } from '@/src/types/meizito';

const LEGACY_DEMO_CARD_ID = 'card-demo-1';

export function removeCardIdFromAllColumns(snap: WorkspaceSnapshot, cardId: string) {
  for (const col of snap.columns) {
    const ids = Array.isArray(col.cardIds) ? col.cardIds : [];
    col.cardIds = ids.filter((id) => id !== cardId);
  }
}

export function appendCardIdToColumn(snap: WorkspaceSnapshot, columnId: string, cardId: string) {
  const col = snap.columns.find((c) => c.id === columnId);
  if (!col) return;
  if (!Array.isArray(col.cardIds)) col.cardIds = [];
  if (!col.cardIds.includes(cardId)) col.cardIds.push(cardId);
}

/** کارت‌های ذخیره‌شده بدون cardIds در ستون (باگ قبلی API) را به ستون‌ها لینک می‌کند. */
export function reconcileWorkspaceCardColumnLinks(snap: WorkspaceSnapshot) {
  const cardIds = new Set(snap.cards.map((c) => c.id));
  for (const col of snap.columns) {
    col.cardIds = Array.isArray(col.cardIds) ? col.cardIds : [];
    col.cardIds = col.cardIds.filter((id) => cardIds.has(id));
  }
  for (const card of snap.cards) {
    removeCardIdFromAllColumns(snap, card.id);
    appendCardIdToColumn(snap, card.columnId, card.id);
  }
}

export function defaultColumnsForBoard(boardId: string): MeizitoColumn[] {
  const c1 = randomUUID();
  const c2 = randomUUID();
  const c3 = randomUUID();
  return [
    { id: c1, boardId, title: 'برای انجام', order: 0, cardIds: [] },
    { id: c2, boardId, title: 'در حال انجام', order: 1, cardIds: [] },
    { id: c3, boardId, title: 'انجام شده', order: 2, cardIds: [] },
  ];
}

export function createBoardWithDefaultColumns(name: string): {
  board: MeizitoBoard;
  columns: MeizitoColumn[];
} {
  const boardId = randomUUID();
  const columns = defaultColumnsForBoard(boardId);
  const board: MeizitoBoard = {
    id: boardId,
    name: name.trim() || 'میز جدید',
    memberNames: [],
    columnIds: columns.map((c) => c.id),
    labelPalette: [{ id: randomUUID(), name: 'برچسب', color: '#94a3b8' }],
  };
  return { board, columns };
}

function repairWorkspaceBoards(snap: WorkspaceSnapshot) {
  snap.boards = snap.boards.map((b) => normalizeWorkspaceBoard(b));
  for (const board of snap.boards) {
    let cols = snap.columns.filter((c) => c.boardId === board.id);
    if (cols.length === 0) {
      cols = defaultColumnsForBoard(board.id);
      snap.columns.push(...cols);
      board.columnIds = cols.map((c) => c.id);
    } else {
      board.columnIds = cols
        .sort((a, b) => a.order - b.order)
        .map((c) => c.id);
    }
  }
}

function ensureWorkspaceDefaults(snap: WorkspaceSnapshot, businessId: string) {
  ensureBusinessScopedWorkspaceSnapshot(snap, businessId);
  if (
    !snap.activeBoardId ||
    !(snap.boards ?? []).some((b) => b.id === snap.activeBoardId)
  ) {
    snap.activeBoardId = snap.boards[0]?.id ?? null;
  }
}

function repairWorkspaceCardTitlesPersist(snap: WorkspaceSnapshot) {
  for (const card of snap.cards ?? []) {
    if (
      card.id === LEGACY_DEMO_CARD_ID &&
      /^\d{1,3}$/.test(String(card.title ?? '').trim())
    ) {
      card.title = 'کار نمونه';
      continue;
    }
    const coerced = coerceWorkspaceCardTitle(card);
    if (coerced !== card.title) card.title = coerced;
  }
}

/** میزهای آزمایشی خالی COPILOT-CHECK که فقط در select گیج می‌کنند. */
function pruneEmptyCopilotCheckBoards(snap: WorkspaceSnapshot) {
  const removeIds: string[] = [];
  for (const board of snap.boards ?? []) {
    const name = (board.name ?? '').trim();
    if (!/^COPILOT-CHECK/i.test(name)) continue;
    const hasCards = (snap.cards ?? []).some((c) => c.boardId === board.id);
    if (hasCards) continue;
    removeIds.push(board.id);
  }
  for (const boardId of removeIds) {
    deleteBoardFromWorkspace(snap, boardId);
  }
  if (
    snap.activeBoardId &&
    removeIds.includes(snap.activeBoardId) &&
    snap.boards.length > 0
  ) {
    snap.activeBoardId = snap.boards[0]?.id ?? null;
  }
}

export function deleteCardFromWorkspace(snap: WorkspaceSnapshot, cardId: string) {
  removeCardIdFromAllColumns(snap, cardId);
  snap.cards = snap.cards.filter((c) => c.id !== cardId);
}

export function deleteColumnFromWorkspace(snap: WorkspaceSnapshot, columnId: string) {
  const col = snap.columns.find((c) => c.id === columnId);
  if (!col) return;
  for (const id of [...(col.cardIds ?? [])]) {
    deleteCardFromWorkspace(snap, id);
  }
  snap.columns = snap.columns.filter((c) => c.id !== columnId);
  const board = snap.boards.find((b) => b.id === col.boardId);
  if (board) {
    board.columnIds = board.columnIds.filter((id) => id !== columnId);
  }
}

export function deleteBoardFromWorkspace(snap: WorkspaceSnapshot, boardId: string) {
  const boardCols = snap.columns.filter((c) => c.boardId === boardId);
  for (const col of boardCols) {
    deleteColumnFromWorkspace(snap, col.id);
  }
  snap.cards = snap.cards.filter((c) => c.boardId !== boardId);
  snap.boards = snap.boards.filter((b) => b.id !== boardId);
}

/** Normalize/repair in memory — safe on GET; persist only via mutations or repair script. */
export function prepareWorkspaceSnapshot(snap: WorkspaceSnapshot, businessId: string) {
  snap.boards = (snap.boards ?? []).map((b) => normalizeWorkspaceBoard(b));
  snap.columns = (snap.columns ?? []).map((c) => normalizeWorkspaceColumn(c));
  snap.cards = (snap.cards ?? []).map((c) => normalizeWorkspaceCard(c));
  snap.notes = snap.notes ?? [];
  snap.noteBoards = snap.noteBoards ?? [];
  snap.dailyReports = snap.dailyReports ?? [];
  snap.fieldVisits = snap.fieldVisits ?? [];
  snap.projects = snap.projects ?? [];
  ensureWorkspaceDefaults(snap, businessId);
  repairWorkspaceBoards(snap);
  reconcileWorkspaceCardColumnLinks(snap);
  repairWorkspaceCardTitlesPersist(snap);
  pruneEmptyCopilotCheckBoards(snap);
}
