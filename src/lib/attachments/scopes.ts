const ROOT = 'nexa';

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function attachmentScopeForBusinessRoot(businessId: string) {
  return `${ROOT}/${sanitizeId(businessId)}`;
}

export function attachmentScopeForMeizitoCard(businessId: string | null, boardId: string, cardId: string) {
  if (businessId) {
    return `${attachmentScopeForBusinessRoot(businessId)}/meizito/boards/${sanitizeId(boardId)}/cards/${sanitizeId(cardId)}`;
  }
  return `${ROOT}/meizito/boards/${sanitizeId(boardId)}/cards/${sanitizeId(cardId)}`;
}

export function attachmentScopeForMeizitoChat(businessId: string | null, threadId: string) {
  if (businessId) return `${attachmentScopeForBusinessRoot(businessId)}/meizito/chat/${sanitizeId(threadId)}`;
  return `${ROOT}/meizito/chat/${sanitizeId(threadId)}`;
}

export function attachmentScopeForMeizitoNotes(businessId: string | null) {
  if (businessId) return `${attachmentScopeForBusinessRoot(businessId)}/meizito/notes`;
  return `${ROOT}/meizito/notes`;
}

export function attachmentScopeForMeizitoRequests(businessId: string | null) {
  if (businessId) return `${attachmentScopeForBusinessRoot(businessId)}/meizito/requests`;
  return `${ROOT}/meizito/requests`;
}

export function attachmentScopeForMeizitoLetterDrafts(businessId: string | null) {
  if (businessId) return `${attachmentScopeForBusinessRoot(businessId)}/meizito/letters/drafts`;
  return `${ROOT}/meizito/letters/drafts`;
}

export function attachmentScopeForMeizitoProject(businessId: string | null, projectId: string) {
  if (businessId) {
    return `${attachmentScopeForBusinessRoot(businessId)}/meizito/projects/${sanitizeId(projectId)}`;
  }
  return `${ROOT}/meizito/projects/${sanitizeId(projectId)}`;
}

export function attachmentScopeForReceipt(receiptId: string) {
  return `${ROOT}/receipts/${sanitizeId(receiptId)}`;
}
