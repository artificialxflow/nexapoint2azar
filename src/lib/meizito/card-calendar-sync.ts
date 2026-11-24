import type { MeizitoCalendarEvent, MeizitoCard } from '@/src/types/meizito';
import { timingFromCardFields } from '@/src/lib/meizito/task-calendar-contract';

/** Build calendar event payload from card (todo-v9 §2.1 — server/context use). */
export function eventPatchFromCard(
  card: MeizitoCard,
  calendarId: string
): Omit<MeizitoCalendarEvent, 'id'> {
  const timing = timingFromCardFields({
    dueDate: card.dueDate,
    dueTime: card.dueTime,
    endDueDate: card.endDueDate,
    endTime: card.dueTime,
    reminderMinutes: card.reminderMinutes ?? null,
  });
  return {
    calendarId,
    title: card.title,
    date: timing.startDate,
    endDate: timing.endDate || timing.startDate,
    time: timing.startTime || undefined,
    endTime: timing.endTime || undefined,
    allDay: timing.allDay,
    reminderMinutes: timing.reminderMinutes ?? undefined,
    sourceCardId: card.id,
    attendeeIds: card.assigneeUserId ? [card.assigneeUserId] : [],
  };
}

/** Whether card should materialize a calendar row (explicit opt-in or legacy dueDate + calendarId). */
export function cardShouldSyncToCalendar(card: MeizitoCard): boolean {
  if (card.addToCalendar) return Boolean(card.dueDate?.trim());
  return Boolean(card.calendarId && card.dueDate?.trim());
}
