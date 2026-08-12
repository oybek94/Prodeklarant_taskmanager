import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { deleteAgreement, listAgreements } from '../features/serviceAgreement/api';
import { downloadAgreementPdf } from '../features/serviceAgreement/downloadAgreementPdf';
import {
  PAYMENT_MODEL_LABEL,
  PAYMENT_MODEL_LETTER,
  STATUS_LABEL,
  type AgreementStatus,
  type ServiceAgreement,
} from '../features/serviceAgreement/types';

const STATUS_FILTERS: Array<{ key: '' | AgreementStatus; label: string }> = [
  { key: '', label: 'Hammasi' },
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'DRAFT', label: 'Qoralama' },
  { key: 'TERMINATED', label: 'Bekor' },
];

const STATUS_BADGE: Record<AgreementStatus, string> = {
  ACTIVE: 'bg-green-50 text-green-700 ring-green-600/20',
  DRAFT: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  TERMINATED: 'bg-red-50 text-red-700 ring-red-600/20',
};

/** Prisma `Decimal` JSON'da matn bo'lib keladi */
const formatMoney = (value: string | null): string =>
  value ? Number(value).toLocaleString('ru-RU') : '—';

export default function ServiceAgreements() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'' | AgreementStatus>('');
  const [items, setItems] = useState<ServiceAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [bhmUzs, setBhmUzs] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<ServiceAgreement | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Qidiruv har harfda so'rov yubormasligi uchun
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAgreements({ q: debounced, status, limit: 100 })
      .then((res) => { if (!cancelled) setItems(res.items); })
      .catch(() => { if (!cancelled) toast.error('Shartnomalarni yuklab bo\'lmadi'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, status]);

  // Tarif ustunidagi so'm ekvivalenti uchun joriy BHM
  useEffect(() => {
    apiClient.get('/bxm/current')
      .then(({ data }) => setBhmUzs(Number(data.amountUzs) || 0))
      .catch(() => setBhmUzs(0));
  }, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAgreement(pendingDelete.id);
      setItems((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success('Shartnoma o\'chirildi');
    } catch {
      toast.error('O\'chirishda xatolik');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shartnomalar</h1>
          {!loading && (
            <p className="text-sm text-gray-500">
              {items.length ? `${items.length} ta shartnoma` : 'Topilmadi'}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/shartnomalar/yangi')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="text-xl" />
          Yangi shartnoma
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Icon icon="solar:magnifer-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Korxona, INN yoki shartnoma raqami…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                status === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500">Yuklanmoqda…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center">
          <p className="mb-3 text-gray-600">Hali shartnoma yo'q</p>
          <Link to="/shartnomalar/yangi" className="text-blue-600 hover:underline">Birinchisini yarating</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Korxona</th>
                <th className="px-4 py-3 font-medium">№ / Sana</th>
                <th className="px-4 py-3 font-medium">Tarif</th>
                <th className="px-4 py-3 font-medium">Kredit limiti</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Holat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr
                  key={a.id}
                  className={`border-t border-gray-100 transition hover:bg-gray-50 ${a.status === 'TERMINATED' ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link to={`/shartnomalar/${a.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {a.customerName}
                    </Link>
                    <div className="text-xs text-gray-500">INN: {a.customerInn || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{a.agreementNumber}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(a.agreementDate).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{Number(a.mainTariffBhm)} BHM</div>
                    <div className="text-xs tabular-nums text-gray-500">
                      {bhmUzs ? (Number(a.mainTariffBhm) * bhmUzs).toLocaleString('ru-RU') : '—'} so'm
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(a.creditLimit)}</td>
                  <td className="px-4 py-3">
                    <span title={PAYMENT_MODEL_LABEL[a.paymentModel]} className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-600">
                      {PAYMENT_MODEL_LETTER[a.paymentModel]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ring-1 ring-inset ${STATUS_BADGE[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => downloadAgreementPdf(a, bhmUzs)} title="PDF yuklab olish" className="rounded p-1.5 hover:bg-gray-100">
                        <Icon icon="solar:file-download-bold-duotone" className="text-xl text-gray-600" />
                      </button>
                      <Link to={`/shartnomalar/${a.id}`} title="Ochish" className="rounded p-1.5 hover:bg-gray-100">
                        <Icon icon="solar:pen-new-square-bold-duotone" className="text-xl text-gray-600" />
                      </Link>
                      <button onClick={() => setPendingDelete(a)} title="O'chirish" className="rounded p-1.5 hover:bg-red-50">
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="text-xl text-gray-400 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingDelete(null); }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h3 className="mb-1 font-semibold text-gray-900">Shartnomani o'chirish</h3>
            <p className="text-sm text-gray-600">
              № {pendingDelete.agreementNumber} — {pendingDelete.customerName}
            </p>
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Shartnoma bazadan butunlay o'chadi va uni tiklab bo'lmaydi. Haqiqatda tuzilgan
              shartnomani yopish uchun uni ochib «Bekor qilish» dan foydalaning.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
                Yopish
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'O\'chirilmoqda…' : 'O\'chirish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
