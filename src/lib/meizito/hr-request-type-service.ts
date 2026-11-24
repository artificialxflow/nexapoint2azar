import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { z } from 'zod';
import { HR_REQUEST_SUBTYPES } from '@/src/lib/meizito/hr-request-types';

const writeSchema = z.object({
  slug: z.string().min(1).max(64),
  labelFa: z.string().min(1),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  formSchema: z.record(z.unknown()).optional(),
});

const patchSchema = writeSchema.partial();

export async function listHrRequestTypes(businessId: string) {
  return prisma.hrRequestType.findMany({
    where: { businessId },
    orderBy: [{ sortOrder: 'asc' }, { labelFa: 'asc' }],
  });
}

/** سه نوع مرخصی/وام/مساعده سند ۱۱ اگر خالی باشد. */
export async function ensureStarterHrRequestTypes(businessId: string) {
  const count = await prisma.hrRequestType.count({ where: { businessId } });
  if (count > 0) return listHrRequestTypes(businessId);
  for (let i = 0; i < HR_REQUEST_SUBTYPES.length; i++) {
    const s = HR_REQUEST_SUBTYPES[i]!;
    await prisma.hrRequestType.create({
      data: {
        businessId,
        slug: s.id,
        labelFa: s.label,
        kind: 'hr',
        formSchema: {},
        enabled: true,
        sortOrder: i,
      },
    });
  }
  return listHrRequestTypes(businessId);
}

export async function createHrRequestType(businessId: string, raw: unknown) {
  const body = writeSchema.parse(raw);
  const max = await prisma.hrRequestType.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });
  return prisma.hrRequestType.create({
    data: {
      businessId,
      slug: body.slug.trim(),
      labelFa: body.labelFa.trim(),
      enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
      formSchema: (body.formSchema ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function updateHrRequestType(businessId: string, typeId: string, raw: unknown) {
  const body = patchSchema.parse(raw);
  const existing = await prisma.hrRequestType.findFirst({ where: { id: typeId, businessId } });
  if (!existing) throw new Error('نوع درخواست یافت نشد');
  return prisma.hrRequestType.update({
    where: { id: typeId },
    data: {
      slug: body.slug?.trim(),
      labelFa: body.labelFa?.trim(),
      enabled: body.enabled,
      sortOrder: body.sortOrder,
      formSchema:
        body.formSchema === undefined ? undefined : (body.formSchema as Prisma.InputJsonValue),
    },
  });
}

export async function deleteHrRequestType(businessId: string, typeId: string) {
  const existing = await prisma.hrRequestType.findFirst({ where: { id: typeId, businessId } });
  if (!existing) throw new Error('نوع درخواست یافت نشد');
  await prisma.hrRequestType.delete({ where: { id: typeId } });
}
