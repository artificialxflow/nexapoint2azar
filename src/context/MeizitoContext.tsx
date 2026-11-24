'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import {
  createMockCalendarSnapshot,
  createMockChatSnapshot,
  createMockLettersSnapshot,
  createMockRequestsSnapshot,
  createMockWorkspaceSnapshot,
  MOCK_MEIZITO_TEAM,
} from '@/src/lib/meizito/mock-bootstrap';
import type {
  MeizitoApprovableEntityType,
  MeizitoBoard,
  MeizitoCalendar,
  MeizitoCalendarEvent,
  MeizitoCalendarKind,
  MeizitoCard,
  MeizitoChatMessage,
  MeizitoChatThread,
  MeizitoDailyReport,
  MeizitoFieldVisit,
  MeizitoInternalRequest,
  MeizitoLetter,
  MeizitoLetterCategory,
  MeizitoMessageType,
  MeizitoMockUser,
  MeizitoThreadType,
  MeizitoColumn,
  MeizitoNote,
  MeizitoNoteBoard,
  MeizitoProject,
  MeizitoRecurrence,
} from '@/src/types/meizito';
import {
  MEIZITO_CURRENT_USER_NAME,
  MEIZITO_ALL_CALENDARS_ID,
  MEIZITO_TASKS_CALENDAR_ID,
} from '@/src/types/meizito';
import {
  applyApprovalAction,
  applySubmitForApproval,
  listTeamDirectory,
  normalizeApprovableFields,
  resolveForwardTargets,
  type RecordApprovalPayload,
  type TeamDirectoryFilter,
} from '@/src/lib/meizito/approval';
import { eventOccursOnDate } from '@/src/lib/meizito/calendarGrid';
import {
  canReviewDailyReport,
  getReviewerRoleLabel,
  isManagerRole,
  newFeedbackId,
  normalizeDailyReport,
  normalizeInternalRequest as normalizeRequestReferrals,
  primaryAssigneeFromReferrals,
} from '@/src/lib/meizito/teamHierarchy';
import { normalizeFieldVisit } from '@/src/lib/meizito/visitHelpers';
import { getProjectPhases } from '@/src/lib/meizito/project-phases';
import { useAuthOptional } from '@/src/context/AuthContext';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import {
  MEIZITO_DATA_SOURCES,
  useMockUserSwitcher as isMockUserSwitcherEnabled,
  type MeizitoDataSources,
} from '@/src/lib/meizito/config';
import {
  ensureBusinessScopedWorkspaceSnapshot,
  defaultNoteBoardIdForBusiness,
  LEGACY_DEFAULT_NOTE_BOARD_ID,
} from '@/src/lib/meizito/workspace/default-note-board';
import { meizitoFetch } from '@/src/lib/meizito/client';
import {
  apiAddColumn,
  apiCreateBoard,
  apiCreateCard,
  apiCreateDailyReport,
  apiCreateFieldVisit,
  apiCreateNote,
  apiCreateNoteBoard,
  apiUpdateNoteBoard,
  apiCreateProject,
  apiDailyReportFeedback,
  apiDeleteBoard,
  apiDeleteCard,
  apiDeleteColumn,
  apiDeleteFieldVisit,
  apiMoveCard,
  apiUpdateBoard,
  apiUpdateCard,
  apiUpdateColumn,
  apiUpdateDailyReport,
  apiUpdateFieldVisit,
  apiUpdateNote,
  apiUpdateProject,
  apiPatchWorkspacePrefs,
} from '@/src/lib/meizito/workspace/client';
import {
  normalizeWorkspaceBoard,
  normalizeWorkspaceCard,
  normalizeWorkspaceColumn,
  type WorkspaceSnapshot,
} from '@/src/lib/meizito/workspace/serialize';
import { emitNexaEvent } from '@/src/lib/automation/event-bus';
import type { AttachmentRef } from '@/src/types/attachment';
import {
  apiCreateInternalRequest,
  apiInternalRequestApproval,
  apiReplyToInternalRequest,
  apiSubmitInternalRequest,
  apiUpdateInternalRequestStatus,
  fetchRequestsSnapshot,
} from '@/src/lib/meizito/requests/client';
import {
  apiCreateLetter,
  apiLetterApproval,
  apiReplyToLetter,
  apiSubmitLetter,
  apiUpdateLetter,
  fetchLettersSnapshot,
} from '@/src/lib/meizito/letters/client';
import type { LettersSnapshot } from '@/src/lib/meizito/letters/serialize';
import {
  apiCreateCalendar,
  apiCreateCalendarEvent,
  apiDeleteCalendarEvent,
  apiSetCalendarEventRsvp,
  apiSyncCalendarEventsFromCards,
  apiUpdateCalendar,
  apiUpdateCalendarEvent,
  fetchCalendarSnapshot,
} from '@/src/lib/meizito/calendar/client';
import {
  apiCreateChatMessage,
  apiCreateChatThread,
  apiDeleteChatMessage,
  apiUpdateChatMessage,
  apiUpdateChatThread,
  fetchChatSnapshot,
} from '@/src/lib/meizito/chat/client';
import type { CalendarSnapshot } from '@/src/lib/meizito/calendar/serialize';
import type { MeizitoHydrationState, MeizitoLazyModule } from '@/src/lib/meizito/tabHydration';
import type { ChatSnapshot } from '@/src/lib/meizito/chat/serialize';
import type { RequestsSnapshot } from '@/src/lib/meizito/requests/serialize';
import { useQueryClient } from '@tanstack/react-query';
import { fetchWorkspaceSnapshot } from '@/src/lib/meizito/workspace/client';
import { meizitoWorkspaceQueryKey, useWorkspaceSnapshotQuery } from '@/src/lib/meizito/workspace/useWorkspaceQuery';

export { MEIZITO_CURRENT_USER_NAME };

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now());
}

/** Mock bootstrap still uses legacy id; API uses per-business ids. */
const MOCK_DEFAULT_NOTE_BOARD_ID = LEGACY_DEFAULT_NOTE_BOARD_ID;
const LEGACY_MEIZITO_STORAGE_KEYS = [
  'nexa-meizito-v2',
  'nexa-meizito-v1',
  'nexa-meizito-current-user-id',
] as const;

type MockBootstrapBundle = {
  workspace: WorkspaceSnapshot;
  letters: LettersSnapshot;
  calendar: CalendarSnapshot;
  chat: ChatSnapshot;
  requests: RequestsSnapshot;
};

let mockBootstrapBundle: MockBootstrapBundle | null | undefined;

function getMockBootstrapBundle(): MockBootstrapBundle | null {
  if (!FRONTEND_ONLY) return null;
  if (mockBootstrapBundle === undefined) {
    mockBootstrapBundle = {
      workspace: createMockWorkspaceSnapshot(),
      letters: createMockLettersSnapshot(),
      calendar: createMockCalendarSnapshot(),
      chat: createMockChatSnapshot(),
      requests: createMockRequestsSnapshot(),
    };
  }
  return mockBootstrapBundle;
}

const INITIAL_MOCK = getMockBootstrapBundle();

function inferLetterCategory(labels: string[]): MeizitoLetterCategory {
  const joined = labels.join(' ').toLowerCase();
  if (/مالی|finance/i.test(joined)) return 'financial';
  if (/اداری|admin/i.test(joined)) return 'administrative';
  if (/منابع|hr/i.test(joined)) return 'hr';
  if (/عملیات|ops/i.test(joined)) return 'operations';
  return 'other';
}

function normalizeCalendar(c: MeizitoCalendar): MeizitoCalendar {
  return {
    ...c,
    sharedWith: c.sharedWith ?? [],
    ownerName: c.ownerName ?? MEIZITO_CURRENT_USER_NAME,
    visible: c.visible ?? true,
  };
}

function normalizeCalendarEvent(e: MeizitoCalendarEvent): MeizitoCalendarEvent {
  return {
    ...e,
    endDate: e.endDate || e.date,
    time: e.time || undefined,
    endTime: e.endTime || undefined,
    allDay: e.allDay ?? false,
    recurrence: e.recurrence ?? 'none',
    attendeeIds: e.attendeeIds ?? [],
    rsvp: e.rsvp ?? {},
  };
}

function normalizeMessage(m: MeizitoChatMessage): MeizitoChatMessage {
  return {
    ...m,
    type: m.type ?? 'text',
    createdAt: m.createdAt ?? new Date().toISOString(),
    attachmentNames: m.attachmentNames ?? [],
    attachmentRefs: m.attachmentRefs ?? [],
  };
}

function normalizeThread(t: MeizitoChatThread): MeizitoChatThread {
  return {
    ...t,
    threadType: t.threadType ?? 'direct',
    participantNames: t.participantNames ?? [],
    pinned: t.pinned ?? false,
    starred: t.starred ?? false,
  };
}

function normalizeProject(p: MeizitoProject): MeizitoProject {
  const memberIds = p.memberIds ?? [];
  return {
    ...p,
    memberIds,
    members: p.members,
  };
}

function normalizeNote(n: MeizitoNote, defaultBoardId: string, noteBoardIds: string[]): MeizitoNote {
  const legacy = (n as MeizitoNote & { ncAttachments?: AttachmentRef[] }).ncAttachments;
  let boardId = n.boardId ?? defaultBoardId;
  if (!noteBoardIds.includes(boardId)) boardId = defaultBoardId;
  return {
    ...n,
    boardId,
    fileAttachments: n.fileAttachments ?? legacy ?? [],
  };
}

function normalizeInternalRequest(r: MeizitoInternalRequest): MeizitoInternalRequest {
  const legacyApproved = !r.approvalState && !r.submittedAt;
  const approval = normalizeApprovableFields(
    {
      approvalState: r.approvalState,
      approvalSteps: r.approvalSteps,
      currentAssigneeId: r.currentAssigneeId,
      submittedAt: r.submittedAt,
    },
    legacyApproved
  );
  return {
    ...normalizeRequestReferrals(r),
    ...approval,
    status: r.status ?? 'open',
    createdAt: r.createdAt ?? new Date().toISOString(),
    attachments: r.attachments ?? [],
    threadId: r.threadId ?? r.id,
    priority: r.priority ?? 'medium',
  };
}

function normalizeLetter(l: MeizitoLetter): MeizitoLetter {
  const id = l.id;
  const labels = l.labels ?? [];
  const legacyApproved = !l.approvalState && !l.submittedAt;
  const approval = normalizeApprovableFields(
    {
      approvalState: l.approvalState,
      approvalSteps: l.approvalSteps,
      currentAssigneeId: l.currentAssigneeId,
      submittedAt: l.submittedAt,
    },
    legacyApproved
  );
  return {
    ...l,
    ...approval,
    labels,
    category: l.category ?? inferLetterCategory(labels),
    status: l.status ?? (l.box === 'archive' ? 'closed' : 'open'),
    referredTo: l.referredTo ?? [],
    referredFrom: l.referredFrom ?? '',
    threadId: l.threadId ?? id,
    attachments: l.attachments ?? [],
    createdAt: l.createdAt ?? new Date().toISOString(),
  };
}

export interface MeizitoContextValue {
  boards: MeizitoBoard[];
  columns: MeizitoColumn[];
  cards: MeizitoCard[];
  projects: MeizitoProject[];
  threads: MeizitoChatThread[];
  messages: MeizitoChatMessage[];
  letters: MeizitoLetter[];
  notes: MeizitoNote[];
  noteBoards: MeizitoNoteBoard[];
  activeNoteBoardId: string;
  setActiveNoteBoardId: (id: string) => void;
  activeBoardId: string;
  activeThreadId: string;
  setActiveBoardId: (id: string) => void;
  setActiveThreadId: (id: string) => void;
  updateBoard: (
    id: string,
    patch: Partial<Pick<MeizitoBoard, 'name' | 'memberNames' | 'labelPalette'>>
  ) => void;
  addBoardLabel: (boardId: string, name: string, color?: string) => void;
  deleteBoard: (boardId: string) => void;
  addBoard: (name: string) => Promise<void>;
  addColumn: (boardId: string, title: string) => Promise<string | void>;
  updateColumn: (columnId: string, patch: Partial<Pick<MeizitoColumn, 'title' | 'order'>>) => void;
  deleteColumn: (columnId: string) => void;
  addCard: (
    boardId: string,
    columnId: string,
    title: string,
    extra?: Partial<MeizitoCard>
  ) => Promise<string | void>;
  moveCard: (cardId: string, toColumnId: string, index: number) => void;
  updateCard: (id: string, patch: Partial<MeizitoCard>) => void;
  deleteCard: (cardId: string) => void;
  copyCardForAssignees: (cardId: string, assignees: string[]) => void;
  toggleCardStar: (id: string) => void;
  addProject: (name: string, memberIds: string[], boardId?: string) => void;
  updateProject: (id: string, patch: Partial<MeizitoProject>) => void;
  addMessage: (
    threadId: string,
    author: string,
    body: string,
    options?: {
      type?: MeizitoMessageType;
      attachmentNames?: string[];
      attachmentRefs?: AttachmentRef[];
      voiceDurationSec?: number;
      imageDataUrl?: string;
    }
  ) => void;
  addThread: (title: string, threadType: MeizitoThreadType, participantNames?: string[]) => string;
  createCardFromText: (boardId: string, columnId: string, title: string, assignee: string, dueDate: string, recurrence: MeizitoRecurrence) => void;
  refreshWorkspace: () => Promise<void>;
  toggleThreadStar: (id: string) => void;
  toggleThreadPin: (id: string) => void;
  updateChatThread: (
    threadId: string,
    patch: Partial<Pick<MeizitoChatThread, 'title' | 'participantNames'>>
  ) => void;
  refreshChat: () => Promise<void>;
  addLetter: (letter: Omit<MeizitoLetter, 'id' | 'threadId'> & { threadId?: string }) => Promise<string>;
  replyToLetter: (
    sourceId: string,
    letter: Omit<MeizitoLetter, 'id' | 'replyToLetterId' | 'threadId'>
  ) => Promise<string>;
  getLetterThread: (threadId: string) => MeizitoLetter[];
  updateLetterBox: (id: string, box: MeizitoLetter['box']) => void;
  closeLetter: (id: string) => void;
  reopenLetter: (id: string) => void;
  setLetterCategory: (id: string, category: MeizitoLetterCategory) => void;
  dailyReports: MeizitoDailyReport[];
  fieldVisits: MeizitoFieldVisit[];
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  sessionUserId: string | null;
  activeBusinessId: string | null;
  dataSources: MeizitoDataSources;
  /** sliceهای لودشده از API/mock — برای gate اسکلتون میز کار */
  meizitoHydration: MeizitoHydrationState;
  ensureMeizitoModuleLoaded: (module: MeizitoLazyModule) => void;
  useMockUserSwitcher: boolean;
  isCurrentUserManager: boolean;
  canReviewDailyReport: (report: MeizitoDailyReport) => boolean;
  mockUsers: MeizitoMockUser[];
  addDailyReport: (
    report: Omit<MeizitoDailyReport, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  updateDailyReport: (
    id: string,
    patch: Partial<Pick<MeizitoDailyReport, 'title' | 'body' | 'status' | 'dayChecklist'>>
  ) => void;
  submitDailyReport: (id: string) => void;
  addFeedbackToReport: (id: string, feedback: string) => void;
  approveDailyReport: (id: string) => void;
  getDailyReportsForDate: (dateKey: string) => MeizitoDailyReport[];
  getMyDailyReportForDate: (dateKey: string) => MeizitoDailyReport | undefined;
  getTeamMembersWithoutReportForDate: (dateKey: string) => MeizitoMockUser[];
  addFieldVisit: (visit: Omit<MeizitoFieldVisit, 'id' | 'createdAt'>) => void;
  updateFieldVisit: (id: string, patch: Partial<Omit<MeizitoFieldVisit, 'id' | 'createdAt'>>) => void;
  deleteFieldVisit: (id: string) => void;
  getFieldVisitsForDate: (dateKey: string) => MeizitoFieldVisit[];
  fieldVisitsAll: MeizitoFieldVisit[];
  internalRequests: MeizitoInternalRequest[];
  addInternalRequest: (
    req: Omit<MeizitoInternalRequest, 'id' | 'createdAt' | 'status'> & { status?: MeizitoInternalRequest['status'] },
    options?: { submitForApproval?: boolean }
  ) => Promise<string>;
  replyToInternalRequest: (
    sourceId: string,
    req: Omit<MeizitoInternalRequest, 'id' | 'replyToRequestId' | 'threadId' | 'createdAt' | 'status'> & {
      status?: MeizitoInternalRequest['status'];
    },
    options?: { submitForApproval?: boolean }
  ) => Promise<string>;
  getRequestThread: (threadId: string) => MeizitoInternalRequest[];
  closeInternalRequest: (id: string) => void;
  reopenInternalRequest: (id: string) => void;
  submitForApproval: (entityType: MeizitoApprovableEntityType, id: string) => void;
  recordApprovalAction: (
    entityType: MeizitoApprovableEntityType,
    id: string,
    payload: Omit<RecordApprovalPayload, 'actorId' | 'actorName'>
  ) => void;
  getPendingApprovalCounts: (userId: string) => { letters: number; requests: number };
  getMockUserById: (id: string) => MeizitoMockUser | undefined;
  listTeamDirectory: (filter?: TeamDirectoryFilter, search?: string) => MeizitoMockUser[];
  updateChatMessage: (messageId: string, patch: Partial<Pick<MeizitoChatMessage, 'body' | 'editedAt'>>) => void;
  deleteChatMessage: (messageId: string) => void;
  setEventRsvp: (eventId: string, userId: string, status: 'accepted' | 'declined' | 'pending') => void;
  getThreadMessages: (threadId: string) => MeizitoChatMessage[];
  addNoteBoard: (name: string) => void;
  updateNoteBoard: (
    id: string,
    patch: Partial<Pick<MeizitoNoteBoard, 'name' | 'color' | 'order' | 'memberUserIds'>>
  ) => void;
  addNote: (
    title: string,
    content: string,
    color: string,
    boardId?: string,
    fileAttachments?: AttachmentRef[],
    labelIds?: string[]
  ) => Promise<void>;
  updateNote: (id: string, patch: Partial<MeizitoNote>) => void;
  toggleNoteStar: (id: string) => void;
  archiveNote: (id: string, archived?: boolean) => void;
  getThreadMessagesForDate: (threadId: string, dateKey: string) => MeizitoChatMessage[];
  currentUserName: string;
  getCardsDueOn: (dateKey: string, boardId?: string) => MeizitoCard[];
  getOverdueCards: (todayKey: string, boardId?: string) => MeizitoCard[];
  getCardsAssignedToOthers: (boardId?: string) => MeizitoCard[];
  searchCards: (boardId: string, query: string, labelId?: string) => MeizitoCard[];
  calendars: MeizitoCalendar[];
  calendarEvents: MeizitoCalendarEvent[];
  activeCalendarId: string;
  setActiveCalendarId: (id: string) => void;
  addCalendar: (name: string, kind: MeizitoCalendarKind, color: string) => void;
  updateCalendar: (id: string, patch: Partial<MeizitoCalendar>) => void;
  addCalendarEvent: (event: Omit<MeizitoCalendarEvent, 'id'>) => string;
  updateCalendarEvent: (id: string, patch: Partial<MeizitoCalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  getCalendarEventsForDate: (calendarId: string, dateKey: string) => MeizitoCalendarEvent[];
  syncEventsFromCards: () => void;
  chatSendError: string;
  clearChatSendError: () => void;
  chatSendingThreadId: string | null;
}

const MeizitoContext = createContext<MeizitoContextValue | null>(null);

export function MeizitoProvider({
  children,
  workspaceSnapshotEnabled = true,
}: {
  children: React.ReactNode;
  /** v10: chats page defers heavy workspace snapshot until needed (e.g. task-from-message). */
  workspaceSnapshotEnabled?: boolean;
}) {
  const auth = useAuthOptional();
  const business = useBusinessOptional();
  const activeBusinessId = business?.activeBusinessId ?? null;
  const sessionUserId = auth?.user?.id ?? null;
  const dataSources = MEIZITO_DATA_SOURCES;
  const useMockUserSwitcher = isMockUserSwitcherEnabled();
  const [teamMembers, setTeamMembers] = useState<MeizitoMockUser[]>(() =>
    FRONTEND_ONLY ? MOCK_MEIZITO_TEAM : []
  );

  const [meizitoHydration, setMeizitoHydration] = useState<MeizitoHydrationState>(() => ({
    workspace: !!INITIAL_MOCK,
    chat: !!INITIAL_MOCK,
    calendar: !!INITIAL_MOCK,
    letters: !!INITIAL_MOCK,
    requests: !!INITIAL_MOCK,
  }));

  const queryClient = useQueryClient();
  const lazyModulesLoadedRef = useRef(new Set<MeizitoLazyModule>());

  const [boards, setBoards] = useState<MeizitoBoard[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.workspace.boards.map(normalizeWorkspaceBoard) : []
  );
  const [columns, setColumns] = useState<MeizitoColumn[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.workspace.columns.map(normalizeWorkspaceColumn) : []
  );
  const [cards, setCards] = useState<MeizitoCard[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.workspace.cards.map(normalizeWorkspaceCard) : []
  );
  const [projects, setProjects] = useState<MeizitoProject[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.workspace.projects.map(normalizeProject) : []
  );
  const [threads, setThreads] = useState<MeizitoChatThread[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.chat.threads.map(normalizeThread) : []
  );
  const [messages, setMessages] = useState<MeizitoChatMessage[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.chat.messages.map(normalizeMessage) : []
  );
  const [letters, setLetters] = useState<MeizitoLetter[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.letters.letters.map(normalizeLetter) : []
  );
  const [dailyReports, setDailyReports] = useState<MeizitoDailyReport[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.workspace.dailyReports.map(normalizeDailyReport) : []
  );
  const [fieldVisits, setFieldVisits] = useState<MeizitoFieldVisit[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.workspace.fieldVisits.map(normalizeFieldVisit) : []
  );
  const [internalRequests, setInternalRequests] = useState<MeizitoInternalRequest[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.requests.requests.map(normalizeInternalRequest) : []
  );
  const [currentUserId, setCurrentUserIdState] = useState('');
  const [chatSendError, setChatSendError] = useState('');
  const [chatSendingThreadId, setChatSendingThreadId] = useState<string | null>(null);
  const [noteBoards, setNoteBoards] = useState<MeizitoNoteBoard[]>(
    () => INITIAL_MOCK?.workspace.noteBoards ?? []
  );
  const [notes, setNotes] = useState<MeizitoNote[]>(() => {
    if (!INITIAL_MOCK) return [];
    const defaultNoteBoardId =
      INITIAL_MOCK.workspace.noteBoards[0]?.id ?? MOCK_DEFAULT_NOTE_BOARD_ID;
    const noteBoardIds = INITIAL_MOCK.workspace.noteBoards.map((b) => b.id);
    return INITIAL_MOCK.workspace.notes.map((n) =>
      normalizeNote(n, defaultNoteBoardId, noteBoardIds)
    );
  });
  const [activeNoteBoardId, setActiveNoteBoardIdState] = useState(() =>
    INITIAL_MOCK?.workspace.activeNoteBoardId ??
      INITIAL_MOCK?.workspace.noteBoards[0]?.id ??
      MOCK_DEFAULT_NOTE_BOARD_ID
  );
  const [calendars, setCalendars] = useState<MeizitoCalendar[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.calendar.calendars.map(normalizeCalendar) : []
  );
  const [calendarEvents, setCalendarEvents] = useState<MeizitoCalendarEvent[]>(() =>
    INITIAL_MOCK ? INITIAL_MOCK.calendar.events.map(normalizeCalendarEvent) : []
  );
  const [activeCalendarId, setActiveCalendarIdState] = useState(
    () => INITIAL_MOCK?.calendar.calendars[0]?.id ?? ''
  );
  const [activeBoardId, setActiveBoardIdState] = useState(() => {
    if (!INITIAL_MOCK) return '';
    const id = INITIAL_MOCK.workspace.activeBoardId;
    if (id && INITIAL_MOCK.workspace.boards.some((b) => b.id === id)) return id;
    return INITIAL_MOCK.workspace.boards[0]?.id ?? '';
  });
  const [activeThreadId, setActiveThreadIdState] = useState(
    () => INITIAL_MOCK?.chat.threads[0]?.id ?? ''
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const key of LEGACY_MEIZITO_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  }, []);

  const directoryUsers = useMemo(() => teamMembers, [teamMembers]);

  const refreshTeamDirectory = useCallback(async () => {
    if (dataSources.teamDirectory !== 'api' || !activeBusinessId) {
      setTeamMembers(FRONTEND_ONLY ? MOCK_MEIZITO_TEAM : []);
      return;
    }
    try {
      const data = await meizitoFetch<{ members: MeizitoMockUser[]; allMembers: MeizitoMockUser[] }>(
        activeBusinessId,
        '/team-directory'
      );
      const members = data.allMembers ?? data.members ?? [];
      setTeamMembers(members);
    } catch {
      setTeamMembers([]);
    }
  }, [activeBusinessId, dataSources.teamDirectory]);

  useEffect(() => {
    void refreshTeamDirectory();
  }, [refreshTeamDirectory]);

  const applyWorkspaceSnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    if (activeBusinessId) {
      ensureBusinessScopedWorkspaceSnapshot(snapshot, activeBusinessId);
    }
    setBoards(snapshot.boards.map(normalizeWorkspaceBoard));
    setColumns(snapshot.columns.map(normalizeWorkspaceColumn));
    setCards(snapshot.cards.map(normalizeWorkspaceCard));
    setProjects(snapshot.projects.map(normalizeProject));
    setNoteBoards(snapshot.noteBoards);
    const defaultNoteBoardId =
      snapshot.noteBoards[0]?.id ??
      (activeBusinessId
        ? defaultNoteBoardIdForBusiness(activeBusinessId)
        : MOCK_DEFAULT_NOTE_BOARD_ID);
    const noteBoardIds = snapshot.noteBoards.map((b) => b.id);
    setNotes(snapshot.notes.map((n) => normalizeNote(n, defaultNoteBoardId, noteBoardIds)));
    setDailyReports(snapshot.dailyReports.map(normalizeDailyReport));
    setFieldVisits(snapshot.fieldVisits.map(normalizeFieldVisit));
    setActiveBoardIdState((prev) => {
      if (prev && snapshot.boards.some((b) => b.id === prev)) return prev;
      if (
        snapshot.activeBoardId &&
        snapshot.boards.some((b) => b.id === snapshot.activeBoardId)
      ) {
        return snapshot.activeBoardId;
      }
      return snapshot.boards[0]?.id ?? '';
    });
    setActiveNoteBoardIdState((prev) => {
      if (prev && snapshot.noteBoards.some((b) => b.id === prev)) return prev;
      if (
        snapshot.activeNoteBoardId &&
        snapshot.noteBoards.some((b) => b.id === snapshot.activeNoteBoardId)
      ) {
        return snapshot.activeNoteBoardId;
      }
      return (
        snapshot.noteBoards[0]?.id ??
        (activeBusinessId
          ? defaultNoteBoardIdForBusiness(activeBusinessId)
          : MOCK_DEFAULT_NOTE_BOARD_ID)
      );
    });
  }, [activeBusinessId]);

  const refreshWorkspace = useCallback(async () => {
    if (dataSources.workspace !== 'api' || !activeBusinessId) return;
    const snapshot = await queryClient.fetchQuery({
      queryKey: meizitoWorkspaceQueryKey(activeBusinessId),
      queryFn: () => fetchWorkspaceSnapshot(activeBusinessId),
    });
    applyWorkspaceSnapshot(snapshot);
    setMeizitoHydration((prev) => ({ ...prev, workspace: true }));
  }, [activeBusinessId, applyWorkspaceSnapshot, dataSources.workspace, queryClient]);

  const workspaceQuery = useWorkspaceSnapshotQuery(
    activeBusinessId,
    dataSources.workspace === 'api' && workspaceSnapshotEnabled
  );

  useEffect(() => {
    if (dataSources.workspace !== 'api') return;
    if (!activeBusinessId) {
      setMeizitoHydration((prev) => ({ ...prev, workspace: false }));
      return;
    }
    if (workspaceQuery.data) {
      applyWorkspaceSnapshot(workspaceQuery.data);
      setMeizitoHydration((prev) => ({ ...prev, workspace: true }));
    } else if (workspaceQuery.isFetching && !workspaceQuery.isPlaceholderData) {
      setMeizitoHydration((prev) => ({ ...prev, workspace: false }));
    }
  }, [
    activeBusinessId,
    applyWorkspaceSnapshot,
    dataSources.workspace,
    workspaceQuery.data,
    workspaceQuery.isFetching,
  ]);

  useEffect(() => {
    lazyModulesLoadedRef.current.clear();
    if (!activeBusinessId) return;
    setMeizitoHydration((prev) => ({
      ...prev,
      chat: false,
      calendar: false,
      letters: false,
      requests: false,
    }));
  }, [activeBusinessId]);

  const useWorkspaceApi = dataSources.workspace === 'api' && !!activeBusinessId;
  const useRequestsApi = dataSources.requests === 'api' && !!activeBusinessId;
  const useLettersApi = dataSources.letters === 'api' && !!activeBusinessId;
  const useCalendarApi = dataSources.calendar === 'api' && !!activeBusinessId;
  const useChatApi = dataSources.chat === 'api' && !!activeBusinessId;

  const applyChatSnapshot = useCallback((snapshot: ChatSnapshot) => {
    setThreads(snapshot.threads.map(normalizeThread));
    setMessages(snapshot.messages.map(normalizeMessage));
    setActiveThreadIdState((prev) =>
      snapshot.threads.some((t) => t.id === prev)
        ? prev
        : (snapshot.threads[0]?.id ?? '')
    );
  }, []);

  const refreshChat = useCallback(async () => {
    if (dataSources.chat !== 'api' || !activeBusinessId) return;
    setMeizitoHydration((prev) => ({ ...prev, chat: false }));
    try {
      const snapshot = await fetchChatSnapshot(activeBusinessId);
      applyChatSnapshot(snapshot);
    } catch {
      /* keep last snapshot */
    } finally {
      setMeizitoHydration((prev) => ({ ...prev, chat: true }));
    }
  }, [activeBusinessId, applyChatSnapshot, dataSources.chat]);

  const applyCalendarSnapshot = useCallback((snapshot: CalendarSnapshot) => {
    setCalendars(snapshot.calendars.map(normalizeCalendar));
    setCalendarEvents(snapshot.events.map(normalizeCalendarEvent));
    setActiveCalendarIdState((prev) =>
      snapshot.calendars.some((c) => c.id === prev)
        ? prev
        : (snapshot.calendars[0]?.id ?? '')
    );
  }, []);

  const refreshCalendar = useCallback(async () => {
    if (dataSources.calendar !== 'api' || !activeBusinessId) return;
    setMeizitoHydration((prev) => ({ ...prev, calendar: false }));
    try {
      const snapshot = await fetchCalendarSnapshot(activeBusinessId);
      applyCalendarSnapshot(snapshot);
    } catch {
      /* keep last snapshot */
    } finally {
      setMeizitoHydration((prev) => ({ ...prev, calendar: true }));
    }
  }, [activeBusinessId, applyCalendarSnapshot, dataSources.calendar]);

  const applyLettersSnapshot = useCallback((snapshot: LettersSnapshot) => {
    setLetters(snapshot.letters.map(normalizeLetter));
  }, []);

  const refreshLetters = useCallback(async () => {
    if (dataSources.letters !== 'api' || !activeBusinessId) return;
    setMeizitoHydration((prev) => ({ ...prev, letters: false }));
    try {
      const snapshot = await fetchLettersSnapshot(activeBusinessId);
      applyLettersSnapshot(snapshot);
    } catch {
      /* keep last snapshot — avoids flicker to empty inbox */
    } finally {
      setMeizitoHydration((prev) => ({ ...prev, letters: true }));
    }
  }, [activeBusinessId, applyLettersSnapshot, dataSources.letters]);

  const applyRequestsSnapshot = useCallback((snapshot: RequestsSnapshot) => {
    setInternalRequests(snapshot.requests.map(normalizeInternalRequest));
  }, []);

  const refreshRequests = useCallback(async () => {
    if (dataSources.requests !== 'api' || !activeBusinessId) return;
    setMeizitoHydration((prev) => ({ ...prev, requests: false }));
    try {
      const snapshot = await fetchRequestsSnapshot(activeBusinessId);
      applyRequestsSnapshot(snapshot);
    } catch {
      /* keep last snapshot */
    } finally {
      setMeizitoHydration((prev) => ({ ...prev, requests: true }));
    }
  }, [activeBusinessId, applyRequestsSnapshot, dataSources.requests]);

  const ensureMeizitoModuleLoaded = useCallback(
    (module: MeizitoLazyModule) => {
      if (lazyModulesLoadedRef.current.has(module)) return;
      lazyModulesLoadedRef.current.add(module);
      const sourceKey =
        module === 'chat'
          ? 'chat'
          : module === 'calendar'
            ? 'calendar'
            : module === 'letters'
              ? 'letters'
              : 'requests';
      if (dataSources[sourceKey] !== 'api') {
        setMeizitoHydration((prev) => ({ ...prev, [module]: true }));
        return;
      }
      switch (module) {
        case 'chat':
          void refreshChat();
          break;
        case 'calendar':
          void refreshCalendar();
          break;
        case 'letters':
          void refreshLetters();
          break;
        case 'requests':
          void refreshRequests();
          break;
        default:
          break;
      }
    },
    [dataSources, refreshCalendar, refreshChat, refreshLetters, refreshRequests]
  );

  const mockBootstrappedRef = useRef(!!INITIAL_MOCK);
  useEffect(() => {
    if (!FRONTEND_ONLY || !useMockUserSwitcher || mockBootstrappedRef.current) return;
    mockBootstrappedRef.current = true;
    setTeamMembers(MOCK_MEIZITO_TEAM);
    applyWorkspaceSnapshot(createMockWorkspaceSnapshot());
    applyLettersSnapshot(createMockLettersSnapshot());
    applyChatSnapshot(createMockChatSnapshot());
    applyCalendarSnapshot(createMockCalendarSnapshot());
    applyRequestsSnapshot(createMockRequestsSnapshot());
    setMeizitoHydration({
      workspace: true,
      chat: true,
      calendar: true,
      letters: true,
      requests: true,
    });
    setCurrentUserIdState(sessionUserId ?? MOCK_MEIZITO_TEAM[0]?.id ?? 'user-demo');
  }, [
    useMockUserSwitcher,
    sessionUserId,
    applyWorkspaceSnapshot,
    applyLettersSnapshot,
    applyChatSnapshot,
    applyCalendarSnapshot,
    applyRequestsSnapshot,
  ]);

  useEffect(() => {
    if (sessionUserId) setCurrentUserIdState(sessionUserId);
  }, [sessionUserId]);

  const setActiveBoardId = useCallback((id: string) => setActiveBoardIdState(id), []);
  const setActiveThreadId = useCallback((id: string) => setActiveThreadIdState(id), []);
  const clearChatSendError = useCallback(() => setChatSendError(''), []);

  const setActiveNoteBoardId = useCallback(
    (id: string) => {
      setActiveNoteBoardIdState(id);
      if (useWorkspaceApi && activeBusinessId) {
        void apiPatchWorkspacePrefs(activeBusinessId, { activeNoteBoardId: id }).catch(() => {});
      }
    },
    [useWorkspaceApi, activeBusinessId]
  );
  const setActiveCalendarId = useCallback((id: string) => setActiveCalendarIdState(id), []);

  const updateBoard = useCallback(
    (id: string, patch: Partial<Pick<MeizitoBoard, 'name' | 'memberNames' | 'labelPalette'>>) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateBoard(activeBusinessId, id, patch).then(() => refreshWorkspace());
        return;
      }
      setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addBoardLabel = useCallback(
    (boardId: string, name: string, color = '#6366f1') => {
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;
      const label = { id: newId(), name: name.trim() || 'برچسب', color };
      const labelPalette = [...(board.labelPalette ?? []), label];
      updateBoard(boardId, { labelPalette });
    },
    [boards, updateBoard]
  );

  const addBoard = useCallback(
    async (name: string) => {
      const trimmed = name.replace(/^\s+|\s+$/g, '') || 'میز جدید';
      if (useWorkspaceApi && activeBusinessId) {
        const { board, columns: createdColumns } = await apiCreateBoard(activeBusinessId, trimmed);
        setBoards((prev) => (prev.some((b) => b.id === board.id) ? prev : [...prev, board]));
        if (createdColumns?.length) {
          setColumns((prev) => {
            const ids = new Set(prev.map((c) => c.id));
            const extra = createdColumns.filter((c) => !ids.has(c.id));
            return extra.length ? [...prev, ...extra] : prev;
          });
        } else {
          await refreshWorkspace();
        }
        setActiveBoardIdState(board.id);
        return;
      }
      const id = newId();
      const c1 = newId();
      const c2 = newId();
      const c3 = newId();
      const nb: MeizitoBoard = {
        id,
        name: trimmed,
        memberNames: [],
        columnIds: [c1, c2, c3],
        labelPalette: [{ id: newId(), name: 'برچسب', color: '#94a3b8' }],
      };
      const newCols: MeizitoColumn[] = [
        { id: c1, boardId: id, title: 'برای انجام', order: 0, cardIds: [] },
        { id: c2, boardId: id, title: 'در حال انجام', order: 1, cardIds: [] },
        { id: c3, boardId: id, title: 'انجام شده', order: 2, cardIds: [] },
      ];
      setBoards((prev) => [...prev, nb]);
      setColumns((prev) => [...prev, ...newCols]);
      setActiveBoardIdState(id);
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addColumn = useCallback(
    async (boardId: string, title: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        const { column } = await apiAddColumn(activeBusinessId, boardId, title);
        await refreshWorkspace();
        return column.id;
      }
      const id = newId();
      const board = boards.find((b) => b.id === boardId);
      const order = board ? board.columnIds.length : 0;
      setColumns((prev) => [...prev, { id, boardId, title: title.trim() || 'ستون', order, cardIds: [] }]);
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, columnIds: [...b.columnIds, id] } : b))
      );
      return id;
    },
    [boards, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addCard = useCallback(
    async (boardId: string, columnId: string, title: string, extra?: Partial<MeizitoCard>) => {
      const displayTitle = title.replace(/^\s+|\s+$/g, '') || 'وظیفه بدون عنوان';
      if (useWorkspaceApi && activeBusinessId) {
        const { card } = await apiCreateCard(activeBusinessId, {
          boardId,
          columnId,
          title: displayTitle,
          description: extra?.description,
          assignee: extra?.assignee,
          assigneeUserId: extra?.assigneeUserId,
          dueDate: extra?.dueDate,
          dueTime: extra?.dueTime,
          endDueDate: extra?.endDueDate,
          recurrence: extra?.recurrence,
          category: extra?.category,
          labelIds: extra?.labelIds,
          calendarId: extra?.calendarId,
          addToCalendar: extra?.addToCalendar,
          reminderMinutes: extra?.reminderMinutes,
          checklist: extra?.checklist,
          attachments: extra?.attachments,
          sourceChatMessageId: extra?.sourceChatMessageId,
          sourceChatThreadId: extra?.sourceChatThreadId,
        });
        await refreshWorkspace();
        emitNexaEvent({
          type: 'meizito.card.created',
          businessId: activeBusinessId,
          title: card.title,
          payload: { cardTitle: card.title, boardId },
        });
        return card.id;
      }
      const id = newId();
      const card: MeizitoCard = normalizeWorkspaceCard({
        id,
        boardId,
        columnId,
        description: '',
        labelIds: [],
        category: '',
        assignee: '',
        checklist: [],
        attachments: [],
        dueDate: '',
        dueTime: '',
        recurrence: 'none',
        starred: false,
        ...extra,
        title: displayTitle,
      });
      setCards((prev) => [...prev, card]);
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, cardIds: [...c.cardIds, id] } : c))
      );
      emitNexaEvent({
        type: 'meizito.card.created',
        businessId: activeBusinessId,
        title: card.title,
        payload: { cardTitle: card.title, boardId },
      });
      return id;
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const moveCard = useCallback(
    (cardId: string, toColumnId: string, index: number) => {
      const cardTitle = cards.find((c) => c.id === cardId)?.title;
      const prevCards = cards;
      const prevColumns = columns;
      if (useWorkspaceApi && activeBusinessId) {
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, columnId: toColumnId } : c)));
        setColumns((prev) => {
          const stripped = prev.map((col) => ({
            ...col,
            cardIds: (col.cardIds ?? []).filter((id) => id !== cardId),
          }));
          return stripped.map((col) => {
            if (col.id !== toColumnId) return col;
            const ids = [...(col.cardIds ?? [])];
            const i = Math.max(0, Math.min(index, ids.length));
            ids.splice(i, 0, cardId);
            return { ...col, cardIds: ids };
          });
        });
        void apiMoveCard(activeBusinessId, cardId, toColumnId)
          .then(() => {
            emitNexaEvent({
              type: 'meizito.card.moved',
              businessId: activeBusinessId,
              title: cardTitle ?? 'کارت',
              payload: { cardTitle, toColumnId },
            });
            void queryClient.invalidateQueries({
              queryKey: meizitoWorkspaceQueryKey(activeBusinessId),
            });
          })
          .catch(() => {
            setCards(prevCards);
            setColumns(prevColumns);
          });
        return;
      }
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, columnId: toColumnId } : c)));
      setColumns((prev) => {
        const stripped = prev.map((col) => ({
          ...col,
          cardIds: col.cardIds.filter((id) => id !== cardId),
        }));
        return stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          const ids = [...col.cardIds];
          const i = Math.max(0, Math.min(index, ids.length));
          ids.splice(i, 0, cardId);
          return { ...col, cardIds: ids };
        });
      });
      emitNexaEvent({
        type: 'meizito.card.moved',
        businessId: activeBusinessId,
        title: cardTitle ?? 'کارت',
        payload: { cardTitle, toColumnId },
      });
    },
    [cards, columns, useWorkspaceApi, activeBusinessId, queryClient]
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<MeizitoCard>) => {
      if (useWorkspaceApi && activeBusinessId) {
        setCards((prev) =>
          prev.map((c) => (c.id === id ? normalizeWorkspaceCard({ ...c, ...patch }) : c))
        );
        void (async () => {
          try {
            await apiUpdateCard(activeBusinessId, id, patch);
            await refreshWorkspace();
          } catch {
            await refreshWorkspace();
          }
        })();
        return;
      }
      setCards((prev) =>
        prev.map((c) => (c.id === id ? normalizeWorkspaceCard({ ...c, ...patch }) : c))
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const copyCardForAssignees = useCallback(
    (cardId: string, assignees: string[]) => {
      const src = cards.find((c) => c.id === cardId);
      if (!src || assignees.length === 0) return;
      const col =
        columns.find((c) => c.boardId === src.boardId && c.order === 0) ||
        columns.find((c) => c.id === src.columnId);
      if (!col) return;
      if (useWorkspaceApi && activeBusinessId) {
        void (async () => {
          for (const assignee of assignees) {
            await apiCreateCard(activeBusinessId, {
              boardId: src.boardId,
              columnId: col.id,
              title: src.title,
              description: src.description,
              assignee: assignee.trim(),
              dueDate: src.dueDate,
              dueTime: src.dueTime,
              recurrence: src.recurrence,
              category: src.category,
              labelIds: src.labelIds,
            });
          }
          await refreshWorkspace();
        })();
        return;
      }
      const copies: MeizitoCard[] = assignees.map((assignee) => ({
        ...src,
        id: newId(),
        columnId: col.id,
        assignee: assignee.trim(),
        checklist: src.checklist.map((x) => ({ ...x, id: newId() })),
        attachments: src.attachments.map((a) => ({ ...a, id: newId() })),
      }));
      setCards((prev) => [...prev, ...copies]);
      setColumns((prev) =>
        prev.map((c) =>
          c.id === col.id ? { ...c, cardIds: [...copies.map((x) => x.id), ...c.cardIds] } : c
        )
      );
    },
    [cards, columns, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const toggleCardStar = useCallback(
    (id: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        const card = cards.find((c) => c.id === id);
        if (!card) return;
        void apiUpdateCard(activeBusinessId, id, { starred: !card.starred }).then(() =>
          refreshWorkspace()
        );
        return;
      }
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
    },
    [cards, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiDeleteCard(activeBusinessId, cardId).then(() => refreshWorkspace());
        return;
      }
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setColumns((prev) =>
        prev.map((c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== cardId) }))
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const updateColumn = useCallback(
    (columnId: string, patch: Partial<Pick<MeizitoColumn, 'title' | 'order'>>) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateColumn(activeBusinessId, columnId, patch).then(() => refreshWorkspace());
        return;
      }
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, ...patch } : c))
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const deleteColumn = useCallback(
    (columnId: string) => {
      const col = columns.find((c) => c.id === columnId);
      if (!col) return;
      if (useWorkspaceApi && activeBusinessId) {
        void apiDeleteColumn(activeBusinessId, columnId).then(() => refreshWorkspace());
        return;
      }
      const ids = new Set(col.cardIds);
      setCards((prev) => prev.filter((c) => !ids.has(c.id)));
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setBoards((prev) =>
        prev.map((b) =>
          b.id === col.boardId
            ? { ...b, columnIds: b.columnIds.filter((id) => id !== columnId) }
            : b
        )
      );
    },
    [columns, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const deleteBoard = useCallback(
    (boardId: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiDeleteBoard(activeBusinessId, boardId).then(() => refreshWorkspace());
        return;
      }
      const colIds = columns.filter((c) => c.boardId === boardId).map((c) => c.id);
      const colIdSet = new Set(colIds);
      setCards((prev) => prev.filter((c) => c.boardId !== boardId));
      setColumns((prev) => prev.filter((c) => !colIdSet.has(c.id)));
      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== boardId);
        setActiveBoardIdState((active) =>
          active === boardId ? (next[0]?.id ?? '') : active
        );
        return next;
      });
    },
    [columns, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addProject = useCallback(
    (name: string, memberIds: string[], boardId?: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiCreateProject(activeBusinessId, {
          name,
          memberIds,
          boardId: boardId || undefined,
        }).then(() => refreshWorkspace());
        return;
      }
      const id = newId();
      setProjects((prev) => [
        ...prev,
        {
          id,
          name: name.trim() || 'پروژه',
          memberIds,
          boardId: boardId || undefined,
        },
      ]);
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<MeizitoProject>) => {
      if (patch.phases !== undefined) {
        const phaseCount = getProjectPhases(patch.phases).length;
        if (process.env.NODE_ENV === 'development') {
          console.debug('[meizito/workspace] updateProject phases', { projectId: id, phaseCount });
        }
      }
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateProject(activeBusinessId, id, patch).then(() => refreshWorkspace());
        return;
      }
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addMessage = useCallback(
    (
      threadId: string,
      author: string,
      body: string,
      options?: {
        type?: MeizitoMessageType;
        attachmentNames?: string[];
        attachmentRefs?: AttachmentRef[];
        voiceDurationSec?: number;
        imageDataUrl?: string;
      }
    ) => {
      if (useChatApi && activeBusinessId) {
        setChatSendError('');
        setChatSendingThreadId(threadId);
        void apiCreateChatMessage(activeBusinessId, {
          threadId,
          authorName: author,
          body,
          type: options?.type,
          attachmentNames: options?.attachmentNames,
          attachmentRefs: options?.attachmentRefs,
          voiceDurationSec: options?.voiceDurationSec,
        })
          .then(({ message: raw }) => {
            const msg = normalizeMessage({
              ...raw,
              threadId: raw.threadId ?? threadId,
              author: raw.author ?? author,
              body: raw.body ?? body,
              type: raw.type ?? options?.type ?? 'text',
              attachmentNames: raw.attachmentNames ?? options?.attachmentNames ?? [],
              attachmentRefs: raw.attachmentRefs ?? options?.attachmentRefs ?? [],
              voiceDurationSec: raw.voiceDurationSec ?? options?.voiceDurationSec,
            });
            setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
            setThreads((prev) =>
              prev.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      messageIds: [...new Set([...(t.messageIds ?? []), msg.id])],
                    }
                  : t
              )
            );
            void refreshChat();
            emitNexaEvent({
              type: 'meizito.message.sent',
              businessId: activeBusinessId,
              title: 'پیام جدید',
              payload: { threadId, author },
            });
          })
          .catch((err) => {
            setChatSendError(
              err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.'
            );
          })
          .finally(() => {
            setChatSendingThreadId((cur) => (cur === threadId ? null : cur));
          });
        return;
      }
      const id = newId();
      const msg: MeizitoChatMessage = normalizeMessage({
        id,
        threadId,
        author,
        body,
        createdAt: new Date().toISOString(),
        type: options?.type ?? 'text',
        attachmentNames: options?.attachmentNames ?? [],
        attachmentRefs: options?.attachmentRefs ?? [],
        voiceDurationSec: options?.voiceDurationSec,
        imageDataUrl: options?.imageDataUrl,
      });
      setMessages((prev) => [...prev, msg]);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, messageIds: [...t.messageIds, id] } : t))
      );
      emitNexaEvent({
        type: 'meizito.message.sent',
        businessId: activeBusinessId,
        title: 'پیام جدید',
        payload: { threadId, author },
      });
    },
    [useChatApi, activeBusinessId, refreshChat]
  );

  const addThread = useCallback(
    (title: string, threadType: MeizitoThreadType, participantNames: string[] = []) => {
      if (useChatApi && activeBusinessId) {
        void (async () => {
          const { thread } = await apiCreateChatThread(
            activeBusinessId,
            title,
            threadType,
            participantNames
          );
          await refreshChat();
          setActiveThreadIdState(thread.id);
        })();
        return '';
      }
      const id = newId();
      const thread: MeizitoChatThread = {
        id,
        title: title.trim() || 'گفتگوی جدید',
        threadType,
        participantNames,
        starred: false,
        pinned: false,
        messageIds: [],
      };
      setThreads((prev) => [...prev, thread]);
      setActiveThreadIdState(id);
      return id;
    },
    [useChatApi, activeBusinessId, refreshChat]
  );

  const createCardFromText = useCallback(
    (boardId: string, columnId: string, title: string, assignee: string, dueDate: string, recurrence: MeizitoRecurrence) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiCreateCard(activeBusinessId, {
          boardId,
          columnId,
          title,
          assignee,
          dueDate,
          recurrence,
        }).then(() => refreshWorkspace());
        return;
      }
      const id = newId();
      const card: MeizitoCard = {
        id,
        boardId,
        columnId,
        title: title.trim(),
        description: '',
        labelIds: [],
        category: '',
        assignee,
        checklist: [],
        attachments: [],
        dueDate,
        dueTime: '',
        recurrence,
        starred: false,
      };
      setCards((prev) => [...prev, card]);
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, cardIds: [...c.cardIds, id] } : c))
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const toggleThreadStar = useCallback(
    (id: string) => {
      if (useChatApi && activeBusinessId) {
        const thread = threads.find((t) => t.id === id);
        if (!thread) return;
        void apiUpdateChatThread(activeBusinessId, id, { starred: !thread.starred }).then(() =>
          refreshChat()
        );
        return;
      }
      setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)));
    },
    [useChatApi, activeBusinessId, refreshChat, threads]
  );

  const toggleThreadPin = useCallback(
    (id: string) => {
      if (useChatApi && activeBusinessId) {
        const thread = threads.find((t) => t.id === id);
        if (!thread) return;
        void apiUpdateChatThread(activeBusinessId, id, { pinned: !thread.pinned }).then(() =>
          refreshChat()
        );
        return;
      }
      setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
    },
    [useChatApi, activeBusinessId, refreshChat, threads]
  );

  const updateChatThread = useCallback(
    (threadId: string, patch: Partial<Pick<MeizitoChatThread, 'title' | 'participantNames'>>) => {
      if (useChatApi && activeBusinessId) {
        void apiUpdateChatThread(activeBusinessId, threadId, patch).then(() => refreshChat());
        return;
      }
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, ...patch, title: patch.title ?? t.title } : t))
      );
    },
    [useChatApi, activeBusinessId, refreshChat]
  );

  const addLetter = useCallback(
    async (letter: Omit<MeizitoLetter, 'id' | 'threadId'> & { threadId?: string }) => {
      if (useLettersApi && activeBusinessId) {
        const { letter: created } = await apiCreateLetter(activeBusinessId, letter);
        await apiSubmitLetter(activeBusinessId, created.id);
        await refreshLetters();
        return created.id;
      }
      const id = newId();
      const full: MeizitoLetter = normalizeLetter({
        ...letter,
        id,
        threadId: letter.threadId || id,
        createdAt: letter.createdAt || new Date().toISOString(),
        approvalState: letter.approvalState ?? 'draft',
      });
      setLetters((prev) => [...prev, full]);
      return id;
    },
    [useLettersApi, activeBusinessId, refreshLetters]
  );

  const getLetterThread = useCallback(
    (threadId: string) =>
      letters
        .filter((l) => l.threadId === threadId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [letters]
  );

  const replyToLetter = useCallback(
    async (
      sourceId: string,
      letter: Omit<MeizitoLetter, 'id' | 'replyToLetterId' | 'threadId'>
    ) => {
      if (useLettersApi && activeBusinessId) {
        const { letter: created } = await apiReplyToLetter(activeBusinessId, sourceId, letter);
        await refreshLetters();
        return created.id;
      }
      const source = letters.find((l) => l.id === sourceId);
      if (!source) return '';
      const id = newId();
      const threadId = source.threadId || source.id;
      const full: MeizitoLetter = normalizeLetter({
        ...letter,
        id,
        replyToLetterId: sourceId,
        threadId,
        createdAt: letter.createdAt || new Date().toISOString(),
      });
      setLetters((prev) => [...prev, full]);
      return id;
    },
    [useLettersApi, activeBusinessId, refreshLetters, letters]
  );

  const updateLetterBox = useCallback(
    (id: string, box: MeizitoLetter['box']) => {
      if (useLettersApi && activeBusinessId) {
        void apiUpdateLetter(activeBusinessId, id, { box }).then(() => refreshLetters());
        return;
      }
      setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, box } : l)));
    },
    [useLettersApi, activeBusinessId, refreshLetters]
  );

  const closeLetter = useCallback(
    (id: string) => {
      if (useLettersApi && activeBusinessId) {
        void apiUpdateLetter(activeBusinessId, id, { status: 'closed', box: 'archive' }).then(() =>
          refreshLetters()
        );
        return;
      }
      setLetters((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'closed' as const, box: 'archive' } : l))
      );
    },
    [useLettersApi, activeBusinessId, refreshLetters]
  );

  const reopenLetter = useCallback(
    (id: string) => {
      if (useLettersApi && activeBusinessId) {
        void (async () => {
          const current = letters.find((l) => l.id === id);
          const box = current?.box === 'archive' ? 'inbox' : current?.box;
          await apiUpdateLetter(activeBusinessId, id, { status: 'open', box });
          await refreshLetters();
        })();
        return;
      }
      setLetters((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: 'open' as const, box: l.box === 'archive' ? 'inbox' : l.box } : l
        )
      );
    },
    [useLettersApi, activeBusinessId, refreshLetters, letters]
  );

  const setLetterCategory = useCallback(
    (id: string, category: MeizitoLetterCategory) => {
      if (useLettersApi && activeBusinessId) {
        void apiUpdateLetter(activeBusinessId, id, { category }).then(() => refreshLetters());
        return;
      }
      setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, category } : l)));
    },
    [useLettersApi, activeBusinessId, refreshLetters]
  );

  const setCurrentUserId = useCallback((id: string) => {
    if (!directoryUsers.some((u) => u.id === id)) return;
    setCurrentUserIdState(id);
  }, [directoryUsers]);

  const currentUser = useMemo((): MeizitoMockUser | undefined => {
    const fromDir = directoryUsers.find((u) => u.id === currentUserId);
    if (fromDir) return fromDir;
    if (sessionUserId && auth?.user) {
      return {
        id: sessionUserId,
        name: auth.user.displayName,
        role: 'member',
      };
    }
    return directoryUsers[0];
  }, [currentUserId, directoryUsers, sessionUserId, auth?.user]);

  const isCurrentUserManager = isManagerRole(currentUser?.role ?? 'member');

  const canReviewDailyReportCb = useCallback(
    (report: MeizitoDailyReport) => canReviewDailyReport(report, currentUserId, directoryUsers),
    [currentUserId, directoryUsers]
  );

  const addDailyReport = useCallback(
    async (report: Omit<MeizitoDailyReport, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (useWorkspaceApi && activeBusinessId) {
        const { report: saved } = await apiCreateDailyReport(activeBusinessId, report);
        await refreshWorkspace();
        return saved.id;
      }
      const now = new Date().toISOString();
      const id = newId();
      setDailyReports((prev) => [
        ...prev,
        { ...report, id, createdAt: now, updatedAt: now },
      ]);
      return id;
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const updateDailyReport = useCallback(
    (
      id: string,
      patch: Partial<Pick<MeizitoDailyReport, 'title' | 'body' | 'status' | 'dayChecklist'>>
    ) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateDailyReport(activeBusinessId, id, patch).then(() => refreshWorkspace());
        return;
      }
      const now = new Date().toISOString();
      setDailyReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r))
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const submitDailyReport = useCallback(
    (id: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        if (!dailyReports.some((r) => r.id === id)) return;
        void apiUpdateDailyReport(activeBusinessId, id, { status: 'submitted' }).then(() =>
          refreshWorkspace()
        );
        return;
      }
      updateDailyReport(id, { status: 'submitted' });
    },
    [useWorkspaceApi, activeBusinessId, dailyReports, refreshWorkspace, updateDailyReport]
  );

  const addFeedbackToReport = useCallback(
    (id: string, feedback: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiDailyReportFeedback(activeBusinessId, id, feedback, 'feedback').then(() =>
          refreshWorkspace()
        );
        return;
      }
      const now = new Date().toISOString();
      setDailyReports((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (!canReviewDailyReport(r, currentUserId, directoryUsers)) return r;
          const roleLabel = getReviewerRoleLabel(r.authorId, currentUserId, directoryUsers);
          const actor = directoryUsers.find((u) => u.id === currentUserId);
          const entry = {
            id: newFeedbackId(),
            authorId: currentUserId,
            authorName: actor?.name ?? MEIZITO_CURRENT_USER_NAME,
            roleLabel,
            text: feedback.trim(),
            kind: 'feedback' as const,
            at: now,
          };
          return normalizeDailyReport({
            ...r,
            feedbackEntries: [...(r.feedbackEntries ?? []), entry],
            updatedAt: now,
          });
        })
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace, currentUserId, directoryUsers]
  );

  const approveDailyReport = useCallback(
    (id: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiDailyReportFeedback(activeBusinessId, id, 'گزارش تایید شد.', 'approve').then(() =>
          refreshWorkspace()
        );
        return;
      }
      const now = new Date().toISOString();
      setDailyReports((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (!canReviewDailyReport(r, currentUserId, directoryUsers)) return r;
          const roleLabel = getReviewerRoleLabel(r.authorId, currentUserId, directoryUsers);
          const actor = directoryUsers.find((u) => u.id === currentUserId);
          const entry = {
            id: newFeedbackId(),
            authorId: currentUserId,
            authorName: actor?.name ?? MEIZITO_CURRENT_USER_NAME,
            roleLabel,
            text: 'گزارش تایید شد.',
            kind: 'approve' as const,
            at: now,
          };
          return normalizeDailyReport({
            ...r,
            managerApproved: true,
            managerApprovedAt: now,
            feedbackEntries: [...(r.feedbackEntries ?? []), entry],
            updatedAt: now,
          });
        })
      );
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace, currentUserId, directoryUsers]
  );

  const getDailyReportsForDate = useCallback(
    (dateKey: string) =>
      dailyReports
        .filter((r) => r.date === dateKey)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [dailyReports]
  );

  const getMyDailyReportForDate = useCallback(
    (dateKey: string) =>
      dailyReports.find((r) => r.authorId === currentUserId && r.date === dateKey),
    [dailyReports, currentUserId]
  );

  const getTeamMembersWithoutReportForDate = useCallback(
    (dateKey: string) => {
      const submittedIds = new Set(
        dailyReports
          .filter((r) => r.date === dateKey && r.status === 'submitted')
          .map((r) => r.authorId)
      );
      return directoryUsers.filter((u) => u.role === 'member' && !submittedIds.has(u.id));
    },
    [dailyReports, directoryUsers]
  );

  const addFieldVisit = useCallback(
    (visit: Omit<MeizitoFieldVisit, 'id' | 'createdAt'>) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiCreateFieldVisit(activeBusinessId, visit).then(() => refreshWorkspace());
        return;
      }
      const row = normalizeFieldVisit({
        ...visit,
        id: newId(),
        createdAt: new Date().toISOString(),
      } as MeizitoFieldVisit);
      setFieldVisits((prev) => [...prev, row]);
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addInternalRequest = useCallback(
    async (
      req: Omit<MeizitoInternalRequest, 'id' | 'createdAt' | 'status'> & {
        status?: MeizitoInternalRequest['status'];
      },
      options?: { submitForApproval?: boolean }
    ) => {
      if (useRequestsApi && activeBusinessId) {
        const { request } = await apiCreateInternalRequest(activeBusinessId, req, options);
        await refreshRequests();
        return request.id;
      }
      const now = new Date().toISOString();
      const id = newId();
      const authorName =
        directoryUsers.find((u) => u.id === req.authorId)?.name ?? req.authorName;
      let item = normalizeInternalRequest({
        ...req,
        id,
        status: req.status ?? 'open',
        createdAt: now,
        threadId: req.threadId ?? id,
      });
      if (options?.submitForApproval !== false) {
        const assigneeId =
          primaryAssigneeFromReferrals(req.referredToUserIds) ??
          req.referredToUserId ??
          req.currentAssigneeId;
        const approval = applySubmitForApproval(item, req.authorId, authorName, assigneeId, directoryUsers);
        item = { ...item, ...approval };
      }
      setInternalRequests((prev) => [...prev, item]);
      return id;
    },
    [useRequestsApi, activeBusinessId, refreshRequests, directoryUsers]
  );

  const getRequestThread = useCallback(
    (threadId: string) =>
      internalRequests
        .filter((r) => (r.threadId || r.id) === threadId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [internalRequests]
  );

  const replyToInternalRequest = useCallback(
    async (
      sourceId: string,
      req: Omit<MeizitoInternalRequest, 'id' | 'replyToRequestId' | 'threadId' | 'createdAt' | 'status'> & {
        status?: MeizitoInternalRequest['status'];
      },
      options?: { submitForApproval?: boolean }
    ) => {
      if (useRequestsApi && activeBusinessId) {
        const { request: created } = await apiReplyToInternalRequest(activeBusinessId, sourceId, req, options);
        if (options?.submitForApproval !== false) {
          await apiSubmitInternalRequest(activeBusinessId, created.id);
        }
        await refreshRequests();
        return created.id;
      }
      const source = internalRequests.find((r) => r.id === sourceId);
      if (!source) return '';
      const now = new Date().toISOString();
      const id = newId();
      const authorName =
        directoryUsers.find((u) => u.id === req.authorId)?.name ?? req.authorName;
      const threadId = source.threadId || source.id;
      let item = normalizeInternalRequest({
        ...req,
        id,
        replyToRequestId: sourceId,
        threadId,
        status: req.status ?? 'open',
        createdAt: now,
      });
      if (options?.submitForApproval !== false) {
        const assigneeId =
          primaryAssigneeFromReferrals(req.referredToUserIds) ??
          req.referredToUserId ??
          req.currentAssigneeId;
        const approval = applySubmitForApproval(item, req.authorId, authorName, assigneeId, directoryUsers);
        item = { ...item, ...approval };
      }
      setInternalRequests((prev) => [...prev, item]);
      return id;
    },
    [useRequestsApi, activeBusinessId, refreshRequests, internalRequests, directoryUsers]
  );

  const closeInternalRequest = useCallback(
    (id: string) => {
      if (useRequestsApi && activeBusinessId) {
        void apiUpdateInternalRequestStatus(activeBusinessId, id, 'closed').then(() => refreshRequests());
        return;
      }
      const now = new Date().toISOString();
      setInternalRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'closed', closedAt: now } : r))
      );
    },
    [useRequestsApi, activeBusinessId, refreshRequests]
  );

  const reopenInternalRequest = useCallback(
    (id: string) => {
      if (useRequestsApi && activeBusinessId) {
        void apiUpdateInternalRequestStatus(activeBusinessId, id, 'open').then(() => refreshRequests());
        return;
      }
      setInternalRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'open', closedAt: undefined } : r))
      );
    },
    [useRequestsApi, activeBusinessId, refreshRequests]
  );

  const submitForApproval = useCallback(
    (entityType: MeizitoApprovableEntityType, id: string) => {
      if (useRequestsApi && activeBusinessId && entityType === 'request') {
        void apiSubmitInternalRequest(activeBusinessId, id).then(() => refreshRequests());
        return;
      }
      if (useLettersApi && activeBusinessId && entityType === 'letter') {
        if (!id) return;
        void apiSubmitLetter(activeBusinessId, id).then(() => refreshLetters());
        return;
      }
      const actor = directoryUsers.find((u) => u.id === currentUserId);
      const actorName = actor?.name ?? MEIZITO_CURRENT_USER_NAME;
      if (entityType === 'letter') {
        setLetters((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            const next = applySubmitForApproval(l, currentUserId, actorName, undefined, directoryUsers);
            return normalizeLetter({ ...l, ...next });
          })
        );
      } else {
        setInternalRequests((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const next = applySubmitForApproval(
              r,
              currentUserId,
              actorName,
              primaryAssigneeFromReferrals(r.referredToUserIds) ?? r.referredToUserId,
              directoryUsers
            );
            return normalizeInternalRequest({ ...r, ...next });
          })
        );
      }
    },
    [useRequestsApi, useLettersApi, activeBusinessId, refreshRequests, refreshLetters, currentUserId, directoryUsers]
  );

  const recordApprovalAction = useCallback(
    (
      entityType: MeizitoApprovableEntityType,
      id: string,
      payload: Omit<RecordApprovalPayload, 'actorId' | 'actorName'>
    ) => {
      if (useRequestsApi && activeBusinessId && entityType === 'request') {
        void apiInternalRequestApproval(activeBusinessId, id, payload).then(() => refreshRequests());
        return;
      }
      if (useLettersApi && activeBusinessId && entityType === 'letter') {
        void apiLetterApproval(activeBusinessId, id, payload).then(() => refreshLetters());
        return;
      }
      const actor = directoryUsers.find((u) => u.id === currentUserId);
      const forward = resolveForwardTargets({
        ...payload,
        actorId: currentUserId,
        actorName: actor?.name ?? MEIZITO_CURRENT_USER_NAME,
        forwardToUserNames:
          payload.forwardToUserNames ??
          payload.forwardToUserIds?.map(
            (id) => directoryUsers.find((u) => u.id === id)?.name ?? id
          ),
      });
      const full: RecordApprovalPayload = {
        ...payload,
        actorId: currentUserId,
        actorName: actor?.name ?? MEIZITO_CURRENT_USER_NAME,
        forwardToUserId: forward.primaryId ?? payload.forwardToUserId,
        forwardToUserName: forward.names.join('، ') || payload.forwardToUserName,
        forwardToUserIds: forward.ids.length > 0 ? forward.ids : payload.forwardToUserIds,
        forwardToUserNames: forward.names.length > 0 ? forward.names : payload.forwardToUserNames,
      };
      const applyFields = (item: {
        approvalState?: import('@/src/types/meizito').MeizitoApprovalState;
        approvalSteps?: import('@/src/types/meizito').MeizitoApprovalStep[];
        currentAssigneeId?: string;
        submittedAt?: string;
      }) => applyApprovalAction(item, full);
      if (entityType === 'letter') {
        setLetters((prev) =>
          prev.map((l) => (l.id === id ? normalizeLetter({ ...l, ...applyFields(l) }) : l))
        );
      } else {
        setInternalRequests((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const merged = { ...r, ...applyFields(r) };
            if (payload.action === 'forward' && forward.ids.length > 1) {
              const extraCc = forward.ids.slice(1);
              merged.ccUserIds = [...new Set([...(r.ccUserIds ?? []), ...extraCc])];
            }
            return normalizeInternalRequest(merged);
          })
        );
      }
    },
    [useRequestsApi, useLettersApi, activeBusinessId, refreshRequests, refreshLetters, currentUserId, directoryUsers]
  );

  const getPendingApprovalCounts = useCallback(
    (userId: string) => ({
      letters: letters.filter((l) => l.approvalState === 'pending' && l.currentAssigneeId === userId)
        .length,
      requests: internalRequests.filter(
        (r) => r.approvalState === 'pending' && r.currentAssigneeId === userId
      ).length,
    }),
    [letters, internalRequests]
  );

  const getMockUserById = useCallback(
    (id: string) => directoryUsers.find((u) => u.id === id),
    [directoryUsers]
  );

  const listTeamDirectoryCb = useCallback(
    (filter: TeamDirectoryFilter = 'all', search = '') =>
      listTeamDirectory(directoryUsers, filter, search),
    [directoryUsers]
  );

  const updateChatMessage = useCallback(
    (messageId: string, patch: Partial<Pick<MeizitoChatMessage, 'body' | 'editedAt'>>) => {
      if (useChatApi && activeBusinessId) {
        void apiUpdateChatMessage(activeBusinessId, messageId, patch).then(() => refreshChat());
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
      );
    },
    [useChatApi, activeBusinessId, refreshChat]
  );

  const deleteChatMessage = useCallback(
    (messageId: string) => {
      if (useChatApi && activeBusinessId) {
        void apiDeleteChatMessage(activeBusinessId, messageId).then(() => refreshChat());
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setThreads((prev) =>
        prev.map((t) => ({
          ...t,
          messageIds: (t.messageIds ?? []).filter((id) => id !== messageId),
        }))
      );
    },
    [useChatApi, activeBusinessId, refreshChat]
  );

  const setEventRsvp = useCallback(
    (eventId: string, userId: string, status: 'accepted' | 'declined' | 'pending') => {
      if (useCalendarApi && activeBusinessId) {
        void apiSetCalendarEventRsvp(activeBusinessId, eventId, userId, status).then(() =>
          refreshCalendar()
        );
        return;
      }
      setCalendarEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          return normalizeCalendarEvent({
            ...e,
            rsvp: { ...(e.rsvp ?? {}), [userId]: status },
          });
        })
      );
    },
    [useCalendarApi, activeBusinessId, refreshCalendar]
  );

  const updateFieldVisit = useCallback(
    (id: string, patch: Partial<Omit<MeizitoFieldVisit, 'id' | 'createdAt'>>) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateFieldVisit(activeBusinessId, id, patch).then(() => refreshWorkspace());
        return;
      }
      setFieldVisits((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const deleteFieldVisit = useCallback(
    (id: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiDeleteFieldVisit(activeBusinessId, id).then(() => refreshWorkspace());
        return;
      }
      setFieldVisits((prev) => prev.filter((v) => v.id !== id));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const getFieldVisitsForDate = useCallback(
    (dateKey: string) =>
      fieldVisits
        .filter((v) => v.date === dateKey)
        .sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')),
    [fieldVisits]
  );

  const getThreadMessages = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return [];
      return thread.messageIds
        .map((mid) => messages.find((m) => m.id === mid))
        .filter((m): m is MeizitoChatMessage => !!m)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    [threads, messages]
  );

  const addNoteBoard = useCallback(
    (name: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        void (async () => {
          const { noteBoard } = await apiCreateNoteBoard(activeBusinessId, name);
          await refreshWorkspace();
          setActiveNoteBoardIdState(noteBoard.id);
        })();
        return;
      }
      const id = newId();
      const boardColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'];
      setNoteBoards((prev) => {
        const board: MeizitoNoteBoard = {
          id,
          name: name.trim() || 'بورد جدید',
          color: boardColors[prev.length % boardColors.length],
          order: prev.length,
        };
        return [...prev, board];
      });
      setActiveNoteBoardIdState(id);
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const updateNoteBoard = useCallback(
    (
      id: string,
      patch: Partial<Pick<MeizitoNoteBoard, 'name' | 'color' | 'order' | 'memberUserIds'>>
    ) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateNoteBoard(activeBusinessId, id, patch).then(() => refreshWorkspace());
        return;
      }
      setNoteBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const addNote = useCallback(
    async (
      title: string,
      content: string,
      color: string,
      boardId?: string,
      fileAttachments?: AttachmentRef[],
      labelIds?: string[]
    ) => {
      const bid = boardId ?? activeNoteBoardId;
      if (useWorkspaceApi && activeBusinessId) {
        await apiCreateNote(activeBusinessId, {
          title,
          content,
          color,
          boardId: bid,
          fileAttachments,
          labelIds,
        });
        await refreshWorkspace();
        return;
      }
      setNotes((prev) => [
        ...prev,
        {
          id: newId(),
          boardId: bid,
          title,
          content,
          color,
          checklist: [],
          fileAttachments: fileAttachments ?? [],
          archived: false,
          deletedAt: null,
          starred: false,
          labelIds: labelIds ?? [],
        },
      ]);
    },
    [activeNoteBoardId, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<MeizitoNote>) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateNote(activeBusinessId, id, patch).then(() => refreshWorkspace());
        return;
      }
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const toggleNoteStar = useCallback(
    (id: string) => {
      if (useWorkspaceApi && activeBusinessId) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        void apiUpdateNote(activeBusinessId, id, { starred: !note.starred }).then(() =>
          refreshWorkspace()
        );
        return;
      }
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n)));
    },
    [notes, useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const archiveNote = useCallback(
    (id: string, archived = true) => {
      if (useWorkspaceApi && activeBusinessId) {
        void apiUpdateNote(activeBusinessId, id, { archived }).then(() => refreshWorkspace());
        return;
      }
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived } : n)));
    },
    [useWorkspaceApi, activeBusinessId, refreshWorkspace]
  );

  const getThreadMessagesForDate = useCallback(
    (threadId: string, dateKey: string) => {
      return messages.filter((m) => {
        if (m.threadId !== threadId) return false;
        const d = (m.createdAt ?? '').slice(0, 10);
        return d === dateKey;
      });
    },
    [messages]
  );

  const doneColumnIdsForBoard = useCallback(
    (boardId: string) =>
      columns
        .filter((c) => c.boardId === boardId && /انجام\s*شده/.test(c.title))
        .map((c) => c.id),
    [columns]
  );

  const getCardsDueOn = useCallback(
    (dateKey: string, boardId?: string) => {
      const bid = boardId ?? activeBoardId;
      return cards.filter((c) => c.boardId === bid && c.dueDate === dateKey);
    },
    [cards, activeBoardId]
  );

  const getOverdueCards = useCallback(
    (todayKey: string, boardId?: string) => {
      const bid = boardId ?? activeBoardId;
      const doneIds = doneColumnIdsForBoard(bid);
      return cards.filter(
        (c) =>
          c.boardId === bid &&
          c.dueDate &&
          c.dueDate < todayKey &&
          !doneIds.includes(c.columnId)
      );
    },
    [cards, activeBoardId, doneColumnIdsForBoard]
  );

  const getCardsAssignedToOthers = useCallback(
    (boardId?: string) => {
      const bid = boardId ?? activeBoardId;
      const me = currentUser?.name ?? MEIZITO_CURRENT_USER_NAME;
      return cards.filter(
        (c) =>
          c.boardId === bid && (c.assignee ?? '').trim() !== '' && (c.assignee ?? '') !== me
      );
    },
    [cards, activeBoardId, currentUser]
  );

  const searchCards = useCallback(
    (boardId: string, query: string, labelId?: string) => {
      const q = query.trim().toLowerCase();
      return cards.filter((c) => {
        if (c.boardId !== boardId) return false;
        if (labelId && !c.labelIds.includes(labelId)) return false;
        if (!q) return true;
        const title = (c.title ?? '').toLowerCase();
        const assignee = (c.assignee ?? '').toLowerCase();
        const category = (c.category ?? '').toLowerCase();
        return title.includes(q) || assignee.includes(q) || category.includes(q);
      });
    },
    [cards]
  );

  const getCalendarEventsForDate = useCallback(
    (calendarId: string, dateKey: string) => {
      const eventsForSingleCalendar = (singleId: string): MeizitoCalendarEvent[] => {
        const manual = calendarEvents.filter(
          (e) => e.calendarId === singleId && eventOccursOnDate(e, dateKey)
        );
        if (singleId !== MEIZITO_TASKS_CALENDAR_ID) return manual;
        const syncedIds = new Set(
          manual.filter((e) => e.sourceCardId).map((e) => e.sourceCardId)
        );
        const fromCards = cards
          .filter((c) => c.dueDate === dateKey && !syncedIds.has(c.id))
          .map(
            (c): MeizitoCalendarEvent => ({
              id: `derived-card-${c.id}`,
              calendarId: singleId,
              title: c.title,
              date: c.dueDate,
              time: c.dueTime || undefined,
              sourceCardId: c.id,
            })
          );
        return [...manual, ...fromCards];
      };

      if (calendarId === MEIZITO_ALL_CALENDARS_ID) {
        const visibleIds = calendars.filter((c) => c.visible !== false).map((c) => c.id);
        const seen = new Set<string>();
        const merged: MeizitoCalendarEvent[] = [];
        for (const id of visibleIds) {
          for (const ev of eventsForSingleCalendar(id)) {
            if (seen.has(ev.id)) continue;
            seen.add(ev.id);
            merged.push(ev);
          }
        }
        return merged;
      }

      return eventsForSingleCalendar(calendarId);
    },
    [calendarEvents, cards, calendars]
  );

  const syncEventsFromCards = useCallback(() => {
    if (useCalendarApi && activeBusinessId) {
      void apiSyncCalendarEventsFromCards(activeBusinessId).then(() => refreshCalendar());
      return;
    }
    setCalendarEvents((prev) => {
      const rest = prev.filter(
        (e) => e.calendarId !== MEIZITO_TASKS_CALENDAR_ID || !e.sourceCardId
      );
      const synced = cards
        .filter((c) => c.dueDate)
        .map(
          (c): MeizitoCalendarEvent => ({
            id: `sync-${c.id}`,
            calendarId: MEIZITO_TASKS_CALENDAR_ID,
            title: c.title,
            date: c.dueDate,
            time: c.dueTime || undefined,
            sourceCardId: c.id,
          })
        );
      return [...rest, ...synced];
    });
  }, [useCalendarApi, activeBusinessId, refreshCalendar, cards]);

  const addCalendar = useCallback(
    (name: string, kind: MeizitoCalendarKind, color: string) => {
      if (useCalendarApi && activeBusinessId) {
        void (async () => {
          const { calendar } = await apiCreateCalendar(activeBusinessId, name, kind, color);
          await refreshCalendar();
          setActiveCalendarIdState(calendar.id);
        })();
        return;
      }
      const id = newId();
      setCalendars((prev) => [
        ...prev,
        {
          id,
          name: name.trim() || 'تقویم جدید',
          color,
          kind,
          sharedWith: [],
          ownerName: MEIZITO_CURRENT_USER_NAME,
        },
      ]);
      setActiveCalendarIdState(id);
    },
    [useCalendarApi, activeBusinessId, refreshCalendar]
  );

  const updateCalendar = useCallback(
    (id: string, patch: Partial<MeizitoCalendar>) => {
      if (useCalendarApi && activeBusinessId) {
        void apiUpdateCalendar(activeBusinessId, id, patch).then(() => refreshCalendar());
        return;
      }
      setCalendars((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    [useCalendarApi, activeBusinessId, refreshCalendar]
  );

  const addCalendarEvent = useCallback(
    (event: Omit<MeizitoCalendarEvent, 'id'>) => {
      if (useCalendarApi && activeBusinessId) {
        void apiCreateCalendarEvent(activeBusinessId, event).then(() => refreshCalendar());
        return '';
      }
      const id = newId();
      setCalendarEvents((prev) => [...prev, { ...event, id }]);
      return id;
    },
    [useCalendarApi, activeBusinessId, refreshCalendar]
  );

  const updateCalendarEvent = useCallback(
    (id: string, patch: Partial<MeizitoCalendarEvent>) => {
      if (useCalendarApi && activeBusinessId) {
        void apiUpdateCalendarEvent(activeBusinessId, id, patch).then(() => refreshCalendar());
        return;
      }
      setCalendarEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [useCalendarApi, activeBusinessId, refreshCalendar]
  );

  const deleteCalendarEvent = useCallback(
    (id: string) => {
      if (useCalendarApi && activeBusinessId) {
        void apiDeleteCalendarEvent(activeBusinessId, id).then(() => refreshCalendar());
        return;
      }
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [useCalendarApi, activeBusinessId, refreshCalendar]
  );

  const value = useMemo<MeizitoContextValue>(
    () => ({
      boards,
      columns,
      cards,
      projects,
      threads,
      messages,
      letters,
      notes,
      noteBoards,
      activeNoteBoardId,
      setActiveNoteBoardId,
      activeBoardId,
      activeThreadId,
      setActiveBoardId,
      setActiveThreadId,
      updateBoard,
      addBoardLabel,
      deleteBoard,
      addBoard,
      addColumn,
      updateColumn,
      deleteColumn,
      addCard,
      moveCard,
      updateCard,
      deleteCard,
      copyCardForAssignees,
      toggleCardStar,
      addProject,
      updateProject,
      addMessage,
      addThread,
      createCardFromText,
      refreshWorkspace,
      toggleThreadStar,
      toggleThreadPin,
      updateChatThread,
      refreshChat,
      addLetter,
      replyToLetter,
      getLetterThread,
      updateLetterBox,
      closeLetter,
      reopenLetter,
      setLetterCategory,
      dailyReports,
      fieldVisits,
      currentUserId,
      setCurrentUserId,
      sessionUserId,
      activeBusinessId,
      dataSources,
      meizitoHydration,
      ensureMeizitoModuleLoaded,
      useMockUserSwitcher,
      isCurrentUserManager,
      canReviewDailyReport: canReviewDailyReportCb,
      mockUsers: directoryUsers,
      addDailyReport,
      updateDailyReport,
      submitDailyReport,
      addFeedbackToReport,
      approveDailyReport,
      getDailyReportsForDate,
      getMyDailyReportForDate,
      getTeamMembersWithoutReportForDate,
      addFieldVisit,
      updateFieldVisit,
      deleteFieldVisit,
      getFieldVisitsForDate,
      fieldVisitsAll: fieldVisits,
      internalRequests,
      addInternalRequest,
      replyToInternalRequest,
      getRequestThread,
      closeInternalRequest,
      reopenInternalRequest,
      submitForApproval,
      recordApprovalAction,
      getPendingApprovalCounts,
      getMockUserById,
      listTeamDirectory: listTeamDirectoryCb,
      updateChatMessage,
      deleteChatMessage,
      setEventRsvp,
      getThreadMessages,
      addNoteBoard,
      updateNoteBoard,
      addNote,
      updateNote,
      toggleNoteStar,
      archiveNote,
      getThreadMessagesForDate,
      currentUserName: currentUser?.name ?? MEIZITO_CURRENT_USER_NAME,
      getCardsDueOn,
      getOverdueCards,
      getCardsAssignedToOthers,
      searchCards,
      calendars,
      calendarEvents,
      activeCalendarId,
      setActiveCalendarId,
      addCalendar,
      updateCalendar,
      addCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent,
      getCalendarEventsForDate,
      syncEventsFromCards,
      chatSendError,
      clearChatSendError,
      chatSendingThreadId,
    }),
    [
      boards,
      columns,
      cards,
      projects,
      threads,
      messages,
      letters,
      notes,
      noteBoards,
      activeNoteBoardId,
      setActiveNoteBoardId,
      activeBoardId,
      activeThreadId,
      setActiveBoardId,
      setActiveThreadId,
      updateBoard,
      addBoardLabel,
      deleteBoard,
      addBoard,
      addColumn,
      updateColumn,
      deleteColumn,
      addCard,
      moveCard,
      updateCard,
      deleteCard,
      copyCardForAssignees,
      toggleCardStar,
      addProject,
      updateProject,
      addMessage,
      addThread,
      createCardFromText,
      refreshWorkspace,
      toggleThreadStar,
      toggleThreadPin,
      updateChatThread,
      refreshChat,
      addLetter,
      replyToLetter,
      getLetterThread,
      updateLetterBox,
      closeLetter,
      reopenLetter,
      setLetterCategory,
      dailyReports,
      fieldVisits,
      currentUserId,
      setCurrentUserId,
      sessionUserId,
      activeBusinessId,
      dataSources,
      meizitoHydration,
      ensureMeizitoModuleLoaded,
      useMockUserSwitcher,
      isCurrentUserManager,
      canReviewDailyReportCb,
      addDailyReport,
      updateDailyReport,
      submitDailyReport,
      addFeedbackToReport,
      approveDailyReport,
      getDailyReportsForDate,
      getMyDailyReportForDate,
      getTeamMembersWithoutReportForDate,
      addFieldVisit,
      updateFieldVisit,
      deleteFieldVisit,
      getFieldVisitsForDate,
      internalRequests,
      addInternalRequest,
      replyToInternalRequest,
      getRequestThread,
      closeInternalRequest,
      reopenInternalRequest,
      submitForApproval,
      recordApprovalAction,
      getPendingApprovalCounts,
      getMockUserById,
      listTeamDirectoryCb,
      updateChatMessage,
      deleteChatMessage,
      setEventRsvp,
      getThreadMessages,
      currentUser,
      addNoteBoard,
      updateNoteBoard,
      addNote,
      updateNote,
      toggleNoteStar,
      archiveNote,
      getThreadMessagesForDate,
      getCardsDueOn,
      getOverdueCards,
      getCardsAssignedToOthers,
      searchCards,
      calendars,
      calendarEvents,
      activeCalendarId,
      setActiveCalendarId,
      addCalendar,
      updateCalendar,
      addCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent,
      getCalendarEventsForDate,
      syncEventsFromCards,
      chatSendError,
      clearChatSendError,
      chatSendingThreadId,
    ]
  );

  return <MeizitoContext.Provider value={value}>{children}</MeizitoContext.Provider>;
}

export function useMeizito() {
  const ctx = useContext(MeizitoContext);
  if (!ctx) throw new Error('useMeizito must be used within MeizitoProvider');
  return ctx;
}
