import type { SystemRole, User } from '@prisma/client';
import { attachmentUrlFromFileKey } from '@/src/lib/media/attachment-url';

export type PermissionMap = Record<string, boolean>;

export type AuthUserPayload = {
  id: string;
  username: string;
  mobilePhone: string | null;
  displayName: string;
  status: User['status'];
  mustChangePassword: boolean;
  avatarFileKey: string | null;
  avatarUrl: string | null;
  systemRole: {
    id: string;
    slug: string;
    nameFa: string;
    level: number;
    permissions: PermissionMap;
  };
};

export function getPermissions(role: SystemRole): PermissionMap {
  if (!role.permissions || typeof role.permissions !== 'object') return {};
  return role.permissions as PermissionMap;
}

export function serializeAuthUser(user: User & { systemRole: SystemRole }): AuthUserPayload {
  const avatarFileKey = user.avatarFileKey?.trim() || null;
  return {
    id: user.id,
    username: user.username,
    mobilePhone: user.mobilePhone,
    displayName: user.displayName,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    avatarFileKey,
    avatarUrl: attachmentUrlFromFileKey(avatarFileKey),
    systemRole: {
      id: user.systemRole.id,
      slug: user.systemRole.slug,
      nameFa: user.systemRole.nameFa,
      level: user.systemRole.level,
      permissions: getPermissions(user.systemRole),
    },
  };
}
