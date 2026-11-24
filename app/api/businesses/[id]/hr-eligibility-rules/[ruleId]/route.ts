import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { assertCanManageBusiness, requireBusinessAccess } from '@/src/lib/business/access';
import {
  deleteHrEligibilityRule,
  updateHrEligibilityRule,
} from '@/src/lib/meizito/hr-eligibility-admin';

type Ctx = { params: Promise<{ id: string; ruleId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, ruleId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    const body = await req.json();
    const rule = await updateHrEligibilityRule(id, ruleId, body);
    return jsonOk({ rule });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.eligibility.update');
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id, ruleId } = await ctx.params;
    const access = await requireBusinessAccess(req, id);
    assertCanManageBusiness(access.memberRole);
    await deleteHrEligibilityRule(id, ruleId);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.eligibility.delete');
  }
}
