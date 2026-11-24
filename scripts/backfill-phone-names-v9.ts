/**
 * Split PhoneDirectoryEntry.displayName → firstName / lastName (todo-v9 §1.5)
 * Usage: npx tsx scripts/backfill-phone-names-v9.ts [--dry-run]
 */
import { prisma } from '../src/lib/db/prisma';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const rows = await prisma.phoneDirectoryEntry.findMany({
    where: { OR: [{ firstName: '' }, { lastName: '' }] },
  });
  let updated = 0;
  for (const row of rows) {
    const parts = row.displayName.trim().split(/\s+/);
    const firstName = parts[0] ?? row.displayName;
    const lastName = parts.slice(1).join(' ');
    if (row.firstName === firstName && row.lastName === lastName) continue;
    if (!dryRun) {
      await prisma.phoneDirectoryEntry.update({
        where: { id: row.id },
        data: { firstName, lastName },
      });
    }
    updated++;
  }
  console.log(dryRun ? `[dry-run] would update ${updated} entries` : `updated ${updated} entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
