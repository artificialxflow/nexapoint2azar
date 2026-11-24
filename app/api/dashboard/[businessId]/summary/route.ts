import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { buildDashboardSummary } from '@/src/lib/dashboard/build-summary';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { getMockDashboardSummary } from '@/src/lib/mock/dashboard-summary';
import {
  hasValidPreviewSession,
  isUnconfiguredDbPreview,
  PREVIEW_DEFAULT_BUSINESS,
} from '@/src/lib/auth/preview-mode';

type Ctx = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    if (isUnconfiguredDbPreview()) {
      if (!hasValidPreviewSession(req)) {
        return jsonError('UNAUTHORIZED', 'لطفاً وارد شوید.', 401);
      }
      return jsonOk({
        summary: {
          businessName: PREVIEW_DEFAULT_BUSINESS.name,
          stats: {
            receiptTotal: 0,
            paymentTotal: 0,
            peopleCount: 0,
            avgDeliveryDays: null,
          },
          chartData: [],
          productionStatus: [],
        },
      });
    }

    const { businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const summary = FRONTEND_ONLY
      ? getMockDashboardSummary(business.name)
      : await buildDashboardSummary(businessId, business.name);
    return jsonOk({ summary });
  } catch (err) {
    return handleAuthRouteError(err, 'dashboard.summary');
  }
}
