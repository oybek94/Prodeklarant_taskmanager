import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import axios from 'axios';
import api from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface FumigationReminder {
  id: number;
  truckNumber: string;
  remindAt: string;
  sentAt: string | null;
  createdAt: string;
  createdBy: { id: number; name: string };
}

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const SENT_VISIBLE_MS = 24 * 60 * 60 * 1000;

/** Toshkent devor soati `YYYY-MM-DDTHH:mm` ko'rinishida (brauzer TZ'ga bog'liq emas) */
const tashkentInputValue = (offsetMinutes: number): string =>
  new Date(Date.now() + offsetMinutes * 60 * 1000 + TASHKENT_OFFSET_MS).toISOString().slice(0, 16);

const tashkentDateKey = (ms: number): string =>
  new Date(ms + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);

const formatClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/** "Bugun" / "Ertaga" / "05.11" */
const formatDayLabel = (iso: string, nowMs: number): string => {
  const key = tashkentDateKey(new Date(iso).getTime());
  if (key === tashkentDateKey(nowMs)) return 'Bugun';
  if (key === tashkentDateKey(nowMs + 24 * 60 * 60 * 1000)) return 'Ertaga';
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit' });
};

const formatRemaining = (iso: string, nowMs: number): string => {
  const diffMin = Math.ceil((new Date(iso).getTime() - nowMs) / 60000);
  if (diffMin <= 0) return 'hozir';
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m} daq`;
  return m === 0 ? `${h} soat` : `${h} soat ${m} daq`;
};

/** Kiritilgandan rasmiylashtirishgacha o'tgan ulush, 0..100 */
const progressPercent = (r: FumigationReminder, nowMs: number): number => {
  const start = new Date(r.createdAt).getTime();
  const end = new Date(r.remindAt).getTime();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((nowMs - start) / (end - start)) * 100)));
};

const DashboardFumigation: React.FC = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [reminders, setReminders] = useState<FumigationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [truckNumber, setTruckNumber] = useState('');
  const [remindAt, setRemindAt] = useState(() => tashkentInputValue(210));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get<FumigationReminder[]>('/fumigation-reminders');
      setReminders(res.data);
    } catch (err) {
      console.error('Failed to fetch fumigation reminders:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (!socket) return;
    const handleUpdate = () => fetchData(true);
    socket.on('fumigation:updated', handleUpdate);
    return () => {
      socket.off('fumigation:updated', handleUpdate);
    };
  }, [fetchData, socket]);

  // Qolgan vaqt va "yuborildi" holatini yangilab turish
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
      fetchData(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = truckNumber.replace(/\s+/g, '').toUpperCase();
    if (normalized.length < 3 || !remindAt) return;
    setError('');
    try {
      setSubmitting(true);
      // datetime-local Toshkent soati sifatida talqin qilinadi (+05:00)
      await api.post('/fumigation-reminders', {
        truckNumber: normalized,
        remindAt: new Date(`${remindAt}:00+05:00`).toISOString(),
      });
      setTruckNumber('');
      setRemindAt(tashkentInputValue(210));
      fetchData(true);
    } catch (err) {
      const message = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined;
      setError(message ?? 'Eslatmani saqlab bo\'lmadi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/fumigation-reminders/${id}`);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete fumigation reminder', err);
    }
  };

  // Yuborilgan eslatma 24 soat ko'rinadi, keyin yo'qoladi (backend ham shunday filtrlaydi)
  const pending = reminders.filter((r) => !r.sentAt);
  const sent = reminders.filter((r) => r.sentAt && nowMs - new Date(r.sentAt).getTime() < SENT_VISIBLE_MS);

  const chipClass =
    'min-h-[36px] px-3.5 rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors';

  return (
    <div className="rounded-[28px] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-4 h-full min-h-[456px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
          <Icon icon="solar:bell-bing-bold-duotone" className="w-[22px] h-[22px]" />
        </div>
        <h2 className="flex-1 text-lg font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
          Fumigatsiya eslatmalari
        </h2>
        {pending.length > 0 && (
          <span className="whitespace-nowrap rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
            {pending.length} kutmoqda
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={truckNumber}
            onChange={(e) => setTruckNumber(e.target.value)}
            placeholder="40232BAA"
            maxLength={20}
            aria-label="Fura raqami"
            className="w-[124px] min-w-0 min-h-[44px] rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 text-[15px] font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-500"
          />
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            aria-label="Rasmiylashtirish vaqti (Toshkent)"
            className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting || truckNumber.trim().length < 3}
            aria-label="Eslatma qo'shish"
            className="w-11 min-h-[44px] shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-emerald-950 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
            ) : (
              <Icon icon="solar:add-circle-bold-duotone" className="w-6 h-6" />
            )}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Tezkor:</span>
          <button type="button" onClick={() => setRemindAt(tashkentInputValue(210))} className={chipClass}>+3.5 soat</button>
          <button type="button" onClick={() => setRemindAt(tashkentInputValue(240))} className={chipClass}>+4 soat</button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      <ul className="flex flex-1 flex-col gap-2.5 overflow-y-auto custom-scrollbar max-h-[300px] pr-0.5">
        {loading ? (
          <li className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
          </li>
        ) : pending.length + sent.length === 0 ? (
          <li className="py-6 text-center text-sm text-slate-500 dark:text-gray-400">Eslatmalar yo'q</li>
        ) : (
          <>
            {pending.map((r) => {
              const canDelete = user?.role === 'ADMIN' || user?.id === r.createdBy.id;
              const percent = progressPercent(r, nowMs);
              return (
                <li key={r.id} className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 py-3 pl-3.5 pr-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-stretch overflow-hidden rounded-[7px] border-2 border-[#0F172A] dark:border-[#F4F4F5] bg-[#F8FAFC] dark:bg-[#F4F4F5]">
                      <span className="flex shrink-0 items-center bg-blue-700 px-1.5 text-[9px] font-extrabold text-white">UZ</span>
                      <span className="truncate px-2.5 py-1 text-[15px] font-extrabold tracking-[0.07em] text-slate-900">{r.truckNumber}</span>
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        aria-label="Bekor qilish"
                        title="Bekor qilish"
                        className="-my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-slate-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-[18px] h-[18px]" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="shrink-0 text-xl font-extrabold leading-none tabular-nums text-gray-900 dark:text-white">{formatClock(r.remindAt)}</div>
                    <div className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
                      {formatDayLabel(r.remindAt, nowMs)} · {r.createdBy.name.split(' ')[0]} kiritdi
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 dark:bg-amber-400/15 px-2.5 py-1.5 text-xs font-extrabold text-amber-800 dark:text-amber-300">
                      {formatRemaining(r.remindAt, nowMs)}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`Muddatning ${percent} foizi o'tdi`}
                    className="mt-3 h-[5px] overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700"
                  >
                    <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all" style={{ width: `${percent}%` }}></div>
                  </div>
                </li>
              );
            })}

            {sent.map((r) => {
              const canDelete = user?.role === 'ADMIN' || user?.id === r.createdBy.id;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-gray-700 py-2.5 pl-3.5 pr-3 opacity-80">
                  <span className="inline-flex shrink-0 overflow-hidden rounded-[7px] border-2 border-slate-400 dark:border-gray-500">
                    <span className="px-2.5 py-0.5 text-sm font-extrabold tracking-[0.07em] text-slate-500 dark:text-gray-400">{r.truckNumber}</span>
                  </span>
                  <div className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
                    {formatClock(r.sentAt as string)} · Telegramga yuborildi
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                    <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" />
                    Yuborildi
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      aria-label="Ro'yxatdan olib tashlash"
                      title="Ro'yxatdan olib tashlash"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </>
        )}
      </ul>
    </div>
  );
};

export default DashboardFumigation;
