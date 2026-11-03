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
  return h > 0 ? `${h} s ${m} d` : `${m} d`;
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
  const visible = [...pending, ...sent];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[20px] shadow-sm border border-white/60 dark:border-gray-700/50 p-4 relative overflow-hidden flex flex-col h-full">
      <div className="absolute -left-10 -top-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 mb-3 relative z-10">
        <Icon icon="solar:bell-bing-bold-duotone" className="w-5 h-5 text-emerald-500" />
        Fumigatsiya eslatmalari
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 mb-2 relative z-10">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={truckNumber}
            onChange={(e) => setTruckNumber(e.target.value)}
            placeholder="40232BAA"
            maxLength={20}
            title="Fura raqami"
            className="w-[7.5rem] shrink-0 text-xs font-semibold uppercase bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400 text-gray-800 dark:text-gray-100"
          />
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            title="Rasmiylashtirish vaqti (Toshkent)"
            className="flex-1 min-w-0 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 text-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRemindAt(tashkentInputValue(210))}
            className="text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
          >
            +3.5 soat
          </button>
          <button
            type="button"
            onClick={() => setRemindAt(tashkentInputValue(240))}
            className="text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
          >
            +4 soat
          </button>
          <button
            type="submit"
            disabled={submitting || truckNumber.trim().length < 3}
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '...' : 'Qo\'shish'}
          </button>
        </div>
      </form>
      {error && <p className="text-xs text-red-500 mb-1 relative z-10">{error}</p>}

      <div className="space-y-1 relative z-10 flex-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="flex justify-center p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-3">Eslatmalar yo'q</div>
        ) : (
          visible.map((r) => {
            const canDelete = user?.role === 'ADMIN' || user?.id === r.createdBy.id;
            return (
              <div
                key={r.id}
                title={`Kiritgan: ${r.createdBy.name}`}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                  r.sentAt
                    ? 'bg-gray-50/50 border-gray-100 dark:bg-gray-900/30 dark:border-gray-800'
                    : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <Icon
                  icon={r.sentAt ? 'solar:check-circle-bold-duotone' : 'solar:clock-circle-bold-duotone'}
                  className={`w-4 h-4 shrink-0 ${r.sentAt ? 'text-emerald-500' : 'text-amber-500'}`}
                />
                <span className={`font-bold tracking-wide ${r.sentAt ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                  {r.truckNumber}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{formatTime(r.remindAt)}</span>
                <span className={`ml-auto font-semibold whitespace-nowrap ${r.sentAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {r.sentAt ? 'Yuborildi' : formatRemaining(r.remindAt, nowMs)}
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    title={r.sentAt ? 'Ro\'yxatdan olib tashlash' : 'Bekor qilish'}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DashboardFumigation;
