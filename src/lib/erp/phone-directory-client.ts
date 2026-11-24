import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';
import type { PhoneDirectoryEntry, PhoneDirectoryGroup } from '@/src/types/phone-directory';

async function phoneFetch<T>(businessId: string, path: string, init?: RequestInit): Promise<T> {
  const url = `/api/businesses/${encodeURIComponent(businessId)}/phone-directory${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  try {
    return await parseApiJson<T>(res);
  } catch (e) {
    if (e instanceof ApiResponseError) throw e;
    throw e;
  }
}

export async function fetchPhoneDirectory(
  businessId: string,
  search?: string
): Promise<PhoneDirectoryEntry[]> {
  const q = search?.trim();
  const path = q ? `?q=${encodeURIComponent(q)}` : '';
  const data = await phoneFetch<{ entries: PhoneDirectoryEntry[] }>(businessId, path);
  return data.entries;
}

export async function createPhoneDirectoryEntryApi(
  businessId: string,
  entry: Omit<PhoneDirectoryEntry, 'id'>
): Promise<PhoneDirectoryEntry> {
  const data = await phoneFetch<{ entry: PhoneDirectoryEntry }>(businessId, '', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  return data.entry;
}

export async function updatePhoneDirectoryEntryApi(
  businessId: string,
  entryId: string,
  patch: Partial<Omit<PhoneDirectoryEntry, 'id'>>
): Promise<PhoneDirectoryEntry> {
  const data = await phoneFetch<{ entry: PhoneDirectoryEntry }>(
    businessId,
    `/${encodeURIComponent(entryId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
  return data.entry;
}

export async function deletePhoneDirectoryEntryApi(businessId: string, entryId: string): Promise<void> {
  await phoneFetch<{ deleted: boolean }>(businessId, `/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  });
}

export async function fetchPhoneDirectoryGroups(businessId: string): Promise<PhoneDirectoryGroup[]> {
  const data = await phoneFetch<{ groups: PhoneDirectoryGroup[] }>(businessId, '/groups');
  return data.groups;
}

export async function createPhoneDirectoryGroupApi(
  businessId: string,
  input: { name: string; sortOrder?: number }
): Promise<PhoneDirectoryGroup> {
  const data = await phoneFetch<{ group: PhoneDirectoryGroup }>(businessId, '/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.group;
}

export async function updatePhoneDirectoryGroupApi(
  businessId: string,
  groupId: string,
  patch: { name?: string; sortOrder?: number }
): Promise<PhoneDirectoryGroup> {
  const data = await phoneFetch<{ group: PhoneDirectoryGroup }>(
    businessId,
    `/groups/${encodeURIComponent(groupId)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
  return data.group;
}

export async function deletePhoneDirectoryGroupApi(businessId: string, groupId: string): Promise<void> {
  await phoneFetch<{ deleted: boolean }>(businessId, `/groups/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
  });
}
