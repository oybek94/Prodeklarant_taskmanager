import React from 'react';
import { Icon } from '@iconify/react';
import type { InvoiceStats, InvoiceStatusTab, InvoicesFilters } from './types';

interface InvoicesToolbarProps {
  isMobile: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusTab: InvoiceStatusTab;
  setStatusTab: (val: InvoiceStatusTab) => void;
  stats: InvoiceStats | null;
  filters: InvoicesFilters;
  showFiltersPanel: boolean;
  setShowFiltersPanel: (val: boolean) => void;
}

const TABS: { key: InvoiceStatusTab; label: string; count: (s: InvoiceStats) => number }[] = [
  { key: '', label: 'Hammasi', count: (s) => s.all },
  { key: 'run', label: 'Jarayonda', count: (s) => s.run },
  { key: 'err', label: 'Xatolik', count: (s) => s.err },
  { key: 'done', label: 'Tugallangan', count: (s) => s.done },
];

export const InvoicesToolbar: React.FC<InvoicesToolbarProps> = ({
  isMobile,
  searchQuery,
  setSearchQuery,
  statusTab,
  setStatusTab,
  stats,
  filters,
  showFiltersPanel,
  setShowFiltersPanel,
}) => {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const search = (
    <label className={`relative block ${isMobile ? 'flex-1' : 'flex-[1_1_280px] max-w-[420px]'}`}>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6472] dark:text-gray-400 flex pointer-events-none">
        <Icon icon="solar:magnifer-bold-duotone" className="w-[18px] h-[18px]" />
      </span>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Qidirish"
        placeholder={isMobile ? 'Qidirish' : "Invoys raqami, mijoz yoki avto bo'yicha qidirish"}
        className={`w-full h-11 rounded-[10px] border border-[#D5D9E0] dark:border-slate-700 pl-[42px] pr-9 text-sm text-[#151A22] dark:text-gray-100 placeholder:text-[#8A92A0] outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isMobile ? 'bg-white dark:bg-slate-800' : 'bg-[#F8F9FB] dark:bg-slate-800'}`}
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          title="Tozalash"
        >
          <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" />
        </button>
      )}
    </label>
  );

  const filterButton = (
    <button
      type="button"
      onClick={() => setShowFiltersPanel(!showFiltersPanel)}
      aria-label="Filtrlar"
      title="Filtrlash"
      className={`relative h-11 rounded-[10px] border border-[#D5D9E0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#151A22] dark:text-gray-100 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${isMobile ? 'w-11' : 'px-3.5'} ${showFiltersPanel && !isMobile ? 'opacity-0 pointer-events-none' : ''}`}
    >
      <Icon icon="solar:filter-bold-duotone" className="w-[18px] h-[18px]" />
      {!isMobile && 'Filtrlar'}
      {activeFiltersCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#B42318] text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
          {activeFiltersCount}
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3.5 mb-3.5 font-['Onest',system-ui,sans-serif]">
        <div className="flex gap-2">
          {search}
          {filterButton}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {TABS.slice(0, 3).map((t) => {
            const active = statusTab === t.key;
            return (
              <button
                key={t.key || 'all'}
                type="button"
                onClick={() => setStatusTab(t.key)}
                className={`flex-none h-9 px-3.5 rounded-full text-[13px] font-semibold flex items-center ${active ? 'bg-[#151A22] text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white dark:bg-slate-800 border border-[#D5D9E0] dark:border-slate-700 text-[#151A22] dark:text-gray-100'}`}
              >
                {t.label}{stats ? ` ${t.count(stats)}` : ''}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-[#E3E6EB] dark:border-gray-700 font-['Onest',system-ui,sans-serif]">
      {search}

      <div className="flex gap-1 p-1 bg-[#F0F2F5] dark:bg-slate-900/60 rounded-[11px]">
        {TABS.map((t) => {
          const active = statusTab === t.key;
          return (
            <button
              key={t.key || 'all'}
              type="button"
              onClick={() => setStatusTab(t.key)}
              className={`h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-colors ${active ? 'bg-white dark:bg-slate-700 text-[#151A22] dark:text-gray-100 shadow-[0_1px_2px_rgba(20,24,34,0.12)]' : 'text-[#5B6472] dark:text-gray-400 hover:text-[#151A22] dark:hover:text-gray-100'}`}
            >
              {t.label}
              {stats && <span className="ml-1 font-medium opacity-70">{t.count(stats)}</span>}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex gap-2.5">{filterButton}</div>
    </div>
  );
};
