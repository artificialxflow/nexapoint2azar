import { prisma } from '@/src/lib/db/prisma';
import { phoneDirectoryGroupSchema } from '@/src/lib/erp/person-zod';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';
import type { PhoneDirectoryGroup } from '@/src/types/phone-directory';

function mapGroup(r: {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}): PhoneDirectoryGroup {
  return { id: r.id, name: r.name, slug: r.slug, sortOrder: r.sortOrder };
}

function slugBase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'group';
  const ascii = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (ascii.length >= 2) return ascii.slice(0, 48);
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) hash = (hash * 31 + trimmed.charCodeAt(i)) | 0;
  return `g${Math.abs(hash).toString(36).slice(0, 10)}`;
}

async function uniqueSlug(businessId: string, name: string, excludeId?: string): Promise<string> {
  let base = slugBase(name);
  let slug = base;
  let n = 0;
  for (;;) {
    const existing = await prisma.phoneDirectoryGroup.findUnique({
      where: { businessId_slug: { businessId, slug } },
    });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function listPhoneDirectoryGroups(businessId: string): Promise<PhoneDirectoryGroup[]> {
  const rows = await prisma.phoneDirectoryGroup.findMany({
    where: { businessId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(mapGroup);
}

export async function createPhoneDirectoryGroup(businessId: string, raw: unknown): Promise<PhoneDirectoryGroup> {
  const body = phoneDirectoryGroupSchema.parse(raw);
  const max = await prisma.phoneDirectoryGroup.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });
  const sortOrder = body.sortOrder ?? (max._max.sortOrder ?? -1) + 1;
  const slug = body.slug?.trim() || (await uniqueSlug(businessId, body.name));
  const row = await prisma.phoneDirectoryGroup.create({
    data: {
      businessId,
      name: body.name.trim(),
      slug,
      sortOrder,
    },
  });
  return mapGroup(row);
}

export async function updatePhoneDirectoryGroup(
  businessId: string,
  groupId: string,
  raw: unknown
): Promise<PhoneDirectoryGroup> {
  const body = phoneDirectoryGroupSchema.partial().parse(raw);
  const existing = await prisma.phoneDirectoryGroup.findFirst({ where: { id: groupId, businessId } });
  if (!existing) throw new PeopleNotFoundError('دسته یافت نشد.');

  let slug = existing.slug;
  if (body.name && body.name.trim() !== existing.name) {
    slug = body.slug?.trim() || (await uniqueSlug(businessId, body.name, groupId));
  } else if (body.slug?.trim()) {
    slug = await uniqueSlug(businessId, body.slug.trim(), groupId);
  }

  const row = await prisma.phoneDirectoryGroup.update({
    where: { id: groupId },
    data: {
      name: body.name?.trim(),
      slug,
      sortOrder: body.sortOrder,
    },
  });
  return mapGroup(row);
}

export async function deletePhoneDirectoryGroup(businessId: string, groupId: string): Promise<void> {
  const existing = await prisma.phoneDirectoryGroup.findFirst({ where: { id: groupId, businessId } });
  if (!existing) throw new PeopleNotFoundError('دسته یافت نشد.');
  await prisma.phoneDirectoryGroup.delete({ where: { id: groupId } });
}
