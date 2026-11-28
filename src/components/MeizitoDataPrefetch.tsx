'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import { fetchWorkspaceSnapshot } from '@/src/lib/meizito/workspace/client';
import { meizitoWorkspaceQueryKey } from '@/src/lib/meizito/workspace/useWorkspaceQuery';
import { meizitoFetch } from '@/src/lib/meizito/client';
import { fetchChatSnapshot } from '@/src/lib/meizito/chat/client';
import { emitInAppNotification } from '@/src/lib/in-app-notifications';

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
    let knownMessageIds = new Set<string>();
    let seeded = false;
    let userName = '';
    void fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data?: { user?: { displayName?: string | null; mobilePhone?: string } } } | null) => {
        const u = json?.data?.user;
        userName = u?.displayName?.trim() || u?.mobilePhone?.trim() || '';
      })
      .catch(() => {});

    const poll = async () => {
      try {
        const snap = await fetchChatSnapshot(businessId);
        if (!seeded) {
          knownMessageIds = new Set(snap.messages.map((m) => m.id));
          seeded = true;
          return;
        }
        for (const m of snap.messages) {
          if (knownMessageIds.has(m.id)) continue;
          if (userName && m.author === userName) continue;
          emitInAppNotification({
            title: 'پیام جدید در گفتگو',
            body: `${m.author}: ${m.body.slice(0, 120)}`,
            href: '/dashboard/chats',
          });
        }
        knownMessageIds = new Set(snap.messages.map((m) => m.id));
      } catch {
        /* ignore poll errors */
      }
    };

    const interval = window.setInterval(() => void poll(), 25_000);
    void poll();
    return () => window.clearInterval(interval);
  }, [businessId]);

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