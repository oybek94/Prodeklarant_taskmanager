import React from 'react';
import { Icon } from '@iconify/react';

interface DashboardActivityHeatmapProps {
  premiumStats: any;
}

export const DashboardActivityHeatmap: React.FC<DashboardActivityHeatmapProps> = ({ premiumStats }) => {
  return (
    <div className="relative h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 flex flex-col transition-all duration-300 overflow-hidden group">
      
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-gradient-to-bl from-emerald-400/10 via-teal-400/5 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 transition-opacity group-hover:opacity-100"></div>

      <div className="flex items-center gap-4 mb-5 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center shadow-inner">
          <Icon icon="lucide:activity" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Umumiy Faollik</h2>
          <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mt-1">Jonli Holat (So'nggi 6 oy)</p>
        </div>
      </div>

      <div className="relative z-10 w-full pt-2">
        {!premiumStats ? (
          <div className="flex items-center justify-center py-6 h-[120px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
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
            <div className="w-full mt-1">
              <div 
                className="grid gap-[3px] sm:gap-1.5 w-full" 
                style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
              >
                {/* Labels Column */}
                {['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'].map((label, r) => (
                  <div 
                    key={`label-${r}`} 
                    className={`text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 pr-1.5 sm:pr-2 flex items-center justify-end ${['Dush', 'Chor', 'Jum'].includes(label) ? 'opacity-0' : ''}`}
                    style={{ gridRow: r + 1, gridColumn: 1 }}
                  >
                    {label}
                  </div>
                ))}

                {/* Heatmap Cells */}
                {weeks.map((week, colIndex) => (
                  week.map((day, rowIndex) => {
                    let colorClass = "bg-gray-200/60 dark:bg-gray-800/60";
                    if (day.isFuture) colorClass = "bg-transparent opacity-0 pointer-events-none";
                    else if (day.count > 0 && day.count <= 3) colorClass = "bg-emerald-300 dark:bg-emerald-800/80";
                    else if (day.count > 3 && day.count <= 8) colorClass = "bg-emerald-400 dark:bg-emerald-600/90";
                    else if (day.count > 8 && day.count <= 15) colorClass = "bg-emerald-500 dark:bg-emerald-500";
                    else if (day.count > 15) colorClass = "bg-emerald-600 dark:bg-emerald-400";

                    return (
                      <div
                        key={`${colIndex}-${rowIndex}`}
                        title={`${day.date}: ${day.count} ta kelib tushgan vazifa`}
                        style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
                        className={`relative w-full aspect-square rounded-[3px] transition-all duration-300 cursor-pointer hover:scale-[1.3] hover:z-20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:ring-2 hover:ring-white/50 ${colorClass}`}
                      ></div>
                    )
                  })
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="relative z-10 flex items-center justify-end gap-3 mt-4 pt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 lg:pr-4 border-t border-gray-100 dark:border-gray-800/50">
        <span>Kam</span>
        <div className="flex gap-1.5 sm:gap-2">
          <div className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-md bg-gray-200/60 dark:bg-gray-800/60"></div>
          <div className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-md bg-emerald-300 dark:bg-emerald-800/80"></div>
          <div className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-md bg-emerald-400 dark:bg-emerald-600/90"></div>
          <div className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-md bg-emerald-500 dark:bg-emerald-500"></div>
          <div className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-md bg-emerald-600 dark:bg-emerald-400"></div>
        </div>
        <span>Ko'p</span>
      </div>
    </div>
  );
};
