import type { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import {
  crmClubMemberSchema,
  crmLeadSchema,
  crmVisitSchema,
  moneyDocumentSchema,
  personCategorySchema,
  personGroupSchema,
  personSchema,
  shareholderRecordSchema,
  vendorRecordSchema,
} from '@/src/lib/erp/person-zod';
import type {
  MoneyDocument,
  Person,
  PersonCategory,
  PersonGroup,
  ShareholderRecord,
  VendorRecord,
} from '@/src/types/person';
import type { CrmClubMember, CrmLead, CrmVisit } from '@/src/types/crm';
import {
  labelCrmClubMemberStatus,
  labelCrmLeadStatus,
  parseCrmClubMemberStatus,
  parseCrmLeadStatus,
} from '@/src/lib/erp/flow-status';
import { moneyFromNumber, rateFromNumber, rateToNumber } from '@/src/lib/money/decimal';

export class PeopleNotFoundError extends Error {
  code = 'NOT_FOUND';
  constructor(message = 'شخص یافت نشد.') {
    super(message);
  }
}

export class PeopleModuleValidationError extends Error {
  code = 'VALIDATION';
  constructor(message: string) {
    super(message);
  }
}

async function personIdSet(businessId: string): Promise<Set<string>> {
  const rows = await prisma.person.findMany({
    where: { businessId },
    select: { personId: true },
  });
  return new Set(rows.map((r) => r.personId));
}

/** v11 فاز ۲ — رد personId نامعتبر قبل از/همزمان با FK دیتابیس */
export async function requirePersonInBusiness(businessId: string, personId: string): Promise<void> {
  const id = personId?.trim();
  if (!id) throw new PeopleModuleValidationError('شناسه شخص الزامی است.');
  const row = await prisma.person.findUnique({
    where: { businessId_personId: { businessId, personId: id } },
    select: { personId: true },
  });
  if (!row) throw new PeopleNotFoundError('شخص برای این کسب‌وکار یافت نشد.');
}

export async function requireUserExists(userId: string): Promise<void> {
  const id = userId?.trim();
  if (!id) throw new PeopleModuleValidationError('شناسه کاربر الزامی است.');
  const row = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!row) throw new PeopleNotFoundError('کاربر یافت نشد.');
}

function assertUniquePersonIds(rows: { personId: string }[], labelFa: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.personId?.trim()) {
      throw new PeopleModuleValidationError(`${labelFa}: برای هر ردیف یک شخص انتخاب کنید.`);
    }
    if (seen.has(row.personId)) {
      throw new PeopleModuleValidationError(
        `${labelFa}: هر شخص فقط یک ردیف می‌تواند داشته باشد.`
      );
    }
    seen.add(row.personId);
  }
}

function dedupeByPersonId<T extends { personId: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const pid = row.personId?.trim();
    if (!pid) continue;
    map.set(pid, row);
  }
  return [...map.values()];
}

function rowToPerson(data: unknown): Person {
  return personSchema.parse(data);
}

function sumMoneyDocAmount(doc: MoneyDocument): number {
  return (doc.lines ?? []).reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
}

export async function listPeople(businessId: string): Promise<Person[]> {
  const rows = await prisma.person.findMany({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => rowToPerson(r.data));
}

export async function createPerson(businessId: string, raw: unknown): Promise<Person> {
  const person = personSchema.parse(raw);
  await prisma.person.create({
    data: {
      businessId,
      personId: person.id,
      displayName: person.displayName || `${person.firstName} ${person.lastName}`.trim(),
      accountingCode: person.accountingCode || '',
      kind: person.kind || 'natural',
      status: person.status || 'active',
      data: person as unknown as Prisma.InputJsonValue,
    },
  });
  return person;
}

export async function updatePerson(businessId: string, personId: string, raw: unknown): Promise<Person> {
  const patch = personSchema.partial().parse(raw);
  const existing = await prisma.person.findUnique({
    where: { businessId_personId: { businessId, personId } },
  });
  if (!existing) throw new PeopleNotFoundError();

  const current = rowToPerson(existing.data);
  const merged = personSchema.parse({ ...current, ...patch, id: personId });
  await prisma.person.update({
    where: { businessId_personId: { businessId, personId } },
    data: {
      displayName: merged.displayName || `${merged.firstName} ${merged.lastName}`.trim(),
      accountingCode: merged.accountingCode || '',
      kind: merged.kind || 'natural',
      status: merged.status || 'active',
      data: merged as unknown as Prisma.InputJsonValue,
    },
  });
  return merged;
}

export async function deletePerson(businessId: string, personId: string): Promise<void> {
  const existing = await prisma.person.findUnique({
    where: { businessId_personId: { businessId, personId } },
  });
  if (!existing) throw new PeopleNotFoundError();
  await prisma.person.delete({
    where: { businessId_personId: { businessId, personId } },
  });
}

export type PeopleModuleBundle = {
  personCategories: PersonCategory[];
  personGroups: PersonGroup[];
  receipts: MoneyDocument[];
  payments: MoneyDocument[];
  shareholders: ShareholderRecord[];
  vendors: VendorRecord[];
};

async function ensurePeopleMeta(businessId: string) {
  const existing = await prisma.businessPeopleMeta.findUnique({ where: { businessId } });
  if (existing) return existing;
  return prisma.businessPeopleMeta.create({
    data: {
      businessId,
      personCategories: [] as unknown as Prisma.InputJsonValue,
      personGroups: [] as unknown as Prisma.InputJsonValue,
    },
  });
}

function zodArray<T>(schema: { parse: (v: unknown) => T }, raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => schema.parse(item));
}

export async function getPeopleModule(businessId: string): Promise<PeopleModuleBundle> {
  const [meta, moneyRows, shareholderRows, vendorRows, validIds] = await Promise.all([
    ensurePeopleMeta(businessId),
    prisma.moneyDocument.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
    prisma.shareholderRecord.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
    prisma.vendorRecord.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } }),
    personIdSet(businessId),
  ]);

  const receipts: MoneyDocument[] = [];
  const payments: MoneyDocument[] = [];
  for (const row of moneyRows) {
    const doc = moneyDocumentSchema.parse(row.data) as MoneyDocument;
    if (row.kind === 'receipt') receipts.push(doc);
    else payments.push(doc);
  }

  const shareholders: ShareholderRecord[] = shareholderRows
    .filter((r) => validIds.has(r.personId))
    .map((r) =>
      shareholderRecordSchema.parse({
        id: r.id,
        personId: r.personId,
        percent: r.percent,
      })
    );

  const vendors: VendorRecord[] = vendorRows
    .filter((r) => validIds.has(r.personId))
    .map((r) =>
      vendorRecordSchema.parse({
        id: r.id,
        personId: r.personId,
        sellPercent: r.sellPercent,
        refundPercent: r.refundPercent,
        expenseAccount: r.expenseAccount,
        active: r.active,
      })
    );

  return {
    personCategories: zodArray(personCategorySchema, meta.personCategories),
    personGroups: zodArray(personGroupSchema, meta.personGroups),
    receipts,
    payments,
    shareholders,
    vendors,
  };
}

export async function savePeopleModule(businessId: string, bundle: PeopleModuleBundle): Promise<PeopleModuleBundle> {
  const personCategories = bundle.personCategories.map((c) => personCategorySchema.parse(c));
  const personGroups = bundle.personGroups.map((g) => personGroupSchema.parse(g));
  const receipts = bundle.receipts.map((d) => moneyDocumentSchema.parse(d) as MoneyDocument);
  const payments = bundle.payments.map((d) => moneyDocumentSchema.parse(d) as MoneyDocument);
  const shareholders = bundle.shareholders.map((s) => shareholderRecordSchema.parse(s));
  const vendors = bundle.vendors.map((v) => vendorRecordSchema.parse(v));

  const validIds = await personIdSet(businessId);
  const shareholdersOk = dedupeByPersonId(shareholders.filter((s) => validIds.has(s.personId)));
  const vendorsOk = dedupeByPersonId(vendors.filter((v) => validIds.has(v.personId)));

  assertUniquePersonIds(shareholdersOk, 'سهامداران');
  assertUniquePersonIds(vendorsOk, 'فروشندگان');

  await prisma.businessPeopleMeta.upsert({
    where: { businessId },
    create: {
      businessId,
      personCategories: personCategories as unknown as Prisma.InputJsonValue,
      personGroups: personGroups as unknown as Prisma.InputJsonValue,
    },
    update: {
      personCategories: personCategories as unknown as Prisma.InputJsonValue,
      personGroups: personGroups as unknown as Prisma.InputJsonValue,
    },
  });

  const savedShareholders: ShareholderRecord[] = [];
  const savedVendors: VendorRecord[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId}))`;

    await tx.moneyDocument.deleteMany({ where: { businessId } });
    await tx.shareholderRecord.deleteMany({ where: { businessId } });
    await tx.vendorRecord.deleteMany({ where: { businessId } });

    for (const doc of receipts) {
      await tx.moneyDocument.create({
        data: {
          businessId,
          kind: 'receipt',
          docDate: doc.date || '',
          totalAmount: moneyFromNumber(sumMoneyDocAmount(doc)),
          data: doc as unknown as Prisma.InputJsonValue,
        },
      });
    }
    for (const doc of payments) {
      await tx.moneyDocument.create({
        data: {
          businessId,
          kind: 'payment',
          docDate: doc.date || '',
          totalAmount: moneyFromNumber(sumMoneyDocAmount(doc)),
          data: doc as unknown as Prisma.InputJsonValue,
        },
      });
    }
    for (const row of shareholdersOk) {
      const created = await tx.shareholderRecord.create({
        data: {
          businessId,
          personId: row.personId,
          percent: rateFromNumber(row.percent),
        },
      });
      savedShareholders.push({
        id: created.id,
        personId: created.personId,
        percent: rateToNumber(created.percent),
      });
    }
    for (const row of vendorsOk) {
      const created = await tx.vendorRecord.create({
        data: {
          businessId,
          personId: row.personId,
          sellPercent: rateFromNumber(row.sellPercent),
          refundPercent: rateFromNumber(row.refundPercent),
          expenseAccount: row.expenseAccount,
          active: row.active,
        },
      });
      savedVendors.push({
        id: created.id,
        personId: created.personId,
        sellPercent: rateToNumber(created.sellPercent),
        refundPercent: rateToNumber(created.refundPercent),
        expenseAccount: created.expenseAccount,
        active: created.active,
      });
    }
  });

  return {
    personCategories,
    personGroups,
    receipts,
    payments,
    shareholders: savedShareholders,
    vendors: savedVendors,
  };
}

export async function listCrmLeads(businessId: string): Promise<CrmLead[]> {
  const rows = await prisma.crmLead.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    interest: r.interest,
    registeredDate: r.registeredDate,
    status: labelCrmLeadStatus(r.status),
  }));
}

export async function createCrmLead(businessId: string, raw: unknown): Promise<CrmLead> {
  const body = crmLeadSchema.parse(raw);
  const status = typeof body.status === 'string' ? parseCrmLeadStatus(body.status) : body.status;
  const row = await prisma.crmLead.create({
    data: {
      businessId,
      name: body.name,
      source: body.source,
      interest: body.interest,
      registeredDate: body.registeredDate,
      status,
    },
  });
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    interest: row.interest,
    registeredDate: row.registeredDate,
    status: labelCrmLeadStatus(row.status),
  };
}

export async function updateCrmLead(businessId: string, leadId: string, raw: unknown): Promise<CrmLead> {
  const body = crmLeadSchema.partial().parse(raw);
  const existing = await prisma.crmLead.findFirst({ where: { id: leadId, businessId } });
  if (!existing) throw new PeopleNotFoundError('سرنخ یافت نشد.');
  const row = await prisma.crmLead.update({
    where: { id: leadId },
    data: {
      ...body,
      ...(body.status !== undefined
        ? { status: parseCrmLeadStatus(String(body.status)) }
        : {}),
    },
  });
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    interest: row.interest,
    registeredDate: row.registeredDate,
    status: labelCrmLeadStatus(row.status),
  };
}

export async function deleteCrmLead(businessId: string, leadId: string): Promise<void> {
  const existing = await prisma.crmLead.findFirst({ where: { id: leadId, businessId } });
  if (!existing) throw new PeopleNotFoundError('سرنخ یافت نشد.');
  await prisma.crmLead.delete({ where: { id: leadId } });
}

export async function listCrmClubMembers(businessId: string): Promise<CrmClubMember[]> {
  const rows = await prisma.crmClubMember.findMany({
    where: { businessId },
    orderBy: { score: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    personId: r.personId ?? undefined,
    name: r.name,
    phone: r.phone,
    level: r.level,
    score: r.score,
    lastVisit: r.lastVisit,
    status: labelCrmClubMemberStatus(r.status),
    source: r.source,
  }));
}

function mapCrmVisitRow(r: {
  id: string;
  customerName: string;
  phone: string;
  source: string;
  companions: number;
  withDesigner: boolean;
  gender: string;
  buyProbability: number;
  visitedAt: Date;
  result: string;
  designerName: string;
  durationMinutes: number;
}): CrmVisit {
  return {
    id: r.id,
    customerName: r.customerName,
    phone: r.phone,
    source: r.source,
    companions: r.companions,
    withDesigner: r.withDesigner,
    gender: r.gender === 'male' ? 'male' : 'female',
    buyProbability: r.buyProbability,
    visitedAt: r.visitedAt.toISOString(),
    result: r.result,
    designerName: r.designerName,
    durationMinutes: r.durationMinutes,
  };
}

export async function listCrmVisits(businessId: string): Promise<CrmVisit[]> {
  const rows = await prisma.crmVisit.findMany({
    where: { businessId },
    orderBy: { visitedAt: 'desc' },
  });
  return rows.map(mapCrmVisitRow);
}

export async function createCrmVisit(businessId: string, raw: unknown): Promise<CrmVisit> {
  const body = crmVisitSchema.parse(raw);
  const row = await prisma.crmVisit.create({
    data: {
      businessId,
      customerName: body.customerName,
      phone: body.phone,
      source: body.source,
      companions: body.companions,
      withDesigner: body.withDesigner,
      gender: body.gender,
      buyProbability: body.buyProbability,
      visitedAt: body.visitedAt ? new Date(body.visitedAt) : new Date(),
      result: body.result,
      designerName: body.designerName,
      durationMinutes: body.durationMinutes,
    },
  });
  return mapCrmVisitRow(row);
}

export async function updateCrmVisit(businessId: string, visitId: string, raw: unknown): Promise<CrmVisit> {
  const body = crmVisitSchema.partial().parse(raw);
  const existing = await prisma.crmVisit.findFirst({ where: { id: visitId, businessId } });
  if (!existing) throw new PeopleNotFoundError('بازدید یافت نشد.');
  const row = await prisma.crmVisit.update({
    where: { id: visitId },
    data: {
      ...body,
      visitedAt: body.visitedAt ? new Date(body.visitedAt) : undefined,
    },
  });
  return mapCrmVisitRow(row);
}

export async function deleteCrmVisit(businessId: string, visitId: string): Promise<void> {
  const existing = await prisma.crmVisit.findFirst({ where: { id: visitId, businessId } });
  if (!existing) throw new PeopleNotFoundError('بازدید یافت نشد.');
  await prisma.crmVisit.delete({ where: { id: visitId } });
}

export async function createCrmClubMember(businessId: string, raw: unknown): Promise<CrmClubMember> {
  const body = crmClubMemberSchema.parse(raw);
  if (body.personId?.trim()) await requirePersonInBusiness(businessId, body.personId);
  const status =
    typeof body.status === 'string' ? parseCrmClubMemberStatus(body.status) : body.status;
  const row = await prisma.crmClubMember.create({
    data: {
      businessId,
      personId: body.personId ?? null,
      name: body.name,
      phone: body.phone,
      level: body.level,
      score: body.score,
      lastVisit: body.lastVisit,
      status,
      source: body.source,
    },
  });
  return {
    id: row.id,
    personId: row.personId ?? undefined,
    name: row.name,
    phone: row.phone,
    level: row.level,
    score: row.score,
    lastVisit: row.lastVisit,
    status: labelCrmClubMemberStatus(row.status),
    source: row.source,
  };
}

export async function updateCrmClubMember(
  businessId: string,
  memberId: string,
  raw: unknown
): Promise<CrmClubMember> {
  const body = crmClubMemberSchema.partial().parse(raw);
  const existing = await prisma.crmClubMember.findFirst({ where: { id: memberId, businessId } });
  if (!existing) throw new PeopleNotFoundError('عضو باشگاه یافت نشد.');
  if (body.personId !== undefined && body.personId?.trim()) {
    await requirePersonInBusiness(businessId, body.personId);
  }
  const row = await prisma.crmClubMember.update({
    where: { id: memberId },
    data: {
      personId: body.personId,
      name: body.name,
      phone: body.phone,
      level: body.level,
      score: body.score,
      lastVisit: body.lastVisit,
      ...(body.status !== undefined
        ? { status: parseCrmClubMemberStatus(String(body.status)) }
        : {}),
      source: body.source,
    },
  });
  return {
    id: row.id,
    personId: row.personId ?? undefined,
    name: row.name,
    phone: row.phone,
    level: row.level,
    score: row.score,
    lastVisit: row.lastVisit,
    status: labelCrmClubMemberStatus(row.status),
    source: row.source,
  };
}

export async function deleteCrmClubMember(businessId: string, memberId: string): Promise<void> {
  const existing = await prisma.crmClubMember.findFirst({ where: { id: memberId, businessId } });
  if (!existing) throw new PeopleNotFoundError('عضو باشگاه یافت نشد.');
  await prisma.crmClubMember.delete({ where: { id: memberId } });
}
