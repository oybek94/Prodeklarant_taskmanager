import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { CopyIconButton } from '../../components/CopyIconButton';
import { TableSkeleton } from '../../components/common/Skeleton';
import { StatusBadge, getBranchCellClass } from './helpers';
import { formatDateOnly } from '../../utils/dateFormatting';
import type { Invoice, Branch } from './types';

interface InvoicesViewProps {
  invoices: Invoice[];
  paginatedInvoices: Invoice[];
  loading: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  isMobile: boolean;
  canEdit: boolean;
  branches: Branch[];
  duplicatingInvoiceId: number | null;
  handleDuplicateInvoice: (invoice: Invoice) => void;
  setShowTaskModalId: (id: number) => void;
  setShowClientModalId: (id: number) => void;
  setShowContractModalId: (id: number | null) => void;
  setInvoiceToDelete: (invoice: Invoice) => void;
  setShowDeleteConfirmModal: (val: boolean) => void;
  
  currentPage: number;
  totalPagesServer: number;
  startItem: number;
  endItem: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  paginatedInvoices,
  loading,
  totalCount,
  hasActiveFilters,
  isMobile,
  canEdit,
  branches,
  duplicatingInvoiceId,
  handleDuplicateInvoice,
  setShowTaskModalId,
  setShowClientModalId,
  setShowContractModalId,
  setInvoiceToDelete,
  setShowDeleteConfirmModal,
  currentPage,
  totalPagesServer,
  startItem,
  endItem,
  setCurrentPage
}) => {
  const navigate = useNavigate();

  if (loading && invoices.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <TableSkeleton columns={7} rows={8} />
      </div>
    );
  }

  return (
    <>
      {invoices.length === 0 && !hasActiveFilters ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-16 text-center lg:py-24 ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Icon icon="solar:document-text-bold-duotone" className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Invoice'lar hozircha yo&apos;q</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Yangi invoice yaratish uchun yuqoridagi &quot;Yangi Invoice&quot; tugmasini bosing va jarayonni boshlang.</p>
        </div>
      ) : totalCount === 0 && hasActiveFilters ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-16 text-center ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-200/50">
            <Icon icon="solar:magnifer-bold-duotone" className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Natija topilmadi</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Siz qidirayotgan qidiruv so&apos;rovi yoki filtrlarga mos keluvchi invoice topilmadi.</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          {paginatedInvoices.map((invoice) => {
            const hasErrors = (invoice.task?._count?.errors ?? 0) > 0;
            const branchName = invoice.task?.branch?.name ?? invoice.branch?.name ?? '-';
            const branchId = invoice.task?.branch?.id ?? invoice.branch?.id;
            const filialCellClass = getBranchCellClass(branchName, branchId, branches);
            
            return (
              <div 
                key={invoice.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/invoices/task/${invoice.taskId}`);
                }}
                className={`cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${hasErrors ? 'border-l-4 border-l-red-500 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'} p-3 space-y-2`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-gray-100 font-bold text-base font-mono">
                    #{invoice.invoiceNumber}
                  </span>
                  <StatusBadge 
                    status={invoice.task?.status} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTaskModalId(invoice.taskId);
                    }}
                    isMobile={true}
                  />
                </div>

                <div className="text-xs space-y-2 pt-1">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-[10px] uppercase font-semibold">Mijoz</p>
                      <p className="font-bold text-gray-900 dark:text-slate-200 text-sm truncate">
                        {invoice.client?.name || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-[10px] uppercase font-semibold">Filial</p>
                      <span className={`inline-block w-20 text-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${filialCellClass}`}>
                        {branchName}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700/50 pt-2">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-semibold">Avto</p>
                        <p className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm tracking-widest">{invoice.additionalInfo?.vehicleNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-semibold text-right">Summa</p>
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm text-right">
                          <CurrencyDisplay
                            amount={invoice.totalAmount || 0}
                            originalCurrency={invoice.contract?.contractCurrency || invoice.currency}
                            forceOriginal
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDuplicateInvoice(invoice)}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 border border-emerald-100/50 dark:border-emerald-800 active:scale-95 transition-transform"
                        >
                          <Icon icon="solar:copy-bold-duotone" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-1 sm:min-h-0 bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-gray-700/50 overflow-visible ring-1 ring-black/5 dark:ring-white/5">
          <div className="sm:flex-1 overflow-x-auto overflow-y-visible sm:overflow-auto bg-transparent">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100/80 dark:border-gray-700/80">
                  <th className="w-28 px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center justify-center gap-1.5 w-full">
                      <Icon icon="solar:hashtag-bold-duotone" className="w-4 h-4 text-blue-500" />
                      №
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="solar:user-bold-duotone" className="w-4 h-4 text-emerald-500" />
                      Mijoz
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center justify-center gap-1.5 w-full">
                      <Icon icon="solar:map-point-bold-duotone" className="w-4 h-4 text-indigo-500" />
                      Filial
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center justify-center gap-1.5 w-full">
                      <Icon icon="solar:bus-bold-duotone" className="w-4 h-4 text-amber-500" />
                      Avtomobil
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5 justify-end w-full">
                      <Icon icon="solar:dollar-minimalistic-bold-duotone" className="w-4 h-4 text-emerald-500" />
                      Summa
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="solar:buildings-3-bold-duotone" className="w-4 h-4 text-purple-500" />
                      Sotuvchi / Qabul qiluvchi
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center justify-center gap-1.5 w-full">
                      <Icon icon="solar:calendar-bold-duotone" className="w-4 h-4 text-cyan-500" />
                      Sana
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center justify-center gap-1.5 w-full">
                      <Icon icon="solar:record-circle-bold-duotone" className="w-4 h-4 text-rose-500" />
                      Status
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5 justify-center w-full">
                      <Icon icon="solar:tuning-2-bold-duotone" className="w-4 h-4 text-slate-500" />
                      Amallar
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60 dark:divide-gray-700/60 bg-white/40 dark:bg-gray-800/40">
                {paginatedInvoices.map((invoice) => {
                  const hasErrors = (invoice.task?._count?.errors ?? 0) > 0;
                  const branchId = invoice.task?.branch?.id ?? invoice.branch?.id;
                  const branchName = invoice.task?.branch?.name ?? invoice.branch?.name ?? undefined;
                  const filialCellClass = getBranchCellClass(branchName, branchId, branches);
                  return (
                    <tr
                      key={invoice.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                        navigate(`/invoices/task/${invoice.taskId}`);
                      }}
                      className="group transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <td className={`w-28 px-4 py-2 whitespace-nowrap text-sm font-semibold border-l-4 text-center ${hasErrors ? 'border-l-red-500' : 'border-l-transparent'}`}>
                        <span className="text-gray-800 dark:text-gray-200 font-mono">
                          #{invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {invoice.client?.name || '-'}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-center">
                        <span className={`inline-flex items-center justify-center w-24 text-center px-1 py-1 rounded-md font-medium ${filialCellClass}`}>
                          {invoice.task?.branch?.name ?? invoice.branch?.name ?? '-'}
                        </span>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-mono text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{invoice.additionalInfo?.vehicleNumber || '-'}</span>
                          {invoice.additionalInfo?.vehicleNumber && (
                            <CopyIconButton
                              textToCopy={invoice.additionalInfo.vehicleNumber as string}
                              toastMessage="Avtomobil raqami nusxalandi"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-gray-100">
                        <CurrencyDisplay
                          amount={invoice.totalAmount || 0}
                          originalCurrency={invoice.contract?.contractCurrency || invoice.currency}
                          forceOriginal
                        />
                      </td>
                      <td className="px-6 py-2 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName].filter(Boolean).join(' / ') || undefined}>
                        {invoice.clientId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowClientModalId(invoice.clientId);
                              setShowContractModalId(invoice.contractId || null);
                            }}
                            className="text-left w-full hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline focus:outline-none focus:ring-0 truncate block"
                          >
                            {[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </button>
                        ) : (
                          <span>
                            {[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {formatDateOnly(invoice.date)}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-center">
                        <StatusBadge 
                          status={invoice.task?.status} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTaskModalId(invoice.taskId);
                          }}
                        />
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDuplicateInvoice(invoice)}
                                disabled={duplicatingInvoiceId === invoice.id}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 shadow-sm ring-1 ring-emerald-200/60 dark:ring-slate-700 transition-all disabled:opacity-50 hover:shadow"
                                title="Dublikat"
                              >
                                <Icon icon="solar:copy-bold-duotone" className="w-4 h-4" />
                              </button>
                              {(() => {
                                const taskStatus = invoice.task?.status;
                                const isEarlyTask = taskStatus === 'BOSHLANMAGAN';
                                const invoysStageReady = invoice.task?.stages?.some(
                                  (s) => String(s.name).trim().toLowerCase() === 'invoys' && s.status === 'TAYYOR'
                                );
                                const canDelete = Boolean(isEarlyTask && !invoysStageReady);
                                if (!canDelete) return null;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInvoiceToDelete(invoice);
                                      setShowDeleteConfirmModal(true);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-slate-700 shadow-sm ring-1 ring-rose-200/60 dark:ring-slate-700 transition-all hover:shadow"
                                    title="O'chirish"
                                  >
                                    <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" />
                                  </button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {(totalPagesServer > 1 || totalCount > 20) && invoices.length > 0 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 mt-2 border border-gray-100/60 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {startItem}-{endItem} / {totalCount} invoice
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Oldingi sahifa"
            >
              <Icon icon="solar:alt-arrow-left-bold-duotone" className="w-5 h-5" />
            </button>
            <div className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
              {currentPage} / {totalPagesServer}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPagesServer, p + 1))}
              disabled={currentPage >= totalPagesServer}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Keyingi sahifa"
            >
              <Icon icon="solar:alt-arrow-right-bold-duotone" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
