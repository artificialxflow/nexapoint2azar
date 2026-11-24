import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('order'),
    orderNo: z.string().optional().default(''),
    customer: z.string().min(1),
    items: z.string().optional().default(''),
    date: z.string().optional().default(''),
    status: z.string().optional().default('در انتظار تایید'),
    progress: z.number().int().min(0).max(100).optional().default(10),
    type: z.enum(['new', 'processing', 'completed']).optional().default('new'),
    amount: z.string().optional().default(''),
    totalRial: z.number().optional().default(0),
    notes: z.string().optional().default(''),
  }),
  z.object({
    entity: z.literal('shipping'),
    orderId: z.string().optional().nullable(),
    orderNo: z.string().optional().default(''),
    customerName: z.string().min(1),
    carrierName: z.string().optional().default(''),
    scheduledDate: z.string().optional().default(''),
    trackingCode: z.string().optional().default(''),
    status: z.string().optional().default('برنامه‌ریزی شده'),
    notes: z.string().optional().default(''),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['order', 'shipping']),
  id: z.string().min(1),
  status: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  type: z.enum(['new', 'processing', 'completed']).optional(),
  trackingCode: z.string().optional(),
  notes: z.string().optional(),
});

const deleteSchema = z.object({
  entity: z.enum(['order', 'shipping']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [orders, shippingSchedules] = await Promise.all([
      prisma.customerOrder.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
      prisma.shippingSchedule.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return jsonOk({
      orders,
      shippingSchedules,
      summary: {
        total: orders.length,
        newCount: orders.filter((o) => o.type === 'new').length,
        processingCount: orders.filter((o) => o.type === 'processing').length,
        completedCount: orders.filter((o) => o.type === 'completed').length,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'orders.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'order') {
      const count = await prisma.customerOrder.count({ where: { businessId } });
      const orderNo = body.orderNo.trim() || `ORD-${1001 + count}`;
      const created = await prisma.customerOrder.create({
        data: {
          businessId,
          orderNo,
          customer: body.customer,
          items: body.items,
          date: body.date,
          status: body.status,
          progress: body.progress,
          type: body.type,
          amount: body.amount,
          totalRial: body.totalRial,
          notes: body.notes,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const created = await prisma.shippingSchedule.create({
      data: {
        businessId,
        orderId: body.orderId ?? null,
        orderNo: body.orderNo,
        customerName: body.customerName,
        carrierName: body.carrierName,
        scheduledDate: body.scheduledDate,
        trackingCode: body.trackingCode,
        status: body.status,
        notes: body.notes,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'orders.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'order') {
      const res = await prisma.customerOrder.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.progress !== undefined ? { progress: body.progress } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'سفارش یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.shippingSchedule.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.trackingCode !== undefined ? { trackingCode: body.trackingCode } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'برنامه ارسال یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'orders.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res =
      body.entity === 'order'
        ? await prisma.customerOrder.deleteMany({ where: { id: body.id, businessId } })
        : await prisma.shippingSchedule.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'orders.delete');
  }
}
