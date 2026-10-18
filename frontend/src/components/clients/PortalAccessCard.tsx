import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import { CopyIconButton } from '../CopyIconButton';

const PORTAL_URL = 'https://my.prodeklarant.uz';

interface Access {
  login: string | null;
  loginValid: boolean;
  hasPassword: boolean;
}

interface Issued {
  login: string;
  password: string;
}

const errorText = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof msg === 'string' ? msg : fallback;
};

/** Mijozga my.prodeklarant.uz kirishini berish (faqat ADMIN). Parol faqat yaratilgan paytda ko'rinadi. */
export default function PortalAccessCard({ clientId, className = 'mb-4' }: { clientId: number; className?: string }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'revoke' | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get<Access>(`/clients/${clientId}/portal-access`);
      setAccess(r.data);
    } catch {
      setAccess(null);
    }
  }, [clientId]);

  useEffect(() => {
    setIssued(null);
    setConfirm(null);
    load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post<Issued>(`/clients/${clientId}/portal-access`);
      setIssued(r.data);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(errorText(e, 'Parol yaratib bo\'lmadi'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await apiClient.delete(`/clients/${clientId}/portal-access`);
      setIssued(null);
      setConfirm(null);
      await load();
      toast.success('Portal kirishi o\'chirildi');
    } catch (e) {
      toast.error(errorText(e, 'O\'chirib bo\'lmadi'));
    } finally {
      setBusy(false);
    }
  };

  if (!access) return null;

  const message = issued
    ? `Prodeklarant shaxsiy kabineti: ${PORTAL_URL}\nLogin: ${issued.login}\nParol: ${issued.password}`
    : '';

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Icon icon="solar:key-bold-duotone" className="w-5 h-5 text-indigo-600" />
            Mijoz portali
          </h2>
          <div className="text-sm text-gray-500 mt-1">
            {access.hasPassword ? 'Kirish yoqilgan' : 'Kirish berilmagan'} ·{' '}
            <a href={PORTAL_URL} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              my.prodeklarant.uz
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {confirm === 'reset' ? (
            <>
              <button type="button" disabled={busy} onClick={create} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                Ha, yangi parol yaratish
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Bekor qilish</button>
            </>
          ) : confirm === 'revoke' ? (
            <>
              <button type="button" disabled={busy} onClick={revoke} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                Ha, kirishni o'chirish
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Bekor qilish</button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || !access.loginValid}
                onClick={() => (access.hasPassword ? setConfirm('reset') : create())}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {access.hasPassword ? 'Yangi parol yaratish' : 'Parol yaratish'}
              </button>
              {access.hasPassword && (
                <button type="button" disabled={busy} onClick={() => setConfirm('revoke')} className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60">
                  Kirishni o'chirish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!access.loginValid && (
        <div className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Login mijozning telefon raqami bo'ladi. Avval mijoz kartasida telefon raqamni to'ldiring.
        </div>
      )}
      {confirm === 'reset' && (
        <div className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Eski parol darhol ishlamay qoladi, mijoz hozir kirgan bo'lsa tizimdan chiqib ketadi.
        </div>
      )}

      {issued && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-3">
            Parol yaratildi. Uni faqat hozir ko'rasiz, mijozga yuboring.
          </div>
          <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Login</dt>
            <dd className="font-mono font-semibold break-all">{issued.login}</dd>
            <dd><CopyIconButton textToCopy={issued.login} toastMessage="Login nusxalandi" /></dd>
            <dt className="text-gray-500">Parol</dt>
            <dd className="font-mono font-semibold text-base tracking-wide break-all">{issued.password}</dd>
            <dd><CopyIconButton textToCopy={issued.password} toastMessage="Parol nusxalandi" /></dd>
          </dl>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(message); toast.success('Xabar nusxalandi'); }}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            <Icon icon="solar:copy-bold-duotone" className="w-4 h-4" />
            Xabarni nusxalash (Telegram/SMS uchun)
          </button>
        </div>
      )}
    </div>
  );
}
