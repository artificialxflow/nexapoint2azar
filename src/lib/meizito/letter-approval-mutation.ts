import {
  applyApprovalAction,
  applySubmitForApproval,
  type RecordApprovalPayload,
} from '@/src/lib/meizito/approval';
import { normalizeLetterRecipients } from '@/src/lib/meizito/letter-recipients';
import type { MeizitoApprovalAction, MeizitoLetter, MeizitoMockUser } from '@/src/types/meizito';

export function applyLetterApprovalMutation(
  existing: MeizitoLetter,
  action: MeizitoApprovalAction,
  actorId: string,
  actorName: string,
  directoryUsers: MeizitoMockUser[],
  extra?: Omit<RecordApprovalPayload, 'actorId' | 'actorName' | 'action'>
): MeizitoLetter {
  const fields =
    action === 'submit'
      ? applySubmitForApproval(existing, actorId, actorName, undefined, directoryUsers)
      : applyApprovalAction(existing, {
          actorId,
          actorName,
          action,
          comment: extra?.comment,
          forwardToUserId: extra?.forwardToUserId,
          forwardToUserName: extra?.forwardToUserName,
          forwardToUserIds: extra?.forwardToUserIds,
          forwardToUserNames: extra?.forwardToUserNames,
        });
  return normalizeLetterRecipients({ ...existing, ...fields });
}
