'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/src/layouts/DashboardShell';
import { dashboardViews } from '@/src/dashboard/view-map';
import type { ViewType } from '@/src/types';
import Settings from '@/src/views/Settings';

interface DashboardViewPageProps {
  params: Promise<{ view: string }>;
}

const TASKS_TAB_REDIRECTS: Record<string, string> = {
  letters: 'letters',
  calendar: 'calendar',
  phone: 'phone',
};

export default function DashboardViewPage({ params }: DashboardViewPageProps) {
  const router = useRouter();
  const resolved = use(params);

  useEffect(() => {
    const tab = TASKS_TAB_REDIRECTS[resolved.view];
    if (tab) {
      router.replace(`/dashboard/tasks?tab=${tab}`);
    }
  }, [resolved.view, router]);

  if (TASKS_TAB_REDIRECTS[resolved.view]) {
    return null;
  }

  const legacyUsers = resolved.view === 'users';
  const safeView = (
    legacyUsers
      ? 'settings'
      : resolved.view in dashboardViews
        ? resolved.view
        : 'dashboard'
  ) as ViewType;
  const ViewComponent = dashboardViews[safeView];

  return (
    <DashboardShell
      currentView={safeView}
      onViewChange={(view) => router.push(`/dashboard/${view}`)}
    >
      {legacyUsers ? <Settings initialSection="access" /> : <ViewComponent />}
    </DashboardShell>
  );
}
