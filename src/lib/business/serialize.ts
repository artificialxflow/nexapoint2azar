import type { Business, BusinessMember, BusinessMemberRole, BusinessProfile } from '@prisma/client';
import type { NexaBusiness, NexaBusinessRole } from '@/src/types/business';
import { attachmentUrlFromFileKey } from '@/src/lib/media/attachment-url';

function mapRole(role: BusinessMemberRole): NexaBusinessRole {
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  return 'member';
}

export function serializeBusiness(
  business: Business,
  membership: Pick<BusinessMember, 'role'>,
  profile?: Pick<BusinessProfile, 'logoFileKey'> | null
): NexaBusiness {
  const logoFileKey = profile?.logoFileKey?.trim() || null;
  return {
    id: business.id,
    name: business.name,
    role: mapRole(membership.role),
    plan: business.plan,
    expiresAt: business.expiresAt?.toISOString(),
    creditLabel: business.creditLabel,
    createdAt: business.createdAt.toISOString(),
    isArchived: business.status === 'archived',
    logoUrl: attachmentUrlFromFileKey(logoFileKey),
  };
}
