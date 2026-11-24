/**
 * فاز ۶: backfill Jalali legacy در _phase6_legacy (در صورت وجود) — مهاجرت معمولاً legacy را حذف کرده؛
 * این اسکریپت ردیف‌های بدون تاریخ را از createdAt / dateKey پر می‌کند.
 */
import { prisma } from '../src/lib/db/prisma';
import {
  calendarOnFromDateKeys,
  dueOnFromTaskCalendarStrings,
  parseBusinessDateForDb,
} from '../src/lib/dates/business-date';

async function fillMissingFromFn<T extends { id: string }>(
  label: string,
  list: () => Promise<T[]>,
  pick: (row: T) => Date | null,
  apply: (id: string, value: Date) => Promise<void>
) {
  const rows = await list();
  let n = 0;
  for (const row of rows) {
    const d = pick(row);
    if (!d) continue;
    await apply(row.id, d);
    n++;
  }
  if (n) console.log(`  ${label}: ${n}`);
}

async function main() {
  await fillMissingFromFn(
    'JournalEntry (createdAt)',
    () => prisma.journalEntry.findMany({ where: { date: null }, select: { id: true, createdAt: true } }),
    (r) => parseBusinessDateForDb(r.createdAt.toISOString().slice(0, 10)),
    async (id, date) => {
      await prisma.journalEntry.update({ where: { id }, data: { date } });
    }
  );

  await fillMissingFromFn(
    'AttendanceLog (createdAt)',
    () => prisma.attendanceLog.findMany({ where: { workDate: null }, select: { id: true, createdAt: true } }),
    (r) => parseBusinessDateForDb(r.createdAt.toISOString().slice(0, 10)),
    async (id, workDate) => {
      await prisma.attendanceLog.update({ where: { id }, data: { workDate } });
    }
  );

  const cards = await prisma.workspaceCard.findMany({
    where: { OR: [{ dueOn: null, NOT: { dueDate: '' } }, { endDueOn: null, NOT: { endDueDate: '' } }] },
    select: { id: true, dueDate: true, endDueDate: true, dueOn: true, endDueOn: true },
  });
  let cardN = 0;
  for (const c of cards) {
    const parsed = dueOnFromTaskCalendarStrings(c.dueDate, c.endDueDate);
    const data: { dueOn?: Date; endDueOn?: Date } = {};
    if (!c.dueOn && parsed.dueOn) data.dueOn = parsed.dueOn;
    if (!c.endDueOn && (parsed.endDueOn ?? parsed.dueOn)) data.endDueOn = parsed.endDueOn ?? parsed.dueOn ?? undefined;
    if (Object.keys(data).length === 0) continue;
    await prisma.workspaceCard.update({ where: { id: c.id }, data });
    cardN++;
  }
  if (cardN) console.log(`  WorkspaceCard jalali: ${cardN}`);

  const events = await prisma.meizitoCalendarEvent.findMany({
    where: { startOn: null },
    select: { id: true, dateKey: true, endDateKey: true },
  });
  let evN = 0;
  for (const e of events) {
    const { startOn, endOn } = calendarOnFromDateKeys(e.dateKey, e.endDateKey);
    await prisma.meizitoCalendarEvent.update({
      where: { id: e.id },
      data: { startOn, endOn },
    });
    evN++;
  }
  if (evN) console.log(`  MeizitoCalendarEvent: ${evN}`);

  console.log('backfill-v11-phase6-dates ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());