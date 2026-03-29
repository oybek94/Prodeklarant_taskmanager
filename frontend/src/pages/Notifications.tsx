import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { getNotifStyle, useNotifications } from '../hooks/useNotifications';
import type { AppNotification, NotificationType } from '../hooks/useNotifications';

const TYPE_LABELS: Record<NotificationType, string> = {
  TASK_CREATED: 'Yangi task',
  TASK_UPDATED: 'Task yangilandi',
  TASK_COMPLETED: 'Task yakunlandi',
  TASK_DELETED: 'Task o\'chirildi',
  STAGE_UPDATED: 'Jarayon yangilandi',
  PROCESS_REMINDER: 'Eslatma',
  PROCESS_ESCALATED: 'Muhim!',
  INVOICE_SAVED: 'Invoys',
  INVOICE_CONFLICT: 'Invoys konflikti',
  ERROR_ADDED: 'Xato',
  SYSTEM: 'Tizim',
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? '?unread=true' : '?limit=100';
      const res = await apiClient.get(`/notifications${params}`);
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markRead = async (id: number) => {
    await apiClient.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await apiClient.patch('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id: number) => {
    await apiClient.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const { confirmProcess, rejectProcess } = useNotifications();

  const handleProcessConfirm = async (n: AppNotification) => {
    const processId = (n.metadata as any)?.taskProcessId;
    if (!processId) return;
    try {
      await confirmProcess(processId);
      setNotifications(prev => prev.filter(notif => notif.id !== n.id));
    } catch (err: any) {
      console.error('Process confirm error:', err);
    }
  };

  const handleProcessReject = async (n: AppNotification) => {
    const processId = (n.metadata as any)?.taskProcessId;
    if (!processId) return;
    try {
      await rejectProcess(processId);
      setNotifications(prev => prev.filter(notif => notif.id !== n.id));
    } catch (err: any) {
      console.error('Process reject error:', err);
    }
  };

  const timeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return 'hozir';
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} soat oldin`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} kun oldin`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Icon icon="lucide:bell" className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bildirishnomalar</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full">
              {unreadCount} ta yangi
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              Barchasini o'qish
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Hammasi
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          O'qilmaganlar
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Icon icon="lucide:loader-2" className="w-8 h-8 mx-auto animate-spin mb-2" />
          Yuklanmoqda...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon icon="lucide:bell-off" className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Bildirishnomalar yo'q</p>
          <p className="text-sm mt-1">
            {filter === 'unread' ? 'Barcha bildirishnomalar o\'qilgan' : 'Hali hech qanday bildirishnoma kelmagan'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const style = getNotifStyle(n.color);
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all ${
                  n.read
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70'
                    : `${style.bg} ${style.darkBg} ${style.border} ${style.darkBorder}`
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        n.read ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : `${style.bg} ${style.text}`
                      }`}>
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                    <button
                      onClick={() => {
                        if (n.actionUrl) navigate(n.actionUrl);
                        if (!n.read) markRead(n.id);
                      }}
                      className={`text-sm font-semibold ${n.read ? 'text-gray-600 dark:text-gray-400' : `${style.text} ${style.darkText}`} hover:underline text-left`}
                    >
                      {n.title}
                    </button>
                    <p className={`text-xs mt-0.5 ${n.read ? 'text-gray-500' : `${style.text} ${style.darkText} opacity-80`}`}>
                      {n.message}
                    </p>

                    {/* Process Reminder action tugmalari */}
                    {(n.type === 'PROCESS_REMINDER' || n.type === 'PROCESS_ESCALATED') && !n.read && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleProcessConfirm(n)}
                          className="px-4 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                        >
                          <Icon icon="lucide:check" className="w-3.5 h-3.5" />
                          Tayyor
                        </button>
                        <button
                          onClick={() => handleProcessReject(n)}
                          className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                        >
                          <Icon icon="lucide:clock" className="w-3.5 h-3.5" />
                          Hali yo'q
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="O'qilgan deb belgilash"
                      >
                        <Icon icon="lucide:check" className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="O'chirish"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
