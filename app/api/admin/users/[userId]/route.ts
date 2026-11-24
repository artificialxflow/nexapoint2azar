import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';
import { serializeAdminUser } from '@/src/lib/admin/serialize';

type Ctx = { params: Promise<{ userId: string }> };

const schema = z.object({
  displayName: z.string().optional(),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
  systemRoleId: z.string().optional(),
  mobilePhone: z.string().nullable().optional(),
  mustChangePassword: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:write');
    const { userId } = await ctx.params;
    const body = schema.parse(await req.json());
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: body.displayName,
        status: body.status,
        systemRoleId: body.systemRoleId,
        mobilePhone: body.mobilePhone,
        mustChangePassword: body.mustChangePassword,
      },
      include: { systemRole: true },
    });
    return jsonOk({ user: serializeAdminUser(user) });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.users.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requirePermission(req, 'users:write');
    const { userId } = await ctx.params;
    if (userId === admin.id) {
      return jsonError('FORBIDDEN', 'نمی‌توانید حساب خود را حذف کنید.', 403);
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      include: { systemRole: true },
    });
    if (!target) {
      return jsonError('NOT_FOUND', 'کاربر یافت نشد.', 404);
    }

    const businessCount = await prisma.business.count({ where: { createdById: userId } });
    if (businessCount > 0) {
      return jsonError(
        'CONFLICT',
        'این کاربر مالک کسب‌وکار است. ابتدا مالکیت را منتقل کنید یا کسب‌وکار را حذف کنید.',
        409
      );
    }

    await prisma.user.delete({ where: { id: userId } });
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.users.delete');
  }
}
