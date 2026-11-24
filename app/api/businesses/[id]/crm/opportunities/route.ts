import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { createCrmOpportunity } from '@/src/lib/erp/crm-pipeline-service';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const opportunity = await createCrmOpportunity(id, body);
    return jsonOk({ opportunity }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'crm.opportunities.create');
  }
}
