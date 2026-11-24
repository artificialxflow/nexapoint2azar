'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWorkspaceSnapshot } from '@/src/lib/meizito/workspace/client';

export function meizitoWorkspaceQueryKey(businessId: string) {
  return ['meizito', businessId, 'workspace'] as const;
}

const WORKSPACE_STALE_MS = 15_000;

export function useWorkspaceSnapshotQuery(businessId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: businessId ? meizitoWorkspaceQueryKey(businessId) : ['meizito', 'workspace', 'disabled'],
    queryFn: () => fetchWorkspaceSnapshot(businessId!),
    enabled: enabled && !!businessId,
    staleTime: WORKSPACE_STALE_MS,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
}
