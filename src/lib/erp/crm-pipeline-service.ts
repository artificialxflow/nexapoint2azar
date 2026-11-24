import { prisma } from '@/src/lib/db/prisma';
import {
  crmOpportunitySchema,
  crmPipelineStageSchema,
} from '@/src/lib/erp/person-zod';
import { PeopleNotFoundError } from '@/src/lib/erp/people-service';
import type { CrmOpportunity, CrmPipelineStage } from '@/src/types/crm';

const defaultStages = ['سرنخ جدید', 'در حال پیگیری', 'پیش فاکتور', 'بستن معامله'];

async function ensurePipelineStages(businessId: string): Promise<CrmPipelineStage[]> {
  const count = await prisma.crmPipelineStage.count({ where: { businessId } });
  if (count === 0) {
    for (let i = 0; i < defaultStages.length; i++) {
      await prisma.crmPipelineStage.create({
        data: { businessId, title: defaultStages[i], sortOrder: i },
      });
    }
  }
  const rows = await prisma.crmPipelineStage.findMany({
    where: { businessId },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map(mapStage);
}

function mapStage(r: {
  id: string;
  businessId: string;
  title: string;
  sortOrder: number;
  color: string;
}): CrmPipelineStage {
  return { id: r.id, title: r.title, sortOrder: r.sortOrder, color: r.color };
}

function mapOpp(r: {
  id: string;
  stageId: string;
  title: string;
  leadId: string | null;
  personId: string | null;
  amount: number | null;
  expectedClose: string;
  sortOrder: number;
}): CrmOpportunity {
  return {
    id: r.id,
    stageId: r.stageId,
    title: r.title,
    leadId: r.leadId ?? undefined,
    personId: r.personId ?? undefined,
    amount: r.amount ?? undefined,
    expectedClose: r.expectedClose,
    sortOrder: r.sortOrder,
  };
}

export async function listCrmPipelineBoard(businessId: string): Promise<{
  stages: CrmPipelineStage[];
  opportunities: CrmOpportunity[];
}> {
  const stages = await ensurePipelineStages(businessId);
  const rows = await prisma.crmOpportunity.findMany({
    where: { businessId },
    orderBy: [{ stageId: 'asc' }, { sortOrder: 'asc' }],
  });
  return { stages, opportunities: rows.map(mapOpp) };
}

export async function createCrmPipelineStage(businessId: string, raw: unknown): Promise<CrmPipelineStage> {
  const body = crmPipelineStageSchema.parse(raw);
  const max = await prisma.crmPipelineStage.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });
  const row = await prisma.crmPipelineStage.create({
    data: {
      businessId,
      title: body.title,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
      color: body.color ?? '',
    },
  });
  return mapStage(row);
}

export async function updateCrmPipelineStage(
  businessId: string,
  stageId: string,
  raw: unknown
): Promise<CrmPipelineStage> {
  const body = crmPipelineStageSchema.partial().parse(raw);
  const existing = await prisma.crmPipelineStage.findFirst({ where: { id: stageId, businessId } });
  if (!existing) throw new PeopleNotFoundError('مرحله یافت نشد.');
  const row = await prisma.crmPipelineStage.update({
    where: { id: stageId },
    data: body,
  });
  return mapStage(row);
}

export async function deleteCrmPipelineStage(businessId: string, stageId: string): Promise<void> {
  const existing = await prisma.crmPipelineStage.findFirst({ where: { id: stageId, businessId } });
  if (!existing) throw new PeopleNotFoundError('مرحله یافت نشد.');
  const count = await prisma.crmPipelineStage.count({ where: { businessId } });
  if (count <= 1) throw new PeopleNotFoundError('حداقل یک مرحله باید باقی بماند.');
  await prisma.crmPipelineStage.delete({ where: { id: stageId } });
}

export async function createCrmOpportunity(businessId: string, raw: unknown): Promise<CrmOpportunity> {
  const body = crmOpportunitySchema.parse(raw);
  const stage = await prisma.crmPipelineStage.findFirst({ where: { id: body.stageId, businessId } });
  if (!stage) throw new PeopleNotFoundError('مرحله نامعتبر است.');
  const max = await prisma.crmOpportunity.aggregate({
    where: { businessId, stageId: body.stageId },
    _max: { sortOrder: true },
  });
  const row = await prisma.crmOpportunity.create({
    data: {
      businessId,
      stageId: body.stageId,
      title: body.title,
      leadId: body.leadId ?? null,
      personId: body.personId ?? null,
      amount: body.amount ?? null,
      expectedClose: body.expectedClose ?? '',
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? -1) + 1,
    },
  });
  return mapOpp(row);
}

export async function updateCrmOpportunity(
  businessId: string,
  opportunityId: string,
  raw: unknown
): Promise<CrmOpportunity> {
  const body = crmOpportunitySchema.partial().parse(raw);
  const existing = await prisma.crmOpportunity.findFirst({ where: { id: opportunityId, businessId } });
  if (!existing) throw new PeopleNotFoundError('فرصت یافت نشد.');
  if (body.stageId) {
    const stage = await prisma.crmPipelineStage.findFirst({ where: { id: body.stageId, businessId } });
    if (!stage) throw new PeopleNotFoundError('مرحله نامعتبر است.');
  }
  const row = await prisma.crmOpportunity.update({
    where: { id: opportunityId },
    data: {
      stageId: body.stageId,
      title: body.title,
      leadId: body.leadId,
      personId: body.personId,
      amount: body.amount,
      expectedClose: body.expectedClose,
      sortOrder: body.sortOrder,
    },
  });
  return mapOpp(row);
}

export async function deleteCrmOpportunity(businessId: string, opportunityId: string): Promise<void> {
  const existing = await prisma.crmOpportunity.findFirst({ where: { id: opportunityId, businessId } });
  if (!existing) throw new PeopleNotFoundError('فرصت یافت نشد.');
  await prisma.crmOpportunity.delete({ where: { id: opportunityId } });
}

export async function getCrmSummaryStats(businessId: string): Promise<{
  leadCount: number;
  visitCount: number;
  opportunityCount: number;
  convertedLeads: number;
  clubMemberCount: number;
  personCount: number;
  visitConversionRate: number;
}> {
  const [leadCount, visitCount, opportunityCount, convertedLeads, clubMemberCount, personCount] =
    await Promise.all([
      prisma.crmLead.count({ where: { businessId } }),
      prisma.crmVisit.count({ where: { businessId } }),
      prisma.crmOpportunity.count({ where: { businessId } }),
      prisma.crmLead.count({ where: { businessId, status: 'تبدیل‌شده' } }),
      prisma.crmClubMember.count({ where: { businessId } }),
      prisma.person.count({ where: { businessId } }),
    ]);
  const visitConversionRate =
    visitCount > 0 ? Math.round((convertedLeads / visitCount) * 100) : 0;
  return {
    leadCount,
    visitCount,
    opportunityCount,
    convertedLeads,
    clubMemberCount,
    personCount,
    visitConversionRate,
  };
}
