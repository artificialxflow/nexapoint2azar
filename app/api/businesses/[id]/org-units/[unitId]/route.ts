import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import { updateOrgUnit } from '@/src/lib/meizito/org-unit-service';

type Ctx = { params: Promise<{ id: string; unitId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, unitId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const unit = await updateOrgUnit(id, unitId, body);
    return jsonOk({ unit });
  } catch (err) {
    return handleAuthRouteError(err, 'org.units.update');
  }
}