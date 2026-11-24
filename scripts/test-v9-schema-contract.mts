import {
  assertTaskCalendarParity,
  taskCalendarFieldsSchema,
  timingFromCalendarEvent,
  timingFromCardFields,
} from '../src/lib/meizito/task-calendar-contract';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const card = {
  dueDate: '1404/08/15',
  dueTime: '10:00',
  endDueDate: '1404/08/16',
  endTime: '12:00',
  allDay: false,
  reminderMinutes: 60,
};

const event = {
  date: '1404/08/15',
  time: '10:00',
  endDate: '1404/08/16',
  endTime: '12:00',
  allDay: false,
  reminderMinutes: 60,
};

assertTaskCalendarParity(card, event);

const tCard = timingFromCardFields(card);
const tEvent = timingFromCalendarEvent(event);
assert(tCard.startDate === tEvent.startDate, 'startDate match');
assert(tCard.endDate === tEvent.endDate, 'endDate match');

taskCalendarFieldsSchema.parse({
  ...tCard,
  addToCalendar: true,
  calendarId: 'cal-1',
});

console.log('OK test-v9-schema-contract');
