import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import type { AttachmentRef } from '@/src/types/attachment';

export type EntityAttachmentHost =
  | 'chat_message'
  | 'workspace_card'
  | 'workspace_note'
  | 'internal_letter'
  | 'internal_work_request';

function asAttachmentRefs(value: unknown): AttachmentRef[] {
  return Array.isArray(value) ? (value as AttachmentRef[]) : [];
}

function refFromAttachment(row: {
  id: string;
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isPublic: boolean;
  createdAt: Date;
}): AttachmentRef {
  const url = row.isPublic
    ? `/api/storage/public/${row.fileKey.split('/').map(encodeURIComponent).join('/')}`
    : `/api/attachments/${row.fileKey.split('/').map(encodeURIComponent).join('/')}`;
  return {
    id: row.id,
    name: row.originalName,
    mimeType: row.mimeType,
    size: row.sizeBytes,
    fileKey: row.fileKey,
    url,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadEntityAttachmentRefs(
  businessId: string,
  entityType: EntityAttachmentHost,
  entityId: string
): Promise<AttachmentRef[]> {
  const links = await prisma.entityAttachment.findMany({
    where: { businessId, entityType, entityId },
    orderBy: { sortOrder: 'asc' },
    include: { attachment: true },
  });
  return links.map((l) => refFromAttachment(l.attachment));
}

export async function loadEntityAttachmentRefsMap(
  businessId: string,
  entityType: EntityAttachmentHost,
  entityIds: string[]
): Promise<Map<string, AttachmentRef[]>> {
  const map = new Map<string, AttachmentRef[]>();
  if (entityIds.length === 0) return map;
  const links = await prisma.entityAttachment.findMany({
    where: { businessId, entityType, entityId: { in: entityIds } },
    orderBy: [{ entityId: 'asc' }, { sortOrder: 'asc' }],
    include: { attachment: true },
  });
  for (const l of links) {
    const arr = map.get(l.entityId) ?? [];
    arr.push(refFromAttachment(l.attachment));
    map.set(l.entityId, arr);
  }
  return map;
}

export function isEntityAttachmentHost(value: string): value is EntityAttachmentHost {
  return (
    value === 'chat_message' ||
    value === 'workspace_card' ||
    value === 'workspace_note' ||
    value === 'internal_letter' ||
    value === 'internal_work_request'
  );
}

export async function syncEntityAttachmentRefs(
  tx: Prisma.TransactionClient,
  businessId: string,
  entityType: EntityAttachmentHost,
  entityId: string,
  refs: unknown
): Promise<void> {
  const parsed = asAttachmentRefs(refs).filter((r) => r.fileKey?.trim());
  await tx.entityAttachment.deleteMany({ where: { businessId, entityType, entityId } });
  for (let i = 0; i < parsed.length; i++) {
    const ref = parsed[i]!;
    const attachment = await tx.attachment.findFirst({
      where: { fileKey: ref.fileKey! },
    });
    if (!attachment) continue;
    await tx.entityAttachment.create({
      data: {
        businessId,
        entityType,
        entityId,
        attachmentId: attachment.id,
        sortOrder: i,
      },
    });
  }
}

/** پیوست‌های legacy در JSON را با junction تثبیت می‌کند (بدون تغییر JSON). */
export async function ensureEntityAttachmentsFromJson(
  businessId: string,
  entityType: EntityAttachmentHost,
  entityId: string,
  refs: unknown
): Promise<void> {
  const existing = await prisma.entityAttachment.count({
    where: { businessId, entityType, entityId },
  });
  if (existing > 0) return;
  await prisma.$transaction(async (tx) => {
    await syncEntityAttachmentRefs(tx, businessId, entityType, entityId, refs);
  });
}