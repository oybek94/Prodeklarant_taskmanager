import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { deleteAgreement, getAgreement, listAgreementSummaries } from '../features/serviceAgreement/api';
import { downloadAgreementPdf } from '../features/serviceAgreement/downloadAgreementPdf';
import {
  PAYMENT_MODEL_LABEL,
  PAYMENT_MODEL_LETTER,
  STATUS_LABEL,
  type AgreementStatus,
  type AgreementSummary,
} from '../features/serviceAgreement/types';

const PAGE_SIZE = 50;

const STATUS_FILTERS: Array<{ key: '' | AgreementStatus; label: string }> = [
  { key: '', label: 'Hammasi' },
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'DRAFT', label: 'Qoralama' },
  { key: 'TERMINATED', label: 'Bekor' },
];

const STATUS_BADGE: Record<AgreementStatus, { cls: string; dot: string }> = {
  ACTIVE: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30', dot: 'bg-emerald-500' },
  DRAFT: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30', dot: 'bg-amber-500' },
  TERMINATED: { cls: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-slate-700/50 dark:text-gray-300 dark:ring-slate-600', dot: 'bg-gray-400' },
};

const EMPTY_COUNTS: Record<AgreementStatus, number> = { ACTIVE: 0, DRAFT: 0, TERMINATED: 0 };

/** Prisma `Decimal` JSON'da matn bo'lib keladi */
const formatUzs = (value: number): string => `${value.toLocaleString('ru-RU')} so'm`;

/** Tarif: BHM rejimida koeffitsient + joriy so'm ekvivalenti, FIXED rejimida qat'iy so'm */
function tariffView(a: AgreementSummary, bhmUzs: number): { main: string; sub: string | null } {
  if (a.pricingMode === 'FIXED') {
    return { main: a.mainTariffUzs ? formatUzs(Number(a.mainTariffUzs)) : '—', sub: 'qat\'iy summa' };
  }
  const bhm = Number(a.mainTariffBhm);
  return { main: `${bhm} BHM`, sub: bhmUzs ? `≈ ${formatUzs(Math.round(bhm * bhmUzs))}` : null };
}

export default function ServiceAgreements() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<'' | AgreementStatus>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AgreementSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [bhmUzs, setBhmUzs] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<AgreementSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  // Qidiruv har harfda so'rov yubormasligi uchun
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAgreementSummaries({ q: debounced, status, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setCounts(res.counts ?? EMPTY_COUNTS);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) toast.error('Shartnomalarni yuklab bo\'lmadi'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, status, page]);

  // Tarif ustunidagi so'm ekvivalenti uchun joriy BHM
  useEffect(() => {
    apiClient.get('/bxm/current')
      .then(({ data }) => setBhmUzs(Number(data.amountUzs) || 0))
      .catch(() => setBhmUzs(0));
  }, []);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) setPendingDelete(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingDelete, deleting]);

  // Ro'yxat faqat jadval maydonlarini oladi — PDF uchun to'liq shartnoma alohida so'raladi
  const downloadPdf = async (a: AgreementSummary) => {
    setPdfLoadingId(a.id);
    try {
      const full = await getAgreement(a.id);
      await downloadAgreementPdf(full, bhmUzs);
    } catch {
      toast.error('Shartnomani yuklab bo\'lmadi');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAgreement(pendingDelete.id);
      setItems((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      setTotal((t) => Math.max(0, t - 1));
      setCounts((c) => ({ ...c, [pendingDelete.status]: Math.max(0, c[pendingDelete.status] - 1) }));
      setPendingDelete(null);
      toast.success('Shartnoma o\'chirildi');
    } catch {
      toast.error('O\'chirishda xatolik');
    } finally {
      setDeleting(false);
    }
  };

  const allCount = counts.ACTIVE + counts.DRAFT + counts.TERMINATED;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = debounced !== '' || status !== '';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shartnomalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Xizmat ko'rsatish shartnomalari
            {loaded && <> · <span className="tabular-nums">{allCount}</span> ta, shundan <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{counts.ACTIVE}</span> faol</>}
          </p>
        </div>
        <button
          onClick={() => navigate('/shartnomalar/yangi')}
          className="h-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5" />
          Yangi shartnoma
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1 overflow-x-auto hide-scrollbar">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            const count = f.key === '' ? allCount : counts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => { setStatus(f.key); setPage(1); }}
                className={`h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
                {loaded && <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Icon icon="solar:magnifer-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Korxona, INN yoki shartnoma raqami…"
            className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100 pl-10 pr-9 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              title="Tozalash"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!loaded ? (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700/60 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 px-4 flex items-center gap-4 bg-white dark:bg-slate-800/60">
              <div className="h-4 w-1/3 rounded bg-gray-100 dark:bg-slate-700 animate-pulse" />
              <div className="h-4 w-1/6 rounded bg-gray-100 dark:bg-slate-700 animate-pulse" />
              <div className="h-4 w-1/6 rounded bg-gray-100 dark:bg-slate-700 animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 py-16 text-center">
          <Icon icon={isFiltered ? 'solar:magnifer-bold-duotone' : 'solar:document-add-bold-duotone'} className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          {isFiltered ? (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hech narsa topilmadi</p>
              <button
                onClick={() => { setQuery(''); setStatus(''); setPage(1); }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Filtrlarni tozalash
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hali shartnoma yo'q</p>
              <Link to="/shartnomalar/yangi" className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Birinchisini yarating
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Desktop jadval */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800 text-left text-xs text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Korxona</th>
                  <th className="px-4 py-3 font-medium">№ / Sana</th>
                  <th className="px-4 py-3 font-medium">Tarif</th>
                  <th className="px-4 py-3 font-medium">Kredit limiti</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 w-px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                {items.map((a) => {
                  const tariff = tariffView(a, bhmUzs);
                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/shartnomalar/${a.id}`)}
                      className={`group cursor-pointer transition hover:bg-gray-50 dark:hover:bg-slate-800 ${a.status === 'TERMINATED' ? 'text-gray-500 dark:text-gray-500' : ''}`}
                    >
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400" title={a.customerName}>
                          {a.customerName}
                        </div>
                        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400">INN {a.customerInn || '—'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="tabular-nums text-gray-900 dark:text-gray-100">№ {a.agreementNumber}</div>
                        <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{new Date(a.agreementDate).toLocaleDateString('ru-RU')}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="tabular-nums text-gray-900 dark:text-gray-100">{tariff.main}</div>
                        {tariff.sub && <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{tariff.sub}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-300">
                        {a.creditLimit ? formatUzs(Number(a.creditLimit)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ModelBadge model={a.paymentModel} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          pdfLoading={pdfLoadingId === a.id}
                          onPdf={() => downloadPdf(a)}
                          onDelete={() => setPendingDelete(a)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil kartalar */}
          <ul className="md:hidden space-y-2">
            {items.map((a) => {
              const tariff = tariffView(a, bhmUzs);
              return (
                <li
                  key={a.id}
                  onClick={() => navigate(`/shartnomalar/${a.id}`)}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 active:bg-gray-50 dark:active:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{a.customerName}</div>
                      <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400 mt-0.5">
                        № {a.agreementNumber} · {new Date(a.agreementDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <div>Tarif: <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">{tariff.main}</span></div>
                      <div className="flex items-center gap-1.5">Model: <ModelBadge model={a.paymentModel} /></div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        pdfLoading={pdfLoadingId === a.id}
                        onPdf={() => downloadPdf(a)}
                        onDelete={() => setPendingDelete(a)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span className="tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
              </span>
              <div className="flex gap-1">
                <PageButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon="solar:alt-arrow-left-linear" label="Oldingi" />
                <PageButton disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} icon="solar:alt-arrow-right-linear" label="Keyingi" />
              </div>
            </div>
          )}
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !deleting) setPendingDelete(null); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5 text-red-600 dark:text-red-400" />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Shartnomani o'chirish</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                  № {pendingDelete.agreementNumber} — {pendingDelete.customerName}
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              Shartnoma bazadan butunlay o'chadi va uni tiklab bo'lmaydi. Haqiqatda tuzilgan
              shartnomani yopish uchun uni ochib «Bekor qilish» dan foydalaning.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="h-9 rounded-lg bg-gray-100 dark:bg-slate-800 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Yopish
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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

function StatusBadge({ status }: { status: AgreementStatus }) {
  const badge = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${badge.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ModelBadge({ model }: { model: AgreementSummary['paymentModel'] }) {
  return (
    <span
      title={PAYMENT_MODEL_LABEL[model]}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-help"
    >
      {PAYMENT_MODEL_LETTER[model]}
    </span>
  );
}

function RowActions({ pdfLoading, onPdf, onDelete }: { pdfLoading: boolean; onPdf: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-0.5">
      <button
        onClick={onPdf}
        disabled={pdfLoading}
        title="PDF yuklab olish"
        aria-label="PDF yuklab olish"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-60"
      >
        <Icon icon={pdfLoading ? 'solar:refresh-bold-duotone' : 'solar:file-download-bold-duotone'} className={`w-5 h-5 ${pdfLoading ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={onDelete}
        title="O'chirish"
        aria-label="O'chirish"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
      >
        <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5" />
      </button>
    </div>
  );
}

function PageButton({ disabled, onClick, icon, label }: { disabled: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon icon={icon} className="w-4 h-4" />
    </button>
  );
}
