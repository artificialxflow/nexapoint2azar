import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';

export class MeizitoApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function meizitoFetch<T>(
  businessId: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `/api/meizito/${encodeURIComponent(businessId)}${normalized}`;
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
      throw new MeizitoApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}
