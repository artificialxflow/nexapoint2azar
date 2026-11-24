/**
 * حذف ردیف سهامدار/فروشنده با personId نامعتبر (بعد از deploy P3 fix).
 * npx tsx scripts/repair-people-module-orphans.ts [businessId]
 */
import { prisma } from '../src/lib/db/prisma';

async function main() {
  const businessId = process.argv[2];
  const businesses = businessId
    ? [{ id: businessId }]
    : await prisma.business.findMany({ select: { id: true } });

  for (const b of businesses) {
    const valid = new Set(
      (await prisma.person.findMany({ where: { businessId: b.id }, select: { personId: true } })).map(
        (r) => r.personId
      )
    );
    const sh = await prisma.shareholderRecord.findMany({ where: { businessId: b.id } });
    const vd = await prisma.vendorRecord.findMany({ where: { businessId: b.id } });
    const shDel = sh.filter((r) => !valid.has(r.personId));
    const vdDel = vd.filter((r) => !valid.has(r.personId));
    if (shDel.length) {
      await prisma.shareholderRecord.deleteMany({
        where: { id: { in: shDel.map((x) => x.id) } },
      });
    }
    if (vdDel.length) {
      await prisma.vendorRecord.deleteMany({
        where: { id: { in: vdDel.map((x) => x.id) } },
      });
    }
    const shDup: string[] = [];
    const shSeen = new Map<string, string>();
    for (const row of sh.filter((r) => valid.has(r.personId))) {
      const prev = shSeen.get(row.personId);
      if (prev) shDup.push(row.id);
      else shSeen.set(row.personId, row.id);
    }
    const vdDup: string[] = [];
    const vdSeen = new Map<string, string>();
    for (const row of vd.filter((r) => valid.has(r.personId))) {
      const prev = vdSeen.get(row.personId);
      if (prev) vdDup.push(row.id);
      else vdSeen.set(row.personId, row.id);
    }
    if (shDup.length) {
      await prisma.shareholderRecord.deleteMany({ where: { id: { in: shDup } } });
    }
    if (vdDup.length) {
      await prisma.vendorRecord.deleteMany({ where: { id: { in: vdDup } } });
    }
    if (shDel.length || vdDel.length || shDup.length || vdDup.length) {
      console.log(
        `${b.id}: orphan sh ${shDel.length} vd ${vdDel.length}; dup sh ${shDup.length} vd ${vdDup.length}`
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
