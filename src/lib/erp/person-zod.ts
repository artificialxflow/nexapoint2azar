import { z } from 'zod';
import { CrmClubMemberStatus, CrmLeadStatus } from '@prisma/client';

const personRoleSchema = z.enum(['customer', 'supplier', 'shareholder', 'subordinate']);
const personKindSchema = z.enum(['natural', 'legal']);
const personTaxProfileSchema = z.enum([
  'none',
  'vat-exempt',
  'vat-included',
  'vat-zero',
  'final-consumer',
]);
const personStatusSchema = z.enum(['active', 'inactive']);

export const personPhoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  number: z.string(),
});

export const personEmailSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
});

export const personAddressSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  text: z.string(),
  isPrimary: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const personBankSchema = z.object({
  id: z.string(),
  bankName: z.string(),
  accountTitle: z.string(),
  iban: z.string(),
  cardNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const personLedgerEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  at: z.string(),
});

export const personSchema = z.object({
  id: z.string().min(1),
  accountingCode: z.string(),
  kind: personKindSchema,
  title: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string(),
  legalName: z.string().optional(),
  alias: z.string(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
  registrationNo: z.string().optional(),
  branchCode: z.string().optional(),
  taxProfile: personTaxProfileSchema,
  roles: z.array(personRoleSchema),
  emails: z.array(personEmailSchema),
  primaryEmailId: z.string().optional(),
  defaultPriceListId: z.string().optional(),
  referrerName: z.string().optional(),
  companyName: z.string().optional(),
  designerName: z.string().optional(),
  primaryPhoneId: z.string().optional(),
  parentPersonId: z.string().optional(),
  categoryIds: z.array(z.string()),
  groupMemberships: z.array(
    z.object({
      groupId: z.string(),
      levelId: z.string(),
    })
  ),
  addresses: z.array(personAddressSchema),
  phones: z.array(personPhoneSchema),
  banks: z.array(personBankSchema),
  importantDates: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      date: z.string(),
    })
  ),
  status: personStatusSchema,
  points: z.number(),
  ledger: z.object({
    financial: z.array(personLedgerEventSchema),
    marketing: z.array(personLedgerEventSchema),
    activity: z.array(personLedgerEventSchema),
    orders: z.array(personLedgerEventSchema),
  }),
});

export const moneyDocumentLineSchema = z.object({
  id: z.string(),
  personId: z.string().optional(),
  amount: z.number(),
  note: z.string().optional(),
});

export const moneyDocumentSchema = z.object({
  id: z.string().min(1),
  number: z.string(),
  date: z.string(),
  project: z.string().optional(),
  currency: z.string(),
  description: z.string().optional(),
  lines: z.array(moneyDocumentLineSchema),
  notes: z.array(z.string()).optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string().optional(),
        dataUrl: z.string().optional(),
        fileRef: z.any().optional(),
        createdAt: z.string(),
      })
    )
    .optional(),
  history: z
    .array(
      z.object({
        id: z.string(),
        action: z.string(),
        at: z.string(),
        by: z.string().optional(),
      })
    )
    .optional(),
});

export const shareholderRecordSchema = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  percent: z.number(),
});

export const vendorRecordSchema = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  sellPercent: z.number(),
  refundPercent: z.number(),
  expenseAccount: z.string(),
  active: z.boolean(),
});

export const personCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
});

export const personGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  levels: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    })
  ),
});

export const crmLeadSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  source: z.string().default(''),
  interest: z.string().default(''),
  registeredDate: z.string().default(''),
  status: z.nativeEnum(CrmLeadStatus).default(CrmLeadStatus.new),
});

export const crmVisitSchema = z.object({
  id: z.string().optional(),
  customerName: z.string().min(1, 'نام مشتری الزامی است.'),
  phone: z.string().min(8, 'شماره تماس معتبر الزامی است.'),
  source: z.string().min(1, 'منبع آشنایی الزامی است.'),
  companions: z.number().int().min(0).max(50),
  withDesigner: z.boolean().default(false),
  gender: z.enum(['female', 'male']).default('female'),
  buyProbability: z.number().int().min(0).max(100),
  visitedAt: z.string().datetime().optional(),
  result: z.string().default('خنثی'),
  designerName: z.string().default(''),
  durationMinutes: z.number().int().min(0).max(24 * 60).default(0),
});

export const crmPipelineStageSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  sortOrder: z.number().int().optional(),
  color: z.string().default(''),
});

export const crmOpportunitySchema = z.object({
  id: z.string().optional(),
  stageId: z.string().min(1),
  title: z.string().min(1),
  leadId: z.string().optional(),
  personId: z.string().optional(),
  amount: z.number().optional(),
  expectedClose: z.string().default(''),
  sortOrder: z.number().int().optional(),
});

export const phoneDirectoryGroupSchema = z.object({
  name: z.string().min(1, 'نام دسته الزامی است'),
  slug: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const phoneDirectoryEntrySchema = z.object({
  id: z.string().optional(),
  displayName: z.string().min(1),
  firstName: z.string().default(''),
  lastName: z.string().default(''),
  mobile: z.string().default(''),
  landline: z.string().default(''),
  internalCode: z.string().default(''),
  address: z.string().default(''),
  notes: z.string().default(''),
  extension: z.string().default(''),
  department: z.string().default(''),
  jobTitle: z.string().default(''),
  userId: z.string().optional(),
  personId: z.string().optional(),
  sortOrder: z.number().int().optional(),
  groupId: z.string().optional().nullable(),
  entryKind: z.enum(['internal', 'linked_user', 'linked_person']).optional(),
  visibilityTags: z.array(z.string()).optional(),
});

export const crmClubMemberSchema = z.object({
  id: z.string().optional(),
  personId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().default(''),
  level: z.string().default(''),
  score: z.number().default(0),
  lastVisit: z.string().default(''),
  status: z.nativeEnum(CrmClubMemberStatus).default(CrmClubMemberStatus.active),
  source: z.string().default(''),
});

export type PersonInput = z.infer<typeof personSchema>;
