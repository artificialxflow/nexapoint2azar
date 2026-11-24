import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { moneyFromNumber, moneyToNumber, rateFromNumber, rateToNumber } from '@/src/lib/money/decimal';
import { requirePersonInBusiness, requireUserExists } from '@/src/lib/erp/people-service';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('member'),
    code: z.string().optional().default(''),
    fullName: z.string().min(1),
    phone: z.string().optional().default(''),
    region: z.string().optional().default(''),
    tier: z.string().optional().default('نماینده'),
    commissionRate: z.number().min(0).max(100).optional().default(5),
    totalSales: z.number().min(0).optional().default(0),
    personId: z.string().optional().nullable(),
    userId: z.string().optional().nullable(),
  }),
  z.object({
    entity: z.literal('commission'),
    memberId: z.string().min(1),
    periodLabel: z.string().min(1),
    salesAmount: z.number().min(0).default(0),
    commissionAmount: z.number().min(0).default(0),
    status: z.string().optional().default('در انتظار تسویه'),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['member', 'commission']),
  id: z.string().min(1),
  active: z.boolean().optional(),
  status: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  totalSales: z.number().min(0).optional(),
  personId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

const deleteSchema = z.object({
  entity: z.enum(['member', 'commission']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [members, commissions] = await Promise.all([
      prisma.salesNetworkMember.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.salesCommission.findMany({
        where: { businessId },
        include: { member: { select: { id: true, fullName: true, region: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return jsonOk({
      members: members.map((m) => ({
        ...m,
        commissionRate: rateToNumber(m.commissionRate),
        totalSales: moneyToNumber(m.totalSales),
      })),
      commissions: commissions.map((c) => ({
        ...c,
        salesAmount: moneyToNumber(c.salesAmount),
        commissionAmount: moneyToNumber(c.commissionAmount),
      })),
      summary: {
        activeMembers: members.filter((m) => m.active).length,
        totalSales: members.reduce((s, m) => s + moneyToNumber(m.totalSales), 0),
        totalCommissions: commissions.reduce((s, c) => s + moneyToNumber(c.commissionAmount), 0),
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'salesNetwork.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'member') {
      if (body.personId?.trim()) await requirePersonInBusiness(businessId, body.personId);
      if (body.userId?.trim()) await requireUserExists(body.userId);
      const count = await prisma.salesNetworkMember.count({ where: { businessId } });
      const created = await prisma.salesNetworkMember.create({
        data: {
          businessId,
          code: body.code.trim() || `AG-${101 + count}`,
          fullName: body.fullName,
          phone: body.phone,
          region: body.region,
          tier: body.tier,
          personId: body.personId?.trim() || null,
          userId: body.userId?.trim() || null,
          commissionRate: rateFromNumber(body.commissionRate),
          totalSales: moneyFromNumber(body.totalSales),
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const member = await prisma.salesNetworkMember.findFirst({
      where: { id: body.memberId, businessId },
    });
    if (!member) return jsonError('NOT_FOUND', 'نماینده یافت نشد.', 404);

    const created = await prisma.salesCommission.create({
      data: {
        businessId,
        memberId: body.memberId,
        periodLabel: body.periodLabel,
        salesAmount: moneyFromNumber(body.salesAmount),
        commissionAmount: moneyFromNumber(body.commissionAmount),
        status: body.status,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'salesNetwork.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'member') {
      if (body.personId?.trim()) await requirePersonInBusiness(businessId, body.personId);
      if (body.userId?.trim()) await requireUserExists(body.userId);
      const res = await prisma.salesNetworkMember.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(body.active !== undefined ? { active: body.active } : {}),
          ...(body.commissionRate !== undefined ? { commissionRate: rateFromNumber(body.commissionRate) } : {}),
          ...(body.totalSales !== undefined ? { totalSales: moneyFromNumber(body.totalSales) } : {}),
          ...(body.personId !== undefined ? { personId: body.personId?.trim() || null } : {}),
          ...(body.userId !== undefined ? { userId: body.userId?.trim() || null } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'نماینده یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.salesCommission.updateMany({
      where: { id: body.id, businessId },
      data: { ...(body.status ? { status: body.status } : {}) },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'پورسانت یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'salesNetwork.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res =
      body.entity === 'member'
        ? await prisma.salesNetworkMember.deleteMany({ where: { id: body.id, businessId } })
        : await prisma.salesCommission.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'salesNetwork.delete');
  }
}
