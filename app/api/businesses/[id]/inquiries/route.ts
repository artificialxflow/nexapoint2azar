import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.object({
  subject: z.string().min(1),
  requesterName: z.string().min(1),
  requesterPhone: z.string().optional().default(''),
  source: z.string().optional().default('تلفن'),
  category: z.string().optional().default('استعلام قیمت'),
  estimatedValue: z.number().min(0).optional().default(0),
  assignedTo: z.string().optional().default(''),
  responseNote: z.string().optional().default(''),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['new', 'in_review', 'quoted', 'closed']).optional(),
  assignedTo: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  responseNote: z.string().optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const inquiries = await prisma.inquiryRecord.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return jsonOk({
      inquiries,
      summary: {
        total: inquiries.length,
        open: inquiries.filter((i) => i.status === 'new' || i.status === 'in_review').length,
        quoted: inquiries.filter((i) => i.status === 'quoted').length,
        totalValue: inquiries.reduce((s, i) => s + i.estimatedValue, 0),
      },
    });
  } catch (err) {
    return handleAuthRouteError(err, 'inquiries.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    const count = await prisma.inquiryRecord.count({ where: { businessId } });
    const created = await prisma.inquiryRecord.create({
      data: {
        businessId,
        inquiryNo: `INQ-${4001 + count}`,
        subject: body.subject,
        requesterName: body.requesterName,
        requesterPhone: body.requesterPhone,
        source: body.source,
        category: body.category,
        estimatedValue: body.estimatedValue,
        assignedTo: body.assignedTo,
        responseNote: body.responseNote,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'inquiries.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    const res = await prisma.inquiryRecord.updateMany({
      where: { id: body.id, businessId },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.assignedTo !== undefined ? { assignedTo: body.assignedTo } : {}),
        ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
        ...(body.responseNote !== undefined ? { responseNote: body.responseNote } : {}),
      },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'استعلام یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'inquiries.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const res = await prisma.inquiryRecord.deleteMany({ where: { id: body.id, businessId } });
    if (res.count === 0) return jsonError('NOT_FOUND', 'استعلام یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'inquiries.delete');
  }
}
