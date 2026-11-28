'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  IN_APP_NOTIFICATION_EVENT,
  loadStoredNotifications,
  saveStoredNotifications,
  type InAppNotificationItem,
} from '@/src/lib/in-app-notifications';

type Ctx = {
  items: InAppNotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const InAppNotificationContext = createContext<Ctx | null>(null);

export function InAppNotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InAppNotificationItem[]>(() => loadStoredNotifications());

  useEffect(() => {
    const onNew = (ev: Event) => {
      const detail = (ev as CustomEvent<InAppNotificationItem>).detail;
      if (!detail?.id) return;
      setItems((prev) => {
        const next = [detail, ...prev.filter((x) => x.id !== detail.id)].slice(0, 50);
        saveStoredNotifications(next);
        return next;
      });
    };
    window.addEventListener(IN_APP_NOTIFICATION_EVENT, onNew);
    return () => window.removeEventListener(IN_APP_NOTIFICATION_EVENT, onNew);
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((x) => ({ ...x, read: true }));
      saveStoredNotifications(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, read: true } : x));
      saveStoredNotifications(next);
      return next;
    });
  }, []);

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, markAllRead, markRead }),
    [items, unreadCount, markAllRead, markRead]
  );

  return <InAppNotificationContext.Provider value={value}>{children}</InAppNotificationContext.Provider>;
}

export function useInAppNotifications(): Ctx {
  const ctx = useContext(InAppNotificationContext);
  if (!ctx) {
    return {
      items: [],
      unreadCount: 0,
      markAllRead: () => {},
      markRead: () => {},
    };
  }
  return ctx;
}