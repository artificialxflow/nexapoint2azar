import {
  MEIZITO_MOCK_USERS,
  type MeizitoMockUser,
} from '@/src/types/meizito';
import type { WorkspaceSnapshot } from '@/src/lib/meizito/workspace/serialize';
import type { LettersSnapshot } from '@/src/lib/meizito/letters/serialize';
import type { ChatSnapshot } from '@/src/lib/meizito/chat/serialize';
import type { CalendarSnapshot } from '@/src/lib/meizito/calendar/serialize';
import type { RequestsSnapshot } from '@/src/lib/meizito/requests/serialize';

const BOARD_ID = 'board-demo';
const COL_TODO = 'col-todo';
const COL_DOING = 'col-doing';
const COL_DONE = 'col-done';
const CARD_ID = 'card-demo-1';

export const MOCK_MEIZITO_TEAM: MeizitoMockUser[] = MEIZITO_MOCK_USERS;

export function createMockWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    boards: [
      {
        id: BOARD_ID,
        name: 'میز کار نمایشی',
        memberNames: [MEIZITO_MOCK_USERS[0]?.name ?? 'کاربر'],
        columnIds: [COL_TODO, COL_DOING, COL_DONE],
        labelPalette: [{ id: 'lbl-1', name: 'فوری', color: '#f59e0b' }],
      },
    ],
    columns: [
      { id: COL_TODO, boardId: BOARD_ID, title: 'برای انجام', order: 0, cardIds: [CARD_ID] },
      { id: COL_DOING, boardId: BOARD_ID, title: 'در حال انجام', order: 1, cardIds: [] },
      { id: COL_DONE, boardId: BOARD_ID, title: 'انجام شده', order: 2, cardIds: [] },
    ],
    cards: [
      {
        id: CARD_ID,
        boardId: BOARD_ID,
        columnId: COL_TODO,
        title: 'کار نمونه',
        description: 'این کارت برای تست رابط کاربری است.',
        labelIds: ['lbl-1'],
        category: 'general',
        assignee: MEIZITO_MOCK_USERS[0]?.name ?? 'کاربر',
        checklist: [],
        attachments: [],
        dueDate: '',
        dueTime: '',
        recurrence: 'none',
        starred: false,
      },
    ],
    projects: [
      {
        id: 'proj-demo',
        name: 'پروژه نمایشی',
        memberIds: [],
        members: [MEIZITO_MOCK_USERS[0]?.name ?? 'کاربر'],
      },
    ],
    noteBoards: [{ id: 'notes-default', name: 'یادداشت‌ها', order: 0 }],
    notes: [],
    dailyReports: [],
    fieldVisits: [],
    activeBoardId: BOARD_ID,
    activeNoteBoardId: 'notes-default',
  };
}

export function createMockLettersSnapshot(): LettersSnapshot {
  return {
    letters: [
      {
        id: 'letter-demo-1',
        subject: 'نامه نمایشی',
        body: 'متن نمونه برای تست صندوق نامه.',
        to: ['امیرحسین'],
        labels: [],
        category: 'administrative',
        status: 'open',
        box: 'inbox',
        referredTo: [],
        referredFrom: '',
        threadId: 'thread-letter-1',
        attachments: [],
        createdAt: new Date().toISOString(),
        approvalState: 'approved',
      },
    ],
  };
}

export function createMockChatSnapshot(): ChatSnapshot {
  const threadId = 'thread-demo';
  const msgId = 'msg-1';
  return {
    threads: [
      {
        id: threadId,
        title: 'گفتگوی نمایشی',
        threadType: 'direct',
        participantNames: [MEIZITO_MOCK_USERS[0]?.name ?? 'الف', MEIZITO_MOCK_USERS[1]?.name ?? 'ب'],
        starred: false,
        messageIds: [msgId],
      },
    ],
    messages: [
      {
        id: msgId,
        threadId,
        author: MEIZITO_MOCK_USERS[0]?.name ?? 'کاربر',
        body: 'سلام! این یک پیام نمایشی است.',
        createdAt: new Date().toISOString(),
        type: 'text',
        attachmentNames: [],
      },
    ],
  };
}

export function createMockCalendarSnapshot(): CalendarSnapshot {
  const calId = 'cal-demo';
  const today = new Date().toISOString().slice(0, 10);
  return {
    calendars: [
      {
        id: calId,
        name: 'تقویم نمایشی',
        kind: 'general',
        color: '#3b82f6',
        sharedWith: [],
        ownerName: MEIZITO_MOCK_USERS[0]?.name ?? 'کاربر',
      },
    ],
    events: [
      {
        id: 'evt-1',
        calendarId: calId,
        title: 'جلسه نمایشی',
        date: today,
        time: '10:00',
      },
    ],
  };
}

export function createMockRequestsSnapshot(): RequestsSnapshot {
  return {
    requests: [
      {
        id: 'req-demo-1',
        subject: 'درخواست نمایشی',
        body: 'برای تست لیست درخواست‌ها',
        status: 'open',
        authorId: MEIZITO_MOCK_USERS[0]?.id ?? 'user-demo',
        authorName: MEIZITO_MOCK_USERS[0]?.name ?? 'کاربر',
        createdAt: new Date().toISOString(),
        priority: 'medium',
        category: 'operations',
      },
    ],
  };
}
