/** Per-slice data source — flip to `api` when a menu phase is complete. */
export type MeizitoDataSource = 'mock' | 'api';

export type MeizitoDataSources = {
  teamDirectory: MeizitoDataSource;
  workspace: MeizitoDataSource;
  requests: MeizitoDataSource;
  letters: MeizitoDataSource;
  calendar: MeizitoDataSource;
  chat: MeizitoDataSource;
};

/** v10 — flip each slice to `api` when its menu phase completes. */
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';

const MOCK_SOURCES: MeizitoDataSources = {
  teamDirectory: 'mock',
  workspace: 'mock',
  requests: 'mock',
  letters: 'mock',
  calendar: 'mock',
  chat: 'mock',
};

const API_SOURCES: MeizitoDataSources = {
  teamDirectory: 'api',
  workspace: 'api',
  requests: 'api',
  letters: 'api',
  calendar: 'api',
  chat: 'api',
};

export const MEIZITO_DATA_SOURCES: MeizitoDataSources = FRONTEND_ONLY
  ? MOCK_SOURCES
  : API_SOURCES;

export function useMockUserSwitcher(): boolean {
  return Object.values(MEIZITO_DATA_SOURCES).every((s) => s === 'mock');
}
