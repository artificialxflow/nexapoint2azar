import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { deleteCrmVisit, PeopleNotFoundError, updateCrmVisit } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; visitId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, visitId } = await ctx.params;
    await requireBusinessAccess(req, id);
    const body = await req.json();
    const visit = await updateCrmVisit(id, visitId, body);
    return jsonOk({ visit });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'crm.visits.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, visitId } = await ctx.params;
    await requireBusinessAccess(req, id);
    await deleteCrmVisit(id, visitId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) {
      return jsonError('NOT_FOUND', err.message, 404);
    }
    return handleAuthRouteError(err, 'crm.visits.delete');
  }
}
