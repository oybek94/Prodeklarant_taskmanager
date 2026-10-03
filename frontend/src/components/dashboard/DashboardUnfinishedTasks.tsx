import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import api from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';

const TaskProcessModal = lazy(() => import('../tasks/TaskProcessModal'));

interface UnfinishedStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  stageOrder: number;
}

interface UnfinishedTask {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  client: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  stages: UnfinishedStage[];
}

interface UnfinishedTasksResponse {
  tasks: UnfinishedTask[];
  total: number;
}

/** Shuncha kundan ko'p ochiq turgan ish qizil rangda ko'rsatiladi */
const OVERDUE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const countDone = (task: UnfinishedTask) => task.stages.filter((s) => s.status === 'TAYYOR').length;

const ageDays = (createdAt: string, now: number) => Math.floor((now - new Date(createdAt).getTime()) / DAY_MS);

const formatAge = (createdAt: string, now: number) => {
  const diffMs = now - new Date(createdAt).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return 'hozirgina';
  if (hours < 24) return `${hours} soat`;
  return `${Math.floor(diffMs / DAY_MS)} kun`;
};

const ageTone = (days: number) => {
  if (days >= OVERDUE_DAYS) return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30';
  if (days >= 1) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30';
};

const StageProgress: React.FC<{ stages: UnfinishedStage[] }> = ({ stages }) => {
  const nextIndex = stages.findIndex((s) => s.status !== 'TAYYOR');
  return (
    <div className="flex gap-1 w-full">
      {stages.map((stage, idx) => {
        const done = stage.status === 'TAYYOR';
        const isNext = idx === nextIndex;
        return (
          <div
            key={stage.id}
            title={`${stage.name} — ${done ? 'tayyor' : 'kutilmoqda'}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              done
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                : isNext
                  ? 'bg-amber-400/80 animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        );
      })}
    </div>
  );
};

const TaskRow: React.FC<{ task: UnfinishedTask; now: number; onOpen: (id: number) => void }> = ({ task, now, onOpen }) => {
  const done = countDone(task);
  const totalStages = task.stages.length;
  const nextStage = task.stages.find((s) => s.status !== 'TAYYOR');
  const days = ageDays(task.createdAt, now);
  const percent = totalStages ? Math.round((done / totalStages) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className="group/row w-full text-left rounded-2xl border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800/80 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-[0_8px_24px_rgba(79,70,229,0.08)] hover:-translate-y-[1px] transition-all duration-200 p-3.5 sm:p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <div className="flex items-start gap-3">
        {/* Progress halqasi */}
        <div className="relative w-11 h-11 shrink-0">
          <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-gray-100 dark:stroke-gray-700" />
            <circle
              cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" strokeLinecap="round"
              className="stroke-emerald-500 transition-[stroke-dasharray] duration-500"
              strokeDasharray={`${(percent / 100) * 97.4} 97.4`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700 dark:text-gray-200">
            {done}/{totalStages}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-300 transition-colors">
              {task.title}
            </p>
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${ageTone(days)}`}>
              <Icon icon="solar:clock-circle-bold-duotone" className="w-3 h-3" />
              {formatAge(task.createdAt, now)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {task.client?.name ?? 'Mijoz yo\'q'}
            {task.branch?.name && <span className="text-gray-300 dark:text-gray-600"> · </span>}
            {task.branch?.name}
          </p>

          <div className="mt-2.5">
            <StageProgress stages={task.stages} />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            {nextStage ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 truncate">
                <Icon icon="solar:arrow-right-bold-duotone" className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Keyingi: {nextStage.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Icon icon="solar:check-circle-bold-duotone" className="w-3.5 h-3.5" />
                {totalStages ? 'Barcha bosqichlar tayyor' : 'Bosqichlar yo\'q'}
              </span>
            )}
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-500 dark:text-indigo-300 opacity-0 group-hover/row:opacity-100 transition-opacity">
              Jarayonlar
              <Icon icon="solar:alt-arrow-right-bold-duotone" className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

/**
 * Dashboard: tugallanmagan ishlar ro'yxati. Ish ustiga bosilsa Jarayonlar oynasi ochiladi
 * va bosqichlarni o'sha yerda tayyor deb belgilash mumkin.
 */
export const DashboardUnfinishedTasks: React.FC = () => {
  const socket = useSocket();
  const [data, setData] = useState<UnfinishedTasksResponse | null>(null);
  const [error, setError] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
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

  // Boshqa xodimlar bosqich belgilasa yoki ish qo'shsa — ro'yxat yangilanadi (bir nechta hodisa birlashtiriladi)
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

  const handleCloseModal = useCallback(() => {
    setOpenTaskId(null);
    load(); // O'zimiz belgilagan bosqichlar socket orqali bizga kelmaydi
  }, [load]);

  // Backend eng yangisidan boshlab qaytaradi
  const tasks = data?.tasks ?? [];

  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 overflow-hidden group">
      <div className="absolute -right-24 -top-24 w-[30rem] h-[30rem] bg-gradient-to-bl from-indigo-400/10 via-violet-400/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      {/* Sarlavha */}
      <div className="relative z-10 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 shrink-0">
            <Icon icon="solar:checklist-minimalistic-bold-duotone" className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
              Tugallanmagan ishlar
              {data && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-black">{data.total}</span>
              )}
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-1">
              Bosqichni belgilash uchun ish ustiga bosing
            </p>
          </div>
        </div>

      </div>

      {/* Ro'yxat */}
      <div className="relative z-10">
        {!data && !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[112px] rounded-2xl bg-gray-100/80 dark:bg-gray-800/50 animate-pulse" />
            ))}
          </div>
        ) : error && !data ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <Icon icon="solar:danger-circle-bold-duotone" className="w-10 h-10 mx-auto mb-2 text-rose-400" />
            <p className="font-bold text-sm">Ro'yxatni yuklab bo'lmadi</p>
            <button type="button" onClick={load} className="mt-3 text-sm font-bold text-indigo-600 dark:text-indigo-300 hover:underline">
              Qayta urinish
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center">
            <Icon icon="solar:cup-star-bold-duotone" className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p className="font-bold text-sm text-gray-600 dark:text-gray-300">Barcha ishlar yakunlangan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1 -mr-1">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} now={now} onOpen={setOpenTaskId} />
            ))}
          </div>
        )}
        {data && data.total > data.tasks.length && (
          <p className="mt-3 text-center text-xs text-gray-400">
            Eng yangi {data.tasks.length} ta ko'rsatilmoqda (jami {data.total} ta)
          </p>
        )}
      </div>

      {/* Portal: karta backdrop-blur'i fixed oynani o'z ichiga qamab qo'ymasligi uchun */}
      {openTaskId !== null && createPortal(
        <Suspense fallback={null}>
          <TaskProcessModal taskId={openTaskId} onClose={handleCloseModal} />
        </Suspense>,
        document.body,
      )}
    </div>
  );
};
