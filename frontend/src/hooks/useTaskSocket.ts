import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';

type TaskListFilters = { status: string; clientId: string; branchId: string };

interface UseTaskSocketProps {
  socket: Socket | null;
  isModalMode: boolean;
  loadTasks: (showArchive: boolean, filters: TaskListFilters) => void;
  showArchive: boolean;
  filters: TaskListFilters;
}

/**
 * Vazifalar ro'yxatini real-time yangilash.
 * Ochiq vazifa kartochkasi (bosqichlar, hujjatlar, AI tekshiruvlar) useTaskData'da yangilanadi —
 * hujjat/AI/xato eventlari ro'yxatda ko'rinmagani uchun bu yerda tinglanmaydi.
 */
export const useTaskSocket = ({
  socket,
  isModalMode,
  loadTasks,
  showArchive,
  filters,
}: UseTaskSocketProps) => {
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket || isModalMode) return;
    const refresh = () => {
      // Debounce: 1.5 sekundda faqat bitta so'rov yuboriladi
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => loadTasks(showArchive, filters), 1500);
    };
    const onTaskCreated = (data: { createdBy: string }) => {
      toast(`${data.createdBy} yangi task yaratdi`, { icon: '📋' });
      refresh();
    };
    const onTaskUpdated = (data: { updatedBy: string }) => {
      toast(`${data.updatedBy} taskni yangiladi`, { icon: '✏️' });
      refresh();
    };
    const onTaskDeleted = (data: { deletedBy: string }) => {
      toast(`${data.deletedBy} taskni o'chirdi`, { icon: '🗑️' });
      refresh();
    };
    const onStageUpdated = (data: { updatedBy: string }) => {
      toast(`${data.updatedBy} jarayonni yangiladi`, { icon: '🔄' });
      refresh();
    };
    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:stageUpdated', onStageUpdated);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:stageUpdated', onStageUpdated);
    };
  }, [socket, showArchive, filters, isModalMode, loadTasks]);
};
