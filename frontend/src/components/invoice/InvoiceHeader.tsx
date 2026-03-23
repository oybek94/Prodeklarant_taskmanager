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
}) => {
  return (
    <div className="flex justify-between items-start w-full mb-0 invoice-header">

      {/* Left: Invoice raqami va sana */}

      <div className="flex-1 min-w-0 pr-4">

        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-1">
            {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
              <div className="space-y-1">
                <span className="text-base font-semibold text-gray-900">
                  {viewTab === 'spec' ? 'Спецификация №:' : viewTab === 'packing' ? 'Упаковочный лист №:' : 'Инвойс №:'} {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                </span>
                {(viewTab === 'spec' || viewTab === 'packing') && (
                  <div className="text-base font-semibold text-gray-900">
                    Инвойс №: {form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')} от {formatDate(form.date)} г.
                  </div>
                )}
              </div>
            ) : (
              <>
                <span className="text-base font-bold text-gray-700 whitespace-nowrap shrink-0">Инвойс №:</span>
                <div className="flex flex-col">
                  <input
                    type="text"
                    value={form.invoiceNumber !== undefined ? form.invoiceNumber : (invoice?.invoiceNumber || '')}
                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                    className={`w-24 px-2 py-1 border rounded text-base font-semibold ${invoiceNumberWarning ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Avtomatik"
                  />
                  {invoiceNumberWarning && (
                    <span className="text-xs text-red-500 mt-0.5">{invoiceNumberWarning}</span>
                  )}
                </div>

                <span className="text-base text-gray-700">от</span>
                <DateInput
                  value={form.date}
                  onChange={(value: any) => setForm({ ...form, date: value })}
                  className="px-2 py-1 border border-gray-300 rounded text-base font-semibold"
                  required
                />

                <span className="text-base text-gray-700">г.</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-700">Контракт №:</span>
            {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
              <span className="px-2 py-1 text-base font-semibold text-gray-900">
                {selectedContract
                  ? `${selectedContract.contractNumber} от ${formatDate(selectedContract.contractDate)}`
                  : ''}
              </span>
            ) : (
              <select
                value={selectedContractId}
                onChange={(e) => handleContractSelect(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-base font-semibold"
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

      {/* Middle: Company Logo */}
      <div className="flex shrink-0 justify-center px-4">
        {(() => {
          const activeContract = contracts.find(c => String(c.id) === String(selectedContractId || contractIdFromQuery));
          const logoUrl = activeContract?.companyLogoUrl;
          if (logoUrl) {
            return (
              <img
                src={resolveUploadUrl(logoUrl)}
                alt="Kompaniya logotipi"
                className="h-14 w-auto object-contain"
                crossOrigin="anonymous"
              />
            );
          }
          return null;
        })()}
      </div>

      {/* Right: Invoice Info */}

      <div className="flex-1 min-w-0 pl-4 text-right">

        <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          {viewTab === 'invoice'
            ? 'INVOICE'
            : viewTab === 'spec'
              ? 'Спецификaция'
              : 'Упаковочный лист'}
        </h1>

      </div>

    </div>
  );
};
