import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireSessionUser } from '@/src/lib/auth/session';
import { DEFAULT_CREDIT_LABEL, DEFAULT_FISCAL_YEAR, defaultBusinessExpiry } from '@/src/lib/business/defaults';
import { serializeBusiness } from '@/src/lib/business/serialize';
import {
  hasValidPreviewSession,
  isUnconfiguredDbPreview,
  PREVIEW_DEFAULT_BUSINESS,
} from '@/src/lib/auth/preview-mode';

export async function GET(req: NextRequest) {
  try {
    if (isUnconfiguredDbPreview()) {
      if (!hasValidPreviewSession(req)) {
        return jsonError('UNAUTHORIZED', 'لطفاً وارد شوید.', 401);
      }
      return jsonOk({ businesses: [PREVIEW_DEFAULT_BUSINESS] });
    }

    const user = await requireSessionUser(req);

    const memberships = await prisma.businessMember.findMany({
      where: { userId: user.id, business: { status: 'active' } },
      include: { business: { include: { profile: { select: { logoFileKey: true } } } } },
      orderBy: { business: { createdAt: 'desc' } },
    });

    return jsonOk({
      businesses: memberships.map((m) => serializeBusiness(m.business, m, m.business.profile)),
    });
  } catch (err) {
    return handleAuthRouteError(err, 'businesses.list');
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  plan: z.enum(['trial', 'active']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser(req);
    const body = createSchema.parse(await req.json());
    const name = body.name.trim();

    const business = await prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          name,
          plan: body.plan ?? 'trial',
          expiresAt: defaultBusinessExpiry(),
          creditLabel: DEFAULT_CREDIT_LABEL,
          createdById: user.id,
          members: {
            create: { userId: user.id, role: 'owner' },
          },
          profile: {
            create: { tradeName: name },
          },
          fiscalYears: {
            create: {
              ...DEFAULT_FISCAL_YEAR,
              isActive: true,
            },
          },
        },
        include: {
          members: { where: { userId: user.id } },
          profile: { select: { logoFileKey: true } },
        },
      });
      return created;
    });

    const membership = business.members[0];
    return jsonOk(
      { business: serializeBusiness(business, membership, business.profile) },
      { status: 201 }
    );
  } catch (err) {
    return handleAuthRouteError(err, 'businesses.create');
  }
}
