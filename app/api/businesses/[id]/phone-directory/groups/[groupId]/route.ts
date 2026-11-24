import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  deletePhoneDirectoryGroup,
  updatePhoneDirectoryGroup,
} from '@/src/lib/erp/phone-directory-group-service';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string; groupId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, groupId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const group = await updatePhoneDirectoryGroup(id, groupId, body);
    return jsonOk({ group });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'phone.directory.groups.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, groupId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    await deletePhoneDirectoryGroup(id, groupId);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'phone.directory.groups.delete');
  }
}
