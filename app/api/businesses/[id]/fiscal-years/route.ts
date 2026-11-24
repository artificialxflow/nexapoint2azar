import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess, assertCanManageBusiness } from '@/src/lib/business/access';
import { serializeFiscalYear } from '@/src/lib/settings/serialize';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const rows = await prisma.fiscalYear.findMany({
      where: { businessId: id },
      orderBy: { createdAt: 'asc' },
    });
    const active = rows.find((r) => r.isActive) ?? null;
    return jsonOk({
      fiscalYears: rows.map(serializeFiscalYear),
      active: active ? serializeFiscalYear(active) : null,
    });
  } catch (err) {
    return handleAuthRouteError(err, 'business.fiscal-years.get');
  }
}

const bodySchema = z.object({
  fiscalYearId: z.string().optional(),
  label: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = bodySchema.parse(await req.json());

    const fiscalYear = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.fiscalYear.updateMany({
          where: { businessId: id },
          data: { isActive: false },
        });
      }
      return tx.fiscalYear.create({
        data: {
          businessId: id,
          label: body.label,
          startDate: body.startDate,
          endDate: body.endDate,
          isActive: body.isActive ?? true,
        },
      });
    });

    return jsonOk({ fiscalYear: serializeFiscalYear(fiscalYear) }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'business.fiscal-years.create');
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = bodySchema.parse(await req.json());
    if (!body.fiscalYearId) {
      return handleAuthRouteError(new Error('VALIDATION'), 'business.fiscal-years.patch');
    }

    const existing = await prisma.fiscalYear.findFirst({
      where: { id: body.fiscalYearId, businessId: id },
    });
    if (!existing) throw new Error('NOT_FOUND');

    const fiscalYear = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.fiscalYear.updateMany({
          where: { businessId: id },
          data: { isActive: false },
        });
      }
      return tx.fiscalYear.update({
        where: { id: body.fiscalYearId },
        data: {
          label: body.label,
          startDate: body.startDate,
          endDate: body.endDate,
          isActive: body.isActive ?? true,
        },
      });
    });

    return jsonOk({ fiscalYear: serializeFiscalYear(fiscalYear) });
  } catch (err) {
    return handleAuthRouteError(err, 'business.fiscal-years.patch');
  }
}
