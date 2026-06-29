import React from 'react';
import { Icon } from '@iconify/react';
import ArchiveFiltersPanel from './ArchiveFiltersPanel';
import type { ArchiveFiltersState, ReportColumnKey } from './ArchiveFiltersPanel';
import type { Branch, Client } from './types';

interface TasksHeaderProps {
  isMobile: boolean;
  navigate: (path: string) => void;
  showArchive: boolean;
  setShowArchive: (show: boolean) => void;
  setPage: (page: number) => void;
  exportToExcel: () => void;
  showArchiveFilters: boolean;
  setShowArchiveFilters: (show: boolean) => void;
  isArchiveFiltersRoute: boolean;
  archiveSearchQuery: string;
  setArchiveSearchQuery: (query: string) => void;
  archiveFilters: ArchiveFiltersState;
  setArchiveFilters: (filters: ArchiveFiltersState) => void;
  branches: Branch[];
  clients: Client[];
  filteredArchiveTasksLength: number;
  exportArchiveReport: (selectedColumns: Record<ReportColumnKey, boolean>) => Promise<void>;
  reportLoading: boolean;
  showArchiveFiltersPanel: boolean;
  setShowForm: (show: boolean) => void;
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  isMobile,
  navigate,
  showArchive,
  setShowArchive,
  setPage,
  exportToExcel,
  showArchiveFilters,
  setShowArchiveFilters,
  isArchiveFiltersRoute,
  archiveSearchQuery,
  setArchiveSearchQuery,
  archiveFilters,
  setArchiveFilters,
  branches,
  clients,
  filteredArchiveTasksLength,
  exportArchiveReport,
  reportLoading,
  showArchiveFiltersPanel,
  setShowForm
}) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Icon icon="solar:list-bold-duotone" className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Vazifalar</h1>
        </div>
        {/* Tab buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => {
              if (isMobile) {
                navigate('/tasks');
              } else {
                navigate('/tasks');
                setShowArchive(false);
              }
            }}
            className={`relative px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2.5 ${!showArchive
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/60'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
          >
            <Icon icon="solar:checklist-minimalistic-bold-duotone" className={`w-4.5 h-4.5 transition-colors ${!showArchive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
            Barcha ishlar
          </button>
          <button
            onClick={() => {
              if (isMobile) {
                navigate('/tasks/archive');
              } else {
                navigate('/tasks/archive');
                setShowArchive(true);
                setPage(1);
              }
            }}
            className={`relative px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2.5 ${showArchive
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/60'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
          >
            <Icon icon="solar:archive-bold-duotone" className={`w-4.5 h-4.5 transition-colors ${showArchive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
            Arxiv
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showArchive && (
          <div className="flex items-center gap-2 relative">
            {/* Export to Excel Icon */}
            <button
              onClick={exportToExcel}
              className="relative p-2 bg-emerald-500 dark:bg-emerald-600/80 text-white rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-sm hover:shadow z-10"
              title="Excel formatida yuklab olish"
            >
              <Icon icon="solar:download-bold-duotone" className="w-4 h-4" />
            </button>
            {/* Search Icon - Minimalistic */}
            <button
              onClick={() => {
                if (isMobile) {
                  navigate(showArchiveFilters ? '/tasks/archive' : '/tasks/archive/filters');
                } else {
                  setShowArchiveFilters(!showArchiveFilters);
                }
              }}
              className={`relative p-2 bg-blue-500 dark:bg-slate-700 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-slate-600 transition-all shadow-sm hover:shadow z-10 ${showArchiveFilters ? 'opacity-0 pointer-events-none' : ''
                }`}
              title="Qidirish va filtrlash"
            >
              <Icon icon="solar:magnifer-bold-duotone" className="w-4 h-4" />
              {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.clientId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>

            {/* Expandable Search and Filter Panel */}
            {showArchiveFiltersPanel && (
              <ArchiveFiltersPanel
                isMobile={isMobile}
                isArchiveFiltersRoute={isArchiveFiltersRoute}
                onClose={() => {
                  if (isMobile && isArchiveFiltersRoute) {
                    navigate('/tasks/archive');
                  } else {
                    setShowArchiveFilters(false);
                  }
                }}
                archiveSearchQuery={archiveSearchQuery}
                setArchiveSearchQuery={setArchiveSearchQuery}
                archiveFilters={archiveFilters}
                setArchiveFilters={setArchiveFilters as any}
                branches={branches}
                clients={clients}
                filteredArchiveTasksLength={filteredArchiveTasksLength}
                onGenerateReport={exportArchiveReport}
                reportLoading={reportLoading}
              />
            )}
          </div>
        )}
        {!showArchive && (
          <button
            onClick={() => {
              if (isMobile) {
                navigate('/tasks/new');
              } else {
                setShowForm(true);
              }
            }}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5 flex-shrink-0" />
            Yangi vazifa
          </button>
        )}
      </div>
    </div>
  );
};
