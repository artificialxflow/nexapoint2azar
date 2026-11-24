import { prisma } from '@/src/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { AttachmentRef } from '@/src/types/attachment';

export const PERSONNEL_DOC_KEYS = [
  'photo',
  'nationalIdCopy',
  'birthCertificate',
  'childrenInfo',
] as const;

export type PersonnelDocKey = (typeof PERSONNEL_DOC_KEYS)[number];

export const PERSONNEL_DOC_LABELS: Record<PersonnelDocKey, string> = {
  photo: 'عکس پرسنلی',
  nationalIdCopy: 'کپی شناسنامه / کارت ملی',
  birthCertificate: 'شناسنامه (صفحات)',
  childrenInfo: 'اطلاعات فرزندان',
};

export type PersonnelDocReviewStatus = 'pending' | 'approved' | 'rejected';

export type PersonnelDocRecord = {
  attachment?: AttachmentRef;
  status?: PersonnelDocReviewStatus;
  reviewNote?: string;
};

export type PersonnelFilePayload = Partial<Record<PersonnelDocKey, boolean>> & {
  notes?: string;
  approvedRequestIds?: string[];
  /** v10.5.4: آپلود + گردش تأیید مدیر */
  documents?: Partial<Record<PersonnelDocKey, PersonnelDocRecord>>;
  /** v10: key-value fields until Settings form builder wires in. */
  customFields?: Record<string, string>;
};

export function isPersonnelDocComplete(payload: PersonnelFilePayload, key: PersonnelDocKey): boolean {
  const rec = payload.documents?.[key];
  if (rec?.status === 'approved') return true;
  if (payload[key] === true && !rec?.attachment) return true;
  return false;
}

const upsertSchema = z.object({
  userId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  formTemplateId: z.string().nullable().optional(),
});

function asPayload(v: unknown): PersonnelFilePayload {
  return v && typeof v === 'object' ? (v as PersonnelFilePayload) : {};
}

export function incompleteDocCount(payload: PersonnelFilePayload): number {
  return PERSONNEL_DOC_KEYS.filter((k) => !isPersonnelDocComplete(payload, k)).length;
}

export async function getPersonnelFile(businessId: string, userId: string) {
  const row = await prisma.personnelFile.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
  if (!row) {
    return {
      userId,
      payload: {} as PersonnelFilePayload,
      formTemplateId: null as string | null,
    };
  }
  return {
    userId: row.userId,
    payload: asPayload(row.payload),
    formTemplateId: row.formTemplateId,
  };
}

export async function recordApprovedHrRequest(
  businessId: string,
  userId: string,
  requestId: string
) {
  const current = await getPersonnelFile(businessId, userId);
  const ids = new Set(current.payload.approvedRequestIds ?? []);
  if (ids.has(requestId)) return;
  ids.add(requestId);
  await upsertPersonnelFile(businessId, {
    userId,
    payload: { ...current.payload, approvedRequestIds: [...ids] },
  });
}

export async function upsertPersonnelFile(businessId: string, raw: unknown) {
  const body = upsertSchema.parse(raw);
  const payload = (body.payload ?? {}) as Prisma.InputJsonValue;
  return prisma.personnelFile.upsert({
    where: { businessId_userId: { businessId, userId: body.userId } },
    create: {
      businessId,
      userId: body.userId,
      payload,
      formTemplateId: body.formTemplateId ?? null,
    },
    update: {
      payload,
      ...(body.formTemplateId !== undefined ? { formTemplateId: body.formTemplateId } : {}),
    },
  });
}
