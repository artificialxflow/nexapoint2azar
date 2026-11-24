/**
 * تست یک‌فرمان برای محیط deploy (سرور staging/production با کد و env کامل).
 * اجرا: npm run test:v9-deploy
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { eventOccursOnDate } from '../src/lib/meizito/calendarGrid';
import type { MeizitoCalendarEvent } from '../src/types/meizito';

function run(label: string, cmd: string) {
  console.log(`\n▶ ${label}`);
  execSync(cmd, { stdio: 'inherit' });
}

const multiDay: MeizitoCalendarEvent = {
  id: 'e1',
  calendarId: 'c1',
  title: 'span',
  date: '2026-01-10',
  endDate: '2026-01-12',
};
if (!eventOccursOnDate(multiDay, '2026-01-11')) {
  console.error('FAIL: multi-day eventOccursOnDate');
  process.exit(1);
}

run('قرارداد اسکیما', 'npm run test:v9-schema-contract');
run('بک‌اند v9', 'npm run test:v9-backend');

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.log('\n⚠ DATABASE_URL نیست — چک migration روی DB رد شد.');
  console.log('OK test-v9-deploy (بدون DB)');
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const mig = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = '20261110120000_v9_phase1_schema'
    LIMIT 1
  `;
  if (mig.length === 0) {
    console.error('FAIL: migration v9 روی DB اعمال نشده (20261110120000_v9_phase1_schema)');
    process.exit(1);
  }

  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkspaceCard'
      AND column_name IN ('addToCalendar', 'endDueDate', 'sourceChatMessageId')
  `;
  const names = new Set(cols.map((c) => c.column_name));
  for (const required of ['addToCalendar', 'endDueDate', 'sourceChatMessageId'] as const) {
    if (!names.has(required)) {
      console.error(`FAIL: ستون WorkspaceCard.${required} روی DB نیست`);
      process.exit(1);
    }
  }

  const refCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkspaceFieldVisit'
      AND column_name = 'hasReferrer'
    LIMIT 1
  `;
  if (refCol.length === 0) {
    console.error('FAIL: ستون WorkspaceFieldVisit.hasReferrer روی DB نیست');
    process.exit(1);
  }

  const hrRules = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'HrEligibilityRule'
    LIMIT 1
  `;
  if (hrRules.length === 0) {
    console.error('FAIL: جدول HrEligibilityRule روی DB نیست');
    process.exit(1);
  }

  const orgTable = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'OrgAssignment'
    LIMIT 1
  `;
  if (orgTable.length === 0) {
    console.error('FAIL: جدول OrgAssignment روی DB نیست');
    process.exit(1);
  }

  const orgUnitTable = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'OrgUnit'
    LIMIT 1
  `;
  if (orgUnitTable.length === 0) {
    console.error('FAIL: جدول OrgUnit روی DB نیست');
    process.exit(1);
  }

  const phoneCols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PhoneDirectoryEntry'
      AND column_name IN ('firstName', 'lastName')
  `;
  const phoneNames = new Set(phoneCols.map((c) => c.column_name));
  if (!phoneNames.has('firstName') || !phoneNames.has('lastName')) {
    console.error('FAIL: ستون‌های firstName/lastName روی PhoneDirectoryEntry نیست');
    process.exit(1);
  }

  console.log('\n✓ migration v9 و ستون‌های کلیدی روی DB تأیید شد.');
  console.log('OK test-v9-deploy');
} finally {
  await prisma.$disconnect();
}
