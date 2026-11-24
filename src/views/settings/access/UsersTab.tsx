'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Loader2,
  MoreVertical,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserCog,
  UserX,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import AdminToast, { useAdminToast } from '@/src/components/admin/AdminToast';
import ConfirmDialog from '@/src/components/admin/ConfirmDialog';
import ResetPasswordModal from '@/src/components/admin/ResetPasswordModal';
import EditUserModal from '@/src/components/admin/EditUserModal';
import UserFormModal from '@/src/components/admin/UserFormModal';
import CredentialsRevealModal from '@/src/components/admin/CredentialsRevealModal';
import InviteLinkModal from '@/src/components/admin/InviteLinkModal';
import type { AdminInviteRow, AdminRoleRow, AdminUserRow } from '@/src/views/settings/access/types';
import { formatLastLogin } from '@/src/views/settings/access/types';
import {
  fetchAdminInvites,
  fetchAdminUsersAndRoles,
  patchAdminUser,
  deleteAdminUser,
  provisionAdminUser,
  resetAdminUserPassword,
  revokeAdminInvite,
  type ProvisionCredentials,
} from '@/src/lib/admin/client';
import PendingAccessPanel from '@/src/views/settings/access/PendingAccessPanel';
import UserRowActionMenu from '@/src/components/admin/UserRowActionMenu';

type UsersTabProps = {
  innerTab: 'users' | 'roles';
  onInnerTabChange: (tab: 'users' | 'roles') => void;
  rolesSlot: React.ReactNode;
};

export default function UsersTab({ innerTab, onInnerTabChange, rolesSlot }: UsersTabProps) {
  const { user: me } = useAuth();
  const { message, error, toast, dismiss } = useAdminToast();
  const canWrite = Boolean(me?.systemRole.permissions['users:write'] || me?.systemRole.slug === 'super_admin');
  const canInvite = Boolean(me?.systemRole.permissions['invites:write'] || me?.systemRole.slug === 'super_admin');

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [invites, setInvites] = useState<AdminInviteRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'pending'>('all');
  const [actionMenuUser, setActionMenuUser] = useState<AdminUserRow | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null);

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<AdminUserRow | null>(null);
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ProvisionCredentials | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const assignableRoles = roles.filter((r) => {
    if (!me) return false;
    if (me.systemRole.slug === 'super_admin') return true;
    return r.level < me.systemRole.level && r.slug !== 'super_admin';
  });

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setInitialLoading(true);
      else setRefreshing(true);
      try {
        const { users: userRows, roles: roleRows } = await fetchAdminUsersAndRoles();
        setUsers(userRows);
        setRoles(roleRows);
        if (canInvite) {
          setInvites(await fetchAdminInvites());
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : 'خطا', true);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [canInvite, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim();
      const matchQ =
        !q || u.displayName.includes(q) || u.username.includes(q.toLowerCase());
      const matchS = statusFilter === 'all' || u.status === statusFilter;
      return matchQ && matchS;
    });
  }, [users, searchQuery, statusFilter]);

  const handleProvision = async (data: Parameters<NonNullable<React.ComponentProps<typeof UserFormModal>['onSubmit']>>[0]) => {
    const result = await provisionAdminUser({ ...data, expiresInDays: 7 });
    if (result.credentials) setCredentials(result.credentials);
    if (result.invite?.url) setInviteUrl(result.invite.url);
    toast(
      data.delivery === 'invite'
        ? 'لینک دعوت ساخته شد.'
        : 'کاربر ساخته شد — تا «فعال‌سازی» نمی‌تواند وارد شود.'
    );
    load(true);
  };

  const handleEdit = async (data: { displayName: string; systemRoleId: string; mustChangePassword: boolean }) => {
    if (!editUser) return;
    await patchAdminUser(editUser.id, data);
    toast('کاربر بروزرسانی شد.');
    load(true);
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetUser) return;
    await resetAdminUserPassword(resetUser.id, newPassword);
    toast('رمز عبور بروزرسانی شد.');
  };

  const confirmToggleStatus = async () => {
    if (!confirmToggle) return;
    setToggleLoading(true);
    try {
      await patchAdminUser(confirmToggle.id, {
        status: confirmToggle.status === 'active' ? 'disabled' : 'active',
      });
      toast(
        confirmToggle.status === 'active'
          ? 'کاربر غیرفعال شد.'
          : confirmToggle.status === 'pending'
            ? 'کاربر تأیید و فعال شد.'
            : 'کاربر فعال شد.'
      );
      load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا', true);
    } finally {
      setToggleLoading(false);
      setConfirmToggle(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await deleteAdminUser(deleteUser.id);
      toast('کاربر حذف شد.');
      load(true);
      setDeleteUser(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا', true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeActionMenu = () => {
    setActionMenuUser(null);
    setActionMenuAnchor(null);
  };

  const confirmRevokeInvite = async () => {
    if (!revokeInviteId) return;
    setRevokeLoading(true);
    try {
      await revokeAdminInvite(revokeInviteId);
      toast('دعوت لغو شد.');
      load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا', true);
    } finally {
      setRevokeLoading(false);
      setRevokeInviteId(null);
    }
  };

  if (initialLoading) {
    return <div className="p-8 text-sm text-gray-500">در حال بارگذاری…</div>;
  }

  return (
    <>
      <AdminToast message={message} error={error} onDismiss={dismiss} />

      {innerTab === 'users' && <PendingAccessPanel roles={roles} canWrite={canWrite} />}

      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => onInnerTabChange('users')}
            className={`px-6 py-2 rounded-xl text-xs font-bold ${
              innerTab === 'users' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400'
            }`}
          >
            لیست کاربران
          </button>
          <button
            type="button"
            onClick={() => onInnerTabChange('roles')}
            className={`px-6 py-2 rounded-xl text-xs font-bold ${
              innerTab === 'roles' ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400'
            }`}
          >
            تعریف نقش‌ها
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            بروزرسانی
          </button>
          {canWrite && innerTab === 'users' && (
            <button
              type="button"
              onClick={() => setUserFormOpen(true)}
              className="nexa-btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              افزودن کاربر
            </button>
          )}
        </div>
      </div>

      {innerTab === 'roles' ? (
        rolesSlot
      ) : (
        <div className="space-y-4">
          <div className="nexa-card p-4 flex flex-col md:flex-row gap-4 md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو نام یا username…"
                className="w-full bg-gray-50 rounded-2xl py-2.5 pr-10 pl-4 text-sm outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'pending', 'disabled'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold ${
                    statusFilter === s ? 'bg-nexa-primary text-white' : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {s === 'all'
                    ? 'همه'
                    : s === 'active'
                      ? 'فعال'
                      : s === 'pending'
                        ? 'در انتظار'
                        : 'غیرفعال'}
                </button>
              ))}
            </div>
          </div>

          <div className="nexa-card overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-nexa-border text-xs text-gray-400">
                  <th className="px-4 py-3">کاربر</th>
                  <th className="px-4 py-3">نقش</th>
                  <th className="px-4 py-3">آخرین ورود</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-nexa-accent/10 text-nexa-accent flex items-center justify-center font-black text-xs">
                          {user.displayName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.displayName}</p>
                          <p className="text-[10px] text-gray-400 dir-ltr">
                            {user.mobilePhone ?? user.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg">{user.systemRole.nameFa}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatLastLogin(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      {user.status === 'active' ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <UserCheck size={12} /> فعال
                        </span>
                      ) : user.status === 'pending' ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <Loader2 size={12} className="opacity-70" /> در انتظار تأیید
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <UserX size={12} /> غیرفعال
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canWrite && user.id !== me?.id && (
                        <button
                          type="button"
                          aria-label="عملیات"
                          onClick={(e) => {
                            if (actionMenuUser?.id === user.id) {
                              closeActionMenu();
                            } else {
                              setActionMenuUser(user);
                              setActionMenuAnchor(e.currentTarget);
                            }
                          }}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200"
                        >
                          <MoreVertical size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canInvite && invites.length > 0 && (
            <div className="nexa-card p-4">
              <h3 className="text-sm font-black mb-3">دعوت‌های اخیر</h3>
              <div className="space-y-2 text-xs">
                {invites.slice(0, 8).map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center border-b border-nexa-border/50 py-2 gap-2">
                    <span>
                      {inv.displayName ?? '—'} · {inv.role.nameFa} · {inv.credentialMode ?? 'self'}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-400">{inv.status}</span>
                      {inv.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setRevokeInviteId(inv.id)}
                          className="text-rose-600 font-bold"
                        >
                          لغو
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <UserFormModal
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        roles={assignableRoles}
        canInvite={canInvite}
        onSubmit={handleProvision}
      />
      <EditUserModal
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        user={
          editUser
            ? {
                id: editUser.id,
                displayName: editUser.displayName,
                systemRoleId: editUser.systemRole.id,
                mustChangePassword: editUser.mustChangePassword,
              }
            : null
        }
        roles={assignableRoles.map((r) => ({ id: r.id, nameFa: r.nameFa }))}
        onSubmit={handleEdit}
      />
      <ResetPasswordModal
        open={Boolean(resetUser)}
        onClose={() => setResetUser(null)}
        username={resetUser?.username ?? ''}
        onSubmit={handleResetPassword}
      />
      <UserRowActionMenu
        open={Boolean(actionMenuUser && actionMenuAnchor)}
        anchorEl={actionMenuAnchor}
        onClose={closeActionMenu}
      >
        {actionMenuUser && (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setEditUser(actionMenuUser);
                closeActionMenu();
              }}
              className="w-full text-right text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-2"
            >
              <UserCog size={14} /> ویرایش
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setResetUser(actionMenuUser);
                closeActionMenu();
              }}
              className="w-full text-right text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-2 text-nexa-accent"
            >
              <KeyRound size={14} /> ریست رمز
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setConfirmToggle(actionMenuUser);
                closeActionMenu();
              }}
              className="w-full text-right text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-gray-50"
            >
              {actionMenuUser.status === 'active'
                ? 'غیرفعال‌سازی'
                : actionMenuUser.status === 'pending'
                  ? 'تأیید و فعال‌سازی'
                  : 'فعال‌سازی'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDeleteUser(actionMenuUser);
                closeActionMenu();
              }}
              className="w-full text-right text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 size={14} /> حذف کاربر
            </button>
          </>
        )}
      </UserRowActionMenu>
      <ConfirmDialog
        open={Boolean(confirmToggle)}
        onClose={() => setConfirmToggle(null)}
        onConfirm={confirmToggleStatus}
        loading={toggleLoading}
        variant="danger"
        title="تغییر وضعیت کاربر"
        message={`آیا از ${
          confirmToggle?.status === 'active'
            ? 'غیرفعال'
            : confirmToggle?.status === 'pending'
              ? 'تأیید و فعال'
              : 'فعال'
        } کردن «${confirmToggle?.displayName}» مطمئن هستید؟`}
        confirmLabel="بله، انجام شود"
      />
      <ConfirmDialog
        open={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        onConfirm={confirmDeleteUser}
        loading={deleteLoading}
        variant="danger"
        title="حذف کاربر"
        message={`کاربر «${deleteUser?.displayName}» (${deleteUser?.username}) برای همیشه از سیستم حذف می‌شود. اگر مالک کسب‌وکار باشد، ابتدا مالکیت را منتقل کنید.`}
        requiredPhrase={deleteUser?.username}
        phraseHint="نام کاربری (username) را برای تأیید بنویسید:"
        confirmLabel="حذف"
      />
      <ConfirmDialog
        open={Boolean(revokeInviteId)}
        onClose={() => setRevokeInviteId(null)}
        onConfirm={confirmRevokeInvite}
        loading={revokeLoading}
        variant="danger"
        title="لغو دعوت"
        message="این لینک دعوت دیگر قابل استفاده نخواهد بود."
        confirmLabel="لغو دعوت"
      />
      <CredentialsRevealModal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        credentials={credentials}
        onCopy={() => toast('اطلاعات ورود کپی شد.')}
      />
      <InviteLinkModal
        open={Boolean(inviteUrl)}
        onClose={() => setInviteUrl(null)}
        url={inviteUrl}
        onCopy={() => {
          if (!inviteUrl) return;
          navigator.clipboard.writeText(inviteUrl);
          toast('لینک کپی شد.');
        }}
      />
    </>
  );
}
