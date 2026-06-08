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
}

export const InvoicesHeader: React.FC<InvoicesHeaderProps> = ({
  canEdit,
  filters,
  showFiltersPanel,
  setShowFiltersPanel,
  isMobile,
  onOpenCreateModal
}) => {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 px-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
          <Icon icon="lucide:file-text" className="w-5 h-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-200 tracking-tight flex items-center gap-3 flex-wrap">
          Invoice'lar
          <span className="hidden sm:inline-flex text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700/60 shadow-sm items-center">
            Barcha schyot-fakturalarni boshqarish
          </span>
        </h1>
      </div>
      <div className="flex items-center gap-2 relative">
        {/* Qidiruv va filtrlash */}
        <button
          type="button"
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`relative flex items-center gap-2 p-2 sm:p-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm z-10 ${showFiltersPanel && !isMobile ? 'opacity-0 pointer-events-none' : ''}`}
          title="Qidirish va filtrlash"
        >
          <Icon icon="lucide:filter" className="w-5 h-5" />
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
            className="inline-flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98]"
          >
            <Icon icon="lucide:plus-circle" className="w-5 h-5" />
            <span className="hidden sm:inline font-semibold text-sm">Yangi Invoice</span>
          </button>
        )}
      </div>
    </div>
  );
};
