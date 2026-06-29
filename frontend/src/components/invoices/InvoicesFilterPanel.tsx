import React from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../../components/DateInput';
import type { Branch, Client, InvoicesFilters } from './types';

interface InvoicesFilterPanelProps {
  isMobile: boolean;
  filtersPanelRef: React.RefObject<HTMLDivElement>;
  showFiltersPanel: boolean;
  setShowFiltersPanel: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filters: InvoicesFilters;
  setFilters: (val: InvoicesFilters) => void;
  setCurrentPage: (val: number) => void;
  branches: Branch[];
  clients: Client[];
}

export const InvoicesFilterPanel: React.FC<InvoicesFilterPanelProps> = ({
  isMobile,
  filtersPanelRef,
  showFiltersPanel,
  setShowFiltersPanel,
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  setCurrentPage,
  branches,
  clients
}) => {
  if (!showFiltersPanel) return null;

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
          onClick={() => setShowFiltersPanel(false)}
        />
      )}
      <div
        ref={filtersPanelRef}
        className={`${isMobile
          ? 'fixed inset-x-0 bottom-0 h-[85vh] w-full rounded-t-3xl'
          : 'absolute right-0 top-0 min-w-[500px] rounded-2xl'
          } bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-slate-700 p-5 z-[100] animate-slideIn`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Icon icon="solar:filter-bold-duotone" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Qidiruv va filtrlash</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Hamma maydonlar bo'yicha</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFiltersPanel(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700 rounded-full transition-colors"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              <Icon icon="solar:magnifer-bold-duotone" className="w-3.5 h-3.5 text-indigo-500" />
              Asosiy qidiruv
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon="solar:magnifer-bold-duotone" className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Invoice №, mijoz, avtomobil raqami, shartnoma..."
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                <Icon icon="solar:buildings-2-bold-duotone" className="w-3.5 h-3.5 text-indigo-500" />
                Filial
              </label>
              <select
                value={filters.branchId}
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
              >
                <option value="">Barcha filiallar</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                <Icon icon="solar:users-group-rounded-bold-duotone" className="w-3.5 h-3.5 text-indigo-500" />
                Mijoz
              </label>
              <select
                value={filters.clientId}
                onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
              >
                <option value="">Barcha mijozlar</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id.toString()}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              <Icon icon="solar:calendar-minimalistic-bold-duotone" className="w-3.5 h-3.5 text-indigo-500" />
              Sana oralig'i
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">Dan</p>
                <DateInput
                  value={filters.startDate}
                  onChange={(value) => setFilters({ ...filters, startDate: value })}
                />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">Gacha</p>
                <DateInput
                  value={filters.endDate}
                  onChange={(value) => setFilters({ ...filters, endDate: value })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setFilters({ branchId: '', clientId: '', startDate: '', endDate: '' });
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-sm"
            >
              Filtrni tozalash
            </button>
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowFiltersPanel(false)}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none text-sm"
              >
                Natijalarni ko'rish
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
