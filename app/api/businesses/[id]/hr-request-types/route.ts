import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  createHrRequestType,
  ensureStarterHrRequestTypes,
} from '@/src/lib/meizito/hr-request-type-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const types = await ensureStarterHrRequestTypes(id);
    return jsonOk({ types });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.requestTypes.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const row = await createHrRequestType(id, body);
    return jsonOk({ type: row }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.requestTypes.create');
  }
}
