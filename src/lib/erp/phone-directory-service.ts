import type { PhoneDirectoryEntryKind, Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import { phoneDirectoryEntrySchema } from '@/src/lib/erp/person-zod';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';
import type { PhoneDirectoryEntry } from '@/src/types/phone-directory';

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
}

function mapRow(r: {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  mobile: string;
  landline: string;
  internalCode: string;
  address: string;
  notes: string;
  extension: string;
  department: string;
  jobTitle: string;
  userId: string | null;
  personId: string | null;
  sortOrder: number;
  groupId: string | null;
  entryKind: PhoneDirectoryEntryKind;
  visibilityTags: unknown;
}): PhoneDirectoryEntry {
  return {
    id: r.id,
    displayName: r.displayName,
    firstName: r.firstName,
    lastName: r.lastName,
    mobile: r.mobile,
    landline: r.landline,
    internalCode: r.internalCode,
    address: r.address,
    notes: r.notes,
    extension: r.extension,
    department: r.department,
    jobTitle: r.jobTitle,
    userId: r.userId ?? undefined,
    personId: r.personId ?? undefined,
    sortOrder: r.sortOrder,
    groupId: r.groupId ?? undefined,
    entryKind: r.entryKind,
    visibilityTags: asStringArray(r.visibilityTags),
  };
}

function entryVisibleToViewer(entry: PhoneDirectoryEntry, viewerRoleSlugs?: string[]): boolean {
  const tags = entry.visibilityTags ?? [];
  if (tags.length === 0) return true;
  if (!viewerRoleSlugs?.length) return false;
  return tags.some((t) => viewerRoleSlugs.includes(t));
}

export type ListPhoneDirectoryOptions = {
  viewerRoleSlugs?: string[];
  groupId?: string | null;
  /** todo-v9 §2.4 — جستجو در نام، فامیل، موبایل، کد داخلی */
  search?: string;
};

export async function listPhoneDirectory(
  businessId: string,
  options: ListPhoneDirectoryOptions = {}
): Promise<PhoneDirectoryEntry[]> {
  const where: Prisma.PhoneDirectoryEntryWhereInput = { businessId };
  if (options.groupId) where.groupId = options.groupId;

  const q = options.search?.trim();
  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q } },
      { internalCode: { contains: q, mode: 'insensitive' } },
      { landline: { contains: q } },
      { address: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.phoneDirectoryEntry.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { firstName: 'asc' }, { lastName: 'asc' }],
  });
  return rows
    .map(mapRow)
    .filter((e) => entryVisibleToViewer(e, options.viewerRoleSlugs));
}

function normalizeCreateData(
  businessId: string,
  body: ReturnType<typeof phoneDirectoryEntrySchema.parse>,
  sortOrder: number
): Prisma.PhoneDirectoryEntryCreateInput {
  const kind = body.entryKind ?? 'internal';
  const personId = kind === 'internal' ? null : (body.personId ?? null);
  const userId = kind === 'linked_user' ? (body.userId ?? null) : kind === 'internal' ? (body.userId ?? null) : (body.userId ?? null);
  const firstName = body.firstName?.trim() || body.displayName.trim().split(/\s+/)[0] || body.displayName;
  const lastName =
    body.lastName?.trim() ||
    body.displayName.trim().split(/\s+/).slice(1).join(' ') ||
    '';

  return {
    business: { connect: { id: businessId } },
    displayName: body.displayName,
    firstName,
    lastName,
    landline: body.landline ?? '',
    internalCode: body.internalCode ?? '',
    address: body.address ?? '',
    notes: body.notes ?? '',
    mobile: body.mobile,
    extension: body.extension,
    department: body.department,
    jobTitle: body.jobTitle,
    userId,
    personId,
    sortOrder,
    entryKind: kind,
    visibilityTags: (body.visibilityTags ?? []) as Prisma.InputJsonValue,
    ...(body.groupId ? { group: { connect: { id: body.groupId } } } : {}),
  };
}

export async function createPhoneDirectoryEntry(businessId: string, raw: unknown): Promise<PhoneDirectoryEntry> {
  const body = phoneDirectoryEntrySchema.parse(raw);
  const max = await prisma.phoneDirectoryEntry.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });
  const sortOrder = body.sortOrder ?? (max._max.sortOrder ?? -1) + 1;
  const row = await prisma.phoneDirectoryEntry.create({
    data: normalizeCreateData(businessId, body, sortOrder),
  });
  return mapRow(row);
}

export async function updatePhoneDirectoryEntry(
  businessId: string,
  entryId: string,
  raw: unknown
): Promise<PhoneDirectoryEntry> {
  const body = phoneDirectoryEntrySchema.partial().parse(raw);
  const existing = await prisma.phoneDirectoryEntry.findFirst({ where: { id: entryId, businessId } });
  if (!existing) throw new PeopleNotFoundError('مخاطب یافت نشد.');

  const nextKind = body.entryKind ?? existing.entryKind;
  const row = await prisma.phoneDirectoryEntry.update({
    where: { id: entryId },
    data: {
      displayName: body.displayName,
      firstName: body.firstName,
      lastName: body.lastName,
      landline: body.landline,
      internalCode: body.internalCode,
      address: body.address,
      notes: body.notes,
      mobile: body.mobile,
      extension: body.extension,
      department: body.department,
      jobTitle: body.jobTitle,
      userId: body.userId,
      personId: nextKind === 'internal' ? null : body.personId,
      sortOrder: body.sortOrder,
      entryKind: body.entryKind,
      visibilityTags:
        body.visibilityTags !== undefined
          ? (body.visibilityTags as Prisma.InputJsonValue)
          : undefined,
      ...(body.groupId !== undefined
        ? body.groupId
          ? { group: { connect: { id: body.groupId } } }
          : { group: { disconnect: true } }
        : {}),
    },
  });
  return mapRow(row);
}

export async function deletePhoneDirectoryEntry(businessId: string, entryId: string): Promise<void> {
  const existing = await prisma.phoneDirectoryEntry.findFirst({ where: { id: entryId, businessId } });
  if (!existing) throw new PeopleNotFoundError('مخاطب یافت نشد.');
  await prisma.phoneDirectoryEntry.delete({ where: { id: entryId } });
}
