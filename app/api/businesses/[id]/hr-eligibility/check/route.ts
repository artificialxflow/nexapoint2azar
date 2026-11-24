import { NextRequest } from 'next/server';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';
import { evaluateHrEligibility, monthsBetween } from '@/src/lib/meizito/hr-eligibility';
import { prisma } from '@/src/lib/db/prisma';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  hrSubtype: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id: businessId } = await ctx.params;
    const access = await requireBusinessAccess(req, businessId);
    const json = await req.json();
    const body = bodySchema.parse(json);

    const member = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: access.user.id } },
    });
    const joinedAt = member?.joinedAt ?? member?.createdAt ?? null;
    const tenureMonths = joinedAt ? monthsBetween(joinedAt, new Date()) : 0;

    const gate = await evaluateHrEligibility(
      businessId,
      access.user.id,
      body.hrSubtype,
      body.payload
    );
    if (!gate.ok) {
      return jsonError('HR_ELIGIBILITY_DENIED', gate.messageFa, 403);
    }
    return jsonOk({ ok: true as const, tenureMonths });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.eligibility.check');
  }
}
