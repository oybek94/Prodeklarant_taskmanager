import React from 'react';
import { Icon } from '@iconify/react';
import type { InvoicesFilters } from './types';

interface InvoicesHeaderProps {
  canEdit: boolean;
  filters: InvoicesFilters;
  showFiltersPanel: boolean;
  setShowFiltersPanel: (val: boolean) => void;
  isMobile: boolean;
  onOpenCreateModal: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const InvoicesHeader: React.FC<InvoicesHeaderProps> = ({
  canEdit,
  filters,
  showFiltersPanel,
  setShowFiltersPanel,
  isMobile,
  onOpenCreateModal,
  searchQuery,
  setSearchQuery
}) => {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="mb-3 flex items-center gap-2 sm:gap-3 shrink-0 px-2">
      {/* Brend ikonkasi */}
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
        <Icon icon="solar:document-text-bold-duotone" className="w-5 h-5" />
      </div>

      {/* Markaziy qidiruv qutisi — har qanday maydon bo'yicha */}
      <div className="relative flex-1 max-w-2xl mx-auto group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon icon="solar:magnifer-bold-duotone" className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Izlash"
          className="w-full h-11 pl-11 pr-10 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 hover:border-gray-300 dark:hover:border-slate-600 transition-all outline-none text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
            title="Tozalash"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" />
          </button>
        )}
      </div>

      {/* Filtr va yangi invoice */}
      <div className="flex items-center gap-2 relative shrink-0">
        <button
          type="button"
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`relative flex items-center justify-center gap-2 h-11 w-11 sm:w-auto sm:px-4 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all shadow-sm z-10 ${showFiltersPanel && !isMobile ? 'opacity-0 pointer-events-none' : ''}`}
          title="Filtrlash"
        >
          <Icon icon="solar:filter-bold-duotone" className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">Filtrlar</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {canEdit && (
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 h-11 w-11 sm:w-auto sm:px-5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            title="Yangi Invoice"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5" />
            <span className="hidden sm:inline font-semibold text-sm">Yangi Invoice</span>
          </button>
        )}
      </div>
    </div>
  );
};
