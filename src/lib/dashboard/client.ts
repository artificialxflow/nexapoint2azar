import type { DashboardSummary } from '@/src/lib/dashboard/types';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { getMockDashboardSummary } from '@/src/lib/mock/dashboard-summary';
import { ApiResponseError, parseApiJson } from '@/src/lib/http/parse-api-response';

export class DashboardApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function fetchDashboardSummary(
  businessId: string,
  businessName?: string
): Promise<DashboardSummary> {
  if (FRONTEND_ONLY) {
    void businessId;
    return getMockDashboardSummary(businessName ?? 'شرکت نمایشی');
  }

  const url = `/api/dashboard/${encodeURIComponent(businessId)}/summary`;
  const res = await fetch(url, { credentials: 'include' });

  try {
    const data = await parseApiJson<{ summary: DashboardSummary }>(res);
    return data.summary;
  } catch (e) {
    if (e instanceof ApiResponseError) {
      throw new DashboardApiError(e.code, e.message, e.status);
    }
    throw e;
  }
}
