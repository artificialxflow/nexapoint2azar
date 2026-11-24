import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  listOrgAssignments,
  upsertOrgAssignment,
} from '@/src/lib/meizito/org-assignment-admin';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const assignments = await listOrgAssignments(id);
    return jsonOk({ assignments });
  } catch (err) {
    return handleAuthRouteError(err, 'org.assignments.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const assignment = await upsertOrgAssignment(id, body);
    return jsonOk({ assignment }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'org.assignments.upsert');
  }
}
