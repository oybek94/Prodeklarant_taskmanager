import React from 'react';
import type { Contract, InvoiceItem, InvoiceFormData } from './types';
import { resolveUploadUrl } from './types';
import { formatDate, formatNumberFixed, formatUnitPrice } from './invoiceUtils';

interface InvoicePriceListProps {
  contract: Contract | null;
  form: InvoiceFormData;
  items: InvoiceItem[];
  isPdfMode?: boolean;
  pdfIncludeSeal?: boolean;
}

/**
 * Прайс-лист — rasmiy hujjat ko'rinishida.
 * Dizayni Invoice sahifasidagi komponentlar (InvoiceHeader, InvoiceItemsTable, InvoiceSignatures)
 * bilan bir xil uslubda qurilgan. PDF rejimida ham ekrandagi ko'rinish saqlanadi.
 */
export const InvoicePriceList: React.FC<InvoicePriceListProps> = React.memo(({
  contract,
  form,
  items,
  isPdfMode = false,
  pdfIncludeSeal = true,
}) => {
  const deliveryTerms = form.deliveryTerms || '';
  const displayCurrency = contract?.contractCurrency || form.currency || 'USD';

  return (
    <div className={`w-full px-10 ${isPdfMode ? 'pt-24' : 'pt-10'}`}>

      {/* ===== HEADER (InvoiceHeader uslubida) ===== */}
      <div className="flex justify-between items-start w-full mb-0 invoice-header">
        {/* Left side */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="space-y-2 mb-4">
            <div className="text-xl text-gray-900">
              <span className="font-bold">Контракт №:</span>
              <span className="font-semibold ml-1">
                {form.contractNumber || contract?.contractNumber || '_________'} от{' '}
                {contract?.contractDate ? formatDate(contract.contractDate) : '___________'}
              </span>
            </div>
            <div className="text-xl text-gray-900">
              <span className="font-bold">Дата:</span>
              <span className="font-semibold ml-1">
                {form.date ? formatDate(form.date) : '«___» ________ 20__ г.'}
              </span>
            </div>
            <div className="text-xl text-gray-900">
              <span className="font-bold">Валюта:</span>
              <span className="font-semibold ml-1">{displayCurrency}</span>
            </div>
          </div>
        </div>

        {/* Middle: Company Logo */}
        <div className="flex shrink-0 justify-center px-4">
          {contract?.companyLogoUrl && (
            <img
              src={resolveUploadUrl(contract.companyLogoUrl)}
              alt="Kompaniya logotipi"
              className="h-14 w-auto object-contain"
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* Right: Title */}
        <div className="flex-1 min-w-0 pl-4 text-right">
          <h1 
            className="font-bold text-gray-800 dark:text-gray-100 mb-6"
            style={{ fontSize: isPdfMode ? '64px' : '3.75rem', lineHeight: 1 }}
          >
            ПРАЙС-ЛИСТ
          </h1>
        </div>
      </div>

      {/* ===== SEPARATOR (invoysdagi kabi) ===== */}
      <hr className="border-gray-300 mb-6" />

      {/* ===== SELLER INFO ===== */}
      <div className="mt-10 mb-6">
        <div className="space-y-2">
          <div className="text-xl text-gray-900">
            <span className="font-bold">Продавец:</span>
            <span className="font-semibold ml-1">
              {contract?.sellerName || '__________________________________'}
            </span>
          </div>
          {contract?.sellerLegalAddress && (
            <div className="text-lg text-gray-700">
              <span className="font-semibold">Юр. адрес:</span> {contract.sellerLegalAddress}
            </div>
          )}
          {contract?.sellerInn && (
            <div className="text-lg text-gray-700">
              <span className="font-semibold">ИНН:</span> {contract.sellerInn}
            </div>
          )}
          {contract?.sellerBankName && (
            <div className="text-lg text-gray-700">
              <span className="font-semibold">Банк:</span> {contract.sellerBankName}
            </div>
          )}
          {contract?.sellerBankAccount && (
            <div className="text-lg text-gray-700">
              <span className="font-semibold">Р/с:</span> {contract.sellerBankAccount}
            </div>
          )}
        </div>
      </div>

      {/* ===== TABLE (InvoiceItemsTable readonly uslubida) ===== */}
      {/* Jadval kichikroq, markazda, tepadan va pastdan erkin joy bilan */}
      <div className="mt-44 mb-16 mx-auto" style={{ maxWidth: '85%' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-lg items-table-compact pricelist-table border-collapse border border-black">
            <thead className="text-left">
              <tr className="bg-white text-gray-900 font-semibold border-b border-black">
                <th className="px-3 py-3 text-center text-base font-semibold border-r border-black w-14" style={{ verticalAlign: 'top' }}>
                  №
                </th>
                <th className="px-3 py-3 text-left text-base font-semibold border-r border-black" style={{ verticalAlign: 'top' }}>
                  Наименование товара
                </th>
                <th className="px-3 py-3 text-center text-base font-semibold border-r border-black" style={{ verticalAlign: 'top' }}>
                  Ед. изм.
                </th>
                <th className="px-3 py-3 text-right text-base font-semibold border-r border-black" style={{ verticalAlign: 'top' }}>
                  Цена ({displayCurrency})
                </th>
                <th className="px-3 py-3 text-center text-base font-semibold" style={{ verticalAlign: 'top' }}>
                  Условия поставки
                </th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-black">
                    <td className="px-3 py-4 text-center border-r border-black">{idx + 1}</td>
                    <td className="px-3 py-4 border-r border-black">{item.name}</td>
                    <td className="px-3 py-4 text-center border-r border-black">{item.unit || '---'}</td>
                    <td className="px-3 py-4 text-right font-semibold border-r border-black">{formatUnitPrice(item.unitPrice)}</td>
                    <td className="px-3 py-4 text-center">{deliveryTerms || '---'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500 italic">
                    Данные о товарах отсутствуют
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== SIGNATURES (InvoiceSignatures uslubida) ===== */}
      {contract?.supplierDirector && (
        <div className="mt-40 mb-8 space-y-3">
          <div className="flex flex-row flex-wrap gap-4 items-start">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-xl font-semibold text-gray-700">Руководитель Поставщика:</div>
                <div className="text-xl text-gray-800">{contract.supplierDirector}</div>
              </div>
            </div>
            <div className="flex flex-row items-center justify-center gap-3">
              {(contract.sellerSignatureUrl || contract.signatureUrl) && (!isPdfMode || pdfIncludeSeal) && (
                <div>
                  <img
                    src={resolveUploadUrl(contract.sellerSignatureUrl || contract.signatureUrl)}
                    alt="Imzo"
                    className="h-[90px] w-auto object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
              {(contract.sellerSealUrl || contract.sealUrl) && (!isPdfMode || pdfIncludeSeal) && (
                <div>
                  <img
                    src={resolveUploadUrl(contract.sellerSealUrl || contract.sealUrl)}
                    alt="Muhr"
                    className="h-[215px] w-auto object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
