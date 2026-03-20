import { api } from './api';

export type NotificationType = 'lead' | 'alert' | 'success' | 'message';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

function mapNotification(n: any): Notification {
  return {
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    message: n.message,
    time: n.created_at || n.time || new Date().toISOString(),
    read: !!n.read,
  };
}

let _cache: Notification[] = [];

export async function loadNotifications(): Promise<Notification[]> {
  try {
    const data = await api.getNotifications();
    _cache = data.map(mapNotification);
    window.dispatchEvent(new Event('notifications_updated'));
    return _cache;
  } catch {
    return _cache;
  }
}

export const addNotification = async (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
  try {
    await api.createNotification({ type: notif.type, title: notif.title, message: notif.message });
    await loadNotifications();
  } catch {
    // Fallback: add to local cache only
    const newNotif: Notification = {
      ...notif,
      id: Date.now(),
      time: new Date().toISOString(),
      read: false,
    };
    _cache = [newNotif, ..._cache];
    window.dispatchEvent(new Event('notifications_updated'));
  }
};

export const getNotifications = (): Notification[] => {
  return _cache;
};

export const markAllAsRead = async () => {
  try {
    await api.markAllNotificationsRead();
    await loadNotifications();
  } catch {
    _cache = _cache.map((n) => ({ ...n, read: true }));
    window.dispatchEvent(new Event('notifications_updated'));
  }
};
