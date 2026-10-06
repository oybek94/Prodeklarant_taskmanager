import React from 'react';
import { Icon } from '@iconify/react';
import CurrencyDisplay from '../CurrencyDisplay';
import type { StageStats } from '../../hooks/useProfileData';

interface StageStatisticsListProps {
  stageStats: StageStats | null;
  loading: boolean;
  onOpenParticipations: () => void;
}

const GRID = 'grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1.6fr)]';

export default function StageStatisticsList({ stageStats, loading, onOpenParticipations }: StageStatisticsListProps) {
  const rows = stageStats?.stageStats ?? [];
  const totalEarned = rows.reduce((sum, s) => sum + Number(s.earnedAmount || 0), 0);

  return (
    <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-slate-700/60">
        <h2 className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Jarayonlar statistikasi</h2>
        <button
          type="button"
          onClick={onOpenParticipations}
          className="h-9 px-3.5 rounded-[10px] border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Barcha ishtiroklar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className={`grid ${GRID} gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-gray-400`}>
              <div>Jarayon</div>
              <div className="text-right">Tarif</div>
              <div className="text-right">Ishtirok</div>
              <div className="text-right">Summa</div>
              <div>Ulush</div>
            </div>
            {rows.map((stat, idx) => {
              const stagePayment = stat.tariffUsd ?? (stat.participationCount > 0 ? Number(stat.earnedAmount) / stat.participationCount : 0);
              const share = totalEarned > 0
                ? Math.round((Number(stat.earnedAmount || 0) / totalEarned) * 100)
                : Math.round(Number(stat.percentage || 0));
              return (
                <div
                  key={idx}
                  className={`grid ${GRID} gap-4 items-center px-6 py-3.5 border-b border-gray-100 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors`}
                >
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{stat.stageName}</div>
                  <div className="text-right text-sm font-medium tabular-nums text-gray-600 dark:text-gray-300">
                    {stagePayment > 0 ? <CurrencyDisplay amount={stagePayment} originalCurrency="UZS" forceOriginal={true} /> : '-'}
                  </div>
                  <div className="text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{stat.participationCount}</div>
                  <div className="text-right text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    <CurrencyDisplay amount={Number(stat.earnedAmount)} originalCurrency="UZS" forceOriginal={true} />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      <span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                    </span>
                    <span className="shrink-0 w-9 text-right text-xs font-bold tabular-nums text-gray-600 dark:text-gray-300">{share}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Icon icon="solar:clipboard-list-bold-duotone" className="w-12 h-12 mb-3 opacity-20" />
          <p>Ma'lumot topilmadi</p>
        </div>
      )}
    </section>
  );
}
