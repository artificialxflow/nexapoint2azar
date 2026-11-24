import { randomUUID } from 'crypto';
import { normalizeInternalRequest } from '@/src/lib/meizito/teamHierarchy';
import type { MeizitoInternalRequest, MeizitoMockUser } from '@/src/types/meizito';

/** Normalize a new/patched internal request before DB or slice persist (UAT 5.06). */
export function prepareRequestForPersist(
  input: Partial<MeizitoInternalRequest> & Pick<MeizitoInternalRequest, 'subject'>,
  users: MeizitoMockUser[] = []
): MeizitoInternalRequest {
  const now = new Date().toISOString();
  const id = input.id || randomUUID();
  const draft: MeizitoInternalRequest = {
    id,
    subject: input.subject.trim(),
    body: input.body?.trim() ?? '',
    status: input.status ?? 'open',
    priority: input.priority ?? 'medium',
    category: input.category ?? 'other',
    authorId: input.authorId ?? '',
    authorName: input.authorName ?? '',
    attachments: input.attachments ?? [],
    referredToUserIds: input.referredToUserIds ?? [],
    referredTo: input.referredTo ?? [],
    ccUserIds: input.ccUserIds ?? [],
    box: input.box ?? 'outbox',
    requestKind: input.requestKind ?? 'admin',
    createdAt: input.createdAt ?? now,
    threadId: input.threadId ?? id,
    replyToRequestId: input.replyToRequestId,
    sourceChatMessageId: input.sourceChatMessageId,
    hrSubtype: input.hrSubtype,
    hrFormPayload: input.hrFormPayload,
    approvalState: input.approvalState,
    currentAssigneeId: input.currentAssigneeId,
    approvalSteps: input.approvalSteps ?? [],
    submittedAt: input.submittedAt,
    closedAt: input.closedAt,
  };
  return normalizeInternalRequest(draft, users);
}
