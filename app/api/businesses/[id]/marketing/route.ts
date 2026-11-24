import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { moneyFromNumber, moneyToNumber } from '@/src/lib/money/decimal';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('campaign'),
    name: z.string().min(1),
    channel: z.string().optional().default('اینستاگرام'),
    budget: z.number().min(0).optional().default(0),
    spent: z.number().min(0).optional().default(0),
    leadsCount: z.number().int().min(0).optional().default(0),
    conversionsCount: z.number().int().min(0).optional().default(0),
    startDate: z.string().optional().default(''),
    endDate: z.string().optional().default(''),
    status: z.enum(['draft', 'active', 'paused', 'completed']).optional().default('active'),
    notes: z.string().optional().default(''),
  }),
  z.object({
    entity: z.literal('survey'),
    title: z.string().min(1),
    description: z.string().optional().default(''),
    status: z.string().optional().default('فعال'),
  }),
  z.object({
    entity: z.literal('response'),
    surveyId: z.string().min(1),
    respondentName: z.string().optional().default(''),
    respondentPhone: z.string().optional().default(''),
    score: z.number().int().min(1).max(5).default(5),
    comment: z.string().optional().default(''),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['campaign', 'survey']),
  id: z.string().min(1),
  status: z.string().optional(),
  spent: z.number().min(0).optional(),
  leadsCount: z.number().int().min(0).optional(),
  conversionsCount: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({
  entity: z.enum(['campaign', 'survey']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [campaigns, surveys] = await Promise.all([
      prisma.marketingCampaign.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.marketingSurvey.findMany({
        where: { businessId },
        include: { responses: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalBudget = campaigns.reduce((s, c) => s + moneyToNumber(c.budget), 0);
    const totalSpent = campaigns.reduce((s, c) => s + moneyToNumber(c.spent), 0);
    const totalLeads = campaigns.reduce((s, c) => s + c.leadsCount, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.conversionsCount, 0);

    return jsonOk({
      campaigns: campaigns.map((c) => ({
        ...c,
        budget: moneyToNumber(c.budget),
        spent: moneyToNumber(c.spent),
      })),
      surveys,
      summary: { totalBudget, totalSpent, totalLeads, totalConversions },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'marketing.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'campaign') {
      const created = await prisma.marketingCampaign.create({
        data: {
          businessId,
          name: body.name,
          channel: body.channel,
          budget: moneyFromNumber(body.budget),
          spent: moneyFromNumber(body.spent),
          leadsCount: body.leadsCount,
          conversionsCount: body.conversionsCount,
          startDate: body.startDate,
          endDate: body.endDate,
          status: body.status,
          notes: body.notes,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'survey') {
      const created = await prisma.marketingSurvey.create({
        data: {
          businessId,
          title: body.title,
          description: body.description,
          status: body.status,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const survey = await prisma.marketingSurvey.findFirst({ where: { id: body.surveyId, businessId } });
    if (!survey) return jsonError('NOT_FOUND', 'نظرسنجی یافت نشد.', 404);
    const created = await prisma.surveyResponse.create({
      data: {
        surveyId: body.surveyId,
        respondentName: body.respondentName,
        respondentPhone: body.respondentPhone,
        score: body.score,
        comment: body.comment,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'marketing.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'campaign') {
      const status =
        body.status === 'draft' ||
        body.status === 'active' ||
        body.status === 'paused' ||
        body.status === 'completed'
          ? body.status
          : undefined;
      const res = await prisma.marketingCampaign.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(status ? { status } : {}),
          ...(body.spent !== undefined ? { spent: moneyFromNumber(body.spent) } : {}),
          ...(body.leadsCount !== undefined ? { leadsCount: body.leadsCount } : {}),
          ...(body.conversionsCount !== undefined ? { conversionsCount: body.conversionsCount } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'کمپین یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.marketingSurvey.updateMany({
      where: { id: body.id, businessId },
      data: { ...(body.status ? { status: body.status } : {}) },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'نظرسنجی یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'marketing.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res =
      body.entity === 'campaign'
        ? await prisma.marketingCampaign.deleteMany({ where: { id: body.id, businessId } })
        : await prisma.marketingSurvey.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'marketing.delete');
  }
}
