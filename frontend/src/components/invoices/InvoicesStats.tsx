import React from 'react';
import type { InvoiceStats } from './types';

interface InvoicesStatsProps {
  stats: InvoiceStats | null;
}

// Ko'rsatkichlar kartalari: jami / jarayonda / tugallangan / xatolik bilan
export const InvoicesStats: React.FC<InvoicesStatsProps> = ({ stats }) => {
  const cards = [
    { label: 'Jami invoys', value: stats?.all, note: stats ? `shu oy ${stats.monthTotal}` : '', tone: 'text-[#5B6472] dark:text-gray-400' },
    { label: 'Jarayonda', value: stats?.run, note: '', tone: '' },
    { label: 'Tugallangan', value: stats?.done, note: stats ? `7 kunda ${stats.weekDone}` : '', tone: 'text-[#0B6E6E] dark:text-[#5FD0C8]' },
    { label: 'Xatolik bilan', value: stats?.err, note: stats && stats.err > 0 ? 'e’tibor kerak' : '', tone: 'text-[#B42318] dark:text-[#F97066]' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 font-['Onest',system-ui,sans-serif]">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white dark:bg-gray-800 border border-[#E3E6EB] dark:border-gray-700 rounded-[14px] px-5 py-[18px] flex flex-col gap-1.5"
        >
          <div className="text-[13px] font-medium text-[#5B6472] dark:text-gray-400">{c.label}</div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <div className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-[#151A22] dark:text-gray-100">{c.value ?? '—'}</div>
            {c.note && <div className={`text-xs font-semibold ${c.tone}`}>{c.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
