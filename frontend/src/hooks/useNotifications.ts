import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../lib/api';

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

export interface InAppNotification {
  id: number;
  userId: number;
  taskId: number;
  taskProcessId: number;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
  carNumber?: string;
  taskProcess?: {
    id: number;
    taskId: number;
    processType: string;
    status: string;
    task?: { id: number; title: string };
  };
}

function getCarNumberFromTitle(title?: string): string {
  if (!title || typeof title !== 'string') return '';
  const parts = title.split(/\s+АВТО\s+/i);
  if (parts.length >= 2) {
    const plate = (parts[1].trim().split(/\s/)[0] || parts[1].trim());
    if (plate) return plate;
  }
  const beforeSlash = title.split('/')[0]?.trim();
  if (beforeSlash && beforeSlash.length <= 20) return beforeSlash;
  return '';
}

export function getNotificationDisplayMessage(n: InAppNotification): string {
  const carNumber = n.carNumber || getCarNumberFromTitle(n.taskProcess?.task?.title);
  if (carNumber && n.message.startsWith('Task #')) {
    return n.message.replace(/^Task #\d+\s*-\s*/, `${carNumber} - `);
  }
  return n.message;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const prevIdsRef = useRef<Set<number>>(new Set());
  const isFirstFetchRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications');
      const data = Array.isArray(response.data) ? response.data : [];
      const newOnes = data.filter((n) => !prevIdsRef.current.has(n.id));
      const hadData = prevIdsRef.current.size > 0;
      prevIdsRef.current = new Set(data.map((n) => n.id));
      setNotifications(data);

      // Brauzer bildirishnomasi: yangi bildirishnoma kelganda (birinchi yuklashda emas)
      if (!isFirstFetchRef.current && newOnes.length > 0 && typeof Notification !== 'undefined') {
        const title = 'Prodeklarant';
        if (document.visibilityState === 'hidden') {
          if (newOnes.length === 1) {
            showBrowserNotification(title, getNotificationDisplayMessage(newOnes[0]), `notif-${newOnes[0].id}`);
          } else {
            showBrowserNotification(title, `Sizda ${newOnes.length} ta yangi bildirishnoma`);
          }
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
    const interval = setInterval(fetchNotifications, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const confirmProcess = async (taskProcessId: number) => {
    try {
      await apiClient.post('/process/confirm', { taskProcessId });
      await fetchNotifications();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Tasdiqlashda xatolik');
    }
  };

  const rejectProcess = async (taskProcessId: number) => {
    try {
      await apiClient.post('/process/reject', { taskProcessId });
      await fetchNotifications();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Rad etishda xatolik');
    }
  };

  const markRead = async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  return {
    notifications,
    loading,
    refresh: fetchNotifications,
    confirmProcess,
    rejectProcess,
    markRead,
  };
}
