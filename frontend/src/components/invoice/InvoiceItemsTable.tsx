import React, { type RefObject } from 'react';
import type { InvoiceItem, ViewTab, VisibleColumns, ColumnLabels, ColumnLabelKey, InvoiceFormData } from './types';
import { UNIT_OPTIONS, DEFAULT_COLUMN_LABELS } from './types';
import { formatNumber, formatNumberFixed, numberToWordsRu, getCurrencySymbol } from './invoiceUtils';
import { InvoiceWeightSummary } from './InvoiceWeightSummary';
import { ExportPriceCalculator } from './ExportPriceCalculator';

interface InvoiceItemsTableProps {
  viewTab: ViewTab;
  isPdfMode: boolean;
  canEditEffective: boolean;
  items: InvoiceItem[];
  effectiveColumns: VisibleColumns;
  visibleColumns: VisibleColumns;
  columnLabels: ColumnLabels;
  totalColumnLabel: string;
  leadingColumnsCount: number;
  invoiceCurrency: string;
  columnsDropdownRef: RefObject<HTMLDetailsElement | null>;
  columnsDropdownOpen: boolean;
  setColumnsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setVisibleColumnsAndPersist: React.Dispatch<React.SetStateAction<VisibleColumns>>;
  setColumnLabels: React.Dispatch<React.SetStateAction<ColumnLabels>>;
  addItem: () => void;
  removeItem: (index: number) => void;
  handleItemChange: (index: number, field: keyof InvoiceItem, value: any) => void;
  handleNameChange: (index: number, value: string) => void;
  handleNameEnChange: (index: number, value: string) => void;
  handleGrossWeightChange: (index: number, value: string) => void;
  handleNetWeightChange: (index: number, value: string) => void;
  applyGrossWeightFormula: (index: number) => void;
  applyNetWeightFormula: (index: number) => void;
  getGrossWeightDisplayValue: (index: number, item: InvoiceItem) => string;
  getNetWeightDisplayValue: (index: number, item: InvoiceItem) => string;
  packagingTypes: { id: string; name: string; code?: string }[];
  form: InvoiceFormData;
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  viewTab,
  isPdfMode,
  canEditEffective,
  items,
  effectiveColumns,
  visibleColumns,
  columnLabels,
  totalColumnLabel,
  leadingColumnsCount,
  invoiceCurrency,
  columnsDropdownRef,
  columnsDropdownOpen,
  setColumnsDropdownOpen,
  setVisibleColumnsAndPersist,
  setColumnLabels,
  addItem,
  removeItem,
  handleItemChange,
  handleNameChange,
  handleNameEnChange,
  handleGrossWeightChange,
  handleNetWeightChange,
  applyGrossWeightFormula,
  applyNetWeightFormula,
  getGrossWeightDisplayValue,
  getNetWeightDisplayValue,
  packagingTypes,
  form,
  setForm,
}) => {
  const isReadonly = isPdfMode || viewTab === 'spec' || viewTab === 'packing';

  const renderTableHeader = (py: string) => (
    <thead className="text-left">
      <tr className="bg-white text-gray-900 font-semibold border-b-2 border-gray-800">
        {effectiveColumns.index && (
          <th className={`px-2 ${py} text-center text-xs font-semibold w-12`} style={{ verticalAlign: 'top' }}>{columnLabels.index}</th>
        )}
        {effectiveColumns.tnved && (
          <th className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.tnved}</th>
        )}
        {effectiveColumns.plu && (
          <th className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.plu}</th>
        )}
        {effectiveColumns.name && (
          <th className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.name}</th>
        )}
        {effectiveColumns.unit && (
          <th className={`px-2 ${py} text-center text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.unit}</th>
        )}
        {effectiveColumns.package && (
          <th className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.package}</th>
        )}
        {effectiveColumns.quantity && (
          <th className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.quantity}</th>
        )}
        {effectiveColumns.packagesCount && (
          <th className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.packagesCount}</th>
        )}
        {effectiveColumns.gross && (
          <th className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.gross}</th>
        )}
        {effectiveColumns.net && (
          <th className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.net}</th>
        )}
        {effectiveColumns.unitPrice && (
          <th className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
            {columnLabels.unitPrice}
          </th>
        )}
        {effectiveColumns.total && (
          <th className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{totalColumnLabel}</th>
        )}
        {!isReadonly && effectiveColumns.actions && (
          <th className={`px-2 ${py} text-center text-xs font-semibold`} style={{ verticalAlign: 'top' }}>{columnLabels.actions}</th>
        )}
      </tr>
    </thead>
  );

  const renderTableFooter = () => (
    <tfoot>
      <tr className="bg-white font-semibold border-t-2 border-gray-800">
        {leadingColumnsCount > 0 && (
          <td className="px-2 py-1 text-center" colSpan={leadingColumnsCount} style={{ verticalAlign: 'top' }}>Всего:</td>
        )}
        {effectiveColumns.quantity && (
          <td className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
            {(() => { const t = items.reduce((sum, i) => sum + i.quantity, 0); return t !== 0 ? formatNumber(t) : ''; })()}
          </td>
        )}
        {effectiveColumns.packagesCount && (
          <td className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
            {formatNumber(items.reduce((sum, i) => sum + (i.packagesCount ?? 0), 0))}
          </td>
        )}
        {effectiveColumns.gross && (
          <td className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
            {formatNumber(items.reduce((sum, i) => sum + (i.grossWeight || 0), 0))}
          </td>
        )}
        {effectiveColumns.net && (
          <td className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
            {formatNumber(items.reduce((sum, i) => sum + (i.netWeight || 0), 0))}
          </td>
        )}
        {effectiveColumns.unitPrice && <td className="px-2 py-1" style={{ verticalAlign: 'top' }}></td>}
        {effectiveColumns.total && (
          <td className="px-2 py-1 text-right font-bold" style={{ verticalAlign: 'top' }}>
            {getCurrencySymbol(invoiceCurrency)} {formatNumberFixed(items.reduce((sum, i) => sum + i.totalPrice, 0))}
          </td>
        )}
        {!isReadonly && effectiveColumns.actions && <td className="px-2 py-1" style={{ verticalAlign: 'top' }}></td>}
      </tr>
    </tfoot>
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div></div>
        {(viewTab === 'invoice' && canEditEffective) && (
          <div className="flex items-center gap-2">
            <details ref={columnsDropdownRef} open={columnsDropdownOpen} className="relative">
              <summary
                className="list-none cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                onClick={(e) => { e.preventDefault(); setColumnsDropdownOpen((prev) => !prev); }}
              >
                Ustunlar
              </summary>
              <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                  {(['index', 'tnved', 'plu', 'name', 'unit', 'package', 'quantity', 'packagesCount', 'gross', 'net', 'unitPrice', 'total', 'actions'] as ColumnLabelKey[]).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <input type="checkbox" checked={visibleColumns[key]} onChange={() => setVisibleColumnsAndPersist((prev) => ({ ...prev, [key]: !prev[key] }))} className="shrink-0" />
                      <input type="text" value={columnLabels[key]} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [key]: e.target.value }))} className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs" placeholder={DEFAULT_COLUMN_LABELS[key]} />
                    </div>
                  ))}
                </div>
              </div>
            </details>
            <button type="button" onClick={addItem} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              Qator qo'shish
            </button>
          </div>
        )}
      </div>

      <>
        {isReadonly ? (
          <>
            <div className="overflow-x-auto border border-black rounded-lg invoice-table-wrap flex flex-wrap justify-start items-start">
              <table className="w-full text-sm items-table-compact border-0">
                {renderTableHeader('py-2')}
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      {effectiveColumns.index && <td className="px-2 py-4 text-center">{index + 1}</td>}
                      {effectiveColumns.tnved && <td className="px-2 py-4">{item.tnvedCode || ''}</td>}
                      {effectiveColumns.plu && <td className="px-2 py-4">{item.pluCode || ''}</td>}
                      {effectiveColumns.name && (
                        <td className="px-2 py-4">
                          <div>{item.name || ''}</div>
                        </td>
                      )}
                      {effectiveColumns.unit && <td className="px-2 py-4 text-center">{item.unit || ''}</td>}
                      {effectiveColumns.package && <td className="px-2 py-4">{item.packageType || ''}</td>}
                      {effectiveColumns.quantity && <td className="px-2 py-4 text-right">{item.quantity != null && item.quantity !== 0 ? formatNumber(item.quantity) : ''}</td>}
                      {effectiveColumns.packagesCount && <td className="px-2 py-4 text-right">{item.packagesCount != null && item.packagesCount !== 0 ? formatNumber(item.packagesCount) : ''}</td>}
                      {effectiveColumns.gross && <td className="px-2 py-4 text-right">{formatNumber(item.grossWeight || 0)}</td>}
                      {effectiveColumns.net && <td className="px-2 py-4 text-right">{formatNumber(item.netWeight || 0)}</td>}
                      {effectiveColumns.unitPrice && <td className="px-2 py-4 text-right">{formatNumber(item.unitPrice)}</td>}
                      {effectiveColumns.total && <td className="px-2 py-4 text-right font-semibold">{item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}</td>}
                    </tr>
                  ))}
                </tbody>
                {renderTableFooter()}
              </table>
            </div>
            {effectiveColumns.total && (
              <div className="mt-0 px-2 py-1.5 text-left text-sm bg-white invoice-sum-words">
                Сумма прописью: {numberToWordsRu(items.reduce((sum, i) => sum + i.totalPrice, 0), invoiceCurrency)}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto border border-black rounded-lg invoice-table-wrap flex flex-wrap justify-start items-start">
              <table className="w-full text-sm items-table-compact border-0">
                {renderTableHeader('py-3')}
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      {effectiveColumns.index && <td className="px-2 py-2 text-center">{index + 1}</td>}
                      {effectiveColumns.tnved && (
                        <td className="px-2 py-2">
                          <input type="text" value={item.tnvedCode || ''} onChange={(e) => handleItemChange(index, 'tnvedCode', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" placeholder="0810700001" />
                        </td>
                      )}
                      {effectiveColumns.plu && (
                        <td className="px-2 py-2">
                          <input type="text" value={item.pluCode || ''} onChange={(e) => handleItemChange(index, 'pluCode', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" placeholder="4309371" />
                        </td>
                      )}
                      {effectiveColumns.name && (
                        <td className="px-2 py-2">
                          <input type="text" value={item.name} onChange={(e) => handleNameChange(index, e.target.value)} list="invoice-tnved-products" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Наименование товара" required />
                        </td>
                      )}
                      {effectiveColumns.unit && (
                        <td className="px-2 py-2">
                          <select value={item.unit || 'кг'} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center bg-white" required>
                            {UNIT_OPTIONS.map((u) => (<option key={u} value={u}>{u}</option>))}
                          </select>
                        </td>
                      )}
                      {effectiveColumns.package && (
                        <td className="px-2 py-2">
                          <select value={item.packageType || ''} onChange={(e) => handleItemChange(index, 'packageType', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                            <option value="">— Вид упаковки —</option>
                            {packagingTypes.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
                          </select>
                        </td>
                      )}
                      {effectiveColumns.quantity && (
                        <td className="px-2 py-2">
                          <input type="number" value={('_quantityStr' in item && (item as any)._quantityStr !== undefined) ? (item as any)._quantityStr : (item.quantity === 0 || item.quantity == null ? '' : item.quantity)} onChange={(e) => { const v = e.target.value; handleItemChange(index, '_quantityStr' as any, v); handleItemChange(index, 'quantity', v === '' ? 0 : (parseFloat(v.replace(',','.')) || 0)); }} onBlur={() => handleItemChange(index, '_quantityStr' as any, undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" min="0" step="any" required placeholder="0" />
                        </td>
                      )}
                      {effectiveColumns.packagesCount && (
                        <td className="px-2 py-2">
                          <input type="number" value={('_packagesCountStr' in item && (item as any)._packagesCountStr !== undefined) ? (item as any)._packagesCountStr : (item.packagesCount === undefined || item.packagesCount === null ? '' : item.packagesCount)} onChange={(e) => { const raw = e.target.value; handleItemChange(index, '_packagesCountStr' as any, raw); const num = raw === '' ? undefined : parseFloat(String(raw).replace(',', '.')); handleItemChange(index, 'packagesCount', isNaN(num as number) ? undefined : num); }} onBlur={() => handleItemChange(index, '_packagesCountStr' as any, undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" min="0" step="any" placeholder="" />
                        </td>
                      )}
                      {effectiveColumns.gross && (
                        <td className="px-2 py-2">
                          <input type="text" inputMode="decimal" value={getGrossWeightDisplayValue(index, item)} onChange={(e) => handleGrossWeightChange(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyGrossWeightFormula(index); } }} onBlur={() => applyGrossWeightFormula(index)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="7802 yoki *8 (Enter)" title="Raqam yoki *8.5 — Enter bosganda Кол-во упаковки ga ko'paytiriladi, natija butun son" />
                        </td>
                      )}
                      {effectiveColumns.net && (
                        <td className="px-2 py-2">
                          <input type="text" inputMode="decimal" value={getNetWeightDisplayValue(index, item)} onChange={(e) => handleNetWeightChange(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyNetWeightFormula(index); } }} onBlur={() => applyNetWeightFormula(index)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="7150 yoki *1.2 (Enter)" title="Raqam yoki *1.2 — Enter: Brutto − (1.2 × Кол-во упаковки), natija butun son" />
                        </td>
                      )}
                      {effectiveColumns.unitPrice && (
                        <td className="px-2 py-2">
                          <input type="number" value={('_unitPriceStr' in item && (item as any)._unitPriceStr !== undefined) ? (item as any)._unitPriceStr : (item.unitPrice === 0 ? '' : item.unitPrice)} onChange={(e) => { const raw = e.target.value; handleItemChange(index, '_unitPriceStr' as any, raw); const num = parseFloat(String(raw).replace(',', '.')); handleItemChange(index, 'unitPrice', Number.isFinite(num) ? num : 0); }} onBlur={() => handleItemChange(index, '_unitPriceStr' as any, undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" min="0" step="any" required placeholder="" />
                        </td>
                      )}
                      {effectiveColumns.total && (
                        <td className="px-2 py-2">
                          <div className="text-right font-semibold text-xs">{item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}</div>
                        </td>
                      )}
                      {effectiveColumns.actions && (
                        <td className="px-2 py-2 text-center">
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800 text-sm">✕</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {renderTableFooter()}
              </table>
            </div>
            {effectiveColumns.total && (
              <div className="mt-0 px-2 py-1.5 text-left text-sm bg-white invoice-sum-words">
                Сумма прописью: {numberToWordsRu(items.reduce((sum, i) => sum + i.totalPrice, 0), invoiceCurrency)}
              </div>
            )}
          </>
        )}
      </>

      {!isPdfMode && viewTab !== 'spec' && (
        <>
          <InvoiceWeightSummary
            items={items}
            loaderWeight={form.loaderWeight}
            trailerWeight={form.trailerWeight}
            palletWeight={form.palletWeight}
          />
          <ExportPriceCalculator 
            form={form}
            setForm={setForm}
            items={items}
            canEditEffective={canEditEffective}
          />
        </>
      )}
    </div>
  );
};
