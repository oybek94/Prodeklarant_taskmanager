import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { CopyIconButton } from '../CopyIconButton';

interface BotLinkStatus {
  linked: boolean;
  code: string | null;
  codeExpiresAt: string | null;
}

const errorText = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof msg === 'string' ? msg : fallback;
};

const formatExpiry = (iso: string): string =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Mijozning Telegram guruhini yuk ma'lumotlari botiga ulash (faqat ADMIN). Kod bir martalik, 24 soat amal qiladi. */
export default function BotLinkCard({ clientId, className = 'mb-4' }: { clientId: number; className?: string }) {
  const [status, setStatus] = useState<BotLinkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get<BotLinkStatus>(`/clients/${clientId}/bot-link`);
      setStatus(r.data);
    } catch {
      setStatus(null);
    }
  }, [clientId]);

  useEffect(() => {
    setConfirmDisconnect(false);
    load();
  }, [load]);

  const createCode = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/clients/${clientId}/bot-link`);
      await load();
    } catch (e) {
      toast.error(errorText(e, 'Kod yaratib bo\'lmadi'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await apiClient.delete(`/clients/${clientId}/bot-link`);
      setConfirmDisconnect(false);
      await load();
      toast.success('Guruh uzildi');
    } catch (e) {
      toast.error(errorText(e, 'Uzib bo\'lmadi'));
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Icon icon="solar:chat-round-dots-bold-duotone" className="w-5 h-5 text-indigo-600" />
            Telegram guruh (yuk ma'lumotlari boti)
          </h2>
          <div className="text-sm text-gray-500 mt-1">{status.linked ? 'Guruh ulangan' : 'Guruh ulanmagan'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {confirmDisconnect ? (
            <>
              <button type="button" disabled={busy} onClick={disconnect} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                Ha, guruhni uzish
              </button>
              <button type="button" onClick={() => setConfirmDisconnect(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Bekor qilish</button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={createCode} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                {status.code ? 'Yangi kod yaratish' : status.linked ? 'Boshqa guruhga ulash (kod)' : 'Ulash kodini olish'}
              </button>
              {status.linked && (
                <button type="button" disabled={busy} onClick={() => setConfirmDisconnect(true)} className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60">
                  Guruhni uzish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {status.code && status.codeExpiresAt && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
            Botni mijozning guruhiga qo'shing va guruhga quyidagini yozing. Kod bir marta ishlaydi, {formatExpiry(status.codeExpiresAt)} gacha amal qiladi.
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono font-semibold text-base tracking-wide break-all">/ulash {status.code}</code>
            <CopyIconButton textToCopy={`/ulash ${status.code}`} toastMessage="Buyruq nusxalandi" />
          </div>
        </div>
      )}
    </div>
  );
}
