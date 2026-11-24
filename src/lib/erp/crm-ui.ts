import type { CrmLead } from '@/src/types/crm';

export const SHOW_CRM_FAUX_LEAD = process.env.NEXT_PUBLIC_CRM_FAUX === 'true';

import { CrmLeadStatus } from '@prisma/client';
import { CRM_LEAD_STATUS_LABELS } from '@/src/lib/erp/flow-status';

export const LEAD_STATUS_OPTIONS = Object.values(CrmLeadStatus).map((s) => CRM_LEAD_STATUS_LABELS[s]);

export function filterCrmLeads(
  leads: CrmLead[],
  search: string,
  statusFilter: string
): CrmLead[] {
  const q = search.trim().toLowerCase();
  return leads.filter((lead) => {
    if (statusFilter && statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (!q) return true;
    const hay = `${lead.name} ${lead.source} ${lead.interest} ${lead.status}`.toLowerCase();
    return hay.includes(q);
  });
}

export function formatVisitDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
