import React from 'react';
import { Icon } from '@iconify/react';

interface DashboardActivityHeatmapProps {
  premiumStats: any;
}

export const DashboardActivityHeatmap: React.FC<DashboardActivityHeatmapProps> = ({ premiumStats }) => {
  return (
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:opacity-100 transition-opacity duration-700 pointer-events-none opacity-50"></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30">
          <Icon icon="lucide:calendar-days" className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Umumiy Faollik</h2>
          <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Jonli Holat (So'nggi 6 oy)</p>
        </div>
      </div>

      <div className="relative z-10 overflow-x-auto custom-scrollbar pb-4 pt-2 px-1">
        {!premiumStats ? (
          <div className="flex items-center justify-center py-6 h-[100px]"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div></div>
        ) : (() => {
          const activityList = premiumStats.githubActivity || [];
          const map = new Map();
          activityList.forEach((a: any) => map.set(a.date, a.count));

          const today = new Date();
          const daysToSubtract = 180;
          const startDate = new Date(today.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

          const startDay = startDate.getDay();
          const startOfGrid = new Date(startDate.getTime() - startDay * 24 * 60 * 60 * 1000);
          const weeks = [];
          let currentWeek = [];

          for (let d = new Date(startOfGrid); d <= today; d.setDate(d.getDate() + 1)) {
            // Set time to noon to avoid timezone shift dropping dates
            const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
            const dateStr = dLocal.toISOString().split('T')[0];
            const count = map.get(dateStr) || 0;

            currentWeek.push({ date: dateStr, count, isFuture: dLocal > today });

            if (currentWeek.length === 7) {
              weeks.push(currentWeek);
              currentWeek = [];
            }
          }
          if (currentWeek.length > 0) {
            weeks.push(currentWeek);
          }

          return (
            <div className="flex gap-[3px] sm:gap-[5px] mt-1">
              <div className="flex flex-col gap-[3px] sm:gap-[5px] pr-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 items-end mt-0.5">
                <div className="h-[12px] sm:h-[14px]">Yak</div>
                <div className="h-[12px] sm:h-[14px] opacity-0">Dush</div>
                <div className="h-[12px] sm:h-[14px]">Sesh</div>
                <div className="h-[12px] sm:h-[14px] opacity-0">Chor</div>
                <div className="h-[12px] sm:h-[14px]">Pay</div>
                <div className="h-[12px] sm:h-[14px] opacity-0">Jum</div>
                <div className="h-[12px] sm:h-[14px]">Shan</div>
              </div>
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-[3px] sm:gap-[5px]">
                  {week.map((day, j) => {
                    let colorClass = "bg-gray-100 dark:bg-gray-800/80";
                    if (day.isFuture) colorClass = "bg-transparent opacity-0 pointer-events-none";
                    else if (day.count > 0 && day.count <= 3) colorClass = "bg-emerald-200 dark:bg-emerald-800/70";
                    else if (day.count > 3 && day.count <= 8) colorClass = "bg-emerald-400 dark:bg-emerald-600/90";
                    else if (day.count > 8 && day.count <= 15) colorClass = "bg-emerald-500 dark:bg-emerald-500";
                    else if (day.count > 15) colorClass = "bg-emerald-600 dark:bg-emerald-400";

                    return (
                      <div
                        key={j}
                        title={`${day.date}: ${day.count} ta kelib tushgan vazifa`}
                        className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px] sm:rounded-[4px] transition-colors cursor-pointer hover:ring-2 hover:ring-gray-400/50 ${colorClass}`}
                      ></div>
                    )
                  })}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="relative z-10 flex items-center justify-end gap-2 mt-auto pt-4 text-[11px] font-medium text-gray-500 dark:text-gray-400 lg:pl-10">
        <span>Kam</span>
        <div className="flex gap-[3px] sm:gap-[5px]">
          <div className="w-[12px] h-[12px] rounded-[3px] bg-gray-100 dark:bg-gray-800/80"></div>
          <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-200 dark:bg-emerald-800/70"></div>
          <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-400 dark:bg-emerald-600/90"></div>
          <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-500 dark:bg-emerald-500"></div>
          <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-600 dark:bg-emerald-400"></div>
        </div>
        <span>Ko'p</span>
      </div>
    </div>
  );
};
