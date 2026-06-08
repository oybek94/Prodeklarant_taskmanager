import React from 'react';
import { Icon } from '@iconify/react';
import { StatsCardsSkeleton } from './Skeletons';
import type { TaskStats } from './types';

interface TaskStatsCardsProps {
  stats: TaskStats | null;
  isModalMode: boolean;
  showArchive: boolean;
}

export const TaskStatsCards: React.FC<TaskStatsCardsProps> = ({
  stats,
  isModalMode,
  showArchive
}) => {
  if (isModalMode || showArchive) {
    return null;
  }

  if (!stats) {
    return <StatsCardsSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {([
        { label: 'Yillik', icon: 'lucide:calendar', data: stats.yearly, bgIcon: 'bg-indigo-100 dark:bg-indigo-900/30', textIcon: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'Oylik', icon: 'lucide:calendar-days', data: stats.monthly, bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30', textIcon: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Haftalik', icon: 'lucide:calendar-range', data: stats.weekly, bgIcon: 'bg-amber-100 dark:bg-amber-900/30', textIcon: 'text-amber-600 dark:text-amber-400' },
        { label: 'Bugungi', icon: 'lucide:calendar-clock', data: stats.daily, bgIcon: 'bg-rose-100 dark:bg-rose-900/30', textIcon: 'text-rose-600 dark:text-rose-400' },
      ] as const).map(({ label, icon, data, bgIcon, textIcon }) => {
        const change = data.previous > 0
          ? Math.round(((data.current - data.previous) / data.previous) * 100)
          : data.current > 0 ? 100 : 0;
        const isPositive = change >= 0;
        return (
          <div
            key={label}
            className="relative overflow-hidden bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgIcon}`}>
                <Icon icon={icon} className={`w-4.5 h-4.5 ${textIcon}`} />
              </div>
              {data.previous > 0 && (
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {isPositive ? '↑' : '↓'} {Math.abs(change)}%
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{data.current}</div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{label} vazifalar</div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Oldingi: {data.previous}</div>
          </div>
        );
      })}
    </div>
  );
};
