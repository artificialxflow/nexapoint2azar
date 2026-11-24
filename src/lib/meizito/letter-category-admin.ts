import { prisma } from '@/src/lib/db/prisma';
import { z } from 'zod';

const createBodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z][a-z0-9_-]*$/, 'slug باید با حرف انگلیسی کوچک شروع شود'),
  labelFa: z.string().min(1).max(80),
  sortOrder: z.number().int().optional(),
});

export async function listLetterCategoryConfigs(businessId: string) {
  return prisma.letterCategoryConfig.findMany({
    where: { businessId },
    orderBy: [{ sortOrder: 'asc' }, { labelFa: 'asc' }],
  });
}

export async function createLetterCategoryConfig(businessId: string, raw: unknown) {
  const body = createBodySchema.parse(raw);
  return prisma.letterCategoryConfig.create({
    data: {
      businessId,
      slug: body.slug,
      labelFa: body.labelFa.trim(),
      sortOrder: body.sortOrder ?? 0,
    },
  });
}

export async function deleteLetterCategoryConfig(businessId: string, categoryId: string) {
  const existing = await prisma.letterCategoryConfig.findFirst({
    where: { id: categoryId, businessId },
  });
  if (!existing) throw new Error('دسته یافت نشد');
  await prisma.letterCategoryConfig.delete({ where: { id: categoryId } });
}
