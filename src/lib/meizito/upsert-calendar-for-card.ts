import { loadCalendarSnapshot, persistCalendarSnapshot } from '@/src/lib/meizito/comms-storage';
import { cardShouldSyncToCalendar, eventPatchFromCard } from '@/src/lib/meizito/card-calendar-sync';
import type { MeizitoCalendarEvent, MeizitoCard } from '@/src/types/meizito';

/** todo-v9 §2.1 — materialize or drop calendar row for one card */
export async function upsertCalendarEventForCard(businessId: string, card: MeizitoCard): Promise<void> {
  const calSnap = await loadCalendarSnapshot(businessId);
  const rest = (calSnap.events ?? []).filter((e) => e.sourceCardId !== card.id);

  if (!cardShouldSyncToCalendar(card)) {
    calSnap.events = rest;
    await persistCalendarSnapshot(businessId, calSnap);
    return;
  }

  const calendarId = card.calendarId || calSnap.calendars?.[0]?.id;
  if (!calendarId) return;

  const base = eventPatchFromCard(card, calendarId);
  const event: MeizitoCalendarEvent = {
    ...base,
    id: card.calendarEventId || `sync-${card.id}`,
  };
  calSnap.events = [...rest, event];
  await persistCalendarSnapshot(businessId, calSnap);
}
