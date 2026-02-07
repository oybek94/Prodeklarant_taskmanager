import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api';

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

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications');
      const data = Array.isArray(response.data) ? response.data : [];
      setNotifications(data);
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
