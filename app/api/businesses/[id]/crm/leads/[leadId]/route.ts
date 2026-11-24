import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deleteCrmLead, PeopleNotFoundError, updateCrmLead } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; leadId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, leadId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const lead = await updateCrmLead(id, leadId, body);
    return jsonOk({ lead });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'crm.leads.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, leadId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deleteCrmLead(id, leadId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'crm.leads.delete');
  }
}
