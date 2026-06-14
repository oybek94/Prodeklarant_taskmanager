import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface UseTaskSocketProps {
  socket: any;
  isModalMode: boolean;
  loadTasks: (showArchive: boolean, filters: any) => void;
  showArchive: boolean;
  filters: any;
  selectedTaskIdRef: React.MutableRefObject<number | null>;
  loadTaskDetail: (taskId: number) => void;
}

export const useTaskSocket = ({
  socket,
  isModalMode,
  loadTasks,
  showArchive,
  filters,
  selectedTaskIdRef,
  loadTaskDetail
}: UseTaskSocketProps) => {
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!socket || isModalMode) return;
      const refresh = (taskId?: number) => {
        // Debounce: 1.5 sekundda faqat bitta so'rov yuboriladi
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          loadTasks(showArchive, filters as any);
          if (selectedTaskIdRef.current && (taskId === undefined || taskId === selectedTaskIdRef.current)) {
            loadTaskDetail(selectedTaskIdRef.current);
          }
        }, 1500);
      };
    const onTaskCreated = (data: { createdBy: string }) => {
      toast(`${data.createdBy} yangi task yaratdi`, { icon: '📋' });
      refresh();
    };
    const onTaskUpdated = (data: { updatedBy: string, taskId?: number }) => {
      toast(`${data.updatedBy} taskni yangiladi`, { icon: '✏️' });
      refresh(data.taskId);
    };
    const onTaskDeleted = (data: { deletedBy: string }) => {
      toast(`${data.deletedBy} taskni o'chirdi`, { icon: '🗑️' });
      refresh();
    };
    const onStageUpdated = (data: { updatedBy: string, taskId?: number }) => {
      toast(`${data.updatedBy} jarayonni yangiladi`, { icon: '🔄' });
      refresh(data.taskId);
    };
    const onDocumentCreated = (data: { taskId: number }) => {
      refresh(data.taskId);
    };
    const onDocumentDeleted = (data: { taskId: number }) => {
      refresh(data.taskId);
    };
    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:stageUpdated', onStageUpdated);
    socket.on('taskDocument:created', onDocumentCreated);
    socket.on('taskDocument:deleted', onDocumentDeleted);
    socket.on('task:errorUpdated', onDocumentCreated); // same handler as it just refreshes
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:stageUpdated', onStageUpdated);
      socket.off('taskDocument:created', onDocumentCreated);
      socket.off('taskDocument:deleted', onDocumentDeleted);
      socket.off('task:errorUpdated', onDocumentCreated);
    };
  }, [socket, showArchive, JSON.stringify(filters), isModalMode, loadTasks, loadTaskDetail, selectedTaskIdRef]);
};
