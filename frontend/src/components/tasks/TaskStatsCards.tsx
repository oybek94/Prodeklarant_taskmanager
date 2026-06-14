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
            className="relative overflow-hidden bg-white dark:bg-slate-800/80 rounded-xl p-3 sm:p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3 sm:gap-4"
          >
            <div className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center ${bgIcon}`}>
              <Icon icon={icon} className={`w-5 h-5 sm:w-5 sm:h-5 ${textIcon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label} vazifalar</div>
                {data.previous > 0 && (
                  <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(change)}%
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between mt-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">{data.current}</div>
                <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mb-0.5">Oldingi: {data.previous}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
