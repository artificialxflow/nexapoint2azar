import { prisma } from '@/src/lib/db/prisma';
import { z } from 'zod';

const upsertSchema = z.object({
  userId: z.string().min(1),
  managerUserId: z.string().nullable().optional(),
  roleTitle: z.string().optional(),
  unitId: z.string().optional(),
});

export async function ensureDefaultOrgUnit(businessId: string) {
  const existing = await prisma.orgUnit.findFirst({
    where: { businessId },
    orderBy: { sortOrder: 'asc' },
  });
  if (existing) return existing;
  return prisma.orgUnit.create({
    data: { businessId, name: 'سازمان', sortOrder: 0 },
  });
}

export async function listOrgAssignments(businessId: string) {
  return prisma.orgAssignment.findMany({
    where: { businessId },
    include: { unit: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function upsertOrgAssignment(businessId: string, raw: unknown) {
  const body = upsertSchema.parse(raw);
  let unitId = body.unitId;
  if (unitId) {
    const unit = await prisma.orgUnit.findFirst({ where: { id: unitId, businessId } });
    if (!unit) throw new Error('واحد سازمان یافت نشد');
  } else {
    const unit = await ensureDefaultOrgUnit(businessId);
    unitId = unit.id;
  }

  return prisma.orgAssignment.upsert({
    where: { businessId_userId: { businessId, userId: body.userId } },
    create: {
      businessId,
      unitId,
      userId: body.userId,
      managerUserId: body.managerUserId ?? null,
      roleTitle: body.roleTitle?.trim() ?? '',
    },
    update: {
      unitId,
      managerUserId: body.managerUserId === undefined ? undefined : body.managerUserId,
      roleTitle: body.roleTitle === undefined ? undefined : body.roleTitle.trim(),
    },
  });
}
