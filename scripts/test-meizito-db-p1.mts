/**
 * Smoke: workspace DB load/save round-trip shape (needs DATABASE_URL + migrated schema).
 * Run: npx tsx scripts/test-meizito-db-p1.mts
 */
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db/prisma';
import {
  loadWorkspaceSnapshotFromDb,
  saveWorkspaceSnapshotToDb,
  workspaceDbHasData,
} from '../src/lib/meizito/workspace/workspace-db-service';
import type { WorkspaceSnapshot } from '../src/lib/meizito/workspace/serialize';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('skip: DATABASE_URL not set');
    return;
  }
  const business = await prisma.business.findFirst({ select: { id: true } });
  assert.ok(business, 'need at least one business');

  const snap: WorkspaceSnapshot = {
    boards: [
      {
        id: 'test-board-p1',
        name: 'تست P1',
        memberNames: ['علی'],
        columnIds: ['test-col-p1'],
        labelPalette: [{ id: 'lbl-p1', name: 'فوری', color: '#f00' }],
      },
    ],
    columns: [{ id: 'test-col-p1', boardId: 'test-board-p1', title: 'انجام', order: 0, cardIds: [] }],
    cards: [],
    projects: [],
    noteBoards: [],
    notes: [],
    dailyReports: [],
    fieldVisits: [],
    activeBoardId: 'test-board-p1',
    activeNoteBoardId: null,
  };

  await saveWorkspaceSnapshotToDb(business.id, snap);
  assert.equal(await workspaceDbHasData(business.id), true);
  const loaded = await loadWorkspaceSnapshotFromDb(business.id);
  assert.equal(loaded.boards[0]?.name, 'تست P1');
  assert.equal(loaded.boards[0]?.labelPalette[0]?.name, 'فوری');
  console.log('test-meizito-db-p1 ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
