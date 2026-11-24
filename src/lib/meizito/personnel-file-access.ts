import { prisma } from '@/src/lib/db/prisma';

export type PersonnelFileAccess = { canRead: boolean; canEdit: boolean; canReview: boolean };

export function evaluatePersonnelFileAccess(
  actorId: string,
  targetUserId: string,
  memberRole: string | undefined,
  managerUserId: string | null | undefined
): PersonnelFileAccess {
  if (memberRole === 'owner' || memberRole === 'admin') {
    return { canRead: true, canEdit: true, canReview: true };
  }
  if (actorId === targetUserId) {
    return { canRead: true, canEdit: true, canReview: false };
  }
  if (managerUserId && managerUserId === actorId) {
    return {
      canRead: true,
      canEdit: true,
      canReview: true,
    };
  }
  return { canRead: false, canEdit: false, canReview: false };
}

export async function resolvePersonnelFileAccess(
  businessId: string,
  actorId: string,
  targetUserId: string,
  memberRole: string | undefined
): Promise<PersonnelFileAccess> {
  const assignment = await prisma.orgAssignment.findUnique({
    where: { businessId_userId: { businessId, userId: targetUserId } },
    select: { managerUserId: true },
  });
  return evaluatePersonnelFileAccess(
    actorId,
    targetUserId,
    memberRole,
    assignment?.managerUserId ?? null
  );
}
