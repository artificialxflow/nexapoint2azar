/**
 * One-time repair: load workspace → prepareWorkspaceSnapshot → persist to DB/slice.
 * Usage: npx tsx scripts/repair-workspace-snapshot.ts [businessId] [--dry-run]
 */
import { prisma } from '../src/lib/db/prisma';
import { loadWorkspaceSnapshot, persistWorkspaceSnapshot } from '../src/lib/meizito/workspace/workspace-storage';
import { prepareWorkspaceSnapshot } from '../src/lib/meizito/workspace/workspace-prepare';

const dryRun = process.argv.includes('--dry-run');
const businessIdArg = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[1]);

async function main() {
  const businesses = businessIdArg
    ? [{ id: businessIdArg }]
    : await prisma.business.findMany({ select: { id: true } });

  for (const { id: businessId } of businesses) {
    const snap = await loadWorkspaceSnapshot(businessId);
    if (!snap.boards?.length && !snap.cards?.length && !snap.notes?.length) {
      console.log(`skip ${businessId} (empty workspace)`);
      continue;
    }
    prepareWorkspaceSnapshot(snap, businessId);
    if (dryRun) {
      console.log(
        `dry-run ${businessId}: boards=${snap.boards.length} columns=${snap.columns.length} cards=${snap.cards.length}`
      );
      continue;
    }
    await persistWorkspaceSnapshot(businessId, snap);
    console.log(`repair ok ${businessId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
