export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };

export class ApiResponseError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function isJsonContentType(res: Response): boolean {
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') || ct.includes('application/problem+json');
}

export async function parseApiJson<T>(res: Response): Promise<T> {
  if (!isJsonContentType(res)) {
    const snippet = (await res.text()).slice(0, 80);
    throw new ApiResponseError(
      'INVALID_RESPONSE',
      res.ok
        ? 'پاسخ سرور JSON نیست.'
        : `خطای سرور (${res.status}). احتمالاً مسیر API وجود ندارد.`,
      res.status
    );
  }

  let body: ApiOk<T> | ApiErr | Record<string, unknown>;
  try {
    body = (await res.json()) as ApiOk<T> | ApiErr;
  } catch {
    throw new ApiResponseError('PARSE_ERROR', 'پاسخ JSON نامعتبر است.', res.status);
  }

  if (!res.ok || !('ok' in body) || !body.ok) {
    const fallback = { code: 'HTTP_ERROR', message: res.statusText || 'خطا' };
    const err =
      'error' in body &&
      body.error &&
      typeof body.error === 'object' &&
      'code' in body.error &&
      'message' in body.error
        ? (body.error as { code: string; message: string })
        : fallback;
    throw new ApiResponseError(err.code, err.message, res.status);
  }

  return (body as ApiOk<T>).data;
}
