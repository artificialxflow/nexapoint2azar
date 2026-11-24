import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';
import { serializeAdminRole, serializeAdminUser } from '@/src/lib/admin/serialize';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, 'users:read');
    const [users, roles, counts] = await Promise.all([
      prisma.user.findMany({
        include: { systemRole: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.systemRole.findMany({ orderBy: { level: 'desc' } }),
      prisma.user.groupBy({
        by: ['systemRoleId'],
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map(counts.map((c) => [c.systemRoleId, c._count._all]));
    return jsonOk({
      users: users.map(serializeAdminUser),
      roles: roles.map((r) => serializeAdminRole(r, countMap.get(r.id) ?? 0)),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.users.list');
  }
}
