'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  type MeizitoTabId,
  type MeizitoReportsSection,
  MEIZITO_MOBILE_NAV_TABS,
  MEIZITO_NAV_TABS,
  MEIZITO_TAB_LABELS,
  showMeizitoWorkspaceTabBar,
  isMeizitoTabId,
  isMeizitoReportsSection,
  MEIZITO_LAST_TAB_KEY,
} from '@/src/types/meizito';
import { useMeizito } from '@/src/context/MeizitoContext';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { isMeizitoTabDataReady, meizitoModulesForTab } from '@/src/lib/meizito/tabHydration';
import MeizitoWorkspaceSkeleton from './components/MeizitoWorkspaceSkeleton';
import DashboardPanel from './panels/DashboardPanel';
import BoardsPanel from './panels/BoardsPanel';
import ProjectsPanel from './panels/ProjectsPanel';
import LettersPanel from './panels/LettersPanel';
import NotesPanel from './panels/NotesPanel';
import StarredPanel from './panels/StarredPanel';
import MonitoringPanel from './panels/MonitoringPanel';
import BoardInfoPanel from './panels/BoardInfoPanel';
import CalendarPanel from './panels/CalendarPanel';
import CommsHubPanel from './panels/CommsHubPanel';
import PhoneDirectoryPanel from './panels/PhoneDirectoryPanel';
import ReportsPanel from './panels/ReportsPanel';

function normalizeTabQuery(tabParam: string | null): string | null {
  if (tabParam === 'info') return 'boardInfo';
  return tabParam;
}

/** تب میز کار وقتی `?tab=` در URL نیست — از localStorage. */
function resolveWorkspaceTab(tabParam: string | null): MeizitoTabId {
  const param = normalizeTabQuery(tabParam);
  if (isMeizitoTabId(param)) return param;
  if (typeof window !== 'undefined') {
    const last = window.localStorage.getItem(MEIZITO_LAST_TAB_KEY);
    if (last === 'chat') return 'dashboard';
    if (isMeizitoTabId(last)) return last;
  }
  return 'boards';
}

export default function MeizitoWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const sectionParam = searchParams.get('section');
  const reportsSection: MeizitoReportsSection = isMeizitoReportsSection(sectionParam)
    ? sectionParam
    : 'daily';
  const business = useBusinessOptional();
  const {
    mockUsers,
    currentUserId,
    setCurrentUserId,
    useMockUserSwitcher,
    meizitoHydration,
    dataSources,
    activeBusinessId,
    ensureMeizitoModuleLoaded,
    refreshWorkspace,
  } = useMeizito();

  const resolvedTab = resolveWorkspaceTab(tabParam);

  const [tabOverride, setTabOverride] = useState<MeizitoTabId | null>(null);

  const meizitoTab = useMemo((): MeizitoTabId => {
    if (tabOverride === null) return resolvedTab;
    const param = normalizeTabQuery(tabParam);
    if (isMeizitoTabId(param) && param !== tabOverride) return resolvedTab;
    return tabOverride;
  }, [tabOverride, resolvedTab, tabParam]);

  const businessLoading = business?.loading ?? false;
  const needsBusiness = !useMockUserSwitcher;
  const tabDataReady = isMeizitoTabDataReady(meizitoTab, meizitoHydration, dataSources);
  const showBootstrapSkeleton =
    (needsBusiness && businessLoading) ||
    (needsBusiness && !!activeBusinessId && !tabDataReady) ||
    (!needsBusiness && !tabDataReady);

  const setTab = useCallback(
    (id: MeizitoTabId, section?: MeizitoReportsSection) => {
      if (id === 'chat') {
        router.push('/dashboard/chats');
        return;
      }
      setTabOverride(id);
      window.localStorage.setItem(MEIZITO_LAST_TAB_KEY, id);
      const params = new URLSearchParams({ tab: id });
      if (id === 'reports' && section) params.set('section', section);
      router.replace(`/dashboard/tasks?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const setReportsSection = useCallback(
    (section: MeizitoReportsSection) => {
      const params = new URLSearchParams({ tab: 'reports', section });
      router.replace(`/dashboard/tasks?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (tabParam === 'chat') {
      router.replace('/dashboard/chats');
    }
  }, [tabParam, router]);

  useEffect(() => {
    for (const lazyModule of meizitoModulesForTab(meizitoTab)) {
      ensureMeizitoModuleLoaded(lazyModule);
    }
  }, [meizitoTab, ensureMeizitoModuleLoaded]);

  useEffect(() => {
    if (meizitoTab !== 'boards') return;
    if (dataSources.workspace !== 'api' || !activeBusinessId) return;
    const id = window.setInterval(() => {
      void refreshWorkspace();
    }, 25_000);
    return () => window.clearInterval(id);
  }, [meizitoTab, dataSources.workspace, activeBusinessId, refreshWorkspace]);

  const render = () => {
    switch (meizitoTab) {
      case 'dashboard':
        return <DashboardPanel onGoTab={setTab} />;
      case 'boards':
        return <BoardsPanel />;
      case 'projects':
        return <ProjectsPanel />;
      case 'letters':
        return <LettersPanel />;
      case 'notes':
        return <NotesPanel />;
      case 'reports':
        return (
          <ReportsPanel section={reportsSection} onSectionChange={setReportsSection} />
        );
      case 'calendar':
        return <CalendarPanel onGoTab={setTab} />;
      case 'comms':
        return <CommsHubPanel onGoTab={setTab} />;
      case 'phone':
        return <PhoneDirectoryPanel />;
      case 'starred':
        return <StarredPanel />;
      case 'monitoring':
        return <MonitoringPanel />;
      case 'boardInfo':
        return <BoardInfoPanel />;
      default:
        return null;
    }
  };

  const tabButtonClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
      active ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400 hover:text-gray-700'
    }`;

  const renderTabButton = (id: MeizitoTabId) => (
    <button
      key={id}
      type="button"
      data-testid={`meizito-tab-${id}`}
      onClick={() => setTab(id)}
      className={tabButtonClass(meizitoTab === id)}
    >
      {MEIZITO_TAB_LABELS[id]}
    </button>
  );

  if (needsBusiness && !businessLoading && !activeBusinessId) {
    return (
      <div className="nexa-card p-8 min-h-[320px] flex items-center justify-center">
        <p className="text-sm text-gray-500 text-center">
          برای میز کار ابتدا یک کسب‌وکار فعال انتخاب کنید.
        </p>
      </div>
    );
  }

  if (showBootstrapSkeleton) {
    return (
      <div className="space-y-6">
        {useMockUserSwitcher ? (
          <div className="flex justify-end">
            <div className="h-9 w-36 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : null}
        <MeizitoWorkspaceSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {useMockUserSwitcher ? (
        <div className="flex justify-end">
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="bg-gray-50 border border-nexa-border rounded-xl px-3 py-2 text-xs font-bold min-w-[140px]"
          >
            {mockUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showMeizitoWorkspaceTabBar(meizitoTab) && (
        <>
          <div
            className="hidden md:flex flex-nowrap gap-1 p-1.5 ps-2 pe-3 bg-gray-100 rounded-2xl meizito-tab-scroll items-center max-w-full"
            role="tablist"
            aria-label="تب‌های میز کار"
          >
            {MEIZITO_NAV_TABS.map(renderTabButton)}
          </div>

          <div
            className="flex md:hidden flex-nowrap gap-1 p-1.5 ps-2 pe-3 bg-gray-100 rounded-2xl meizito-tab-scroll items-center max-w-full scroll-smooth"
            role="tablist"
            aria-label="تب‌های میز کار"
          >
            {MEIZITO_MOBILE_NAV_TABS.map(renderTabButton)}
          </div>
        </>
      )}

      <div className="nexa-card p-6 md:p-8 min-h-[520px] min-w-0 max-w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={meizitoTab}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {render()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
