/**
 * Gate فاز ۵: بدون ستون imageDataUrl؛ جدول EntityAttachment
 * Run: npm run test:v11-phase5-attachments
 */
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('skip: DATABASE_URL not set');
    return;
  }

  const col = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ChatMessage'
      AND column_name = 'imageDataUrl'
    LIMIT 1
  `;
  assert.equal(col.length, 0, 'ChatMessage.imageDataUrl must be dropped');

  const table = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'EntityAttachment'
    LIMIT 1
  `;
  assert.ok(table.length > 0, 'EntityAttachment table required');

  const withInline = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM "ChatMessage"
    WHERE COALESCE("attachmentRefs"::text, '') LIKE '%data:image%'
  `;
  assert.equal(Number(withInline[0]?.n ?? 0), 0, 'no base64 data URLs in attachmentRefs');

  console.log('test-v11-phase5-attachments ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());