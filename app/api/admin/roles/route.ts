import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';
import { PERMISSION_CATALOG } from '@/src/lib/auth/permissions-catalog';
import { serializeAdminRole } from '@/src/lib/admin/serialize';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, 'users:read');
    const [roles, counts] = await Promise.all([
      prisma.systemRole.findMany({ orderBy: { level: 'desc' } }),
      prisma.user.groupBy({
        by: ['systemRoleId'],
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map(counts.map((c) => [c.systemRoleId, c._count._all]));
    return jsonOk({
      roles: roles.map((r) => serializeAdminRole(r, countMap.get(r.id) ?? 0)),
      catalog: PERMISSION_CATALOG,
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.roles.list');
  }
}
