import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';
import type { Person } from '@/src/types/person';

export class PeopleApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function peopleFetch<T>(businessId: string, path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `/api/businesses/${encodeURIComponent(businessId)}/people${normalized}`;
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
      throw new PeopleApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}

export async function fetchPeople(businessId: string): Promise<Person[]> {
  const data = await peopleFetch<{ people: Person[] }>(businessId, '');
  return data.people;
}

export async function createPersonApi(businessId: string, person: Person): Promise<Person> {
  const data = await peopleFetch<{ person: Person }>(businessId, '', {
    method: 'POST',
    body: JSON.stringify({ person }),
  });
  return data.person;
}

export async function updatePersonApi(businessId: string, person: Person): Promise<Person> {
  const data = await peopleFetch<{ person: Person }>(businessId, `/${encodeURIComponent(person.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ person }),
  });
  return data.person;
}

export async function deletePersonApi(businessId: string, personId: string): Promise<void> {
  await peopleFetch(businessId, `/${encodeURIComponent(personId)}`, { method: 'DELETE' });
}

export type PeopleModulePayload = {
  personCategories: import('@/src/types/person').PersonCategory[];
  personGroups: import('@/src/types/person').PersonGroup[];
  receipts: import('@/src/types/person').MoneyDocument[];
  payments: import('@/src/types/person').MoneyDocument[];
  shareholders: import('@/src/types/person').ShareholderRecord[];
  vendors: import('@/src/types/person').VendorRecord[];
};

async function moduleFetch<T>(businessId: string, init?: RequestInit): Promise<T> {
  const url = `/api/businesses/${encodeURIComponent(businessId)}/people-module`;
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
      throw new PeopleApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}

export async function fetchPeopleModule(businessId: string): Promise<PeopleModulePayload> {
  return moduleFetch<PeopleModulePayload>(businessId);
}

export async function savePeopleModuleApi(
  businessId: string,
  payload: PeopleModulePayload
): Promise<PeopleModulePayload> {
  return moduleFetch<PeopleModulePayload>(businessId, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
