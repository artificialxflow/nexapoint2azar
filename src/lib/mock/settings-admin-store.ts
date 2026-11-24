import { PERMISSION_CATALOG, permissionsForPreset } from '@/src/lib/auth/permissions-catalog';
import type { AdminInviteRow, AdminRoleRow, AdminUserRow } from '@/src/views/settings/access/types';

type Restrictions = {
  ownSalesOnly: boolean;
  ownPurchaseOnly: boolean;
  timeWindowEnabled: boolean;
  allowedFrom: string | null;
  allowedTo: string | null;
};

type BankRow = { id: string; nameFa: string; code: string; allowed: boolean };

type AdminState = {
  roles: AdminRoleRow[];
  users: AdminUserRow[];
  invites: AdminInviteRow[];
  restrictions: Record<string, Restrictions>;
  bankAccess: Record<string, Record<string, boolean>>;
};

const STORAGE_KEY = 'nexa-mock-admin-settings-v1';

const MOCK_BANKS: Omit<BankRow, 'allowed'>[] = [
  { id: 'bank-mellat', nameFa: 'بانک ملت', code: 'MELLAT' },
  { id: 'bank-melli', nameFa: 'بانک ملی', code: 'MELLI' },
  { id: 'bank-parsian', nameFa: 'بانک پارسیان', code: 'PARSIAN' },
  { id: 'bank-cash', nameFa: 'صندوق مرکزی', code: 'CASH' },
];

function defaultRestrictions(): Restrictions {
  return {
    ownSalesOnly: false,
    ownPurchaseOnly: false,
    timeWindowEnabled: false,
    allowedFrom: null,
    allowedTo: null,
  };
}

function seedState(): AdminState {
  const fullPerms = permissionsForPreset('full');
  const salesPerms = permissionsForPreset('sales_only');
  const financePerms = permissionsForPreset('finance_only');

  const roles: AdminRoleRow[] = [
    {
      id: 'role-super',
      slug: 'super_admin',
      nameFa: 'مدیر سیستم',
      level: 100,
      isSystem: true,
      permissions: fullPerms,
      userCount: 1,
    },
    {
      id: 'role-manager',
      slug: 'manager',
      nameFa: 'مدیر',
      level: 80,
      isSystem: true,
      permissions: { ...fullPerms, 'users:write': false, 'invites:write': false },
      userCount: 0,
    },
    {
      id: 'role-accountant',
      slug: 'accountant',
      nameFa: 'حسابدار',
      level: 60,
      isSystem: true,
      permissions: financePerms,
      userCount: 0,
    },
    {
      id: 'role-sales',
      slug: 'sales',
      nameFa: 'فروش',
      level: 40,
      isSystem: true,
      permissions: salesPerms,
      userCount: 0,
    },
  ];

  const users: AdminUserRow[] = [
    {
      id: 'user-demo',
      username: 'demo',
      displayName: 'کاربر نمایشی',
      status: 'active',
      mustChangePassword: false,
      accessLevelPreset: 'full',
      systemRole: {
        id: 'role-super',
        slug: 'super_admin',
        nameFa: 'مدیر سیستم',
        level: 100,
      },
      lastLoginAt: new Date().toISOString(),
    },
    {
      id: 'user-sales-1',
      username: 'sales1',
      displayName: 'علی فروشنده',
      status: 'active',
      mustChangePassword: false,
      accessLevelPreset: 'sales_only',
      systemRole: {
        id: 'role-sales',
        slug: 'sales',
        nameFa: 'فروش',
        level: 40,
      },
      lastLoginAt: null,
    },
  ];

  return {
    roles,
    users,
    invites: [],
    restrictions: {
      'user-demo': defaultRestrictions(),
      'user-sales-1': { ...defaultRestrictions(), ownSalesOnly: true },
    },
    bankAccess: {},
  };
}

function readState(): AdminState {
  if (typeof window === 'undefined') return seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedState();
      writeState(seeded);
      return seeded;
    }
    return JSON.parse(raw) as AdminState;
  } catch {
    const seeded = seedState();
    writeState(seeded);
    return seeded;
  }
}

function writeState(state: AdminState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncRoleUserCounts(state: AdminState): AdminState {
  const counts = new Map<string, number>();
  for (const u of state.users) {
    counts.set(u.systemRole.id, (counts.get(u.systemRole.id) ?? 0) + 1);
  }
  return {
    ...state,
    roles: state.roles.map((r) => ({ ...r, userCount: counts.get(r.id) ?? 0 })),
  };
}

function getState(): AdminState {
  return syncRoleUserCounts(readState());
}

function saveState(state: AdminState) {
  writeState(syncRoleUserCounts(state));
}

export function mockListUsersAndRoles(): { users: AdminUserRow[]; roles: AdminRoleRow[] } {
  const state = getState();
  return { users: [...state.users], roles: [...state.roles] };
}

export function mockListInvites(): AdminInviteRow[] {
  return [...getState().invites];
}

export function mockListRolesWithCatalog(): { roles: AdminRoleRow[]; catalog: typeof PERMISSION_CATALOG } {
  const state = getState();
  return { roles: [...state.roles], catalog: PERMISSION_CATALOG };
}

export function mockPatchRolePermissions(roleId: string, permissions: Record<string, boolean>): void {
  const state = getState();
  const idx = state.roles.findIndex((r) => r.id === roleId);
  if (idx < 0) throw new Error('نقش یافت نشد.');
  if (state.roles[idx].slug === 'super_admin') throw new Error('ویرایش نقش مدیر سیستم مجاز نیست.');
  state.roles[idx] = { ...state.roles[idx], permissions: { ...permissions } };
  saveState(state);
}

export function mockPatchUser(
  userId: string,
  patch: {
    displayName?: string;
    systemRoleId?: string;
    mustChangePassword?: boolean;
    status?: 'active' | 'disabled';
    accessLevelPreset?: string;
  }
): void {
  const state = getState();
  const idx = state.users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error('کاربر یافت نشد.');
  const user = state.users[idx];
  let systemRole = user.systemRole;
  if (patch.systemRoleId) {
    const role = state.roles.find((r) => r.id === patch.systemRoleId);
    if (!role) throw new Error('نقش یافت نشد.');
    systemRole = {
      id: role.id,
      slug: role.slug,
      nameFa: role.nameFa,
      level: role.level,
    };
  }
  state.users[idx] = {
    ...user,
    ...patch,
    systemRole,
  };
  saveState(state);
}

export function mockResetPassword(_userId: string, _newPassword: string): void {
  void _userId;
  void _newPassword;
}

export type ProvisionInput = {
  displayName: string;
  systemRoleId: string;
  credentialMode: 'manual' | 'auto' | 'self';
  delivery: 'direct' | 'invite';
  mobilePhone?: string;
  username?: string;
  password?: string;
  expiresInDays?: number;
};

export function mockProvisionUser(input: ProvisionInput): {
  credentials?: {
    mobilePhone: string;
    username: string;
    password: string | null;
    loginHint: string;
  };
  invite?: { url: string };
} {
  const state = getState();
  const role = state.roles.find((r) => r.id === input.systemRoleId);
  if (!role) throw new Error('نقش یافت نشد.');

  if (input.delivery === 'invite') {
    const id = `inv-${Date.now()}`;
    const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 86400000).toISOString();
    const token = `mock-${id}`;
    state.invites.unshift({
      id,
      role: { slug: role.slug, nameFa: role.nameFa },
      expiresAt,
      status: 'pending',
      displayName: input.displayName.trim(),
      credentialMode: input.credentialMode,
    });
    saveState(state);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return { invite: { url: `${origin}/invite/${id}?t=${token}` } };
  }

  const username =
    input.username?.trim().toLowerCase() ||
    `user${Math.floor(1000 + Math.random() * 9000)}`;
  const password = input.password || `Nexa${Math.floor(100000 + Math.random() * 900000)}`;
  const mobilePhone = input.mobilePhone?.trim() || '09120000000';

  const user: AdminUserRow = {
    id: `user-${Date.now()}`,
    username,
    displayName: input.displayName.trim(),
    status: 'active',
    mustChangePassword: true,
    accessLevelPreset: 'custom',
    systemRole: {
      id: role.id,
      slug: role.slug,
      nameFa: role.nameFa,
      level: role.level,
    },
    lastLoginAt: null,
  };
  state.users.unshift(user);
  state.restrictions[user.id] = defaultRestrictions();
  saveState(state);
  return {
    credentials: {
      mobilePhone,
      username,
      password,
      loginHint: 'ورود با کد پیامکی به همین شماره موبایل',
    },
  };
}

export function mockRevokeInvite(inviteId: string): void {
  const state = getState();
  const inv = state.invites.find((i) => i.id === inviteId);
  if (!inv) throw new Error('دعوت یافت نشد.');
  inv.status = 'revoked';
  saveState(state);
}

export function mockGetRestrictions(userId: string): Restrictions {
  const state = getState();
  return { ...(state.restrictions[userId] ?? defaultRestrictions()) };
}

export function mockPatchRestrictions(userId: string, data: Restrictions): void {
  const state = getState();
  if (!state.users.some((u) => u.id === userId)) throw new Error('کاربر یافت نشد.');
  state.restrictions[userId] = { ...data };
  saveState(state);
}

export function mockGetBankAccess(userId: string): BankRow[] {
  const state = getState();
  const map = state.bankAccess[userId] ?? {};
  return MOCK_BANKS.map((b) => ({
    ...b,
    allowed: map[b.id] ?? true,
  }));
}

export function mockPatchBankAccess(
  userId: string,
  items: { bankAccountId: string; allowed: boolean }[]
): void {
  const state = getState();
  if (!state.users.some((u) => u.id === userId)) throw new Error('کاربر یافت نشد.');
  const map: Record<string, boolean> = {};
  for (const item of items) {
    map[item.bankAccountId] = item.allowed;
  }
  state.bankAccess[userId] = map;
  saveState(state);
}
