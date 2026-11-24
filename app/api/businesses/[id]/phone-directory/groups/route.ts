import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  createPhoneDirectoryGroup,
  listPhoneDirectoryGroups,
} from '@/src/lib/erp/phone-directory-group-service';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const groups = await listPhoneDirectoryGroups(id);
    return jsonOk({ groups });
  } catch (err) {
    return handleAuthRouteError(err, 'phone.directory.groups.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const group = await createPhoneDirectoryGroup(id, body);
    return jsonOk({ group }, { status: 201 });
  } catch (err) {
    if (err instanceof PeopleNotFoundError) return jsonError('NOT_FOUND', err.message, 404);
    return handleAuthRouteError(err, 'phone.directory.groups.create');
  }
}
