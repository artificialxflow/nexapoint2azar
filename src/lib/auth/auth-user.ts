export type { AuthUserPayload, PermissionMap } from '@/src/lib/auth/rbac';
export { serializeAuthUser } from '@/src/lib/auth/rbac';

import type { AuthUserPayload } from '@/src/lib/auth/rbac';

export function createDemoAuthUser(): AuthUserPayload {
  return {
    id: 'user-demo',
    username: 'demo',
    mobilePhone: null,
    displayName: 'کاربر نمایشی',
    status: 'active',
    mustChangePassword: false,
    avatarFileKey: null,
    avatarUrl: null,
    systemRole: {
      id: 'role-super',
      slug: 'super_admin',
      nameFa: 'مدیر سیستم',
      level: 100,
      permissions: {},
    },
  };
}
