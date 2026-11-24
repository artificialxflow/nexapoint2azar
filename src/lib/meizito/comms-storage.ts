import type { LettersSnapshot } from '@/src/lib/meizito/letters/serialize';
import type { CalendarSnapshot } from '@/src/lib/meizito/calendar/serialize';
import type { ChatSnapshot } from '@/src/lib/meizito/chat/serialize';
import type { RequestsSnapshot } from '@/src/lib/meizito/requests/serialize';
import {
  loadCalendarSnapshotFromDb,
  loadChatSnapshotFromDb,
  loadLettersSnapshotFromDb,
  loadRequestsSnapshotFromDb,
  saveCalendarSnapshotToDb,
  saveChatSnapshotToDb,
  appendChatMessageToDb,
  deleteChatMessageInDb,
  updateChatMessageInDb,
  updateChatThreadInDb,
  saveLettersSnapshotToDb,
  appendLetterToDb,
  appendRequestToDb,
  updateLetterInDb,
  updateRequestInDb,
  saveRequestsSnapshotToDb,
} from '@/src/lib/meizito/comms-db-service';
import type {
  MeizitoChatMessage,
  MeizitoChatThread,
  MeizitoInternalRequest,
  MeizitoLetter,
} from '@/src/types/meizito';

export type MeizitoStorageMode = 'db';

export function commsStorageMode(): MeizitoStorageMode {
  // Preserves MEIZITO_COMMS_STORAGE env contract; normalized PostgreSQL tables are always authoritative.
  void process.env.MEIZITO_COMMS_STORAGE;
  return 'db';
}

export async function loadLettersSnapshot(businessId: string): Promise<LettersSnapshot> {
  return loadLettersSnapshotFromDb(businessId);
}

export async function persistLettersSnapshot(businessId: string, snap: LettersSnapshot) {
  await saveLettersSnapshotToDb(businessId, snap);
}

export async function replaceLetter(businessId: string, letter: MeizitoLetter) {
  await updateLetterInDb(businessId, letter);
}

export async function replaceRequest(businessId: string, request: MeizitoInternalRequest) {
  await updateRequestInDb(businessId, request);
}

export async function appendLetter(
  businessId: string,
  letter: LettersSnapshot['letters'][0],
  _snap?: LettersSnapshot
) {
  await appendLetterToDb(businessId, letter);
}

export async function appendRequest(
  businessId: string,
  request: MeizitoInternalRequest,
  _snap?: RequestsSnapshot
) {
  await appendRequestToDb(businessId, request);
}

export async function loadCalendarSnapshot(businessId: string): Promise<CalendarSnapshot> {
  return loadCalendarSnapshotFromDb(businessId);
}

export async function persistCalendarSnapshot(businessId: string, snap: CalendarSnapshot) {
  await saveCalendarSnapshotToDb(businessId, snap);
}

export async function loadChatSnapshot(businessId: string): Promise<ChatSnapshot> {
  return loadChatSnapshotFromDb(businessId);
}

export async function persistChatSnapshot(businessId: string, snap: ChatSnapshot) {
  await saveChatSnapshotToDb(businessId, snap);
}

export async function appendChatMessage(
  businessId: string,
  message: ChatSnapshot['messages'][0],
  _snap?: ChatSnapshot
) {
  await appendChatMessageToDb(businessId, message);
}

export async function patchChatThread(
  businessId: string,
  threadId: string,
  patch: Partial<Pick<MeizitoChatThread, 'title' | 'starred' | 'pinned' | 'participantNames'>>
) {
  await updateChatThreadInDb(businessId, threadId, patch);
}

export async function patchChatMessage(
  businessId: string,
  messageId: string,
  patch: Partial<Pick<MeizitoChatMessage, 'body' | 'editedAt'>>
) {
  await updateChatMessageInDb(businessId, messageId, patch);
}

export async function removeChatMessage(businessId: string, messageId: string) {
  await deleteChatMessageInDb(businessId, messageId);
}

export async function loadRequestsSnapshot(businessId: string): Promise<RequestsSnapshot> {
  return loadRequestsSnapshotFromDb(businessId);
}

export async function persistRequestsSnapshot(businessId: string, snap: RequestsSnapshot) {
  await saveRequestsSnapshotToDb(businessId, snap);
}
