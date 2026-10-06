import React from 'react';
import { Icon } from '@iconify/react';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Stats } from '../../hooks/useProfileData';

interface KpiStatsProps {
  stats: Stats | null;
  loading: boolean;
  stageStatsLoading: boolean;
  totalTasksCount: number;
  errorStats: any;
  errorStatsLoading: boolean;
  onOpenParticipations: () => void;
  onOpenEarnings: () => void;
  onOpenPayments: () => void;
  onOpenErrors: () => void;
}

const Skeleton = () => <span className="block animate-pulse w-24 h-7 bg-gray-200 dark:bg-gray-700 rounded" />;

export default function KpiStats({
  stats, loading, stageStatsLoading, totalTasksCount,
  errorStats, errorStatsLoading,
  onOpenParticipations, onOpenEarnings, onOpenPayments, onOpenErrors
}: KpiStatsProps) {
  const money = (amount: number) => <CurrencyDisplay amount={amount} originalCurrency="UZS" forceOriginal={true} />;

  const items: {
    label: string;
    node: React.ReactNode;
    tone: string;
    onClick?: () => void;
  }[] = [
    {
      label: 'Jami ishtirok',
      node: stageStatsLoading ? <Skeleton /> : totalTasksCount,
      tone: 'text-gray-900 dark:text-gray-100',
      onClick: onOpenParticipations,
    },
    {
      label: 'Ishlab topilgan',
      node: loading ? <Skeleton /> : money(stats?.totalEarned || 0),
      tone: 'text-emerald-800 dark:text-emerald-300',
      onClick: onOpenEarnings,
    },
    {
      label: 'Olingan maosh',
      node: loading ? <Skeleton /> : money(stats?.totalPaid || 0),
      tone: 'text-gray-900 dark:text-gray-100',
      onClick: onOpenPayments,
    },
    {
      label: 'Qolgan haq',
      node: loading ? <Skeleton /> : money(stats?.pending || 0),
      tone: 'text-orange-800 dark:text-orange-300',
    },
    {
      label: 'Jami xatolar',
      node: errorStatsLoading ? <Skeleton /> : money(Number(errorStats?.totalErrorAmount || 0)),
      tone: 'text-red-700 dark:text-red-400',
      onClick: onOpenErrors,
    },
  ];

  const base = 'flex-1 basis-[220px] min-w-0 flex flex-col items-start gap-1.5 px-6 py-5 text-left border-r border-b sm:border-b-0 border-gray-100 dark:border-slate-700/60 last:border-r-0';

  return (
    <div className="flex flex-wrap bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      {items.map((item) => {
        const content = (
          <>
            <span className="flex items-center justify-between w-full text-[13px] font-semibold text-gray-500 dark:text-gray-400">
              {item.label}
              {item.onClick && <Icon icon="solar:arrow-right-up-bold-duotone" className="w-3.5 h-3.5 text-gray-400" />}
            </span>
            <span className={`text-2xl font-extrabold tracking-tight tabular-nums ${item.tone}`}>{item.node}</span>
          </>
        );
        return item.onClick ? (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={`${base} hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors`}
          >
            {content}
          </button>
        ) : (
          <div key={item.label} className={base}>{content}</div>
        );
      })}
    </div>
  );
}
