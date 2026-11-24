import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requirePermission } from '@/src/lib/auth/admin-access';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, 'users:read');
    const status = req.nextUrl.searchParams.get('status') ?? 'pending';
    const requests = await prisma.accessRequest.findMany({
      where: status === 'all' ? undefined : { status: status as 'pending' | 'approved' | 'rejected' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return jsonOk({
      requests: requests.map((r) => ({
        id: r.id,
        mobilePhone: r.mobilePhone,
        displayName: r.displayName,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'admin.access-requests.list');
  }
}
