import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';
import type { ProductionModulePayload, WarehouseModulePayload } from '@/src/types/production';

export class ProductionApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function moduleFetch<T>(businessId: string, path: string, init?: RequestInit): Promise<T> {
  const url = `/api/businesses/${encodeURIComponent(businessId)}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  try {
    return await parseApiJson<T>(res);
  } catch (e) {
    if (e instanceof ApiResponseError) {
      throw new ProductionApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}

export async function fetchWarehouseModule(businessId: string): Promise<WarehouseModulePayload> {
  return moduleFetch<WarehouseModulePayload>(businessId, '/warehouse-module');
}

export async function saveWarehouseModuleApi(
  businessId: string,
  payload: WarehouseModulePayload
): Promise<WarehouseModulePayload> {
  return moduleFetch<WarehouseModulePayload>(businessId, '/warehouse-module', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchProductionModule(businessId: string): Promise<ProductionModulePayload> {
  return moduleFetch<ProductionModulePayload>(businessId, '/production-module');
}

export async function saveProductionModuleApi(
  businessId: string,
  payload: ProductionModulePayload
): Promise<ProductionModulePayload> {
  return moduleFetch<ProductionModulePayload>(businessId, '/production-module', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
