import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';

interface ActivityCalendarProps {
  contributions: { date: string; count: number; level: number }[];
}

export default function ActivityCalendar({ contributions }: ActivityCalendarProps) {
  const weeks = useMemo(() => {
    if (contributions.length === 0) return [];
    
    const map = new Map();
    contributions.forEach((a: any) => map.set(a.date, a.count));

    const today = new Date();
    const startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
    const startDay = startDate.getDay();
    const startOfGrid = new Date(startDate.getTime() - startDay * 24 * 60 * 60 * 1000);
    const result: { date: string; count: number; isFuture: boolean }[][] = [];
    let currentWeek: { date: string; count: number; isFuture: boolean }[] = [];

    for (let d = new Date(startOfGrid); d <= today; d.setDate(d.getDate() + 1)) {
      const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
      const dateStr = dLocal.toISOString().split('T')[0];
      const count = map.get(dateStr) || 0;
      currentWeek.push({ date: dateStr, count, isFuture: dLocal > today });
      
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    
    return result;
  }, [contributions]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Umumiy Faollik</h2>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">So'nggi 6 oy</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <Icon icon="lucide:calendar-days" className="w-5 h-5 text-indigo-500" />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center relative z-10">
        {contributions.length > 0 ? (
          <>
            <div className="overflow-x-auto custom-scrollbar pb-4 pt-2">
              <div className="flex gap-[4px] sm:gap-[5px] mt-1 w-max mx-auto">
                <div className="flex flex-col gap-[4px] sm:gap-[5px] pr-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 items-end mt-0.5">
                  {['Yak', '', 'Sesh', '', 'Pay', '', 'Shan'].map((label, i) => (
                    <div key={i} className={`h-[12px] sm:h-[14px] ${!label ? 'opacity-0' : ''}`}>{label || '.'}</div>
                  ))}
                </div>
                {weeks.map((week, i) => (
                  <div key={i} className="flex flex-col gap-[4px] sm:gap-[5px]">
                    {week.map((day, j) => {
                      let colorClass = 'bg-gray-100 dark:bg-gray-700/50';
                      if (day.isFuture) colorClass = 'bg-transparent opacity-0 pointer-events-none';
                      else if (day.count > 15) colorClass = 'bg-indigo-600 dark:bg-indigo-500';
                      else if (day.count > 8) colorClass = 'bg-indigo-500 dark:bg-indigo-600';
                      else if (day.count > 3) colorClass = 'bg-indigo-400 dark:bg-indigo-700';
                      else if (day.count > 0) colorClass = 'bg-indigo-300 dark:bg-indigo-800';

                      return (
                        <div
                          key={j}
                          title={`${day.date}: ${day.count} ta vazifa`}
                          className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px] sm:rounded-[4px] transition-all cursor-pointer hover:ring-2 hover:ring-gray-300 ${colorClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-4 border-t border-gray-50 dark:border-gray-700/50 pt-4">
              <span>Kam faollik</span>
              <div className="flex gap-1.5">
                {['bg-gray-100 dark:bg-gray-700/50', 'bg-indigo-300 dark:bg-indigo-800', 'bg-indigo-400 dark:bg-indigo-700', 'bg-indigo-500 dark:bg-indigo-600', 'bg-indigo-600 dark:bg-indigo-500'].map((c, i) => (
                  <div key={i} className={`w-3 h-3 rounded-[3px] ${c}`} />
                ))}
              </div>
              <span>Ko'p</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-400">
            <Icon icon="lucide:activity" className="w-8 h-8 mb-2 opacity-20" />
            <p>Faollik yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}
