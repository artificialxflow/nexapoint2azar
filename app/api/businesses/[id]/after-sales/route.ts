import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { moneyFromNumber, moneyToNumber } from '@/src/lib/money/decimal';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('ticket'),
    customerName: z.string().min(1),
    phone: z.string().optional().default(''),
    productName: z.string().optional().default(''),
    subject: z.string().min(1),
    description: z.string().optional().default(''),
    priority: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal'),
    technician: z.string().optional().default(''),
    warrantyId: z.string().optional().nullable(),
  }),
  z.object({
    entity: z.literal('warranty'),
    warrantyNo: z.string().optional().default(''),
    customerName: z.string().min(1),
    productName: z.string().min(1),
    serialNumber: z.string().optional().default(''),
    startDate: z.string().optional().default(''),
    endDate: z.string().optional().default(''),
    status: z.enum(['active', 'expired', 'void']).optional().default('active'),
    notes: z.string().optional().default(''),
  }),
  z.object({
    entity: z.literal('estimate'),
    ticketId: z.string().min(1),
    laborCost: z.number().min(0).default(0),
    partsCost: z.number().min(0).default(0),
    approvedByCustomer: z.boolean().optional().default(false),
    notes: z.string().optional().default(''),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['ticket', 'warranty']),
  id: z.string().min(1),
  status: z.string().optional(),
  technician: z.string().optional(),
});

const deleteSchema = z.object({
  entity: z.enum(['ticket', 'warranty']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [tickets, warranties] = await Promise.all([
      prisma.afterSalesTicket.findMany({
        where: { businessId },
        include: { estimates: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.warrantyRecord.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return jsonOk({
      tickets: tickets.map((t) => ({
        ...t,
        estimates: t.estimates.map((e) => ({
          ...e,
          laborCost: moneyToNumber(e.laborCost),
          partsCost: moneyToNumber(e.partsCost),
          totalCost: moneyToNumber(e.totalCost),
        })),
      })),
      warranties,
      summary: {
        openTickets: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length,
        resolvedTickets: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
        activeWarranties: warranties.filter((w) => w.status === 'active').length,
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'afterSales.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'ticket') {
      const count = await prisma.afterSalesTicket.count({ where: { businessId } });
      const created = await prisma.afterSalesTicket.create({
        data: {
          businessId,
          ticketNo: `SRV-${2001 + count}`,
          warrantyId: body.warrantyId ?? null,
          customerName: body.customerName,
          phone: body.phone,
          productName: body.productName,
          subject: body.subject,
          description: body.description,
          priority: body.priority,
          technician: body.technician,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'warranty') {
      const count = await prisma.warrantyRecord.count({ where: { businessId } });
      const created = await prisma.warrantyRecord.create({
        data: {
          businessId,
          warrantyNo: body.warrantyNo.trim() || `WRN-${3001 + count}`,
          customerName: body.customerName,
          productName: body.productName,
          serialNumber: body.serialNumber,
          startDate: body.startDate,
          endDate: body.endDate,
          status: body.status,
          notes: body.notes,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const ticket = await prisma.afterSalesTicket.findFirst({ where: { id: body.ticketId, businessId } });
    if (!ticket) return jsonError('NOT_FOUND', 'تیکت یافت نشد.', 404);
    const created = await prisma.repairEstimate.create({
      data: {
        ticketId: body.ticketId,
        laborCost: moneyFromNumber(body.laborCost),
        partsCost: moneyFromNumber(body.partsCost),
        totalCost: moneyFromNumber(body.laborCost + body.partsCost),
        approvedByCustomer: body.approvedByCustomer,
        notes: body.notes,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'afterSales.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'ticket') {
      const validStatuses = ['open', 'diagnosing', 'waiting_part', 'repairing', 'resolved', 'closed'] as const;
      const status = validStatuses.find((s) => s === body.status);
      const res = await prisma.afterSalesTicket.updateMany({
        where: { id: body.id, businessId },
        data: {
          ...(status ? { status } : {}),
          ...(body.technician !== undefined ? { technician: body.technician } : {}),
        },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'تیکت یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const validW = ['active', 'expired', 'void'] as const;
    const status = validW.find((s) => s === body.status);
    const res = await prisma.warrantyRecord.updateMany({
      where: { id: body.id, businessId },
      data: { ...(status ? { status } : {}) },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'گارانتی یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'afterSales.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res =
      body.entity === 'ticket'
        ? await prisma.afterSalesTicket.deleteMany({ where: { id: body.id, businessId } })
        : await prisma.warrantyRecord.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'afterSales.delete');
  }
}
