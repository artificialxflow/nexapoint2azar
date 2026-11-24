import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';
import type { BlogModulePayload, CommerceModulePayload, StoreModulePayload } from '@/src/types/commerce';
import type { PriceList } from '@/src/types/person';
import type { ProductCategory } from '@/src/types/product';

export class CommerceApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function commerceFetch<T>(businessId: string, path: string, init?: RequestInit): Promise<T> {
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
      throw new CommerceApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}

export async function fetchCommerceModule(businessId: string): Promise<CommerceModulePayload> {
  return commerceFetch<CommerceModulePayload>(businessId, '/commerce-module');
}

export async function saveCommerceModuleApi(
  businessId: string,
  payload: CommerceModulePayload
): Promise<CommerceModulePayload> {
  return commerceFetch<CommerceModulePayload>(businessId, '/commerce-module', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchStoreModule(businessId: string): Promise<StoreModulePayload> {
  return commerceFetch<StoreModulePayload>(businessId, '/store-module');
}

export async function saveStoreModuleApi(
  businessId: string,
  payload: StoreModulePayload
): Promise<StoreModulePayload> {
  return commerceFetch<StoreModulePayload>(businessId, '/store-module', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchBlogModule(businessId: string): Promise<BlogModulePayload> {
  return commerceFetch<BlogModulePayload>(businessId, '/blog-module');
}

export async function saveBlogModuleApi(
  businessId: string,
  payload: BlogModulePayload
): Promise<BlogModulePayload> {
  return commerceFetch<BlogModulePayload>(businessId, '/blog-module', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export type CatalogModulePayload = {
  productCategories: ProductCategory[];
  priceLists: PriceList[];
};

export async function fetchCatalogModule(businessId: string): Promise<CatalogModulePayload> {
  return commerceFetch<CatalogModulePayload>(businessId, '/catalog-module');
}

export async function saveCatalogModuleApi(
  businessId: string,
  payload: CatalogModulePayload
): Promise<CatalogModulePayload> {
  return commerceFetch<CatalogModulePayload>(businessId, '/catalog-module', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
