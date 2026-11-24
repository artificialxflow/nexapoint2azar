import { emptyWorkspacePayloadForBusiness } from '@/src/lib/meizito/workspace/default-note-board';

export type MeizitoSliceKey = 'workspace' | 'chat' | 'calendar' | 'letters' | 'requests';

export function emptyPayloadForSlice(slice: MeizitoSliceKey, businessId: string): unknown {
  switch (slice) {
    case 'workspace':
      return emptyWorkspacePayloadForBusiness(businessId);
    case 'chat':
      return { threads: [], messages: [] };
    case 'calendar':
      return { calendars: [], events: [] };
    case 'letters':
      return { letters: [] };
    case 'requests':
      return { requests: [] };
    default:
      return {};
  }
}

export function getTeamDirectory() {
  return {
    members: [],
    allMembers: [],
  };
}
