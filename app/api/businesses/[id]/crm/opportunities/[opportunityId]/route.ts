import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deleteCrmOpportunity, updateCrmOpportunity } from '@/src/lib/erp/crm-pipeline-service';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; opportunityId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, opportunityId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const opportunity = await updateCrmOpportunity(id, opportunityId, body);
    return jsonOk({ opportunity });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.opportunities.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, opportunityId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deleteCrmOpportunity(id, opportunityId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'crm.opportunities.delete');
  }
}
