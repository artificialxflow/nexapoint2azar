import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

type Ctx = { params: Promise<{ userId: string }> };

const MOCK_BANKS = [
  { id: 'bank-mellat', nameFa: 'بانک ملت', code: 'MELLAT' },
  { id: 'bank-melli', nameFa: 'بانک ملی', code: 'MELLI' },
  { id: 'bank-parsian', nameFa: 'بانک پارسیان', code: 'PARSIAN' },
  { id: 'bank-cash', nameFa: 'صندوق مرکزی', code: 'CASH' },
];

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:read');
    const { userId } = await ctx.params;
    const rows = await prisma.userBankAccess.findMany({ where: { userId } });
    const map = new Map(rows.map((r) => [r.bankCode, r.allowed]));
    return jsonOk({
      banks: MOCK_BANKS.map((b) => ({
        ...b,
        allowed: map.has(b.code) ? map.get(b.code)! : true,
      })),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.bank-access.get');
  }
}

const patchSchema = z.record(z.boolean());

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:write');
    const { userId } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    for (const [bankCode, allowed] of Object.entries(body)) {
      await prisma.userBankAccess.upsert({
        where: { userId_bankCode: { userId, bankCode } },
        create: { userId, bankCode, allowed },
        update: { allowed },
      });
    }
    const rows = await prisma.userBankAccess.findMany({ where: { userId } });
    const map = new Map(rows.map((r) => [r.bankCode, r.allowed]));
    return jsonOk({
      access: Object.fromEntries(MOCK_BANKS.map((b) => [b.code, map.get(b.code) ?? true])),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.bank-access.patch');
  }
}
