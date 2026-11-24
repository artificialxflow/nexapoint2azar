import type { SystemRole, User } from '@prisma/client';
import type { AdminRoleRow, AdminUserRow } from '@/src/views/settings/access/types';
import { getPermissions } from '@/src/lib/auth/rbac';

export function serializeAdminUser(user: User & { systemRole: SystemRole }): AdminUserRow {
  return {
    id: user.id,
    username: user.username,
    mobilePhone: user.mobilePhone,
    displayName: user.displayName,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    systemRole: {
      id: user.systemRole.id,
      slug: user.systemRole.slug,
      nameFa: user.systemRole.nameFa,
      level: user.systemRole.level,
    },
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export function serializeAdminRole(role: SystemRole, userCount = 0): AdminRoleRow {
  return {
    id: role.id,
    slug: role.slug,
    nameFa: role.nameFa,
    level: role.level,
    isSystem: role.isSystem,
    permissions: getPermissions(role),
    userCount,
  };
}
