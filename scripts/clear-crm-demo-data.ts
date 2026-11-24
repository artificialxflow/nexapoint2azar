/**
 * Delete CRM demo rows for a business (leads, visits, club members).
 * Usage:
 *   npx tsx scripts/clear-crm-demo-data.ts --dry-run
 *   npx tsx scripts/clear-crm-demo-data.ts --confirm [businessId]
 */
import { prisma } from '../src/lib/db/prisma';

const dryRun = process.argv.includes('--dry-run');
const confirm = process.argv.includes('--confirm');
const businessIdArg = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[1]);

async function main() {
  if (!dryRun && !confirm) {
    console.error('Pass --dry-run or --confirm.');
    process.exit(1);
  }

  const businesses = businessIdArg
    ? [{ id: businessIdArg, name: businessIdArg }]
    : await prisma.business.findMany({ select: { id: true, name: true } });

  for (const { id, name } of businesses) {
    const [leads, visits, club] = await Promise.all([
      prisma.crmLead.count({ where: { businessId: id } }),
      prisma.crmVisit.count({ where: { businessId: id } }),
      prisma.crmClubMember.count({ where: { businessId: id } }),
    ]);
    console.log(`${name}: leads=${leads} visits=${visits} club=${club}`);
    if (dryRun) continue;
    await prisma.$transaction([
      prisma.crmLead.deleteMany({ where: { businessId: id } }),
      prisma.crmVisit.deleteMany({ where: { businessId: id } }),
      prisma.crmClubMember.deleteMany({ where: { businessId: id } }),
    ]);
    console.log(`cleared CRM demo for ${id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
