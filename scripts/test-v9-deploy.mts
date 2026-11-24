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

/** مایگریشن‌های قابل قبول: خط v9 تدریجی یا baseline v11 */
const ACCEPTED_ROOT_MIGRATIONS = [
  '20261110120000_v9_phase1_schema',
  '20261123000000_baseline',
] as const;

const prisma = new PrismaClient();
try {
  const migList = ACCEPTED_ROOT_MIGRATIONS.map((n) => `'${n}'`).join(', ');
  const mig = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations"
     WHERE migration_name IN (${migList})
     LIMIT 1`
  );
  if (mig.length === 0) {
    console.error(
      `FAIL: هیچ migration ریشه‌ای روی DB نیست (انتظار یکی از: ${ACCEPTED_ROOT_MIGRATIONS.join(', ')})`
    );
    process.exit(1);
  }
  console.log(`  migration ریشه: ${mig[0].migration_name}`);

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

  const journal = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'JournalEntry'
    LIMIT 1
  `;
  if (journal.length === 0 && mig[0].migration_name === '20261123000000_baseline') {
    console.error('FAIL: baseline اعمال شده اما جدول JournalEntry نیست');
    process.exit(1);
  }

  const personFk = await prisma.$queryRaw<{ conname: string }[]>`
    SELECT conname FROM pg_constraint
    WHERE conname = 'ShareholderRecord_businessId_personId_fkey'
    LIMIT 1
  `;
  if (personFk.length === 0) {
    console.error('FAIL: FK ShareholderRecord → Person روی DB نیست (v11 فاز ۲)');
    process.exit(1);
  }

  const salesPersonCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SalesNetworkMember'
      AND column_name = 'personId'
    LIMIT 1
  `;
  if (salesPersonCol.length === 0) {
    console.error('FAIL: ستون SalesNetworkMember.personId نیست (v11 فاز ۲)');
    process.exit(1);
  }

  const storeCatalogCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'StoreProduct'
      AND column_name = 'catalogProductId'
    LIMIT 1
  `;
  if (storeCatalogCol.length === 0) {
    console.error('FAIL: ستون StoreProduct.catalogProductId نیست (v11 فاز ۳)');
    process.exit(1);
  }

  const warehouseDataCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WarehouseItem'
      AND column_name = 'data'
    LIMIT 1
  `;
  if (warehouseDataCol.length > 0) {
    console.error('FAIL: ستون legacy WarehouseItem.data هنوز وجود دارد (v11 فاز ۳)');
    process.exit(1);
  }

  const columnCardIdsCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkspaceColumn'
      AND column_name = 'cardIds'
    LIMIT 1
  `;
  if (columnCardIdsCol.length > 0) {
    console.error('FAIL: ستون legacy WorkspaceColumn.cardIds هنوز وجود دارد (v11 فاز ۴)');
    process.exit(1);
  }

  const cardSortCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkspaceCard'
      AND column_name = 'sortOrder'
    LIMIT 1
  `;
  if (cardSortCol.length === 0) {
    console.error('FAIL: ستون WorkspaceCard.sortOrder نیست (v11 فاز ۴)');
    process.exit(1);
  }

  const imageDataUrlCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ChatMessage'
      AND column_name = 'imageDataUrl'
    LIMIT 1
  `;
  if (imageDataUrlCol.length > 0) {
    console.error('FAIL: ستون legacy ChatMessage.imageDataUrl هنوز وجود دارد (v11 فاز ۵)');
    process.exit(1);
  }

  const entityAttachmentTable = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'EntityAttachment'
    LIMIT 1
  `;
  if (entityAttachmentTable.length === 0) {
    console.error('FAIL: جدول EntityAttachment نیست (v11 فاز ۵)');
    process.exit(1);
  }

  const chatInlineBase64 = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM "ChatMessage"
    WHERE COALESCE("attachmentRefs"::text, '') LIKE '%data:image%'
  `;
  if (Number(chatInlineBase64[0]?.n ?? 0) > 0) {
    console.error('FAIL: پیوست base64 در ChatMessage.attachmentRefs (v11 فاز ۵)');
    process.exit(1);
  }

  const journalDateType = await prisma.$queryRaw<{ data_type: string }[]>`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'JournalEntry' AND column_name = 'date'
    LIMIT 1
  `;
  if (journalDateType[0]?.data_type !== 'date') {
    console.error('FAIL: JournalEntry.date باید نوع DATE باشد (v11 فاز ۶)');
    process.exit(1);
  }

  const attDateType = await prisma.$queryRaw<{ data_type: string }[]>`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AttendanceLog' AND column_name = 'workDate'
    LIMIT 1
  `;
  if (attDateType[0]?.data_type !== 'date') {
    console.error('FAIL: AttendanceLog.workDate باید نوع DATE باشد (v11 فاز ۶)');
    process.exit(1);
  }

  const orderStatusEnum = await prisma.$queryRaw<{ udt_name: string }[]>`
    SELECT udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CustomerOrder' AND column_name = 'status'
    LIMIT 1
  `;
  if (orderStatusEnum[0]?.udt_name !== 'CustomerOrderStatus') {
    console.error('FAIL: CustomerOrder.status باید enum باشد (v11 فاز ۷)');
    process.exit(1);
  }

  const blogLegacyStatus = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'BlogPost' AND column_name = 'status'
    LIMIT 1
  `;
  if (blogLegacyStatus.length > 0) {
    console.error('FAIL: BlogPost.status legacy هنوز وجود دارد (v11 فاز ۷)');
    process.exit(1);
  }

  console.log('\n✓ migration و ستون‌های کلیدی روی DB تأیید شد.');
  console.log('OK test-v9-deploy');
} finally {
  await prisma.$disconnect();
}
