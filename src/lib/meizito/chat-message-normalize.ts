import type { ChatSnapshot } from '@/src/lib/meizito/chat/serialize';

type RawMessage = Record<string, unknown>;

export type NormalizedChatMessageInput = Omit<ChatSnapshot['messages'][0], 'id'> & { id?: string };

export function normalizeIncomingChatMessage(
  raw: RawMessage,
  fallbackThreadId?: string
): NormalizedChatMessageInput {
  const threadId = String(raw.threadId ?? fallbackThreadId ?? '').trim();
  const author = String(raw.author ?? raw.authorName ?? '').trim();
  const body = String(raw.body ?? '');
  const type = (raw.type ?? raw.messageType ?? 'text') as ChatSnapshot['messages'][0]['type'];
  const createdRaw = raw.createdAt;
  let createdAt: string;
  if (typeof createdRaw === 'string' && !Number.isNaN(Date.parse(createdRaw))) {
    createdAt = createdRaw;
  } else {
    createdAt = new Date().toISOString();
  }
  const attachmentNames = Array.isArray(raw.attachmentNames)
    ? (raw.attachmentNames as string[])
    : [];
  const attachmentRefs = Array.isArray(raw.attachmentRefs) ? raw.attachmentRefs : [];
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : undefined;
  return {
    ...(id ? { id } : {}),
    threadId,
    author,
    body,
    createdAt,
    type,
    attachmentNames,
    attachmentRefs: attachmentRefs as ChatSnapshot['messages'][0]['attachmentRefs'],
    voiceDurationSec:
      typeof raw.voiceDurationSec === 'number' ? raw.voiceDurationSec : undefined,
  };
}
