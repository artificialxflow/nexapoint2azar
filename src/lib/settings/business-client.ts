import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import {
  mockCreateProject,
  mockDeleteProject,
  mockGetFiscalYears,
  mockGetProfile,
  mockListProjects,
  mockPatchProfile,
  mockUpdateProject,
  mockUpsertFiscalYear,
  type MockProjectRow,
} from '@/src/lib/mock/settings-business-store';
import type { BusinessProfile, FiscalYearSettings } from '@/src/types/settings';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

async function parseJson<T>(res: Response): Promise<T> {
  return parseApiJson<T>(res);
}

export async function fetchSettingsProjects(businessId: string): Promise<MockProjectRow[]> {
  if (FRONTEND_ONLY) return mockListProjects(businessId);
  const data = await parseJson<{ projects: MockProjectRow[] }>(
    await fetch(`/api/businesses/${businessId}/projects`, { credentials: 'include' })
  );
  return data.projects ?? [];
}

export async function createSettingsProject(
  businessId: string,
  body: { name: string; isDefault?: boolean; active?: boolean }
): Promise<void> {
  if (FRONTEND_ONLY) {
    mockCreateProject(businessId, body);
    return;
  }
  await parseJson(
    await fetch(`/api/businesses/${businessId}/projects`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

export async function updateSettingsProject(
  businessId: string,
  projectId: string,
  body: Partial<{ name: string; isDefault: boolean; active: boolean }>
): Promise<void> {
  if (FRONTEND_ONLY) {
    mockUpdateProject(businessId, projectId, body);
    return;
  }
  await parseJson(
    await fetch(`/api/businesses/${businessId}/projects/${projectId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

export async function deleteSettingsProject(businessId: string, projectId: string): Promise<void> {
  if (FRONTEND_ONLY) {
    mockDeleteProject(businessId, projectId);
    return;
  }
  await parseJson(
    await fetch(`/api/businesses/${businessId}/projects/${projectId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
  );
}

export async function fetchBusinessProfile(businessId: string): Promise<BusinessProfile> {
  if (FRONTEND_ONLY) return mockGetProfile(businessId);
  const data = await parseJson<{ profile: BusinessProfile }>(
    await fetch(`/api/businesses/${businessId}/profile`, { credentials: 'include' })
  );
  return data.profile;
}

export async function patchBusinessProfile(
  businessId: string,
  patch: Partial<BusinessProfile>
): Promise<void> {
  if (FRONTEND_ONLY) {
    mockPatchProfile(businessId, patch);
    return;
  }
  await parseJson(
    await fetch(`/api/businesses/${businessId}/profile`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

export async function fetchFiscalYears(businessId: string) {
  if (FRONTEND_ONLY) return mockGetFiscalYears(businessId);
  return parseJson<{ fiscalYears: unknown[]; active: { id: string } & FiscalYearSettings | null }>(
    await fetch(`/api/businesses/${businessId}/fiscal-years`, { credentials: 'include' })
  );
}

export async function saveFiscalYear(
  businessId: string,
  fiscalYearId: string | null,
  body: FiscalYearSettings & { isActive?: boolean }
): Promise<{ id: string }> {
  if (FRONTEND_ONLY) {
    const row = mockUpsertFiscalYear(businessId, { ...body, fiscalYearId });
    return { id: row.id };
  }
  const data = await parseJson<{ fiscalYear: { id: string } }>(
    await fetch(`/api/businesses/${businessId}/fiscal-years`, {
      method: fiscalYearId ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fiscalYearId ? { fiscalYearId, ...body, isActive: true } : { ...body, isActive: true }),
    })
  );
  return { id: data.fiscalYear.id };
}
