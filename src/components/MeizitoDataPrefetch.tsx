'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { fetchWorkspaceSnapshot } from '@/src/lib/meizito/workspace/client';
import { meizitoWorkspaceQueryKey } from '@/src/lib/meizito/workspace/useWorkspaceQuery';
import { meizitoFetch } from '@/src/lib/meizito/client';

/** Prefetch workspace + team-directory when business is known (v10 perf). */
const WORKSPACE_PREFETCH_VIEWS = new Set([
  'tasks',
  'work-requests',
  'hr',
  'dashboard',
]);

export default function MeizitoDataPrefetch() {
  const business = useBusinessOptional();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const businessId = business?.activeBusinessId ?? null;

  useEffect(() => {
    if (FRONTEND_ONLY || !businessId) return;
    const view = pathname?.match(/\/dashboard\/([^/?]+)/)?.[1] ?? '';
    const prefetchWorkspace = view === '' || WORKSPACE_PREFETCH_VIEWS.has(view);
    const skipWorkspaceSnapshot = view === 'chats';
    if (prefetchWorkspace && !skipWorkspaceSnapshot) {
      void queryClient.prefetchQuery({
        queryKey: meizitoWorkspaceQueryKey(businessId),
        queryFn: () => fetchWorkspaceSnapshot(businessId),
      });
    }
    void meizitoFetch(businessId, '/team-directory').catch(() => {});
  }, [businessId, pathname, queryClient]);

  return null;
}