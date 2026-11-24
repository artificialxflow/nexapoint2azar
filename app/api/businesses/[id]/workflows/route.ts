import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('definition'),
    name: z.string().min(1),
    module: z.string().optional().default('عمومی'),
    description: z.string().optional().default(''),
    steps: z
      .array(
        z.object({
          title: z.string().min(1),
          approverRoleKey: z.string().optional().default('manager'),
          slaHours: z.number().int().min(1).optional().default(24),
        })
      )
      .optional()
      .default([]),
  }),
  z.object({
    entity: z.literal('run'),
    workflowId: z.string().min(1),
    title: z.string().min(1),
    entityType: z.string().optional().default('general'),
    entityId: z.string().optional().default(''),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['definition', 'run']),
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  status: z.enum(['running', 'approved', 'rejected', 'completed']).optional(),
  currentStepOrder: z.number().int().min(1).optional(),
});

const deleteSchema = z.object({
  entity: z.enum(['definition', 'run']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [definitions, runs] = await Promise.all([
      prisma.workflowDefinition.findMany({
        where: { businessId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workflowRun.findMany({
        where: { businessId },
        include: { workflow: { select: { id: true, name: true, module: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return jsonOk({ definitions, runs });
  } catch (err) {
    return handleAuthRouteError(err, 'workflows.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    const { user } = await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'definition') {
      const created = await prisma.workflowDefinition.create({
        data: {
          businessId,
          name: body.name,
          module: body.module,
          description: body.description,
          steps: {
            create: body.steps.map((s, idx) => ({
              stepOrder: idx + 1,
              title: s.title,
              approverRoleKey: s.approverRoleKey,
              slaHours: s.slaHours,
            })),
          },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return jsonOk(created, { status: 201 });
    }

    const wf = await prisma.workflowDefinition.findFirst({ where: { id: body.workflowId, businessId } });
    if (!wf) return jsonError('NOT_FOUND', 'گردش‌کار یافت نشد.', 404);

    const created = await prisma.workflowRun.create({
      data: {
        businessId,
        workflowId: body.workflowId,
        title: body.title,
        entityType: body.entityType,
        entityId: body.entityId,
        initiatedBy: user.displayName || user.username,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'workflows.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'definition') {
      const res = await prisma.workflowDefinition.updateMany({
        where: { id: body.id, businessId },
        data: { ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'گردش‌کار یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.workflowRun.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.currentStepOrder !== undefined ? { currentStepOrder: body.currentStepOrder } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'اجرای گردش‌کار یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'workflows.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res =
      body.entity === 'definition'
        ? await prisma.workflowDefinition.deleteMany({ where: { id: body.id, businessId } })
        : await prisma.workflowRun.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'workflows.delete');
  }
}
