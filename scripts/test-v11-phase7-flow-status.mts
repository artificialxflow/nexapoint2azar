/**
 * Gate فاز ۷: enum در DB + بدون مقایسهٔ وضعیت فارسی در API اصلی
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/db/prisma';
import { CustomerOrderStatus } from '@prisma/client';

const FORBIDDEN_PATTERNS = [
  /status\s*===\s*['"]در /,
  /status\s*!==\s*['"]در /,
  /\.status\s*===\s*['"]ثبت/,
  /\.status\s*===\s*['"]جدید/,
];

const API_FILES = [
  'app/api/businesses/[id]/orders/route.ts',
  'app/api/public/shop/route.ts',
  'app/api/businesses/[id]/accounting/route.ts',
  'app/api/businesses/[id]/hr/operations/route.ts',
];

async function main() {
  const root = process.cwd();
  for (const rel of API_FILES) {
    const file = path.join(root, rel);
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.ok(!pattern.test(text), `${rel} must not compare Persian status literals`);
    }
  }

  if (!process.env.DATABASE_URL) {
    console.log('skip DB checks: DATABASE_URL not set');
    console.log('test-v11-phase7-flow-status ok (static)');
    return;
  }

  const col = await prisma.$queryRaw<{ udt_name: string }[]>`
    SELECT udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CustomerOrder' AND column_name = 'status'
    LIMIT 1
  `;
  assert.equal(col[0]?.udt_name, 'CustomerOrderStatus', 'CustomerOrder.status enum');

  const blogStatusCol = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'BlogPost' AND column_name = 'status'
  `;
  assert.equal(blogStatusCol.length, 0, 'BlogPost.status must be dropped');

  const biz = await prisma.business.findFirst({ select: { id: true } });
  if (biz) {
    const id = `co-p7-${Date.now()}`;
    await prisma.customerOrder.create({
      data: {
        id,
        businessId: biz.id,
        customer: 'probe',
        status: CustomerOrderStatus.pending_approval,
      },
    });
    const open = await prisma.customerOrder.count({
      where: { businessId: biz.id, status: CustomerOrderStatus.pending_approval, id },
    });
    assert.equal(open, 1);
    await prisma.customerOrder.deleteMany({ where: { id } });
  }

  console.log('test-v11-phase7-flow-status ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());