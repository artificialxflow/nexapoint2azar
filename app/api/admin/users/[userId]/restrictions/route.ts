import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

type Ctx = { params: Promise<{ userId: string }> };

const defaultRestrictions = {
  ownSalesOnly: false,
  ownPurchaseOnly: false,
  timeWindowEnabled: false,
  allowedFrom: null as string | null,
  allowedTo: null as string | null,
};

const schema = z.object({
  ownSalesOnly: z.boolean().optional(),
  ownPurchaseOnly: z.boolean().optional(),
  timeWindowEnabled: z.boolean().optional(),
  allowedFrom: z.string().nullable().optional(),
  allowedTo: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:read');
    const { userId } = await ctx.params;
    const row = await prisma.userRestriction.findUnique({ where: { userId } });
    return jsonOk({
      restrictions: row
        ? {
            ownSalesOnly: row.ownSalesOnly,
            ownPurchaseOnly: row.ownPurchaseOnly,
            timeWindowEnabled: row.timeWindowEnabled,
            allowedFrom: row.allowedFrom,
            allowedTo: row.allowedTo,
          }
        : defaultRestrictions,
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.restrictions.get');
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:write');
    const { userId } = await ctx.params;
    const body = schema.parse(await req.json());
    const row = await prisma.userRestriction.upsert({
      where: { userId },
      create: { userId, ...defaultRestrictions, ...body },
      update: body,
    });
    return jsonOk({
      restrictions: {
        ownSalesOnly: row.ownSalesOnly,
        ownPurchaseOnly: row.ownPurchaseOnly,
        timeWindowEnabled: row.timeWindowEnabled,
        allowedFrom: row.allowedFrom,
        allowedTo: row.allowedTo,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.restrictions.patch');
  }
}
