import { prisma } from '@/src/lib/db/prisma';
import { z } from 'zod';

const STARTER_UNITS = ['مدیریت', 'فروش', 'تولید', 'طراحی'] as const;

const createSchema = z.object({
  name: z.string().min(1, 'نام واحد الزامی است'),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
});

export async function listOrgUnits(businessId: string) {
  return prisma.orgUnit.findMany({
    where: { businessId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/** اگر واحدی نیست، چهار واحد نمونه سند ۱۰ را می‌سازد. */
export async function ensureStarterOrgUnits(businessId: string) {
  const count = await prisma.orgUnit.count({ where: { businessId } });
  if (count > 0) return listOrgUnits(businessId);
  for (let i = 0; i < STARTER_UNITS.length; i++) {
    await prisma.orgUnit.create({
      data: {
        businessId,
        name: STARTER_UNITS[i],
        sortOrder: i,
      },
    });
  }
  return listOrgUnits(businessId);
}

export async function createOrgUnit(businessId: string, raw: unknown) {
  const body = createSchema.parse(raw);
  const max = await prisma.orgUnit.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });
  return prisma.orgUnit.create({
    data: {
      businessId,
      name: body.name.trim(),
      parentId: body.parentId ?? null,
      phone: body.phone?.trim() ?? '',
      email: body.email?.trim() ?? '',
      location: body.location?.trim() ?? '',
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateOrgUnit(businessId: string, unitId: string, raw: unknown) {
  const body = createSchema.partial().parse(raw);
  const existing = await prisma.orgUnit.findFirst({ where: { id: unitId, businessId } });
  if (!existing) throw new Error('واحد یافت نشد');
  return prisma.orgUnit.update({
    where: { id: unitId },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
      ...(body.email !== undefined ? { email: body.email.trim() } : {}),
      ...(body.location !== undefined ? { location: body.location.trim() } : {}),
    },
  });
}
