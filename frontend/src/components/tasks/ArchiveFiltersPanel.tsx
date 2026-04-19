import React from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import type { Branch, Client } from './types';

// O'rnatilgan filterlar obyekti formati
export interface ArchiveFiltersState {
  branchId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  hasPsr: string;
}

// Hisobot ustunlari ro'yxati
export const REPORT_COLUMNS = {
  taskName: 'Task nomi',
  clientName: 'Mijoz',
  sellerName: 'Sotuvchi nomi',
  buyerName: 'Sotib oluvchi nomi',
  contractNumber: 'Shartnoma raqami',
  invoiceNumber: 'Invoys raqami',
  invoiceDate: 'Sana',
  deliveryTerms: 'Условия поставки',
  vehicleNumber: 'Номер автотранспорта',
  customsAddress: 'Место там. очистки',
  productNames: 'Наименование товара',
  totalAmount: 'Общая сумма',
} as const;

export type ReportColumnKey = keyof typeof REPORT_COLUMNS;

interface ArchiveFiltersPanelProps {
  isMobile: boolean;
  isArchiveFiltersRoute: boolean;
  navigate?: (path: string) => void;
  onClose: () => void;
  archiveSearchQuery: string;
  setArchiveSearchQuery: (query: string) => void;
  archiveFilters: ArchiveFiltersState;
  setArchiveFilters: (filters: ArchiveFiltersState) => void;
  branches: Branch[];
  clients: Client[];
  filteredArchiveTasksLength: number;
  onGenerateReport?: (selectedColumns: Record<ReportColumnKey, boolean>) => void;
  reportLoading?: boolean;
}

const ArchiveFiltersPanel: React.FC<ArchiveFiltersPanelProps> = ({
  isMobile,
  isArchiveFiltersRoute,
  onClose,
  archiveSearchQuery,
  setArchiveSearchQuery,
  archiveFilters,
  setArchiveFilters,
  branches,
  clients,
  filteredArchiveTasksLength,
  onGenerateReport,
  reportLoading = false,
}) => {
  const hasActiveFilters = Boolean(
    archiveSearchQuery ||
    archiveFilters.branchId ||
    archiveFilters.clientId ||
    archiveFilters.startDate ||
    archiveFilters.endDate ||
    archiveFilters.hasPsr
  );

  // Hisobot ustunlari state — barcha ustunlar boshlang'ichda tanlangan
  const [selectedReportColumns, setSelectedReportColumns] = React.useState<Record<ReportColumnKey, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(REPORT_COLUMNS)) {
      initial[key] = true;
    }
    return initial as Record<ReportColumnKey, boolean>;
  });

  const selectedCount = Object.values(selectedReportColumns).filter(Boolean).length;

  const toggleColumn = (key: ReportColumnKey) => {
    setSelectedReportColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const allSelected = selectedCount === Object.keys(REPORT_COLUMNS).length;
    const updated: Record<string, boolean> = {};
    for (const key of Object.keys(REPORT_COLUMNS)) {
      updated[key] = !allSelected;
    }
    setSelectedReportColumns(updated as Record<ReportColumnKey, boolean>);
  };

  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isArchiveFiltersRoute) return;
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isMobile, isArchiveFiltersRoute]);

  return (
    <div
      ref={panelRef}
      className={
        isMobile && isArchiveFiltersRoute
          ? 'fixed inset-0 bg-white z-50 p-4 overflow-y-auto'
          : 'absolute right-0 top-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-20 min-w-[500px] animate-slideIn'
      }
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Icon icon="lucide:filter" className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Qidiruv va filtrlash</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none transition-colors"
        >
          &times;
        </button>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Icon icon="lucide:search" className="w-3.5 h-3.5 text-blue-600" />
            Qidirish
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="lucide:search" className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              placeholder="Task nomi yoki mijoz nomi..."
              className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
              autoFocus
            />
            {archiveSearchQuery && (
              <button
                onClick={() => setArchiveSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <Icon icon="lucide:x" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Branch Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Icon icon="lucide:building" className="w-3.5 h-3.5 text-blue-600" />
            Filial
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="lucide:building" className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={archiveFilters.branchId}
              onChange={(e) => setArchiveFilters({ ...archiveFilters, branchId: e.target.value })}
              className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
            >
              <option value="">Barcha filiallar</option>
              {Array.isArray(branches) && branches.map((branch) => (
                <option key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Client Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Icon icon="lucide:users" className="w-3.5 h-3.5 text-blue-600" />
            Mijoz
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="lucide:users" className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={archiveFilters.clientId}
              onChange={(e) => setArchiveFilters({ ...archiveFilters, clientId: e.target.value })}
              className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
            >
              <option value="">Barcha mijozlar</option>
              {Array.isArray(clients) && clients.map((client) => (
                <option key={client.id} value={client.id.toString()}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Icon icon="lucide:calendar-range" className="w-3.5 h-3.5 text-blue-600" />
            Sana oralig'i
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <DateInput
                value={archiveFilters.startDate}
                onChange={(value) => setArchiveFilters({ ...archiveFilters, startDate: value })}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                placeholder="Boshlanish"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <DateInput
                value={archiveFilters.endDate}
                onChange={(value) => setArchiveFilters({ ...archiveFilters, endDate: value })}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                placeholder="Tugash"
              />
            </div>
          </div>
        </div>

        {/* PSR Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Icon icon="lucide:file-text" className="w-3.5 h-3.5 text-blue-600" />
            PSR
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="lucide:file-text" className="w-4 h-4 text-gray-400" />
            </div>
            <select
              value={archiveFilters.hasPsr}
              onChange={(e) => setArchiveFilters({ ...archiveFilters, hasPsr: e.target.value })}
              className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
            >
              <option value="">Barcha</option>
              <option value="true">PSR bor</option>
              <option value="false">PSR yo'q</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Icon icon="lucide:files" className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium text-gray-700">
              {filteredArchiveTasksLength} ta natija
            </span>
            {hasActiveFilters && (
              <span className="text-gray-500">(filtrlangan)</span>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* Hisobot ustunlari — checkbox bilan tanlash */}
        {/* ========================================== */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Icon icon="lucide:table-2" className="w-3.5 h-3.5 text-emerald-600" />
              Hisobot ustunlari
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wide"
            >
              {selectedCount === Object.keys(REPORT_COLUMNS).length ? 'Barchasini yechish' : 'Barchasini tanlash'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {(Object.entries(REPORT_COLUMNS) as [ReportColumnKey, string][]).map(([key, label]) => (
              <label
                key={key}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-sm select-none ${
                  selectedReportColumns[key]
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedReportColumns[key]}
                  onChange={() => toggleColumn(key)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className={`text-[13px] font-medium ${selectedReportColumns[key] ? '' : 'line-through opacity-60'}`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Hisobot olish tugmasi */}
        {onGenerateReport && (
          <button
            type="button"
            disabled={selectedCount === 0 || reportLoading}
            onClick={() => onGenerateReport(selectedReportColumns)}
            className={`w-full px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
              selectedCount === 0 || reportLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md active:scale-[0.98]'
            }`}
          >
            {reportLoading ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                Hisobot tayyorlanmoqda...
              </>
            ) : (
              <>
                <Icon icon="lucide:file-spreadsheet" className="w-4 h-4" />
                Hisobot olish ({selectedCount} ustun)
              </>
            )}
          </button>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setArchiveSearchQuery('');
              setArchiveFilters({ branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '' });
            }}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md border border-gray-300"
          >
            <Icon icon="lucide:x-circle" className="w-3.5 h-3.5" />
            Filtrlarni tozalash
          </button>
        )}
      </div>
    </div>
  );
};

export default ArchiveFiltersPanel;

