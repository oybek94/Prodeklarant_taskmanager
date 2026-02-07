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
  taskProcess?: {
    id: number;
    taskId: number;
    processType: string;
    status: string;
  };
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
