import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import type { WarehouseLocation } from '@/src/types/warehouse';

type Ctx = { params: Promise<{ id: string }> };

const seedWarehouses: WarehouseLocation[] = [
  { id: 'w1', code: 'WH-CENTRAL', name: 'انبار مرکزی', isActive: true, description: 'اصلی' },
  { id: 'w2', code: 'WH-RAW', name: 'انبار مواد اولیه', isActive: true, description: 'مواد' },
];

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

async function ensureSeedWarehouses(businessId: string) {
  const count = await prisma.warehouseLocation.count({ where: { businessId } });
  if (count > 0) return;
  for (const w of seedWarehouses) {
    await prisma.warehouseLocation.create({
      data: {
        id: w.id,
        businessId,
        code: w.code,
        name: w.name,
        address: w.description,
        active: w.isActive,
      },
    });
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    await ensureSeedWarehouses(id);
    const rows = await prisma.warehouseLocation.findMany({
      where: { businessId: id },
      orderBy: { createdAt: 'asc' },
    });
    return jsonOk({
      items: rows.map(mapLocation),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.list');
  }
}

const createSchema = z.object({
  item: z.object({
    id: z.string().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    isActive: z.boolean().optional().default(true),
    description: z.string().optional().default(''),
  }),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = createSchema.parse(await req.json());
    const row = await prisma.warehouseLocation.create({
      data: {
        id: body.item.id,
        businessId: id,
        code: body.item.code,
        name: body.item.name,
        address: body.item.description ?? '',
        active: body.item.isActive ?? true,
      },
    });
    return jsonOk({ item: mapLocation(row) }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'erp.warehouse.create');
  }
}