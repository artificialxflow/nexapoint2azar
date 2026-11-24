import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';
import type { WarehouseLocation } from '@/src/types/warehouse';

export class WarehouseApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function warehouseFetch<T>(businessId: string, path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `/api/businesses/${encodeURIComponent(businessId)}/warehouse/items${normalized}`;
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
      throw new WarehouseApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}

export async function fetchWarehouseItems(businessId: string): Promise<WarehouseLocation[]> {
  const data = await warehouseFetch<{ items: WarehouseLocation[] }>(businessId, '');
  return data.items;
}

export async function createWarehouseItemApi(
  businessId: string,
  item: WarehouseLocation
): Promise<WarehouseLocation> {
  const data = await warehouseFetch<{ item: WarehouseLocation }>(businessId, '', {
    method: 'POST',
    body: JSON.stringify({ item }),
  });
  return data.item;
}

export async function updateWarehouseItemApi(
  businessId: string,
  item: WarehouseLocation
): Promise<WarehouseLocation> {
  const data = await warehouseFetch<{ item: WarehouseLocation }>(
    businessId,
    `/${encodeURIComponent(item.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ item }),
    }
  );
  return data.item;
}

export async function deleteWarehouseItemApi(businessId: string, itemId: string): Promise<void> {
  await warehouseFetch(businessId, `/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}
