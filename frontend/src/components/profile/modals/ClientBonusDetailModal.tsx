import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../../../lib/api';
import TableModal from './TableModal';

type ContractPaymentType = 'CASH_ALL_INCLUSIVE' | 'TRANSFER_ONLY' | 'CASH_ONLY' | 'MIXED';
type ExcludedReason = 'ASSIGNED_USER' | 'ADMIN' | 'NO_UZS' | null;

interface WorkerFeeLine {
  kpiLogId: number;
  userId: number;
  userName: string | null;
  stageName: string;
  amount: number;
  currency: string | null;
  amountUzs: number | null;
  excludedReason: ExcludedReason;
}

interface BonusBreakdown {
  contractPaymentType: ContractPaymentType;
  deal: { amount: number | null; currency: string | null; exchangeRate: number | null; amountUzs: number };
  tax: { ratePercent: number; baseUzs: number; amountUzs: number };
  certifier: {
    configCreatedAt: string | null;
    st1Uzs: number;
    fitoUzs: number;
    aktUzs: number;
    fumigationUzs: number;
    amountUzs: number;
  };
  otherWorkers: { amountUzs: number; lines: WorkerFeeLine[] };
  profitBeforeClampUzs: number;
  profitUzs: number;
  bonusSharePercent: number;
  bonusUzs: number;
}

interface BonusDetail {
  id: number;
  taskId: number;
  taskTitle?: string;
  clientName?: string;
  createdAt: string;
  stored: {
    dealAmountUzs: number;
    taxUzs: number;
    certifierFeeUzs: number;
    otherWorkersFeeUzs: number;
    profitUzs: number;
    bonusUzs: number;
  };
  breakdown: BonusBreakdown | null;
}

const CONTRACT_LABELS: Record<ContractPaymentType, string> = {
  CASH_ALL_INCLUSIVE: 'Naqt (hammasi ichida)',
  TRANSFER_ONLY: "Xizmat haqi — 100% perechisleniya",
  CASH_ONLY: "Xizmat haqi — 100% naqt",
  MIXED: 'Xizmat haqi — aralash (naqt + perechisleniya)',
};

const EXCLUDED_LABELS: Record<Exclude<ExcludedReason, null>, string> = {
  ASSIGNED_USER: 'Biriktirilgan xodimning o‘zi — ayirilmaydi',
  ADMIN: 'Admin — ayirilmaydi',
  NO_UZS: "So'mga o'girib bo'lmadi (kurs yo'q)",
};

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n)).replace(/,/g, ' ');
const fmtRate = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n).replace(/,/g, ' ');
const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

function Step({ n, title, sign, amount, children }: {
  n: number; title: string; sign: '+' | '−' | '='; amount: number; children?: ReactNode;
}) {
  const color = sign === '+' ? 'text-gray-900 dark:text-white' : sign === '−' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">{n}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{title}</span>
        </div>
        <span className={`font-bold whitespace-nowrap ${color}`}>{sign === '+' ? '' : `${sign} `}{fmt(amount)} so'm</span>
      </div>
      {children && <div className="mt-3 pl-8 text-sm text-gray-600 dark:text-gray-400 space-y-1">{children}</div>}
    </div>
  );
}

function Row({ label, value, muted }: { label: ReactNode; value: ReactNode; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${muted ? 'text-gray-400 dark:text-gray-500' : ''}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}

export default function ClientBonusDetailModal({ workerId, bonusId, onClose }: {
  workerId: number | string; bonusId: number; onClose: () => void;
}) {
  const [data, setData] = useState<BonusDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient.get<BonusDetail>(`/workers/${workerId}/client-bonuses/${bonusId}`)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.error || "Ma'lumotni yuklab bo'lmadi"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workerId, bonusId]);

  const b = data?.breakdown;
  const s = data?.stored;
  const mismatch = !!(b && s && Math.abs(b.bonusUzs - s.bonusUzs) >= 1);

  return (
    <TableModal
      title="Bonus qanday hisoblandi"
      subtitle={data ? `${data.clientName || '-'} · ${data.taskTitle || `#${data.taskId}`} · ${fmtDate(data.createdAt)}` : ''}
      onClose={onClose}
      loading={loading}
      empty={!loading && (!!error || !data)}
      emptyText={error || "Ma'lumot topilmadi"}
    >
      {data && s && (
        <div className="p-6 space-y-3">
          {mismatch && b && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
              <Icon icon="solar:danger-triangle-bold-duotone" className="w-5 h-5 shrink-0" />
              <span>
                Vazifa yakunlangandan keyin ma'lumot (stavka yoki ishchilar haqi) o'zgargan. Yozilgan bonus:{' '}
                <b>{fmt(s.bonusUzs)} so'm</b>, quyidagi joriy ma'lumot bo'yicha: <b>{fmt(b.bonusUzs)} so'm</b>.
              </span>
            </div>
          )}

          {!b ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Batafsil qatorlarni qayta tiklab bo'lmadi (mijozdan xodim biriktirilishi yoki shartnoma turi o'zgargan). Yozilgan summalar:
              </p>
              <Step n={1} title="Shartnoma summasi" sign="+" amount={s.dealAmountUzs} />
              <Step n={2} title="Soliq" sign="−" amount={s.taxUzs} />
              <Step n={3} title="Sertifikatchi xarajatlari" sign="−" amount={s.certifierFeeUzs} />
              <Step n={4} title="Boshqa ishchilar haqi" sign="−" amount={s.otherWorkersFeeUzs} />
              <Step n={5} title="Sof foyda" sign="=" amount={s.profitUzs} />
              <Step n={6} title="Bonus" sign="=" amount={s.bonusUzs} />
            </>
          ) : (
            <>
              <Step n={1} title="Shartnoma summasi" sign="+" amount={b.deal.amountUzs}>
                <Row label="Shartnoma turi" value={CONTRACT_LABELS[b.contractPaymentType]} />
                {b.deal.amount != null && b.deal.currency && b.deal.currency !== 'UZS' && (
                  <Row
                    label="Hisob"
                    value={`${fmtRate(b.deal.amount)} ${b.deal.currency}${b.deal.exchangeRate ? ` × ${fmtRate(b.deal.exchangeRate)}` : ''}`}
                  />
                )}
              </Step>

              <Step n={2} title={`Soliq (${fmtRate(b.tax.ratePercent)}%)`} sign="−" amount={b.tax.amountUzs}>
                {b.contractPaymentType === 'CASH_ONLY' ? (
                  <p>100% naqt shartnomada soliq olinmaydi.</p>
                ) : (
                  <Row
                    label={b.contractPaymentType === 'MIXED' ? 'Perechisleniya qismi × stavka' : 'Shartnoma summasi × stavka'}
                    value={`${fmt(b.tax.baseUzs)} × ${fmtRate(b.tax.ratePercent)}%`}
                  />
                )}
              </Step>

              <Step n={3} title="Sertifikatchi xarajatlari" sign="−" amount={b.certifier.amountUzs}>
                <Row label="ST-1" value={`${fmt(b.certifier.st1Uzs)} so'm`} />
                <Row label="FITO" value={`${fmt(b.certifier.fitoUzs)} so'm`} />
                <Row label="AKT" value={`${fmt(b.certifier.aktUzs)} so'm`} />
                <Row label="Fumigatsiya" value={`${fmt(b.certifier.fumigationUzs)} so'm`} />
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                  {b.certifier.configCreatedAt
                    ? `Filial stavkalari, ${fmtDate(b.certifier.configCreatedAt)} dagi sozlama`
                    : "Filial uchun sertifikatchi stavkalari sozlanmagan"}
                </p>
              </Step>

              <Step n={4} title="Boshqa ishchilar haqi" sign="−" amount={b.otherWorkers.amountUzs}>
                {b.otherWorkers.lines.length === 0 ? (
                  <p>Bu vazifa bo'yicha ishchilar haqi yozilmagan.</p>
                ) : (
                  b.otherWorkers.lines.map((l) => (
                    <Row
                      key={l.kpiLogId}
                      muted={!!l.excludedReason}
                      label={
                        <span>
                          {l.userName || `#${l.userId}`} · {l.stageName}
                          {l.excludedReason && <span className="block text-xs italic">{EXCLUDED_LABELS[l.excludedReason]}</span>}
                        </span>
                      }
                      value={
                        <span className={l.excludedReason ? 'line-through' : ''}>
                          {l.currency && l.currency !== 'UZS' ? `${fmtRate(l.amount)} ${l.currency} → ` : ''}
                          {l.amountUzs != null ? `${fmt(l.amountUzs)} so'm` : '—'}
                        </span>
                      }
                    />
                  ))
                )}
              </Step>

              <Step n={5} title="Sof foyda" sign="=" amount={b.profitUzs}>
                <Row
                  label="1 − 2 − 3 − 4"
                  value={`${fmt(b.deal.amountUzs)} − ${fmt(b.tax.amountUzs)} − ${fmt(b.certifier.amountUzs)} − ${fmt(b.otherWorkers.amountUzs)}`}
                />
                {b.profitBeforeClampUzs < 0 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    Natija manfiy ({fmt(b.profitBeforeClampUzs)} so'm) — foyda 0 deb olinadi.
                  </p>
                )}
              </Step>

              <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-800 dark:text-gray-100">Bonus</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Sof foydaning {fmtRate(b.bonusSharePercent)}%: {fmt(b.profitUzs)} × {fmtRate(b.bonusSharePercent)}%
                  </div>
                </div>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(b.bonusUzs)} so'm</span>
              </div>
            </>
          )}
        </div>
      )}
    </TableModal>
  );
}
