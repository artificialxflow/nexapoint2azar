export type InAppNotificationItem = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = 'nexa-in-app-notifications';

export function loadStoredNotifications(): InAppNotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InAppNotificationItem[];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(items: InAppNotificationItem[]) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

export function createInAppNotification(
  input: Pick<InAppNotificationItem, 'title' | 'body' | 'href'>
): InAppNotificationItem {
  return {
    id: `in-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

export const IN_APP_NOTIFICATION_EVENT = 'nexa-in-app-notification';

export function emitInAppNotification(input: Pick<InAppNotificationItem, 'title' | 'body' | 'href'>) {
  if (typeof window === 'undefined') return;
  const item = createInAppNotification(input);
  const prev = loadStoredNotifications();
  saveStoredNotifications([item, ...prev]);
  window.dispatchEvent(new CustomEvent(IN_APP_NOTIFICATION_EVENT, { detail: item }));
}