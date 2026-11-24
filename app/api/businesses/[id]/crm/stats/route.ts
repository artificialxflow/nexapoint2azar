import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { getCrmSummaryStats } from '@/src/lib/erp/crm-pipeline-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const stats = await getCrmSummaryStats(id);
    return jsonOk({ stats });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.stats.get');
  }
}
