import { z } from 'zod';

const checklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  fileName: z.string().optional(),
});

/** POST/PATCH body for workspace cards (todo-v9 §2.1). */
export const workspaceCardWriteSchema = z
  .object({
    id: z.string().optional(),
    boardId: z.string().min(1, 'boardId الزامی است'),
    columnId: z.string().min(1, 'columnId الزامی است'),
    title: z.string().optional(),
    description: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    category: z.string().optional(),
    assignee: z.string().optional(),
    assigneeUserId: z.string().optional(),
    checklist: z.array(checklistItemSchema).optional(),
    attachments: z.array(z.record(z.unknown())).optional(),
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
    endDueDate: z.string().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly']).optional(),
    starred: z.boolean().optional(),
    calendarId: z.string().optional(),
    calendarEventId: z.string().optional(),
    addToCalendar: z.boolean().optional(),
    reminderMinutes: z.number().int().min(0).optional(),
    sourceChatMessageId: z.string().optional(),
    sourceChatThreadId: z.string().optional(),
  })
  .passthrough();

export const calendarEventWriteSchema = z.object({
  calendarId: z.string().optional(),
  title: z.string().optional(),
  date: z.string().min(1, 'date الزامی است'),
  endDate: z.string().optional(),
  time: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
  recurrenceUntil: z.string().optional(),
  seriesId: z.string().optional(),
  sourceCardId: z.string().optional(),
  notes: z.string().optional(),
  reminderMinutes: z.number().int().min(0).optional(),
  attendeeIds: z.array(z.string()).optional(),
  rsvp: z.record(z.enum(['pending', 'accepted', 'declined'])).optional(),
});

export function unwrapMeizitoBody(body: Record<string, unknown>, key: 'card' | 'event'): Record<string, unknown> {
  const nested = body[key];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...body, ...(nested as Record<string, unknown>) };
  }
  return body;
}
