import React from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../../components/DateInput';
import type { Branch, Client, InvoicesFilters } from './types';
import { INVOICE_REPORT_COLUMNS, type InvoiceReportColumnKey } from '../../hooks/useInvoiceReport';

const allReportColumns = (value: boolean) =>
  Object.fromEntries(Object.keys(INVOICE_REPORT_COLUMNS).map((k) => [k, value])) as Record<InvoiceReportColumnKey, boolean>;

interface InvoicesFilterPanelProps {
  isMobile: boolean;
  filtersPanelRef: React.RefObject<HTMLDivElement>;
  showFiltersPanel: boolean;
  setShowFiltersPanel: (val: boolean) => void;
  filters: InvoicesFilters;
  setFilters: (val: InvoicesFilters) => void;
  setCurrentPage: (val: number) => void;
  branches: Branch[];
  clients: Client[];
  totalCount: number;
  onGenerateReport: (selectedColumns: Record<InvoiceReportColumnKey, boolean>) => void;
  reportLoading: boolean;
}

export const InvoicesFilterPanel: React.FC<InvoicesFilterPanelProps> = ({
  isMobile,
  filtersPanelRef,
  showFiltersPanel,
  setShowFiltersPanel,
  filters,
  setFilters,
  setCurrentPage,
  branches,
  clients,
  totalCount,
  onGenerateReport,
  reportLoading
}) => {
  // Hisobot ustunlari — boshlang'ichda barchasi tanlangan
  const [selectedColumns, setSelectedColumns] = React.useState<Record<InvoiceReportColumnKey, boolean>>(() => allReportColumns(true));
  const selectedCount = Object.values(selectedColumns).filter(Boolean).length;
  const allSelected = selectedCount === Object.keys(INVOICE_REPORT_COLUMNS).length;
  // Ustunlar ro'yxati faqat "Hisobot olish" bosilgandan keyin ko'rinadi (panel ixcham turadi)
  const [showColumnPicker, setShowColumnPicker] = React.useState(false);

  React.useEffect(() => {
    if (!showFiltersPanel) setShowColumnPicker(false);
  }, [showFiltersPanel]);

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
          } bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-slate-700 p-5 z-[100] animate-slideIn overflow-y-auto ${isMobile ? '' : 'max-h-[calc(100vh-8rem)]'}`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Icon icon="solar:filter-bold-duotone" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Filtrlash</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Filial, mijoz, sana</p>
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

          {!showColumnPicker ? (
            <button
              type="button"
              disabled={totalCount === 0}
              onClick={() => setShowColumnPicker(true)}
              className={`w-full px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                totalCount === 0
                  ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md active:scale-[0.98]'
              }`}
            >
              <Icon icon="solar:file-download-bold-duotone" className="w-4 h-4" />
              Hisobot olish ({totalCount} ta)
            </button>
          ) : (
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Icon icon="solar:tablet-bold-duotone" className="w-3.5 h-3.5 text-emerald-600" />
                  Qaysi ustunlar kerak?
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedColumns(allReportColumns(!allSelected))}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors uppercase tracking-wide"
                >
                  {allSelected ? 'Barchasini yechish' : 'Barchasini tanlash'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {(Object.entries(INVOICE_REPORT_COLUMNS) as [InvoiceReportColumnKey, string][]).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all select-none ${
                      selectedColumns[key]
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns[key]}
                      onChange={() => setSelectedColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className={`text-[13px] font-medium ${selectedColumns[key] ? '' : 'line-through opacity-60'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowColumnPicker(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0 || reportLoading}
                  onClick={() => onGenerateReport(selectedColumns)}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                    selectedCount === 0 || reportLoading
                      ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  {reportLoading ? (
                    <>
                      <Icon icon="solar:refresh-bold-duotone" className="w-4 h-4 animate-spin" />
                      Hisobot tayyorlanmoqda...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:file-download-bold-duotone" className="w-4 h-4" />
                      Yuklab olish ({totalCount} ta, {selectedCount} ustun)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFilters({ branchId: '', clientId: '', startDate: '', endDate: '' });
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
