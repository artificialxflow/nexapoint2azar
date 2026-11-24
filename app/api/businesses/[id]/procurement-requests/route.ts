import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional().default('تأمین کالا'),
  date: z.string().optional().default(''),
  priority: z.string().optional().default('متوسط'),
  description: z.string().optional().default(''),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const requests = await prisma.procurementRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return jsonOk({
      requests,
      summary: {
        total: requests.length,
        pending: requests.filter((r) => r.status.includes('انتظار')).length,
        approved: requests.filter((r) => r.status.includes('تایید شده')).length,
        rejected: requests.filter((r) => r.status.includes('رد')).length,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'procurementRequests.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    const { user } = await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    const created = await prisma.procurementRequest.create({
      data: {
        businessId,
        title: body.title,
        type: body.type,
        requester: user.displayName || user.username,
        requesterId: user.id,
        date: body.date || new Intl.DateTimeFormat('fa-IR').format(new Date()),
        status: 'در انتظار تایید',
        priority: body.priority,
        description: body.description,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'procurementRequests.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    const res = await prisma.procurementRequest.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'درخواست یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'procurementRequests.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res = await prisma.procurementRequest.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'درخواست یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'procurementRequests.delete');
  }
}
