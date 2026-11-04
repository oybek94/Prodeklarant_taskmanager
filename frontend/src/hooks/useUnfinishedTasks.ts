import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { useSocket } from '../contexts/SocketContext';

export interface UnfinishedStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  stageOrder: number;
}

export interface UnfinishedTask {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  client: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  stages: UnfinishedStage[];
}

export interface OldestUnfinishedTask {
  id: number;
  title: string;
  createdAt: string;
  client: { id: number; name: string } | null;
}

export interface UnfinishedTasksResponse {
  tasks: UnfinishedTask[];
  total: number;
  /** 3 kundan ko'p ochiq turgan ishlar soni (ro'yxat cheklovidan mustaqil) */
  overdue: number;
  oldest: OldestUnfinishedTask | null;
}

/**
 * Tugallanmagan ishlar — Dashboard'dagi ro'yxat va salomlashuv bloki bitta so'rovdan foydalanadi.
 * Boshqa xodimlar bosqich belgilasa yoki ish qo'shsa yangilanadi (bir nechta hodisa birlashtiriladi).
 */
export const useUnfinishedTasks = () => {
  const socket = useSocket();
  const [data, setData] = useState<UnfinishedTasksResponse | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await api.get<UnfinishedTasksResponse>('/dashboard/unfinished-tasks');
      setData(res.data);
      setError(false);
      setNow(Date.now());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!socket) return;
    const scheduleReload = () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(load, 800);
    };
    const events = ['task:stageUpdated', 'task:updated', 'task:created', 'task:deleted'];
    events.forEach((e) => socket.on(e, scheduleReload));
    return () => {
      events.forEach((e) => socket.off(e, scheduleReload));
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [socket, load]);

  return { data, error, now, reload: load };
};
