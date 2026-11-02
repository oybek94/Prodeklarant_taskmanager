import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { CopyIconButton } from '../CopyIconButton';

interface DriverCodeStatus {
  exists: boolean;
  code?: string;
  status?: 'WAITING' | 'ACTIVE' | 'FINISHED';
  driverBound?: boolean;
  lastLat?: number | null;
  lastLng?: number | null;
  lastLocationAt?: string | null;
}

const errorText = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof msg === 'string' ? msg : fallback;
};

const formatAge = (iso: string): string => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'hozirgina';
  if (minutes < 60) return `${minutes} daq oldin`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} soat ${minutes % 60} daq oldin`;
  return `${Math.floor(minutes / 1440)} kun oldin`;
};

const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

/** Yuk uchun haydovchi boti kodi: xodim kodni oladi va haydovchiga beradi; ulanish holati va oxirgi joylashuv ko'rinadi. */
export default function DriverCodeCard({ taskId, className = '' }: { taskId: number; className?: string }) {
  const [status, setStatus] = useState<DriverCodeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get<DriverCodeStatus>(`/tasks/${taskId}/driver-code`);
      setStatus(r.data);
    } catch {
      setStatus(null);
    }
  }, [taskId]);

  useEffect(() => {
    setConfirmReset(false);
    setStatus(null);
    load();
  }, [load]);

  const issue = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/tasks/${taskId}/driver-code`);
      setConfirmReset(false);
      await load();
    } catch (e) {
      toast.error(errorText(e, "Kod yaratib bo'lmadi"));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await apiClient.delete(`/tasks/${taskId}/driver-code`);
      await load();
      toast.success("Kod o'chirildi");
    } catch (e) {
      toast.error(errorText(e, "O'chirib bo'lmadi"));
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  const hasCode = status.exists && !!status.code && status.status !== 'FINISHED';
  const hasLocation = status.lastLat != null && status.lastLng != null && !!status.lastLocationAt;

  return (
    <div className={`rounded-[14px] border border-[#e6e8ef] dark:border-slate-700 p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="m-0 text-[13px] font-bold">Haydovchi boti</h4>
        {hasCode && (
          <span className={`text-[12px] font-semibold ${status.driverBound ? 'text-emerald-600' : 'text-[#5d6272] dark:text-gray-400'}`}>
            {status.driverBound ? 'Haydovchi ulangan' : 'Ulanmagan'}
          </span>
        )}
      </div>

      {hasCode ? (
        <>
          <div className="flex items-center gap-2">
            <code className="text-lg font-bold tracking-[0.2em]" style={MONO}>{status.code}</code>
            <CopyIconButton textToCopy={status.code ?? ''} toastMessage="Kod nusxalandi" />
          </div>
          <div className="text-[12px] text-[#5d6272] dark:text-gray-400">
            Haydovchiga bering: u Telegram'da @pd_client_bot ga kirib shu kodni yozadi. Bot unga bojxona, manzil va hujjatlarni ko'rsatadi, joylashuvini kuzatadi.
          </div>
          {hasLocation && (
            <div className="text-[13px]">
              Oxirgi joylashuv: <b>{formatAge(status.lastLocationAt as string)}</b>{' '}
              <a
                className="text-[#0f7fb8] underline"
                href={`https://www.google.com/maps?q=${status.lastLat},${status.lastLng}`}
                target="_blank"
                rel="noreferrer"
              >
                xaritada
              </a>
            </div>
          )}
          {status.driverBound && !hasLocation && (
            <div className="text-[12px] text-[#8a5a00] dark:text-amber-400">Haydovchi hali joylashuv yubormagan.</div>
          )}
          <div className="flex gap-2">
            {confirmReset ? (
              <>
                <button type="button" disabled={busy} onClick={issue} className="flex-1 h-10 rounded-[10px] bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-60">
                  Ha, yangi kod (haydovchi uziladi)
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className="h-10 px-4 rounded-[10px] border border-gray-300 dark:border-slate-600 text-[13px]">
                  Bekor
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (status.driverBound ? setConfirmReset(true) : issue())}
                  className="flex-1 h-10 rounded-[10px] border border-[#d7dbe7] dark:border-slate-600 text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  Yangi kod
                </button>
                <button type="button" disabled={busy} onClick={revoke} className="h-10 px-4 rounded-[10px] border border-red-300 text-red-600 text-[13px] font-semibold hover:bg-red-50 disabled:opacity-60">
                  O'chirish
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <button type="button" disabled={busy} onClick={issue} className="h-10 rounded-[10px] bg-[#0f7fb8] hover:bg-[#0c6c9d] text-white text-[13px] font-semibold disabled:opacity-60">
          Haydovchi kodini olish
        </button>
      )}
    </div>
  );
}
