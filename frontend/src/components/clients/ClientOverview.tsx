import { Icon } from '@iconify/react';
import { formatAmount } from '../../utils/currencyFormatting';

export interface ClientDetail {
  id: number;
  name: string;
  assignedUserId?: number | null;
  assignedUser?: { id: number; name: string } | null;
  dealAmount?: number | string | null;
  balanceCurrency?: 'USD' | 'UZS';
  phone?: string;
  createdAt: string;
  defaultAfterHoursPayer?: 'CLIENT' | 'COMPANY' | null;
  creditType?: string | null;
  creditLimit?: number | string | null;
  creditStartDate?: string | null;
  tasks: Array<{
    id: number;
    title?: string;
    status: string;
    createdAt: string;
    hasPsr?: boolean;
    branch: { name: string } | null;
  }>;
  transactions: Array<{
    id: number;
    amount: number | string;
    currency: string;
    date: string;
    comment?: string | null;
  }>;
  stats?: {
    currency?: 'USD' | 'UZS';
    dealAmount: number;
    totalDealAmount?: number; // Jami shartnoma summasi (PSR hisobga olingan)
    totalIncome: number;
    balance: number;
    totalTasks: number;
    tasksByBranch: Record<string, number>;
    tasksWithPsr?: number; // PSR bor bo'lgan tasklar soni
  };
}

interface ClientOverviewProps {
  client: ClientDetail;
  hideMoney: boolean;
}

const HIDDEN = '•••';

/** Mijoz kartochkasining "Umumiy" bo'limi: moliya, asosiy ma'lumotlar, nasiya, ishlar taqsimoti */
const ClientOverview = ({ client, hideMoney }: ClientOverviewProps) => {
  const stats = client.stats;
  const currency = stats?.currency || client.balanceCurrency || 'USD';
  const money = (value: number | string | null | undefined) =>
    hideMoney ? HIDDEN : formatAmount(Number(value || 0), currency);

  return (
    <div className="space-y-5">
      {stats && <FinanceSummary stats={stats} money={money} hideMoney={hideMoney} />}

      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
        <SectionTitle icon="solar:user-id-bold-duotone">Ma'lumotlar</SectionTitle>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100 dark:bg-slate-700/60 border-t border-gray-100 dark:border-slate-700/60 rounded-b-2xl overflow-hidden">
          <InfoRow label="Telefon" icon="solar:phone-bold-duotone">
            {client.phone ? (
              <a href={`tel:${client.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {client.phone}
              </a>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </InfoRow>
          <InfoRow label="Mas'ul xodim" icon="solar:user-bold-duotone">
            {client.assignedUser?.name || 'Admin'}
          </InfoRow>
          <InfoRow label="Bitta ish narxi" icon="solar:document-text-bold-duotone">
            {client.dealAmount ? money(client.dealAmount) : <span className="text-gray-400">—</span>}
          </InfoRow>
          <InfoRow label="Qo'shimcha to'lov (After Hours)" icon="solar:moon-bold-duotone">
            {client.defaultAfterHoursPayer === 'COMPANY' ? 'Kompaniya to\'laydi' : 'Mijoz to\'laydi'}
          </InfoRow>
        </dl>
      </section>

      {(client.creditType || client.creditLimit) && (
        <CreditTerms client={client} money={money} />
      )}

      {stats && <BranchBreakdown stats={stats} />}
    </div>
  );
};

function SectionTitle({ icon, children, aside }: { icon: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <Icon icon={icon} className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
        {children}
      </h3>
      {aside}
    </div>
  );
}

function InfoRow({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 px-5 py-3.5 flex items-center gap-3 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-900/60 flex items-center justify-center shrink-0">
        <Icon icon={icon} className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate tabular-nums">{children}</dd>
      </div>
    </div>
  );
}

function FinanceSummary({
  stats,
  money,
  hideMoney,
}: {
  stats: NonNullable<ClientDetail['stats']>;
  money: (value: number | string | null | undefined) => string;
  hideMoney: boolean;
}) {
  const totalDeal = stats.totalDealAmount ?? stats.totalTasks * stats.dealAmount;
  const paid = Number(stats.totalIncome || 0);
  const balance = Number(stats.balance || 0);
  // balance = hisoblangan − to'langan + boshlang'ich qarz → jami hisoblangan = balance + to'langan
  const charged = balance + paid;
  const paidPercent = charged > 0 ? Math.min(100, Math.round((paid / charged) * 100)) : 0;

  const debtTone =
    balance > 0
      ? { label: 'Qarzdorlik', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' }
      : balance < 0
        ? { label: 'Avans (ortiqcha to\'lov)', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
        : { label: 'Qarz yo\'q', text: 'text-gray-900 dark:text-gray-100', dot: 'bg-gray-400' };

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-slate-700/60">
        <Metric
          label="Hisoblangan"
          value={money(totalDeal)}
          hint={`${stats.totalTasks} ta ish${stats.tasksWithPsr ? ` · ${stats.tasksWithPsr} tasi PSR bilan` : ''}`}
        />
        <Metric label="To'langan" value={money(paid)} valueClass="text-emerald-600 dark:text-emerald-400" />
        <Metric
          label={debtTone.label}
          value={money(Math.abs(balance))}
          valueClass={debtTone.text}
          dot={debtTone.dot}
        />
      </div>
      {!hideMoney && charged > 0 && (
        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>To'lov holati</span>
            <span className="tabular-nums font-medium">{paidPercent}% to'langan</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  valueClass = 'text-gray-900 dark:text-gray-100',
  dot,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
  dot?: string;
}) {
  return (
    <div className="px-5 py-4 min-w-0">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tracking-tight tabular-nums truncate ${valueClass}`} title={value}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</div>}
    </div>
  );
}

function CreditTerms({
  client,
  money,
}: {
  client: ClientDetail;
  money: (value: number | string | null | undefined) => string;
}) {
  const isTaskCount = client.creditType === 'TASK_COUNT';
  const typeLabel = isTaskCount
    ? 'Ma\'lum bir ish sonigacha'
    : client.creditType === 'AMOUNT'
      ? 'Ma\'lum bir summagacha'
      : 'Nasiya yo\'q';
  const limitLabel = client.creditLimit
    ? isTaskCount
      ? `${Number(client.creditLimit)} ta ish`
      : money(client.creditLimit)
    : null;

  return (
    <section className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
      <SectionTitle icon="solar:shield-check-bold-duotone">Nasiya shartlari</SectionTitle>
      <div className="px-5 pb-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <Term label="Turi" value={typeLabel} />
        {limitLabel && <Term label={isTaskCount ? 'Ish soni limiti' : 'Summa limiti'} value={limitLabel} />}
        {client.creditStartDate && (
          <Term
            label="Boshlangan"
            value={new Date(client.creditStartDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
        )}
      </div>
      {client.creditType && limitLabel && (
        <p className="px-5 pb-4 -mt-1 text-xs text-blue-800/80 dark:text-blue-300/80">
          {isTaskCount
            ? `${limitLabel}dan keyin to'lov qilinishi kerak.`
            : `Qarzdorlik ${limitLabel}ga yetganda to'lov qilinishi kerak.`}
        </p>
      )}
    </section>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value}</div>
    </div>
  );
}

function BranchBreakdown({ stats }: { stats: NonNullable<ClientDetail['stats']> }) {
  const branches = Object.entries(stats.tasksByBranch).sort((a, b) => b[1] - a[1]);
  const total = stats.totalTasks;

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
      <SectionTitle
        icon="solar:chart-2-bold-duotone"
        aside={
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Jami <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{total}</span> ta
          </span>
        }
      >
        Ishlar filiallar bo'yicha
      </SectionTitle>
      {branches.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-gray-400 dark:text-gray-500">Hali ishlar yo'q</p>
      ) : (
        <ul className="px-5 pb-4 space-y-3">
          {branches.map(([branch, count]) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={branch}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{branch === 'Unknown' ? 'Filialsiz' : `${branch} filiali`}</span>
                  <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{count}</span> ta · {percent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ClientOverview;
