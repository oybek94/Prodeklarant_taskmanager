import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { CopyIconButton } from '../../components/CopyIconButton';
import { TableSkeleton } from '../../components/common/Skeleton';
import { StatusPill, StageProgress } from './helpers';
import { formatDateOnly } from '../../utils/dateFormatting';
import type { Invoice } from './types';

interface InvoicesViewProps {
  invoices: Invoice[];
  paginatedInvoices: Invoice[];
  loading: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  isMobile: boolean;
  canEdit: boolean;
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

const FONT = "font-['Onest',system-ui,sans-serif]";
const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

const TH = 'px-3 py-3 text-left text-xs font-semibold text-[#5B6472] dark:text-gray-400 uppercase tracking-[0.04em] bg-[#FAFBFC] dark:bg-gray-800/60 border-b border-[#E3E6EB] dark:border-gray-700 whitespace-nowrap';

// Sahifa raqamlari: 1 … (joriy-1) joriy (joriy+1) … oxirgi
const buildPageList = (current: number, total: number): (number | 'gap')[] => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
};

const getTaskStageInfo = (invoice: Invoice) => {
  const hasErrors = (invoice.task?._count?.errors ?? 0) > 0 && invoice.task?.status !== 'YAKUNLANDI';
  return { hasErrors };
};

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  paginatedInvoices,
  loading,
  totalCount,
  hasActiveFilters,
  isMobile,
  canEdit,
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

  const canDeleteInvoice = (invoice: Invoice) => {
    const isEarlyTask = invoice.task?.status === 'BOSHLANMAGAN';
    const invoysStageReady = invoice.task?.stages?.some(
      (s) => String(s.name).trim().toLowerCase() === 'invoys' && s.status === 'TAYYOR'
    );
    return Boolean(isEarlyTask && !invoysStageReady);
  };

  const pageButtonBase = 'min-w-[44px] h-11 rounded-[10px] text-sm font-semibold flex items-center justify-center transition-colors';

  return (
    <div className={FONT}>
      {invoices.length === 0 && !hasActiveFilters ? (
        <div className="p-16 text-center lg:py-24">
          <div className="bg-[#E3F3F1] dark:bg-[#0B6E6E]/25 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="solar:document-text-bold-duotone" className="w-10 h-10 text-[#0B6E6E] dark:text-[#5FD0C8]" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Invoice'lar hozircha yo&apos;q</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Yangi invoice yaratish uchun yuqoridagi &quot;Yangi invoys&quot; tugmasini bosing va jarayonni boshlang.</p>
        </div>
      ) : totalCount === 0 && hasActiveFilters ? (
        <div className="p-16 text-center">
          <div className="bg-gray-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="solar:magnifer-bold-duotone" className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Natija topilmadi</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Siz qidirayotgan qidiruv so&apos;rovi yoki filtrlarga mos keluvchi invoice topilmadi.</p>
        </div>
      ) : isMobile ? (
        <div className="flex flex-col gap-3.5">
          {paginatedInvoices.map((invoice) => {
            const { hasErrors } = getTaskStageInfo(invoice);
            const branchName = invoice.task?.branch?.name ?? invoice.branch?.name ?? '-';
            const vehicle = invoice.additionalInfo?.vehicleNumber || '-';

            return (
              <div
                key={invoice.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/invoices/task/${invoice.taskId}`);
                }}
                className="cursor-pointer bg-white dark:bg-gray-800 border border-[#E3E6EB] dark:border-gray-700 rounded-[14px] px-4 py-3.5 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className={`${MONO} text-[13px] font-medium text-[#0B6E6E] dark:text-[#5FD0C8]`}>#{invoice.invoiceNumber}</div>
                    <div className="font-semibold text-[15px] mt-[3px] text-[#151A22] dark:text-gray-100 truncate">{invoice.client?.name || '-'}</div>
                    <div className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">
                      {formatDateOnly(invoice.date)} · {branchName} · {vehicle}
                    </div>
                  </div>
                  <div className="flex-none">
                    <StatusPill
                      status={invoice.task?.status}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTaskModalId(invoice.taskId);
                      }}
                    />
                  </div>
                </div>

                <StageProgress stages={invoice.task?.stages} taskStatus={invoice.task?.status} hasErrors={hasErrors} />

                <div className="flex justify-end items-center gap-3">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDuplicateInvoice(invoice)}
                      disabled={duplicatingInvoiceId === invoice.id}
                      aria-label="Nusxa olish"
                      className="w-9 h-9 rounded-[10px] text-[#2B3340] dark:text-gray-300 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                    >
                      <Icon icon="solar:copy-bold-duotone" className="w-5 h-5" />
                    </button>
                  )}
                  <div className="font-bold text-base tabular-nums text-[#151A22] dark:text-gray-100">
                    <CurrencyDisplay
                      amount={invoice.totalAmount || 0}
                      originalCurrency={invoice.contract?.contractCurrency || invoice.currency}
                      forceOriginal
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${TH} !pl-5`}>Invoys</th>
                <th className={TH}>Mijoz / shartnoma</th>
                <th className={TH}>Filial</th>
                <th className={TH}>Avto</th>
                <th className={`${TH} w-[190px]`}>Bosqichlar</th>
                <th className={`${TH} !text-right`}>Summa</th>
                <th className={TH}>Holat</th>
                <th className={`${TH} w-[150px] !pr-5`}><span className="sr-only">Amallar</span></th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((invoice) => {
                const { hasErrors } = getTaskStageInfo(invoice);
                const branchName = invoice.task?.branch?.name ?? invoice.branch?.name ?? '-';
                const parties = [invoice.contract?.shipperName || invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName]
                  .filter(Boolean)
                  .join(' / ');
                const vehicle = invoice.additionalInfo?.vehicleNumber;
                return (
                  <tr
                    key={invoice.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                      navigate(`/invoices/task/${invoice.taskId}`);
                    }}
                    className="group cursor-pointer border-b border-[#EEF0F3] dark:border-gray-700/70 hover:bg-[#F7F9FB] dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="py-2 pl-5 pr-3 whitespace-nowrap">
                      <div className={`${MONO} text-[13px] font-medium text-[#0B6E6E] dark:text-[#5FD0C8]`}>#{invoice.invoiceNumber}</div>
                      <div className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">{formatDateOnly(invoice.date)}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[280px]" title={parties || undefined}>
                      <div className="font-semibold text-[#151A22] dark:text-gray-100 truncate">{invoice.client?.name || '-'}</div>
                      {invoice.clientId && invoice.contractNumber ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowClientModalId(invoice.clientId);
                            setShowContractModalId(invoice.contractId || null);
                          }}
                          className="block max-w-full text-left text-xs text-[#5B6472] dark:text-gray-400 mt-0.5 hover:text-[#0B6E6E] dark:hover:text-[#5FD0C8] hover:underline truncate"
                        >
                          Shartnoma {invoice.contractNumber}
                        </button>
                      ) : (
                        <div className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">
                          {invoice.contractNumber ? `Shartnoma ${invoice.contractNumber}` : '—'}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[#2B3340] dark:text-gray-300">{branchName}</td>
                    <td className={`py-2 px-3 whitespace-nowrap ${MONO} text-[13px] text-[#2B3340] dark:text-gray-300`}>
                      <div className="flex items-center gap-2">
                        <span>{vehicle || '-'}</span>
                        {vehicle && (
                          <CopyIconButton
                            textToCopy={vehicle as string}
                            toastMessage="Avtomobil raqami nusxalandi"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <StageProgress stages={invoice.task?.stages} taskStatus={invoice.task?.status} hasErrors={hasErrors} />
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap font-semibold tabular-nums text-[#151A22] dark:text-gray-100">
                      <CurrencyDisplay
                        amount={invoice.totalAmount || 0}
                        originalCurrency={invoice.contract?.contractCurrency || invoice.currency}
                        forceOriginal
                      />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusPill
                        status={invoice.task?.status}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTaskModalId(invoice.taskId);
                        }}
                      />
                    </td>
                    <td className="py-2 pl-3 pr-5 whitespace-nowrap">
                      <div className="flex justify-end gap-0.5 opacity-[0.35] group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setShowTaskModalId(invoice.taskId)}
                          aria-label="Jarayonlar"
                          title="Jarayonlar"
                          className="w-9 h-9 rounded-[10px] text-[#2B3340] dark:text-gray-300 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <Icon icon="solar:routing-2-bold-duotone" className="w-5 h-5" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDuplicateInvoice(invoice)}
                            disabled={duplicatingInvoiceId === invoice.id}
                            aria-label="Nusxa olish"
                            title="Dublikat"
                            className="w-9 h-9 rounded-[10px] text-[#2B3340] dark:text-gray-300 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                          >
                            <Icon icon="solar:copy-bold-duotone" className="w-5 h-5" />
                          </button>
                        )}
                        {canEdit && canDeleteInvoice(invoice) && (
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceToDelete(invoice);
                              setShowDeleteConfirmModal(true);
                            }}
                            aria-label="O'chirish"
                            title="O'chirish"
                            className="w-9 h-9 rounded-[10px] text-[#B42318] dark:text-[#F97066] flex items-center justify-center hover:bg-[#B42318]/10 transition-colors"
                          >
                            <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sahifalash */}
      {(totalPagesServer > 1 || totalCount > 20) && invoices.length > 0 && (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${isMobile ? 'mt-3.5' : 'border-t border-[#E3E6EB] dark:border-gray-700 bg-[#FAFBFC] dark:bg-gray-800/60 rounded-b-2xl'}`}>
          <p className="text-[13px] text-[#5B6472] dark:text-gray-400">
            {startItem}–{endItem} / {totalCount} ta invoys
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Oldingi sahifa"
              className={`${pageButtonBase} w-11 border border-[#D5D9E0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#151A22] dark:text-gray-100 disabled:text-[#8A92A0] disabled:cursor-not-allowed`}
            >
              <Icon icon="solar:alt-arrow-left-bold-duotone" className="w-[18px] h-[18px]" />
            </button>
            {buildPageList(currentPage, totalPagesServer).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} className="min-w-[24px] h-11 flex items-center justify-center text-[#8A92A0]">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`${pageButtonBase} ${p === currentPage ? 'bg-[#151A22] text-white dark:bg-gray-100 dark:text-gray-900' : 'border border-[#D5D9E0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#151A22] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPagesServer, p + 1))}
              disabled={currentPage >= totalPagesServer}
              aria-label="Keyingi sahifa"
              className={`${pageButtonBase} w-11 border border-[#D5D9E0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#151A22] dark:text-gray-100 disabled:text-[#8A92A0] disabled:cursor-not-allowed`}
            >
              <Icon icon="solar:alt-arrow-right-bold-duotone" className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
