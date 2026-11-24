import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import type { WarehouseLocation } from '@/src/types/warehouse';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

async function findItemRow(businessId: string, itemId: string) {
  const rows = await prisma.warehouseItem.findMany({ where: { businessId } });
  return rows.find((r) => {
    const data = r.data as unknown as WarehouseLocation;
    return data.id === itemId;
  });
}

const patchSchema = z.object({
  item: z.record(z.unknown()),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, itemId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = patchSchema.parse(await req.json());
    const row = await findItemRow(id, itemId);
    if (!row) return jsonError('NOT_FOUND', 'ردیف انبار یافت نشد.', 404);

    const current = row.data as unknown as WarehouseLocation;
    const merged = { ...current, ...body.item, id: itemId } as WarehouseLocation;

    const updated = await prisma.warehouseItem.update({
      where: { id: row.id },
      data: { data: merged as unknown as Prisma.InputJsonValue },
    });
    return jsonOk({ item: updated.data as unknown as WarehouseLocation });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, itemId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const row = await findItemRow(id, itemId);
    if (!row) return jsonError('NOT_FOUND', 'ردیف انبار یافت نشد.', 404);
    await prisma.warehouseItem.delete({ where: { id: row.id } });
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.delete');
  }
}
