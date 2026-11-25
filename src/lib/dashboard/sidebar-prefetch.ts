import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { QueryClient } from '@tanstack/react-query';
import type { ViewType } from '@/src/types';
import { fetchWorkspaceSnapshot } from '@/src/lib/meizito/workspace/client';
import { meizitoWorkspaceQueryKey } from '@/src/lib/meizito/workspace/useWorkspaceQuery';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';

const CATALOG_VIEWS = new Set<string>([
  'products',
  'sales',
  'people',
  'warehouse',
  'purchasing',
  'production',
  'orders',
]);

const WORKSPACE_VIEWS = new Set<string>(['tasks', 'work-requests', 'hr', 'dashboard', 'chats']);

type PrefetchOpts = {
  router: AppRouterInstance;
  queryClient: QueryClient;
  businessId: string | null;
  view: ViewType | string;
  href?: string;
};

let catalogPrefetchDelegate: ((businessId: string, scope: 'people' | 'catalog' | 'people+catalog' | 'full') => void) | null = null;

export function registerCatalogPrefetchDelegate(
  fn: (businessId: string, scope: 'people' | 'catalog' | 'people+catalog' | 'full') => void
) {
  catalogPrefetchDelegate = fn;
}

export function prefetchSidebarTarget(opts: PrefetchOpts) {
  const path = opts.href ?? `/dashboard/${opts.view}`;
  void opts.router.prefetch(path);

  if (FRONTEND_ONLY || !opts.businessId) return;

  const view = String(opts.view);

  if (WORKSPACE_VIEWS.has(view)) {
    void opts.queryClient.prefetchQuery({
      queryKey: meizitoWorkspaceQueryKey(opts.businessId),
      queryFn: () => fetchWorkspaceSnapshot(opts.businessId!),
    });
  }

  if (catalogPrefetchDelegate) {
    if (view === 'products' || view === 'warehouse') {
      catalogPrefetchDelegate(opts.businessId, 'catalog');
    } else if (view === 'sales' || view === 'production' || view === 'purchasing') {
      catalogPrefetchDelegate(opts.businessId, 'people+catalog');
    } else if (view === 'people') {
      catalogPrefetchDelegate(opts.businessId, 'full');
    } else if (view === 'orders' || view === 'crm') {
      catalogPrefetchDelegate(opts.businessId, 'people');
    }
  }

  if (CATALOG_VIEWS.has(view)) {
    /* warm route chunk only; data via delegate above */
  }
}