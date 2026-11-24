import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, 'invites:read');
    const invites = await prisma.userInvite.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const roles = await prisma.systemRole.findMany();
    const roleBySlug = new Map(roles.map((r) => [r.slug, r]));

    return jsonOk({
      invites: invites.map((inv) => {
        const role = roleBySlug.get(inv.roleSlug);
        const status = inv.usedAt ? 'used' : inv.expiresAt < new Date() ? 'expired' : 'pending';
        return {
          id: inv.id,
          role: {
            slug: inv.roleSlug,
            nameFa: role?.nameFa ?? inv.roleSlug,
          },
          expiresAt: inv.expiresAt.toISOString(),
          usedAt: inv.usedAt?.toISOString() ?? null,
          status,
          displayName: inv.displayName,
          credentialMode: inv.credentialMode,
        };
      }),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.invites.list');
  }
}
