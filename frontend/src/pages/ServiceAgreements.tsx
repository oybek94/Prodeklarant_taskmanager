import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { listAgreements } from '../features/serviceAgreement/api';
import { renderAgreementPdf } from '../features/serviceAgreement/pdf/renderAgreementPdf';
import {
  PAYMENT_MODEL_LETTER,
  STATUS_LABEL,
  type AgreementStatus,
  type ServiceAgreement,
} from '../features/serviceAgreement/types';
import { PdfMissingGlyphError, describeMissingGlyphs } from '../components/invoice/pdf/pdfGlyphCheck';

const STATUS_FILTERS: Array<{ key: '' | AgreementStatus; label: string }> = [
  { key: '', label: 'Hammasi' },
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'DRAFT', label: 'Qoralama' },
  { key: 'TERMINATED', label: 'Bekor' },
];

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

  const handlePdf = async (agreement: ServiceAgreement) => {
    const toastId = toast.loading('PDF tayyorlanmoqda...');
    try {
      const blob = await renderAgreementPdf(agreement, bhmUzs);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Shartnoma-${agreement.agreementNumber.replace('/', '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF yuklab olindi', { id: toastId });
    } catch (error) {
      console.error(error);
      // Shriftda glifi yo'q belgi PDF'dan JIMGINA tushib qoladi — bunday
      // hujjat yuridik kuchga ega emas, shuning uchun yuklash to'xtatiladi.
      if (error instanceof PdfMissingGlyphError) {
        toast.error(describeMissingGlyphs(error.missing), { id: toastId, duration: 20000 });
        return;
      }
      toast.error('PDF yaratishda xatolik', { id: toastId });
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Shartnomalar</h1>
        <button
          onClick={() => navigate('/shartnomalar/yangi')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="text-xl" />
          Yangi shartnoma
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Icon icon="solar:magnifer-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Korxona, INN yoki shartnoma raqami…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm ${status === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
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
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Korxona</th>
                <th className="px-4 py-3">INN</th>
                <th className="px-4 py-3">№ / Sana</th>
                <th className="px-4 py-3">Tarif</th>
                <th className="px-4 py-3">Kredit limiti</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className={`border-t border-gray-100 ${a.status === 'TERMINATED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{a.customerName}</td>
                  <td className="px-4 py-3">{a.customerInn || '—'}</td>
                  <td className="px-4 py-3">
                    <div>{a.agreementNumber}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(a.agreementDate).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{Number(a.mainTariffBhm)} BHM</div>
                    <div className="text-xs text-gray-500">
                      {bhmUzs ? (Number(a.mainTariffBhm) * bhmUzs).toLocaleString('ru-RU') : '—'} so'm
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatMoney(a.creditLimit)}</td>
                  <td className="px-4 py-3">{PAYMENT_MODEL_LETTER[a.paymentModel]}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[a.status]}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handlePdf(a)} title="PDF" className="rounded p-1.5 hover:bg-gray-100">
                        <Icon icon="solar:file-download-bold-duotone" className="text-xl text-gray-600" />
                      </button>
                      <Link to={`/shartnomalar/${a.id}`} title="Ochish" className="rounded p-1.5 hover:bg-gray-100">
                        <Icon icon="solar:pen-new-square-bold-duotone" className="text-xl text-gray-600" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
