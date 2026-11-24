import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import type { WarehouseLocation } from '@/src/types/warehouse';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

function mapLocation(row: {
  id: string;
  code: string;
  name: string;
  address: string;
  active: boolean;
}): WarehouseLocation {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.active,
    description: row.address,
  };
}

const patchSchema = z.object({
  item: z.object({
    code: z.string().optional(),
    name: z.string().optional(),
    isActive: z.boolean().optional(),
    description: z.string().optional(),
  }),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, itemId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.warehouseLocation.findFirst({
      where: { businessId: id, id: itemId },
    });
    if (!existing) return jsonError('NOT_FOUND', 'ردیف انبار یافت نشد.', 404);

    const updated = await prisma.warehouseLocation.update({
      where: { id: existing.id },
      data: {
        code: body.item.code,
        name: body.item.name,
        active: body.item.isActive,
        address: body.item.description,
      },
    });
    return jsonOk({ item: mapLocation(updated) });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, itemId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const res = await prisma.warehouseLocation.deleteMany({
      where: { businessId: id, id: itemId },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'ردیف انبار یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.delete');
  }
}