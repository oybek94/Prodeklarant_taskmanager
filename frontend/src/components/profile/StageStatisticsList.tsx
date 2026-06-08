import React from 'react';
import { Icon } from '@iconify/react';
import CurrencyDisplay from '../CurrencyDisplay';
import type { StageStats } from '../../hooks/useProfileData';

interface StageStatisticsListProps {
  stageStats: StageStats | null;
  loading: boolean;
  onOpenParticipations: () => void;
}

export default function StageStatisticsList({ stageStats, loading, onOpenParticipations }: StageStatisticsListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-gray-700/50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Jarayonlar Statistikasi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Siz ishtirok etgan barcha bosqichlar ro'yxati</p>
        </div>
        <button onClick={onOpenParticipations} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-2 rounded-xl transition-colors">
          Barchasini ko'rish
        </button>
      </div>
      
      <div className="p-0 overflow-x-auto flex-1 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : stageStats && stageStats.stageStats.length > 0 ? (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800/80">
                <th className="px-6 py-5 font-bold">Jarayon nomi</th>
                <th className="px-6 py-5 font-bold text-center">Tarif</th>
                <th className="px-6 py-5 font-bold text-center">Ishtirok</th>
                <th className="px-6 py-5 font-bold text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
              {stageStats.stageStats.map((stat, idx) => {
                const stagePayment = stat.tariffUsd ?? (stat.participationCount > 0 ? Number(stat.earnedAmount) / stat.participationCount : 0);
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
                const color = colors[idx % colors.length];

                return (
                  <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <span className={`w-2 h-2 rounded-full ${color} shadow-sm`} />
                        <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{stat.stageName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        {stagePayment > 0 ? <CurrencyDisplay amount={stagePayment} originalCurrency="UZS" forceOriginal={true} /> : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-3 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                        {stat.participationCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        <CurrencyDisplay amount={Number(stat.earnedAmount)} originalCurrency="UZS" forceOriginal={true} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Icon icon="lucide:clipboard-list" className="w-12 h-12 mb-3 opacity-20" />
            <p>Ma'lumot topilmadi</p>
          </div>
        )}
      </div>
    </div>
  );
}
