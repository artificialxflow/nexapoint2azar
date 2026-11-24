import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  createHrEligibilityRule,
  listHrEligibilityRules,
} from '@/src/lib/meizito/hr-eligibility-admin';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireBusinessAccess(req, id);
    const rules = await listHrEligibilityRules(id);
    return jsonOk({ rules });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.eligibility.list');
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const rule = await createHrEligibilityRule(id, body);
    return jsonOk({ rule }, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.eligibility.create');
  }
}
