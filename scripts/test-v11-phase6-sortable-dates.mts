/**
 * Gate فاز ۶: ستون DATE + فیلتر ماه در DB
 * Run: npm run test:v11-phase6-sortable-dates
 */
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db/prisma';
import {
  businessDateToPrismaDate,
  jalaliMonthRangeOnDb,
  parseBusinessDateForDb,
} from '../src/lib/dates/business-date';
import { toGregorian } from 'jalaali-js';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('skip: DATABASE_URL not set');
    return;
  }

  const journalCol = await prisma.$queryRaw<{ data_type: string }[]>`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'JournalEntry' AND column_name = 'date'
    LIMIT 1
  `;
  assert.equal(journalCol[0]?.data_type, 'date', 'JournalEntry.date must be DATE');

  const attCol = await prisma.$queryRaw<{ data_type: string }[]>`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AttendanceLog' AND column_name = 'workDate'
    LIMIT 1
  `;
  assert.equal(attCol[0]?.data_type, 'date', 'AttendanceLog.workDate must be DATE');

  const cardCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkspaceCard' AND column_name = 'dueOn'
    LIMIT 1
  `;
  assert.ok(cardCol.length > 0, 'WorkspaceCard.dueOn required');

  const biz = await prisma.business.findFirst({ select: { id: true } });
  if (!biz) {
    console.log('skip: no business for filter probe');
    return;
  }

  const jy = 1403;
  const jm = 10;
  const g = toGregorian(jy, jm, 15);
  const probe = businessDateToPrismaDate(new Date(g.gy, g.gm - 1, g.gd));

  const attId = `test-att-${Date.now()}`;
  await prisma.attendanceLog.create({
    data: {
      id: attId,
      businessId: biz.id,
      employeeName: 'phase6-probe',
      workDate: probe,
    },
  });

  const range = jalaliMonthRangeOnDb(`${jy}/${jm}`)!;
  const filtered = await prisma.attendanceLog.findMany({
    where: {
      businessId: biz.id,
      workDate: { gte: range.gte, lt: range.lt },
      id: attId,
    },
  });
  assert.equal(filtered.length, 1, 'attendance month filter must hit probe row');

  const journalId = `test-je-${Date.now()}`;
  await prisma.journalEntry.create({
    data: {
      id: journalId,
      businessId: biz.id,
      entryNo: `P6-${Date.now()}`,
      date: probe,
      description: 'phase6',
      totalDebit: 0,
      totalCredit: 0,
    },
  });

  const journals = await prisma.journalEntry.findMany({
    where: {
      businessId: biz.id,
      date: { gte: range.gte, lt: range.lt },
      id: journalId,
    },
  });
  assert.equal(journals.length, 1, 'journal month filter must hit probe row');

  await prisma.journalEntry.deleteMany({ where: { id: journalId } });
  await prisma.attendanceLog.deleteMany({ where: { id: attId } });

  const parsed = parseBusinessDateForDb('1404/01/01');
  assert.ok(parsed, 'jalali parse');

  console.log('test-v11-phase6-sortable-dates ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());