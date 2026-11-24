import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

const schema = z.object({
  note: z.string().optional(),
});

type Ctx = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requirePermission(req, 'users:write');
    const { requestId } = await ctx.params;
    const body = schema.parse(await req.json().catch(() => ({})));

    const accessReq = await prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!accessReq || accessReq.status !== 'pending') {
      return jsonError('NOT_FOUND', 'درخواست در انتظار یافت نشد.', 404);
    }

    await prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        note: body.note?.trim() || accessReq.note,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    return jsonOk({ rejected: true });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.access-requests.reject');
  }
}
