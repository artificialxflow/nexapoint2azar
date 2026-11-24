import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { z } from 'zod';

const ruleBodySchema = z.object({
  requestTypeId: z.string().optional().nullable(),
  hrSubtype: z.string().optional().nullable(),
  conditionJson: z.record(z.unknown()),
  userMessageFa: z.string().min(1),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function listHrEligibilityRules(businessId: string) {
  return prisma.hrEligibilityRule.findMany({
    where: { businessId },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createHrEligibilityRule(businessId: string, raw: unknown) {
  const body = ruleBodySchema.parse(raw);
  return prisma.hrEligibilityRule.create({
    data: {
      businessId,
      requestTypeId: body.requestTypeId ?? null,
      hrSubtype: body.hrSubtype ?? null,
      conditionJson: body.conditionJson as Prisma.InputJsonValue,
      userMessageFa: body.userMessageFa,
      enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });
}

export async function updateHrEligibilityRule(businessId: string, ruleId: string, raw: unknown) {
  const body = ruleBodySchema.partial().parse(raw);
  const existing = await prisma.hrEligibilityRule.findFirst({ where: { id: ruleId, businessId } });
  if (!existing) throw new Error('قانون یافت نشد');
  return prisma.hrEligibilityRule.update({
    where: { id: ruleId },
    data: {
      requestTypeId: body.requestTypeId === undefined ? undefined : body.requestTypeId,
      hrSubtype: body.hrSubtype === undefined ? undefined : body.hrSubtype,
      conditionJson:
        body.conditionJson === undefined ? undefined : (body.conditionJson as Prisma.InputJsonValue),
      userMessageFa: body.userMessageFa,
      enabled: body.enabled,
      sortOrder: body.sortOrder,
    },
  });
}

export async function deleteHrEligibilityRule(businessId: string, ruleId: string) {
  const existing = await prisma.hrEligibilityRule.findFirst({ where: { id: ruleId, businessId } });
  if (!existing) throw new Error('قانون یافت نشد');
  await prisma.hrEligibilityRule.delete({ where: { id: ruleId } });
}
