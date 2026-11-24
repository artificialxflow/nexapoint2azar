import { z } from 'zod';

/** SSOT shared date/time fields — card due* ↔ calendar event date/endDate (todo-v9 §1.1) */
export const taskCalendarTimingSchema = z.object({
  startDate: z.string().default(''),
  startTime: z.string().default(''),
  endDate: z.string().default(''),
  endTime: z.string().default(''),
  allDay: z.boolean().default(false),
  reminderMinutes: z.number().int().min(0).nullable().optional(),
});

export type TaskCalendarTiming = z.infer<typeof taskCalendarTimingSchema>;

export const taskCalendarFieldsSchema = taskCalendarTimingSchema.extend({
  addToCalendar: z.boolean().default(false),
  calendarId: z.string().optional(),
  calendarEventId: z.string().optional(),
});

export type TaskCalendarFields = z.infer<typeof taskCalendarFieldsSchema>;

export function timingFromCardFields(input: {
  dueDate?: string;
  dueTime?: string;
  endDueDate?: string;
  endTime?: string;
  allDay?: boolean;
  reminderMinutes?: number | null;
}): TaskCalendarTiming {
  return taskCalendarTimingSchema.parse({
    startDate: input.dueDate ?? '',
    startTime: input.dueTime ?? '',
    endDate: input.endDueDate ?? input.dueDate ?? '',
    endTime: input.endTime ?? '',
    allDay: input.allDay ?? false,
    reminderMinutes: input.reminderMinutes ?? null,
  });
}

export function timingFromCalendarEvent(input: {
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  allDay?: boolean;
  reminderMinutes?: number;
}): TaskCalendarTiming {
  return taskCalendarTimingSchema.parse({
    startDate: input.date ?? '',
    startTime: input.time ?? '',
    endDate: input.endDate ?? input.date ?? '',
    endTime: input.endTime ?? '',
    allDay: input.allDay ?? false,
    reminderMinutes: input.reminderMinutes ?? null,
  });
}

/** Assert card and event timings describe the same schedule (for sync guard/tests). */
export function assertTaskCalendarParity(
  card: Parameters<typeof timingFromCardFields>[0],
  event: Parameters<typeof timingFromCalendarEvent>[0]
): void {
  const a = timingFromCardFields(card);
  const b = timingFromCalendarEvent(event);
  const keys: (keyof TaskCalendarTiming)[] = [
    'startDate',
    'startTime',
    'endDate',
    'endTime',
    'allDay',
    'reminderMinutes',
  ];
  for (const key of keys) {
    if (a[key] !== b[key]) {
      throw new Error(`task-calendar parity: ${key} mismatch (${String(a[key])} vs ${String(b[key])})`);
    }
  }
}
