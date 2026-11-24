import type { MeizitoDataSources } from '@/src/lib/meizito/config';
import type { MeizitoTabId } from '@/src/types/meizito';

export type MeizitoLazyModule = 'chat' | 'calendar' | 'letters' | 'requests';

export type MeizitoHydrationState = {
  workspace: boolean;
  chat: boolean;
  calendar: boolean;
  letters: boolean;
  requests: boolean;
};

export function isMeizitoTabDataReady(
  tab: MeizitoTabId,
  hydration: MeizitoHydrationState,
  sources: MeizitoDataSources
): boolean {
  if (!hydration.workspace) return false;
  if (tab === 'calendar' && sources.calendar === 'api' && !hydration.calendar) return false;
  if (tab === 'letters' && sources.letters === 'api' && !hydration.letters) return false;
  if (tab === 'comms' && sources.requests === 'api' && !hydration.requests) return false;
  return true;
}

/** Maps workspace tab to comms modules that must be loaded before showing content. */
export function meizitoModulesForTab(tab: MeizitoTabId): MeizitoLazyModule[] {
  switch (tab) {
    case 'calendar':
      return ['calendar'];
    case 'letters':
      return ['letters'];
    case 'comms':
      return ['requests'];
    case 'boards':
      return [];
    default:
      return [];
  }
}
