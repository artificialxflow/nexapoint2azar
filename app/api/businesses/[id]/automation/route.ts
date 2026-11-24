import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('rule'),
    name: z.string().min(1),
    description: z.string().optional().default(''),
    trigger: z.string().min(1),
    conditions: z.array(z.unknown()).optional().default([]),
    actions: z.array(z.unknown()).optional().default([]),
    active: z.boolean().optional().default(true),
  }),
  z.object({
    entity: z.literal('log'),
    ruleId: z.string().optional().nullable(),
    ruleName: z.string().optional().default(''),
    trigger: z.string().min(1),
    status: z.string().optional().default('success'),
    summary: z.string().optional().default(''),
    payload: z.record(z.unknown()).optional().default({}),
  }),
]);

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z.string().optional(),
  conditions: z.array(z.unknown()).optional(),
  actions: z.array(z.unknown()).optional(),
  active: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [rules, logs] = await Promise.all([
      prisma.automationRule.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.automationLog.findMany({ where: { businessId }, orderBy: { executedAt: 'desc' }, take: 150 }),
    ]);

    return jsonOk({
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        trigger: r.trigger,
        conditions: Array.isArray(r.conditionsJson) ? r.conditionsJson : [],
        actions: Array.isArray(r.actionsJson) ? r.actionsJson : [],
        active: r.active,
        runCount: r.runCount,
        lastRunAt: r.lastRunAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      logs: logs.map((l) => ({
        id: l.id,
        ruleId: l.ruleId,
        ruleName: l.ruleName,
        trigger: l.trigger,
        status: l.status,
        summary: l.summary,
        payload: l.payload,
        executedAt: l.executedAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'automation.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'rule') {
      const created = await prisma.automationRule.create({
        data: {
          businessId,
          name: body.name,
          description: body.description,
          trigger: body.trigger,
          conditionsJson: body.conditions as Prisma.InputJsonValue,
          actionsJson: body.actions as Prisma.InputJsonValue,
          active: body.active,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const log = await tx.automationLog.create({
        data: {
          businessId,
          ruleId: body.ruleId ?? null,
          ruleName: body.ruleName,
          trigger: body.trigger,
          status: body.status,
          summary: body.summary,
          payload: body.payload as Prisma.InputJsonValue,
        },
      });
      if (body.ruleId) {
        await tx.automationRule.updateMany({
          where: { id: body.ruleId, businessId },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });
      }
      return log;
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'automation.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    const res = await prisma.automationRule.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
        ...(body.conditions !== undefined
          ? { conditionsJson: body.conditions as Prisma.InputJsonValue }
          : {}),
        ...(body.actions !== undefined
          ? { actionsJson: body.actions as Prisma.InputJsonValue }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'قانون اتوماسیون یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'automation.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res = await prisma.automationRule.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'قانون اتوماسیون یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'automation.delete');
  }
}
