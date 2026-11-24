import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';
import { usernameForMobile } from '@/src/lib/invite/accept';

const schema = z.object({
  systemRoleId: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

type Ctx = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requirePermission(req, 'users:write');
    const { requestId } = await ctx.params;
    const body = schema.parse(await req.json());

    const accessReq = await prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!accessReq || accessReq.status !== 'pending') {
      return jsonError('NOT_FOUND', 'درخواست در انتظار یافت نشد.', 404);
    }

    const role = await prisma.systemRole.findUnique({ where: { id: body.systemRoleId } });
    if (!role) return jsonError('NOT_FOUND', 'نقش یافت نشد.', 404);

    const existing = await prisma.user.findFirst({
      where: { mobilePhone: accessReq.mobilePhone },
    });
    if (existing) {
      return jsonError('MOBILE_TAKEN', 'کاربری با این موبایل وجود دارد.', 409);
    }

    const displayName = body.displayName?.trim() || accessReq.displayName || accessReq.mobilePhone;
    const username = await usernameForMobile(accessReq.mobilePhone);

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        mobilePhone: accessReq.mobilePhone,
        passwordHash: null,
        systemRoleId: role.id,
        status: 'active',
      },
    });

    const membership = await prisma.businessMember.findFirst({ where: { userId: admin.id } });
    if (membership) {
      await prisma.businessMember.create({
        data: {
          businessId: membership.businessId,
          userId: user.id,
          role: 'member',
        },
      });
    }

    await prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    return jsonOk({ userId: user.id });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.access-requests.approve');
  }
}
