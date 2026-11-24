'use client';

import { useCallback, useEffect, useState } from 'react';
import { meizitoFetch } from '@/src/lib/meizito/client';
import { fetchRequestsSnapshot } from '@/src/lib/meizito/requests/client';
import { HR_SUBTYPE_LABELS } from '@/src/lib/meizito/hr-request-types';
import type { MeizitoInternalRequest, MeizitoMockUser } from '@/src/types/meizito';
import { MEIZITO_APPROVAL_STATE_LABELS } from '@/src/types/meizito';

export type HrEmployeeRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
  performance: number;
  joinDate: string;
  managerId?: string;
  fromLive: boolean;
};

export type HrRequestRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  raw?: MeizitoInternalRequest;
};

export type HrEligibilityRuleRow = {
  id: string;
  hrSubtype: string | null;
  userMessageFa: string;
  enabled: boolean;
  conditionJson: unknown;
};

function requestRowFromMeizito(r: MeizitoInternalRequest): HrRequestRow {
  const type =
    r.hrSubtype && HR_SUBTYPE_LABELS[r.hrSubtype]
      ? HR_SUBTYPE_LABELS[r.hrSubtype]
      : r.category
        ? r.category
        : 'عمومی';
  let status = 'باز';
  if (r.approvalState) status = MEIZITO_APPROVAL_STATE_LABELS[r.approvalState];
  else if (r.status === 'closed') status = 'بسته';
  return {
    id: r.id,
    title: r.subject,
    type,
    status,
    date: r.createdAt?.slice(0, 10) || '—',
    raw: r,
  };
}

function employeeFromMember(m: MeizitoMockUser): HrEmployeeRow {
  return {
    id: m.id,
    name: m.name,
    role: m.jobTitle?.trim() || m.role,
    department: m.department?.trim() || '—',
    status: 'حاضر',
    performance: 0,
    joinDate: '—',
    managerId: m.managerId,
    fromLive: true,
  };
}

export function useHrLiveData(activeBusinessId: string | null) {
  const [employees, setEmployees] = useState<HrEmployeeRow[]>([]);
  const [requests, setRequests] = useState<HrRequestRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<MeizitoMockUser[]>([]);
  const [rules, setRules] = useState<HrEligibilityRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState('');

  const reload = useCallback(async () => {
    if (!activeBusinessId) {
      setLive(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const [directory, reqSnap, rulesRes] = await Promise.all([
        meizitoFetch<{ members: MeizitoMockUser[]; allMembers: MeizitoMockUser[] }>(
          activeBusinessId,
          '/team-directory'
        ),
        fetchRequestsSnapshot(activeBusinessId),
        fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/hr-eligibility-rules`, {
          credentials: 'include',
        }),
      ]);
      const members = directory.allMembers ?? directory.members ?? [];
      setTeamMembers(members);
      setEmployees(members.map(employeeFromMember));
      const hrReqs = reqSnap.requests.filter(
        (r) => r.requestKind === 'hr' || r.category === 'hr'
      );
      setRequests(hrReqs.map(requestRowFromMeizito));
      if (rulesRes.ok) {
        const json = (await rulesRes.json()) as { data?: { rules?: HrEligibilityRuleRow[] } };
        setRules(json.data?.rules ?? []);
      } else {
        setRules([]);
      }
      setLive(true);
    } catch {
      setLoadError('بارگذاری دادهٔ HR از میزیتو ناموفق بود.');
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { employees, requests, teamMembers, rules, loading, live, loadError, reload };
}
