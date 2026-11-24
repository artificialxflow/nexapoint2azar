import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  createOrgUnit,
  ensureStarterOrgUnits,
  listOrgUnits,
} from '@/src/lib/meizito/org-unit-service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const units = await ensureStarterOrgUnits(id);
    return jsonOk({ units });
  } catch (err) {
    return handleAuthRouteError(err, 'org.units.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const unit = await createOrgUnit(id, body);
    return jsonOk({ unit }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'org.units.create');
  }
}
