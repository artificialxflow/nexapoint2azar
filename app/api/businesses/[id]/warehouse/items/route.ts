import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import type { WarehouseLocation } from '@/src/types/warehouse';

type Ctx = { params: Promise<{ id: string }> };

const seedWarehouses: WarehouseLocation[] = [
  { id: 'w1', code: 'WH-CENTRAL', name: 'انبار مرکزی', isActive: true, description: 'اصلی' },
  { id: 'w2', code: 'WH-RAW', name: 'انبار مواد اولیه', isActive: true, description: 'مواد' },
];

async function ensureSeedWarehouses(businessId: string) {
  const count = await prisma.warehouseItem.count({ where: { businessId } });
  if (count > 0) return;
  for (const w of seedWarehouses) {
    await prisma.warehouseItem.create({
      data: {
        businessId,
        data: w as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    await ensureSeedWarehouses(id);
    const rows = await prisma.warehouseItem.findMany({
      where: { businessId: id },
      orderBy: { createdAt: 'asc' },
    });
    return jsonOk({
      items: rows.map((r) => r.data as unknown as WarehouseLocation),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.list');
  }
}

const createSchema = z.object({
  item: z.record(z.unknown()),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = createSchema.parse(await req.json());
    const row = await prisma.warehouseItem.create({
      data: {
        businessId: id,
        data: body.item as unknown as Prisma.InputJsonValue,
      },
    });
    return jsonOk({ item: row.data as unknown as WarehouseLocation }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.create');
  }
}
