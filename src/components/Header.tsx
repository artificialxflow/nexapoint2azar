'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  User,
  Menu,
  ChevronDown,
  Building2,
  LogOut,
  Settings,
  Phone,
  AtSign,
} from 'lucide-react';
import Logo from './Logo';
import EntityAvatar from '@/src/components/media/EntityAvatar';
import ProfileImageUploader from '@/src/components/media/ProfileImageUploader';
import { useBusiness } from '@/src/context/BusinessContext';
import { useAuth } from '@/src/context/AuthContext';
import { patchAuthAvatar } from '@/src/lib/auth/profile-client';
import { NEXA_BUSINESS_ROLE_LABELS } from '@/src/types/business';
import { useInAppNotifications } from '@/src/context/InAppNotificationContext';

interface HeaderProps {
  onMenuOpen: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
  const router = useRouter();
  const { user, logout, refresh: refreshAuth } = useAuth();
  const { activeBusiness, businesses, setActiveBusinessId } = useBusiness();
  const [bizOpen, setBizOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bizRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const { items: notifItems, unreadCount, markAllRead, markRead } = useInAppNotifications();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (bizRef.current && !bizRef.current.contains(t)) setBizOpen(false);
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const switchBusiness = (id: string) => {
    setActiveBusinessId(id);
    setBizOpen(false);
    router.refresh();
  };

  const canAccessUsersSettings = Boolean(
    user?.systemRole.permissions['users:read'] || user?.systemRole.slug === 'super_admin'
  );

  return (
    <header className="h-20 bg-white border-b border-nexa-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
        <button
          onClick={onMenuOpen}
          className="p-2 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>

        <div className="md:hidden">
          <Logo showText={false} />
        </div>

        <div className="relative shrink-0" ref={bizRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              setBizOpen((o) => !o);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-nexa-border/60 text-xs font-bold text-gray-800 max-w-[200px] md:max-w-[260px]"
          >
            {activeBusiness?.name ? (
              <EntityAvatar
                imageUrl={activeBusiness.logoUrl}
                label={activeBusiness.name}
                className="w-6 h-6"
                rounded="lg"
                fallbackIcon={Building2}
              />
            ) : (
              <Building2 size={16} className="text-nexa-accent shrink-0" />
            )}
            <span className="truncate">{activeBusiness?.name ?? 'کسب‌وکار'}</span>
            <ChevronDown size={14} className="shrink-0 text-gray-400" />
          </button>
          {bizOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[220px] bg-white rounded-xl shadow-lg border border-nexa-border py-1">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => switchBusiness(b.id)}
                  className={`w-full text-right px-4 py-2.5 text-xs font-bold hover:bg-gray-50 flex items-center gap-2 ${
                    b.id === activeBusiness?.id ? 'text-nexa-accent' : 'text-gray-700'
                  }`}
                >
                  <EntityAvatar
                    imageUrl={b.logoUrl}
                    label={b.name}
                    className="w-6 h-6"
                    rounded="lg"
                  />
                  <span className="truncate flex-1">{b.name}</span>
                </button>
              ))}
              <div className="border-t border-nexa-border my-1" />
              <button
                type="button"
                onClick={() => {
                  setBizOpen(false);
                  router.push('/businesses');
                }}
                className="w-full text-right px-4 py-2.5 text-xs font-bold text-nexa-accent hover:bg-gray-50"
              >
                مدیریت کسب‌وکارها
              </button>
            </div>
          )}
        </div>

        <div className="relative flex-1 min-w-0 max-w-md">
          <Search
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            size={18}
          />
          <input
            type="search"
            placeholder="جستجو..."
            aria-label="جستجوی سراسری"
            className="w-full min-w-0 bg-gray-50 border-none rounded-xl sm:rounded-2xl py-2 sm:py-2.5 pr-9 sm:pr-11 pl-2 sm:pl-4 text-xs sm:text-sm focus:ring-2 focus:ring-nexa-accent/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              setBizOpen(false);
              setNotifOpen((o) => !o);
              if (!notifOpen && unreadCount > 0) markAllRead();
            }}
            className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl relative transition-colors"
            aria-label="اعلان‌ها"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center font-fa-num">
                {unreadCount > 9 ? '۹+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-white border border-nexa-border rounded-2xl shadow-xl z-50 p-2 space-y-1">
              {notifItems.length === 0 ? (
                <p className="text-xs text-gray-500 p-3 text-center">اعلان جدیدی نیست.</p>
              ) : (
                notifItems.slice(0, 12).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markRead(n.id);
                      setNotifOpen(false);
                      if (n.href) router.push(n.href);
                    }}
                    className={`w-full text-right p-2 rounded-xl hover:bg-gray-50 ${n.read ? 'opacity-70' : ''}`}
                  >
                    <p className="text-xs font-bold text-gray-900">{n.title}</p>
                    {n.body && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="h-10 w-[1px] bg-gray-100 mx-1 md:mx-2"></div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => {
              setBizOpen(false);
              setProfileOpen((o) => !o);
            }}
            className="flex items-center gap-2 md:gap-3 pl-1 md:pl-2 hover:bg-gray-50 p-1 md:p-1.5 rounded-2xl transition-colors min-w-0 text-right"
          >
            <div className="text-left hidden sm:block min-w-0">
              <p className="text-xs md:text-sm font-bold text-gray-900 truncate max-w-[100px] md:max-w-[140px]">
                {user?.displayName ?? 'کاربر'}
              </p>
              <p className="text-[8px] md:text-[10px] text-gray-500 font-medium truncate max-w-[100px] md:max-w-[140px]">
                {user?.systemRole.nameFa ?? '—'}
              </p>
            </div>
            <EntityAvatar
              imageUrl={user?.avatarUrl}
              label={user?.displayName ?? 'کاربر'}
              className="w-8 h-8 md:w-10 md:h-10"
              rounded="xl"
              fallbackIcon={User}
            />
            <ChevronDown
              size={14}
              className={`hidden sm:block text-gray-400 shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {profileOpen && user && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-2 z-50 w-[min(100vw-2rem,320px)] bg-white rounded-2xl shadow-lg border border-nexa-border py-3"
            >
              <div className="px-4 pb-3 border-b border-nexa-border/60 space-y-3">
                <ProfileImageUploader
                  purpose="avatar"
                  label={user.displayName}
                  imageUrl={user.avatarUrl}
                  avatarSize="w-14 h-14"
                  onSaved={async (fileKey, previewUrl) => {
                    await patchAuthAvatar(fileKey, previewUrl);
                    await refreshAuth();
                  }}
                />
                <p className="text-sm font-black text-gray-900">{user.displayName}</p>
                <div className="space-y-1 text-[11px] text-gray-600">
                  <p className="flex items-center gap-2">
                    <AtSign size={12} className="text-gray-400 shrink-0" />
                    <span className="font-mono truncate">{user.username}</span>
                  </p>
                  {user.mobilePhone ? (
                    <p className="flex items-center gap-2 font-fa-num">
                      <Phone size={12} className="text-gray-400 shrink-0" />
                      {user.mobilePhone}
                    </p>
                  ) : null}
                  <p>
                    <span className="text-gray-400">نقش سیستمی: </span>
                    <span className="font-bold">{user.systemRole.nameFa}</span>
                  </p>
                  {activeBusiness ? (
                    <p>
                      <span className="text-gray-400">در «{activeBusiness.name}»: </span>
                      <span className="font-bold">
                        {NEXA_BUSINESS_ROLE_LABELS[activeBusiness.role]}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/dashboard/settings?tab=business');
                  }}
                  className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings size={14} />
                  تنظیمات کسب‌وکار
                </button>
                {canAccessUsersSettings ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push('/dashboard/settings?tab=access');
                    }}
                    className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User size={14} />
                    کاربران و دسترسی
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/businesses');
                  }}
                  className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Building2 size={14} />
                  مدیریت کسب‌وکارها
                </button>
              </div>
              <div className="border-t border-nexa-border/60 pt-1 px-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                  className="w-full text-right px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2"
                >
                  <LogOut size={14} />
                  خروج از سیستم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
