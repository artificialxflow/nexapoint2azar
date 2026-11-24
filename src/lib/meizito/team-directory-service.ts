import type { BusinessMemberRole } from '@prisma/client';
import { prisma } from '@/src/lib/db/prisma';
import type { MeizitoMockUser, MeizitoMockUserRole } from '@/src/types/meizito';
import { attachmentUrlFromFileKey } from '@/src/lib/media/attachment-url';

function mapMemberRole(role: BusinessMemberRole): MeizitoMockUserRole {
  if (role === 'owner') return 'senior_manager';
  if (role === 'admin') return 'manager';
  return 'member';
}

function jobTitleForRole(role: BusinessMemberRole): string {
  if (role === 'owner') return 'مالک';
  if (role === 'admin') return 'مدیر';
  return 'عضو';
}

export async function getTeamDirectoryForBusiness(businessId: string): Promise<{
  members: MeizitoMockUser[];
  allMembers: MeizitoMockUser[];
}> {
  const [rows, assignments] = await Promise.all([
    prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            mobilePhone: true,
            username: true,
            avatarFileKey: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.orgAssignment.findMany({
      where: { businessId },
      include: { unit: { select: { name: true } } },
    }),
  ]);

  const assignmentByUser = new Map(assignments.map((a) => [a.userId, a]));
  const managesSomeone = new Set(
    assignments.map((a) => a.managerUserId).filter((id): id is string => Boolean(id))
  );

  const members: MeizitoMockUser[] = rows.map((m) => {
    const assign = assignmentByUser.get(m.userId);
    const managerId = assign?.managerUserId ?? undefined;
    let role = mapMemberRole(m.role);
    if (managesSomeone.has(m.userId) && role === 'member') role = 'manager';
    const avatarFileKey = m.user.avatarFileKey?.trim() || null;
    return {
      id: m.userId,
      name: m.user.displayName,
      role,
      managerId,
      avatarUrl: attachmentUrlFromFileKey(avatarFileKey) ?? undefined,
      mobile: m.user.mobilePhone ?? undefined,
      email: (() => {
        const un = m.user.username?.trim() ?? '';
        return un.includes('@') ? un : undefined;
      })(),
      jobTitle: assign?.roleTitle?.trim() || jobTitleForRole(m.role),
      department: assign?.unit?.name ?? '',
    };
  });

  return { members, allMembers: members };
}
