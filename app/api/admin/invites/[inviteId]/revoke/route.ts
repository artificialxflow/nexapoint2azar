import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

type Ctx = { params: Promise<{ inviteId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await requirePermission(req, 'invites:write');
    const { inviteId } = await ctx.params;
    await prisma.userInvite.delete({ where: { id: inviteId } });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.invites.revoke');
  }
}
