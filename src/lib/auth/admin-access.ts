import type { NextRequest } from 'next/server';
import { requireSessionUser, type SessionUser } from '@/src/lib/auth/session';
import { getPermissions } from '@/src/lib/auth/rbac';

export async function requireSuperAdmin(req: NextRequest): Promise<SessionUser> {
  const user = await requireSessionUser(req);
  if (user.systemRole.level < 100) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requirePermission(
  req: NextRequest,
  permissionKey: string
): Promise<SessionUser> {
  const user = await requireSessionUser(req);
  if (user.systemRole.level >= 100) return user;
  const perms = getPermissions(user.systemRole);
  if (!perms[permissionKey]) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireAnyPermission(
  req: NextRequest,
  keys: string[]
): Promise<SessionUser> {
  const user = await requireSessionUser(req);
  if (user.systemRole.level >= 100) return user;
  const perms = getPermissions(user.systemRole);
  if (!keys.some((k) => perms[k])) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
