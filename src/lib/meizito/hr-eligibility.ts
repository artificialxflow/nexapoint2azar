import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';

export type HrEligibilityDeny = { ok: false; messageFa: string };
export type HrEligibilityAllow = { ok: true };
export type HrEligibilityResult = HrEligibilityDeny | HrEligibilityAllow;

export function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export type HrEligibilityRuleLike = {
  enabled?: boolean;
  hrSubtype?: string | null;
  conditionJson: unknown;
  userMessageFa: string;
};

/** Pure rule evaluation — used in tests (e.g. وام ۶ ماه) and DB-backed gate. */
export function evaluateHrEligibilityFromRules(
  hrSubtype: string,
  tenureMonths: number,
  rules: HrEligibilityRuleLike[],
  payload?: Record<string, unknown>
): HrEligibilityResult {
  const active = rules.filter((r) => r.enabled !== false);
  if (active.length === 0) return { ok: true };

  for (const rule of active) {
    if (rule.hrSubtype != null && rule.hrSubtype !== '' && rule.hrSubtype !== hrSubtype) continue;
    const cond = rule.conditionJson as Prisma.JsonObject;
    const minTenure = typeof cond.minTenureMonths === 'number' ? cond.minTenureMonths : null;
    if (minTenure != null && tenureMonths < minTenure) {
      return { ok: false, messageFa: rule.userMessageFa || 'شرایط درخواست برآورده نشده است.' };
    }
    const maxAdvance =
      typeof cond.maxAdvanceAmount === 'number' ? cond.maxAdvanceAmount : null;
    if (maxAdvance != null && hrSubtype === 'advance') {
      const amount = typeof payload?.amount === 'number' ? payload.amount : null;
      if (amount != null && amount > maxAdvance) {
        return {
          ok: false,
          messageFa:
            rule.userMessageFa ||
            `سقف مساعده ${maxAdvance.toLocaleString('fa-IR')} ریال است.`,
        };
      }
    }
  }
  return { ok: true };
}

/** Server-only gate before HR request insert (todo-v9 §2.6). */
export async function evaluateHrEligibility(
  businessId: string,
  userId: string,
  hrSubtype: string,
  _payload?: Record<string, unknown>
): Promise<HrEligibilityResult> {
  const rules = await prisma.hrEligibilityRule.findMany({
    where: { businessId, enabled: true, OR: [{ hrSubtype }, { hrSubtype: null }] },
    orderBy: { sortOrder: 'asc' },
  });
  if (rules.length === 0) return { ok: true };

  const member = await prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
  const joinedAt = member?.joinedAt ?? member?.createdAt ?? null;
  const tenureMonths = joinedAt ? monthsBetween(joinedAt, new Date()) : 0;

  return evaluateHrEligibilityFromRules(hrSubtype, tenureMonths, rules, _payload);
}
