import { Icon } from '@iconify/react';
import { formatSom } from './format';
import type { MonthlyStats } from './types';

interface TransactionsStatsCardsProps {
  stats: MonthlyStats;
}

type Metric = { label: string; value: number; change: number; goodWhenUp: boolean };

function Change({ change, goodWhenUp }: { change: number; goodWhenUp: boolean }) {
  const up = change >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-emerald-600' : 'text-rose-600'}`}>
      <Icon icon={up ? 'solar:arrow-up-bold-duotone' : 'solar:arrow-down-bold-duotone'} className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(1).replace('.', ',')}%
      <span className="ml-1 font-normal text-gray-400">o'tgan oyga</span>
    </span>
  );
}

export function TransactionsStatsCards({ stats }: TransactionsStatsCardsProps) {
  const metrics: Metric[] = [
    { label: 'Oylik kirim', value: stats.income?.current ?? 0, change: stats.income?.change ?? 0, goodWhenUp: true },
    { label: 'Oylik chiqim', value: stats.expense?.current ?? 0, change: stats.expense?.change ?? 0, goodWhenUp: false },
    { label: 'Sof foyda', value: stats.net?.current ?? 0, change: stats.net?.change ?? 0, goodWhenUp: true },
  ];
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500">{m.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
            {m.value < 0 ? '−' : ''}{formatSom(Math.abs(m.value))} <span className="text-sm font-normal text-gray-400">so'm</span>
          </p>
          <div className="mt-1"><Change change={m.change} goodWhenUp={m.goodWhenUp} /></div>
        </div>
      ))}
    </div>
  );
}
