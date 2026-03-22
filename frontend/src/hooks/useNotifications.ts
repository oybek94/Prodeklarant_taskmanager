import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../lib/api';
import { useSocket } from '../contexts/SocketContext';

const NOTIFICATION_TAG = 'prodeklarant-notification';

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return Promise.resolve('denied');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

function showBrowserNotification(title: string, body: string, tag?: string) {
  if (typeof Notification === 'undefined') return;
  const icon = '/logo.png';
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag: tag ?? NOTIFICATION_TAG, icon });
    } catch (e) {
      console.warn('Browser notification error:', e);
    }
    return;
  }
  if (Notification.permission === 'default') {
    requestNotificationPermission().then((p) => {
      if (p === 'granted') {
        try {
          new Notification(title, { body, tag: tag ?? NOTIFICATION_TAG, icon });
        } catch (e) {
          console.warn('Browser notification error:', e);
        }
      }
    });
  }
}

// Bildirishnoma turlari
export type NotificationType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'TASK_DELETED'
  | 'STAGE_UPDATED'
  | 'PROCESS_REMINDER'
  | 'PROCESS_ESCALATED'
  | 'INVOICE_SAVED'
  | 'INVOICE_CONFLICT'
  | 'ERROR_ADDED'
  | 'SYSTEM';

export interface AppNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  taskId: number | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  icon: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray';
}

// Bildirishnoma turi bo'yicha rang konfiguratsiyasi (CSS classlari uchun)
export const NOTIFICATION_STYLES: Record<string, {
  bg: string;
  border: string;
  text: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}> = {
  green: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
    darkBg: 'dark:bg-emerald-900/30', darkBorder: 'dark:border-emerald-700', darkText: 'dark:text-emerald-200',
  },
  blue: {
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900/30', darkBorder: 'dark:border-blue-700', darkText: 'dark:text-blue-200',
  },
  yellow: {
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30', darkBorder: 'dark:border-amber-700', darkText: 'dark:text-amber-200',
  },
  red: {
    bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30', darkBorder: 'dark:border-red-700', darkText: 'dark:text-red-200',
  },
  purple: {
    bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800',
    darkBg: 'dark:bg-purple-900/30', darkBorder: 'dark:border-purple-700', darkText: 'dark:text-purple-200',
  },
  gray: {
    bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800',
    darkBg: 'dark:bg-gray-800', darkBorder: 'dark:border-gray-700', darkText: 'dark:text-gray-200',
  },
};

export function getNotifStyle(color: string) {
  return NOTIFICATION_STYLES[color] || NOTIFICATION_STYLES.gray;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevIdsRef = useRef<Set<number>>(new Set());
  const isFirstFetchRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications?unread=true');
      const data: AppNotification[] = Array.isArray(response.data) ? response.data : [];
      const newOnes = data.filter((n) => !prevIdsRef.current.has(n.id));
      prevIdsRef.current = new Set(data.map((n) => n.id));
      setNotifications(data);
      setUnreadCount(data.length);

      // Brauzer bildirishnomasi: yangi bo'lsa va tab yashirin bo'lsa
      if (!isFirstFetchRef.current && newOnes.length > 0 && document.visibilityState === 'hidden') {
        if (newOnes.length === 1) {
          showBrowserNotification('Prodeklarant', `${newOnes[0].icon} ${newOnes[0].title}`, `notif-${newOnes[0].id}`);
        } else {
          showBrowserNotification('Prodeklarant', `Sizda ${newOnes.length} ta yangi bildirishnoma`);
        }
      }
      if (isFirstFetchRef.current) isFirstFetchRef.current = false;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Socket.io: real-time push
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onNewNotification = () => {
      fetchNotifications();
    };
    socket.on('notification:new', onNewNotification);
    return () => { socket.off('notification:new', onNewNotification); };
  }, [socket, fetchNotifications]);

  const markRead = useCallback(async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  }, []);

  const dismissNotification = useCallback(async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, []);

  // Process confirm/reject uchun mos API (eski sistemadan saqlab qolish)
  const confirmProcess = useCallback(async (taskProcessId: number) => {
    try {
      await apiClient.post('/process/confirm', { taskProcessId });
      await fetchNotifications();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Tasdiqlashda xatolik');
    }
  }, [fetchNotifications]);

  const rejectProcess = useCallback(async (taskProcessId: number) => {
    try {
      await apiClient.post('/process/reject', { taskProcessId });
      await fetchNotifications();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Rad etishda xatolik');
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markRead,
    markAllRead,
    dismissNotification,
    confirmProcess,
    rejectProcess,
  };
}
