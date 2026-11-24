import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  deleteHrRequestType,
  updateHrRequestType,
} from '@/src/lib/meizito/hr-request-type-service';

type Ctx = { params: Promise<{ id: string; typeId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, typeId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const row = await updateHrRequestType(id, typeId, body);
    return jsonOk({ type: row });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.requestTypes.update');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, typeId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    await deleteHrRequestType(id, typeId);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.requestTypes.delete');
  }
}
