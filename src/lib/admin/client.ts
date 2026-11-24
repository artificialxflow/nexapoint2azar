import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import type { PermissionDef } from '@/src/lib/auth/permissions-catalog';
import {
  mockGetBankAccess,
  mockGetRestrictions,
  mockListInvites,
  mockListRolesWithCatalog,
  mockListUsersAndRoles,
  mockPatchBankAccess,
  mockPatchRestrictions,
  mockPatchRolePermissions,
  mockPatchUser,
  mockProvisionUser,
  mockResetPassword,
  mockRevokeInvite,
  type ProvisionInput,
} from '@/src/lib/mock/settings-admin-store';
import type { AdminInviteRow, AdminRoleRow, AdminUserRow } from '@/src/views/settings/access/types';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

async function parseJson<T>(res: Response): Promise<T> {
  return parseApiJson<T>(res);
}

export async function fetchAdminUsersAndRoles(): Promise<{
  users: AdminUserRow[];
  roles: AdminRoleRow[];
}> {
  if (FRONTEND_ONLY) return mockListUsersAndRoles();
  const data = await parseJson<{ users: AdminUserRow[]; roles: AdminRoleRow[] }>(
    await fetch('/api/admin/users', { credentials: 'include' })
  );
  return data;
}

export async function fetchAdminInvites(): Promise<AdminInviteRow[]> {
  if (FRONTEND_ONLY) return mockListInvites();
  const data = await parseJson<{ invites: AdminInviteRow[] }>(
    await fetch('/api/admin/invites', { credentials: 'include' })
  );
  return data.invites;
}

export async function fetchAdminRoles(): Promise<{ roles: AdminRoleRow[]; catalog: PermissionDef[] }> {
  if (FRONTEND_ONLY) return mockListRolesWithCatalog();
  return parseJson(await fetch('/api/admin/roles', { credentials: 'include' }));
}

export async function patchAdminRolePermissions(
  roleId: string,
  permissions: Record<string, boolean>
): Promise<void> {
  if (FRONTEND_ONLY) {
    mockPatchRolePermissions(roleId, permissions);
    return;
  }
  await parseJson(
    await fetch(`/api/admin/roles/${roleId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions }),
    })
  );
}

export async function fetchAccessRequests(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
): Promise<
  Array<{
    id: string;
    mobilePhone: string;
    displayName: string | null;
    status: string;
    createdAt: string;
  }>
> {
  if (FRONTEND_ONLY) return [];
  const data = await parseJson<{ requests: Array<{ id: string; mobilePhone: string; displayName: string | null; status: string; createdAt: string }> }>(
    await fetch(`/api/admin/access-requests?status=${status}`, { credentials: 'include' })
  );
  return data.requests;
}

export async function approveAccessRequest(
  requestId: string,
  body: { systemRoleId: string; displayName?: string }
): Promise<void> {
  await parseJson(
    await fetch(`/api/admin/access-requests/${requestId}/approve`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

export async function rejectAccessRequest(requestId: string, note?: string): Promise<void> {
  await parseJson(
    await fetch(`/api/admin/access-requests/${requestId}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
  );
}

export type ProvisionCredentials = {
  mobilePhone: string;
  username: string;
  password: string | null;
  loginHint: string;
};

export async function provisionAdminUser(input: ProvisionInput): Promise<{
  credentials?: ProvisionCredentials;
  invite?: { url: string };
}> {
  if (FRONTEND_ONLY) return mockProvisionUser(input);
  const data = await parseJson<{
    credentials?: ProvisionCredentials;
    invite?: { url: string };
  }>(
    await fetch('/api/admin/users/provision', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, expiresInDays: input.expiresInDays ?? 7 }),
    })
  );
  return data;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  if (FRONTEND_ONLY) return;
  await parseJson(
    await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
  );
}

export async function patchAdminUser(
  userId: string,
  body: Record<string, unknown>
): Promise<void> {
  if (FRONTEND_ONLY) {
    mockPatchUser(userId, body as Parameters<typeof mockPatchUser>[1]);
    return;
  }
  await parseJson(
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

export async function resetAdminUserPassword(userId: string, newPassword: string): Promise<void> {
  if (FRONTEND_ONLY) {
    mockResetPassword(userId, newPassword);
    return;
  }
  await parseJson(
    await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
  );
}

export async function revokeAdminInvite(inviteId: string): Promise<void> {
  if (FRONTEND_ONLY) {
    mockRevokeInvite(inviteId);
    return;
  }
  await parseJson(
    await fetch(`/api/admin/invites/${inviteId}/revoke`, {
      method: 'POST',
      credentials: 'include',
    })
  );
}

export async function fetchUserRestrictions(userId: string) {
  if (FRONTEND_ONLY) return mockGetRestrictions(userId);
  const data = await parseJson<{ restrictions: ReturnType<typeof mockGetRestrictions> }>(
    await fetch(`/api/admin/users/${userId}/restrictions`, { credentials: 'include' })
  );
  return data.restrictions;
}

export async function patchUserRestrictions(
  userId: string,
  restrictions: ReturnType<typeof mockGetRestrictions>
): Promise<void> {
  if (FRONTEND_ONLY) {
    mockPatchRestrictions(userId, restrictions);
    return;
  }
  await parseJson(
    await fetch(`/api/admin/users/${userId}/restrictions`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restrictions),
    })
  );
}

export async function fetchUserBankAccess(userId: string) {
  if (FRONTEND_ONLY) return mockGetBankAccess(userId);
  const data = await parseJson<{ banks: ReturnType<typeof mockGetBankAccess> }>(
    await fetch(`/api/admin/users/${userId}/bank-access`, { credentials: 'include' })
  );
  return data.banks;
}

export async function patchUserBankAccess(
  userId: string,
  accessByCode: Record<string, boolean>
): Promise<void> {
  if (FRONTEND_ONLY) {
    const items = Object.entries(accessByCode).map(([code, allowed]) => ({
      bankAccountId: code,
      allowed,
    }));
    mockPatchBankAccess(userId, items);
    return;
  }
  await parseJson(
    await fetch(`/api/admin/users/${userId}/bank-access`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accessByCode),
    })
  );
}
