import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';
import type {
  CrmClubMember,
  CrmLead,
  CrmOpportunity,
  CrmPipelineStage,
  CrmVisit,
} from '@/src/types/crm';

async function crmFetch<T>(businessId: string, path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `/api/businesses/${encodeURIComponent(businessId)}/crm${normalized}`;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  try {
    return await parseApiJson<T>(res);
  } catch (e) {
    if (e instanceof ApiResponseError) {
      throw e;
    }
    throw e;
  }
}

export async function fetchCrmLeads(businessId: string): Promise<CrmLead[]> {
  const data = await crmFetch<{ leads: CrmLead[] }>(businessId, '/leads');
  return data.leads;
}

export async function createCrmLeadApi(businessId: string, lead: Omit<CrmLead, 'id'>): Promise<CrmLead> {
  const data = await crmFetch<{ lead: CrmLead }>(businessId, '/leads', {
    method: 'POST',
    body: JSON.stringify(lead),
  });
  return data.lead;
}

export async function updateCrmLeadApi(
  businessId: string,
  leadId: string,
  patch: Partial<Omit<CrmLead, 'id'>>
): Promise<CrmLead> {
  const data = await crmFetch<{ lead: CrmLead }>(businessId, `/leads/${encodeURIComponent(leadId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.lead;
}

export async function deleteCrmLeadApi(businessId: string, leadId: string): Promise<void> {
  await crmFetch<{ deleted: boolean }>(businessId, `/leads/${encodeURIComponent(leadId)}`, {
    method: 'DELETE',
  });
}

export async function fetchCrmVisits(businessId: string): Promise<CrmVisit[]> {
  const data = await crmFetch<{ visits: CrmVisit[] }>(businessId, '/visits');
  return data.visits;
}

export async function createCrmVisitApi(
  businessId: string,
  visit: Omit<CrmVisit, 'id'>
): Promise<CrmVisit> {
  const data = await crmFetch<{ visit: CrmVisit }>(businessId, '/visits', {
    method: 'POST',
    body: JSON.stringify(visit),
  });
  return data.visit;
}

export async function updateCrmVisitApi(
  businessId: string,
  visitId: string,
  patch: Partial<Omit<CrmVisit, 'id'>>
): Promise<CrmVisit> {
  const data = await crmFetch<{ visit: CrmVisit }>(businessId, `/visits/${encodeURIComponent(visitId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.visit;
}

export async function deleteCrmVisitApi(businessId: string, visitId: string): Promise<void> {
  await crmFetch<{ deleted: boolean }>(businessId, `/visits/${encodeURIComponent(visitId)}`, {
    method: 'DELETE',
  });
}

export async function fetchCrmClubMembers(businessId: string): Promise<CrmClubMember[]> {
  const data = await crmFetch<{ members: CrmClubMember[] }>(businessId, '/club-members');
  return data.members;
}

export async function createCrmClubMemberApi(
  businessId: string,
  member: Omit<CrmClubMember, 'id'>
): Promise<CrmClubMember> {
  const data = await crmFetch<{ member: CrmClubMember }>(businessId, '/club-members', {
    method: 'POST',
    body: JSON.stringify(member),
  });
  return data.member;
}

export async function updateCrmClubMemberApi(
  businessId: string,
  memberId: string,
  patch: Partial<Omit<CrmClubMember, 'id'>>
): Promise<CrmClubMember> {
  const data = await crmFetch<{ member: CrmClubMember }>(
    businessId,
    `/club-members/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
  return data.member;
}

export async function deleteCrmClubMemberApi(businessId: string, memberId: string): Promise<void> {
  await crmFetch<{ deleted: boolean }>(businessId, `/club-members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
  });
}

export async function fetchCrmPipelineBoard(businessId: string): Promise<{
  stages: CrmPipelineStage[];
  opportunities: CrmOpportunity[];
}> {
  return crmFetch(businessId, '/pipeline');
}

export async function createCrmStageApi(
  businessId: string,
  stage: Omit<CrmPipelineStage, 'id'>
): Promise<CrmPipelineStage> {
  const data = await crmFetch<{ stage: CrmPipelineStage }>(businessId, '/stages', {
    method: 'POST',
    body: JSON.stringify(stage),
  });
  return data.stage;
}

export async function updateCrmStageApi(
  businessId: string,
  stageId: string,
  patch: Partial<Omit<CrmPipelineStage, 'id'>>
): Promise<CrmPipelineStage> {
  const data = await crmFetch<{ stage: CrmPipelineStage }>(
    businessId,
    `/stages/${encodeURIComponent(stageId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
  return data.stage;
}

export async function deleteCrmStageApi(businessId: string, stageId: string): Promise<void> {
  await crmFetch<{ deleted: boolean }>(businessId, `/stages/${encodeURIComponent(stageId)}`, {
    method: 'DELETE',
  });
}

export async function createCrmOpportunityApi(
  businessId: string,
  opp: Omit<CrmOpportunity, 'id'>
): Promise<CrmOpportunity> {
  const data = await crmFetch<{ opportunity: CrmOpportunity }>(businessId, '/opportunities', {
    method: 'POST',
    body: JSON.stringify(opp),
  });
  return data.opportunity;
}

export async function updateCrmOpportunityApi(
  businessId: string,
  opportunityId: string,
  patch: Partial<Omit<CrmOpportunity, 'id'>>
): Promise<CrmOpportunity> {
  const data = await crmFetch<{ opportunity: CrmOpportunity }>(
    businessId,
    `/opportunities/${encodeURIComponent(opportunityId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
  return data.opportunity;
}

export async function deleteCrmOpportunityApi(businessId: string, opportunityId: string): Promise<void> {
  await crmFetch<{ deleted: boolean }>(
    businessId,
    `/opportunities/${encodeURIComponent(opportunityId)}`,
    { method: 'DELETE' }
  );
}

export async function fetchCrmStats(businessId: string): Promise<{
  leadCount: number;
  visitCount: number;
  opportunityCount: number;
  convertedLeads: number;
  clubMemberCount: number;
  personCount: number;
  visitConversionRate: number;
}> {
  const data = await crmFetch<{
    stats: {
      leadCount: number;
      visitCount: number;
      opportunityCount: number;
      convertedLeads: number;
      clubMemberCount: number;
      personCount: number;
      visitConversionRate: number;
    };
  }>(businessId, '/stats');
  return data.stats;
}
