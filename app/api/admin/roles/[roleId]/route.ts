import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';
import { serializeAdminRole } from '@/src/lib/admin/serialize';

type Ctx = { params: Promise<{ roleId: string }> };

const schema = z.object({
  permissions: z.record(z.boolean()),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'users:write');
    const { roleId } = await ctx.params;
    const body = schema.parse(await req.json());
    const role = await prisma.systemRole.update({
      where: { id: roleId },
      data: { permissions: body.permissions },
    });
    const userCount = await prisma.user.count({ where: { systemRoleId: roleId } });
    return jsonOk({ role: serializeAdminRole(role, userCount) });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.roles.patch');
  }
}
