import React from 'react';
import type { ViewTab, Contract } from './types';
import { resolveUploadUrl } from './types';
import DateInput from '../DateInput';
import { formatDate } from './invoiceUtils';

interface InvoiceHeaderProps {
  viewTab: ViewTab;
  isPdfMode: boolean;
  form: any;
  setForm: (form: any) => void;
  invoice: any;
  invoiceNumberWarning: string | null;
  selectedContractId: string;
  selectedContract: Contract | undefined;
  contracts: Contract[];
  contractIdFromQuery: string | null | undefined;
  handleContractSelect: (contractId: string) => void;
  showItemErrors?: boolean;
}

export const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  viewTab,
  isPdfMode,
  form,
  setForm,
  invoice,
  invoiceNumberWarning,
  selectedContractId,
  selectedContract,
  contracts,
  contractIdFromQuery,
  handleContractSelect,
  showItemErrors,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-0 invoice-header gap-6 md:gap-4">

      {/* Left: Document title */}

      <div className="flex-1 min-w-0 md:pr-4">

        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-2 md:mb-6">
          {viewTab === 'invoice'
            ? 'Инвойс'
            : viewTab === 'spec'
              ? 'Спецификaция'
              : 'Упаковочный лист'}
        </h1>

      </div>

      {/* Middle: Company Logo */}
      <div className="flex shrink-0 justify-center md:px-4">
        {(() => {
          const activeContract = contracts.find(c => String(c.id) === String(selectedContractId || contractIdFromQuery));
          const logoUrl = activeContract?.companyLogoUrl;
          if (logoUrl) {
            return (
              <img
                src={resolveUploadUrl(logoUrl)}
                alt="Kompaniya logotipi"
                className="h-10 md:h-14 w-auto object-contain"
                crossOrigin="anonymous"
              />
            );
          }
          return null;
        })()}
      </div>

      {/* Right: Invoice raqami va sana */}

      <div className="flex-1 min-w-0 md:pl-4 w-full md:w-auto">

        <div className="space-y-1 md:mb-4 flex flex-col items-start md:items-end">
          <div className="flex flex-wrap items-center gap-1">
            {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
              <div className="space-y-1 text-left md:text-right">
                <div className="text-base md:text-lg text-gray-900">
                  <span className="font-bold">
                    {viewTab === 'spec' ? 'Спецификация №:' : viewTab === 'packing' ? 'Упаковочный лист №:' : 'Инвойс №:'}
                  </span>
                  <span className="font-semibold ml-1">
                    {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                  </span>
                </div>
                {(viewTab === 'spec' || viewTab === 'packing') && (
                  <div className="text-base md:text-lg text-gray-900">
                    <span className="font-bold">Инвойс №:</span>
                    <span className="font-semibold ml-1">
                      {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <span className="text-base md:text-lg font-bold text-gray-700 whitespace-nowrap shrink-0">Инвойс №:</span>
                <div className="flex flex-col">
                  <input
                    type="text"
                    value={form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')}
                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                    className={`w-24 md:w-28 px-2 py-1 border rounded text-base md:text-lg font-semibold ${invoiceNumberWarning || (showItemErrors && !String(form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')).trim()) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder="Avtomatik"
                  />
                  {invoiceNumberWarning && (
                    <span className="text-xs text-red-500 mt-0.5">{invoiceNumberWarning}</span>
                  )}
                </div>

                <span className="text-base md:text-lg text-gray-700">от</span>
                <DateInput
                  value={form.date}
                  onChange={(value: any) => setForm({ ...form, date: value })}
                  className="px-2 py-1 border border-gray-300 rounded text-base md:text-lg font-semibold"
                  required
                />

                <span className="text-base md:text-lg text-gray-700">г.</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 w-full md:w-auto">
            <span className="text-base md:text-lg font-bold text-gray-900">Контракт №:</span>
            {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
              <span className="text-base md:text-lg font-semibold text-gray-900">
                {selectedContract
                  ? `${selectedContract.contractNumber} от ${formatDate(selectedContract.contractDate)}`
                  : ''}
              </span>
            ) : (
              <select
                value={selectedContractId}
                onChange={(e) => handleContractSelect(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-base md:text-lg font-semibold"
              >
                <option value="">Shartnoma tanlang...</option>
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contractNumber} от {formatDate(contract.contractDate)}
                  </option>
                ))}
              </select>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
