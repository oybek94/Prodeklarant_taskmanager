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

/** Toshkent devor soati `YYYY-MM-DDTHH:mm` ko'rinishida (brauzer TZ'ga bog'liq emas) */
const tashkentInputValue = (offsetMinutes: number): string =>
  new Date(Date.now() + offsetMinutes * 60 * 1000 + TASHKENT_OFFSET_MS).toISOString().slice(0, 16);

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const formatRemaining = (iso: string, nowMs: number): string => {
  const diffMin = Math.ceil((new Date(iso).getTime() - nowMs) / 60000);
  if (diffMin <= 0) return 'hozir';
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h} soat ${m} daq` : `${m} daq`;
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

  const pending = reminders.filter((r) => !r.sentAt);
  const sent = reminders.filter((r) => r.sentAt);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-white/60 dark:border-gray-700/50 p-5 relative overflow-hidden">
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Icon icon="solar:bell-bing-bold-duotone" className="w-5 h-5 text-emerald-500" />
          Fumigatsiya eslatmalari
        </h2>
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
          Telegram guruhga xabar yuboriladi
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-2 relative z-10">
        <input
          type="text"
          value={truckNumber}
          onChange={(e) => setTruckNumber(e.target.value)}
          placeholder="Fura raqami (40232BAA)"
          maxLength={20}
          className="sm:w-56 text-sm uppercase bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 text-gray-800 dark:text-gray-100"
        />
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="sm:w-56 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 text-gray-800 dark:text-gray-100"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRemindAt(tashkentInputValue(210))}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
          >
            +3.5 soat
          </button>
          <button
            type="button"
            onClick={() => setRemindAt(tashkentInputValue(240))}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
          >
            +4 soat
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting || truckNumber.trim().length < 3}
          className="sm:ml-auto text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Saqlanmoqda...' : 'Eslatma qo\'shish'}
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mb-2 relative z-10">{error}</p>}

      <div className="space-y-2 relative z-10 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
            Kutayotgan fumigatsiya eslatmalari yo'q
          </div>
        ) : (
          <>
            {[...pending, ...sent].map((r) => {
              const canDelete = user?.role === 'ADMIN' || user?.id === r.createdBy.id;
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    r.sentAt
                      ? 'bg-gray-50/50 border-gray-100 dark:bg-gray-900/30 dark:border-gray-800'
                      : 'bg-white border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <Icon
                    icon={r.sentAt ? 'solar:check-circle-bold-duotone' : 'solar:clock-circle-bold-duotone'}
                    className={`w-5 h-5 shrink-0 ${r.sentAt ? 'text-emerald-500' : 'text-amber-500'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold tracking-wide ${r.sentAt ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                      {r.truckNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(r.remindAt)} · {r.createdBy.name}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${r.sentAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {r.sentAt ? 'Xabar yuborildi' : `${formatRemaining(r.remindAt, nowMs)} qoldi`}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      title={r.sentAt ? 'Ro\'yxatdan olib tashlash' : 'Bekor qilish'}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardFumigation;
