/**
 * Smoke tests for workspace normalize/repair helpers (run: npx tsx scripts/test-workspace-guards.mts)
 */
import assert from 'node:assert/strict';
import {
  coerceWorkspaceCardTitle,
  normalizeWorkspaceColumn,
  normalizeWorkspaceCard,
  normalizeWorkspaceBoard,
} from '../src/lib/meizito/workspace/serialize';
import type { MeizitoCard, MeizitoColumn } from '../src/types/meizito';

function testCoerceNumericTitle() {
  const card: MeizitoCard = {
    id: 'c1',
    boardId: 'b1',
    columnId: 'col1',
    title: '2',
    description: 'کار نمونه',
    labelIds: [],
    category: '',
    assignee: '',
    checklist: [],
    attachments: [],
    dueDate: '',
    dueTime: '',
    recurrence: 'none',
    starred: false,
  };
  assert.equal(coerceWorkspaceCardTitle(card), 'کار نمونه');
  assert.equal(normalizeWorkspaceCard(card).title, 'کار نمونه');
}

function testNormalizeColumnMissingCardIds() {
  const col = normalizeWorkspaceColumn({
    id: 'x',
    boardId: 'b',
    title: 'برای انجام',
    order: 0,
    cardIds: undefined as unknown as MeizitoColumn['cardIds'],
  });
  assert.deepEqual(col.cardIds, []);
}

function testNormalizeBoardMissingMembers() {
  const board = normalizeWorkspaceBoard({
    id: 'b',
    name: 'COPILOT-CHECK',
    memberNames: undefined as unknown as string[],
    columnIds: [],
    labelPalette: undefined as unknown as [],
  });
  assert.deepEqual(board.memberNames, []);
  assert.deepEqual(board.labelPalette, []);
}

function testCoerceNumericTitleNoRecovery() {
  const card: MeizitoCard = {
    id: 'c9',
    boardId: 'b1',
    columnId: 'col1',
    title: '3',
    description: '',
    labelIds: [],
    category: '',
    assignee: '',
    checklist: [],
    attachments: [],
    dueDate: '',
    dueTime: '',
    recurrence: 'none',
    starred: false,
  };
  assert.equal(coerceWorkspaceCardTitle(card), 'وظیفه بدون عنوان');
}

function testCalendarFieldsPreserved() {
  const card: MeizitoCard = {
    id: 'c1',
    boardId: 'b1',
    columnId: 'col1',
    title: 'کار',
    description: '',
    labelIds: [],
    category: '',
    assignee: '',
    checklist: [],
    attachments: [],
    dueDate: '',
    dueTime: '',
    recurrence: 'none',
    starred: false,
    calendarId: 'cal-1',
    calendarEventId: 'ev-1',
  };
  const n = normalizeWorkspaceCard(card);
  assert.equal(n.calendarId, 'cal-1');
  assert.equal(n.calendarEventId, 'ev-1');
}

testCoerceNumericTitle();
testCoerceNumericTitleNoRecovery();
testNormalizeColumnMissingCardIds();
testNormalizeBoardMissingMembers();
testCalendarFieldsPreserved();
console.log('test-workspace-guards: ok');
