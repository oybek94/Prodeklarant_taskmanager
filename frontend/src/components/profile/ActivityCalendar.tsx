import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';

interface ActivityCalendarProps {
  contributions: { date: string; count: number; level: number }[];
}

const LEVEL_CLASSES = [
  'bg-gray-100 dark:bg-slate-700/60',
  'bg-blue-200 dark:bg-blue-900',
  'bg-blue-300 dark:bg-blue-800',
  'bg-blue-500 dark:bg-blue-600',
  'bg-blue-800 dark:bg-blue-400',
];

const levelOf = (count: number): number => {
  if (count > 15) return 4;
  if (count > 8) return 3;
  if (count > 3) return 2;
  if (count > 0) return 1;
  return 0;
};

export default function ActivityCalendar({ contributions }: ActivityCalendarProps) {
  const weeks = useMemo(() => {
    if (contributions.length === 0) return [];

    const map = new Map<string, number>();
    contributions.forEach((a) => map.set(a.date, a.count));

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
    <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-6 py-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Umumiy faollik</h2>
        <span className="text-[13px] text-gray-500 dark:text-gray-400">So'nggi 6 oy</span>
      </div>

      {contributions.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <div className="flex gap-1 w-max">
              <div className="flex flex-col gap-1 pr-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 items-end">
                {['Yak', '', 'Sesh', '', 'Pay', '', 'Shan'].map((label, i) => (
                  <div key={i} className={`h-3.5 leading-[14px] ${!label ? 'opacity-0' : ''}`}>{label || '.'}</div>
                ))}
              </div>
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {week.map((day, j) => (
                    <div
                      key={j}
                      title={`${day.date}: ${day.count} ta vazifa`}
                      className={`w-3.5 h-3.5 rounded-[4px] ${day.isFuture ? 'opacity-0 pointer-events-none' : LEVEL_CLASSES[levelOf(day.count)]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            Kam
            {LEVEL_CLASSES.map((c, i) => (
              <span key={i} className={`w-3.5 h-3.5 rounded-[4px] ${c}`} />
            ))}
            Ko'p
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-400">
          <Icon icon="solar:pulse-bold-duotone" className="w-8 h-8 mb-2 opacity-20" />
          <p>Faollik yo'q</p>
        </div>
      )}
    </section>
  );
}
