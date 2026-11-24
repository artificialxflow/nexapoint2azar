import { cardShouldSyncToCalendar, eventPatchFromCard } from '../src/lib/meizito/card-calendar-sync';
import { eventOccursOnDate } from '../src/lib/meizito/calendarGrid';
import { shiftDateKeyWithAnchor } from '../src/lib/meizito/calendar-drag';
import { evaluateHrEligibilityFromRules } from '../src/lib/meizito/hr-eligibility';
import { validateHrFormPayload } from '../src/lib/meizito/hr-form-payload';
import { evaluatePersonnelFileAccess } from '../src/lib/meizito/personnel-file-access';
import { workspaceCardWriteSchema } from '../src/lib/meizito/workspace-api-schemas';
import { incompleteDocCount } from '../src/lib/meizito/personnel-file-service';
import { getProjectMeta, getProjectPhases, withProjectPhases } from '../src/lib/meizito/project-phases';
import { shouldRemindDailyReportToday } from '../src/lib/meizito/daily-report-reminder';
import { canRecordFieldVisits } from '../src/lib/meizito/field-visit-access';
import { buildPhoneDirectorySections, splitPhoneTags } from '../src/lib/erp/phone-directory-views';
import { phoneEntrySearchHaystack } from '../src/lib/erp/phone-display-name';
import {
  letterHasRecipients,
  normalizeLetterRecipients,
} from '../src/lib/meizito/letter-recipients';
import { applyLetterApprovalMutation } from '../src/lib/meizito/letter-approval-mutation';
import type { MeizitoLetter } from '../src/types/meizito';
import { normalizeIncomingChatMessage } from '../src/lib/meizito/chat-message-normalize';
import { prepareRequestForPersist } from '../src/lib/meizito/request-prepare';
import { requestBoxForViewer } from '../src/lib/meizito/request-box';
import {
  canReviewDailyReport,
  getReviewerRoleLabel,
} from '../src/lib/meizito/teamHierarchy';
import type { MeizitoCalendarEvent, MeizitoCard, MeizitoMockUser } from '../src/types/meizito';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const card: MeizitoCard = {
  id: 'c1',
  boardId: 'b1',
  columnId: 'col1',
  title: 'گزارش',
  description: '',
  labelIds: [],
  category: '',
  assignee: '',
  checklist: [],
  attachments: [],
  dueDate: '1404/08/10',
  dueTime: '09:00',
  recurrence: 'none',
  starred: false,
  addToCalendar: true,
  calendarId: 'cal-1',
  reminderMinutes: 60,
  endDueDate: '1404/08/11',
};

assert(cardShouldSyncToCalendar(card), 'addToCalendar with dueDate');
const ev = eventPatchFromCard(card, 'cal-1');
assert(ev.endDate === '1404/08/11', 'endDate on event');
assert(ev.reminderMinutes === 60, 'reminder');

const off: MeizitoCard = { ...card, addToCalendar: false, calendarId: undefined };
assert(!cardShouldSyncToCalendar(off), 'no sync when off');

const span: MeizitoCalendarEvent = {
  id: 'ev',
  calendarId: 'c',
  title: 'x',
  date: '2026-02-01',
  endDate: '2026-02-03',
};
assert(eventOccursOnDate(span, '2026-02-02'), 'multi-day calendar span');

const orgUsers: MeizitoMockUser[] = [
  { id: 'senior', name: 'Sr', role: 'senior_manager' },
  { id: 'mgr', name: 'M', role: 'manager', managerId: 'senior' },
  { id: 'emp', name: 'E', role: 'member', managerId: 'mgr' },
];
assert(canReviewDailyReport({ authorId: 'emp' }, 'mgr', orgUsers), 'direct manager review');
assert(canReviewDailyReport({ authorId: 'emp' }, 'senior', orgUsers), 'senior manager review');
assert(getReviewerRoleLabel('emp', 'mgr', orgUsers) === 'مدیر مستقیم', 'direct role label');
assert(getReviewerRoleLabel('emp', 'senior', orgUsers) === 'مدیر بالاتر', 'senior role label');

assert(
  requestBoxForViewer({ id: '1', subject: 'x', body: '', status: 'open', authorId: 'emp', authorName: 'E', createdAt: '', currentAssigneeId: 'mgr' }, 'mgr') === 'inbox',
  'request inbox for assignee'
);

assert(
  shiftDateKeyWithAnchor('2026-01-12', '2026-01-10', '2026-01-11') === '2026-01-13',
  'calendar drag span shift'
);

const loanRule = {
  hrSubtype: 'loan',
  conditionJson: { minTenureMonths: 6 },
  userMessageFa: 'برای وام حداقل ۶ ماه سابقه لازم است.',
  enabled: true,
};
const deny = evaluateHrEligibilityFromRules('loan', 3, [loanRule]);
assert(!deny.ok && deny.messageFa.includes('۶'), 'HR loan 6-month deny');
const allow = evaluateHrEligibilityFromRules('loan', 8, [loanRule]);
assert(allow.ok, 'HR loan allow after 6 months');

const advanceRule = {
  hrSubtype: 'advance',
  conditionJson: { maxAdvanceAmount: 5_000_000 },
  userMessageFa: 'سقف مساعده ۵ میلیون است.',
  enabled: true,
};
const advDeny = evaluateHrEligibilityFromRules('advance', 12, [advanceRule], { amount: 9_000_000 });
assert(!advDeny.ok, 'HR advance cap deny');
const leaveOk = validateHrFormPayload('leave', {
  leaveKind: 'annual',
  startDate: '2026-01-10',
  endDate: '2026-01-12',
});
assert(leaveOk.ok, 'HR leave form parse');

const mgrAcl = evaluatePersonnelFileAccess('mgr', 'emp', 'member', 'mgr');
assert(mgrAcl.canEdit, 'manager edits subordinate personnel file');
const peerAcl = evaluatePersonnelFileAccess('other', 'emp', 'member', 'mgr');
assert(!peerAcl.canRead, 'non-manager cannot read personnel file');

const cardParse = workspaceCardWriteSchema.safeParse({ boardId: 'b', columnId: 'c' });
assert(cardParse.success, 'card schema minimal');
const badCard = workspaceCardWriteSchema.safeParse({ boardId: '', columnId: 'c' });
assert(!badCard.success, 'card schema rejects empty boardId');

assert(
  phoneEntrySearchHaystack({
    id: '1',
    displayName: 'رضا',
    firstName: 'رضا',
    lastName: 'علوی',
    mobile: '09121234567',
    extension: '',
    department: 'تولید',
    jobTitle: 'سرپرست',
    visibilityTags: ['داخلی'],
    sortOrder: 0,
  }).includes('علوی'),
  'phone search haystack includes lastName'
);

assert(splitPhoneTags('داخلی، پیمانکار').length === 2, 'phone tag split');
const phoneSections = buildPhoneDirectorySections(
  [
    {
      id: '1',
      displayName: 'ب',
      firstName: 'ب',
      lastName: 'آ',
      mobile: '',
      extension: '',
      department: 'فروش',
      jobTitle: '',
      sortOrder: 0,
      visibilityTags: ['الفا'],
    },
    {
      id: '2',
      displayName: 'الف',
      firstName: 'الف',
      lastName: 'ب',
      mobile: '',
      extension: '',
      department: 'فروش',
      jobTitle: '',
      sortOrder: 1,
      visibilityTags: [],
    },
  ],
  'alpha',
  new Map()
);
assert(phoneSections[0]?.entries[0]?.lastName === 'آ', 'phone alpha sort by last name');

assert(canRecordFieldVisits({ role: 'member', department: 'فروش' }), 'field visit sales');
assert(!canRecordFieldVisits({ role: 'member', department: 'پشتیبانی' }), 'field visit support blocked');
assert(
  shouldRemindDailyReportToday('2026-03-01', '2026-03-01', undefined, true),
  'n4 remind when no report'
);

const phased = withProjectPhases([], [{ id: 'a', title: 'طراحی', listTitles: ['لیست ۱'] }]);
assert(getProjectPhases(phased).length === 1, 'project phases');
assert(getProjectMeta(phased).kind === 'meta', 'project meta row');

assert(incompleteDocCount({ photo: true }) === 3, 'personnel incomplete docs');

const letterNorm = normalizeLetterRecipients({ to: ['مدیر سیستم'], referredTo: [] });
assert(letterHasRecipients(letterNorm), 'letter recipients from `to`');
assert(letterNorm.referredTo.length > 0, 'letter referredTo mirrored from to');
assert(!letterHasRecipients({ to: [], referredTo: [] }), 'letter rejects empty recipients');

const draftLetter: MeizitoLetter = {
  id: 'ltr-test',
  subject: 'نامه تست',
  body: 'متن',
  to: ['مدیر'],
  labels: [],
  category: 'administrative',
  status: 'open',
  box: 'outbox',
  referredTo: ['مدیر'],
  referredFrom: '',
  threadId: 'ltr-test',
  attachments: [],
  createdAt: new Date().toISOString(),
  approvalState: 'draft',
  approvalSteps: [],
};
const submitted = applyLetterApprovalMutation(
  draftLetter,
  'submit',
  'user-a',
  'کاربر آ',
  [{ id: 'user-m', name: 'مدیر', role: 'manager' }]
);
assert(submitted.approvalState === 'pending', 'letter submit → pending');
assert((submitted.approvalSteps?.length ?? 0) >= 1, 'letter submit adds approval step');
assert(submitted.currentAssigneeId === 'user-m', 'letter submit assigns default manager');

const chatNorm = normalizeIncomingChatMessage({
  threadId: 't1',
  authorName: 'کاربر',
  body: 'سلام',
});
assert(chatNorm.author === 'کاربر' && chatNorm.threadId === 't1', 'chat authorName → author');
assert(chatNorm.createdAt && !Number.isNaN(Date.parse(chatNorm.createdAt)), 'chat createdAt default');

const reqPrepared = prepareRequestForPersist(
  {
    subject: 'درخواست تست',
    authorId: 'user-a',
    authorName: 'کاربر',
    category: 'other',
    priority: 'medium',
  },
  orgUsers
);
assert(Boolean(reqPrepared.id), 'request prepare id');
assert(Boolean(reqPrepared.createdAt), 'request prepare createdAt');
assert(Array.isArray(reqPrepared.attachments), 'request prepare attachments array');
assert(reqPrepared.box === 'outbox', 'request prepare box');

console.log('OK test-v9-backend');
