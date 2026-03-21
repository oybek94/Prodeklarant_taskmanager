import React from 'react';
import { Icon } from '@iconify/react';
import { numberToWordsRu } from './invoiceUtils';
import { UNIT_OPTIONS } from './types';
import type { InvoiceItem } from './types';

export interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  setItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
  viewTab: 'invoice' | 'spec' | 'packing';
  isPdfMode: boolean;
  canEditEffective: boolean;
  effectiveColumns: Record<string, boolean>;
  columnLabels: Record<string, string>;
  formatNumberFixed: (v: any, d?: number, k?: boolean) => string;
  formatNumber: (v: any, d?: boolean) => string;
  invoiceCurrency: string;
  
  handleItemChange: (index: number, field: keyof InvoiceItem, value: any) => void;
  handleNameChange: (index: number, value: string) => void;
  handleGrossWeightChange: (index: number, value: string) => void;
  applyGrossWeightFormula: (index: number) => void;
  getGrossWeightDisplayValue: (index: number, item: InvoiceItem) => string;
  handleNetWeightChange: (index: number, value: string) => void;
  applyNetWeightFormula: (index: number) => void;
  getNetWeightDisplayValue: (index: number, item: InvoiceItem) => string;
  
  invoiceProductOptions: any[];
  toggleItemSublist: (index: number) => void;
  expandedSublists: Record<number, boolean>;
  removeItem: (index: number) => void;
  packagingTypes: Array<{ id: string; name: string; code?: string }>;
  totalColumnLabel: string;
}

export default function InvoiceItemsTable({
  items,
  setItems,
  viewTab,
  isPdfMode,
  canEditEffective,
  effectiveColumns,
  columnLabels,
  formatNumberFixed,
  formatNumber,
  invoiceCurrency,
  handleItemChange,
  handleNameChange,
  handleGrossWeightChange,
  applyGrossWeightFormula,
  getGrossWeightDisplayValue,
  handleNetWeightChange,
  applyNetWeightFormula,
  getNetWeightDisplayValue,
  invoiceProductOptions,
  toggleItemSublist,
  expandedSublists,
  removeItem,
  packagingTypes,
  totalColumnLabel
}: InvoiceItemsTableProps) {
  const leadingColumnsCount = [effectiveColumns.index, effectiveColumns.tnved, effectiveColumns.plu, effectiveColumns.name, effectiveColumns.unit, effectiveColumns.package].filter(Boolean).length;
  return (
              <>
                {(isPdfMode || viewTab === 'spec' || viewTab === 'packing') ? (
                  <>
                    <div className="overflow-x-auto border border-black rounded-lg invoice-table-wrap flex flex-wrap justify-start items-start">
                      <table className="w-full text-sm items-table-compact border-0">
                        <thead className="text-left">
                          <tr className="bg-white text-gray-900 font-semibold border-b-2 border-gray-800">
                            {effectiveColumns.index && (
                              <th className="px-2 py-2 text-center text-xs font-semibold w-12" style={{ verticalAlign: 'top' }}>
                                {columnLabels.index}
                              </th>
                            )}
                            {effectiveColumns.tnved && (
                              <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.tnved}
                              </th>
                            )}
                            {effectiveColumns.plu && (
                              <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.plu}
                              </th>
                            )}
                            {effectiveColumns.name && (
                              <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.name}
                              </th>
                            )}
                            {effectiveColumns.unit && (
                              <th className="px-2 py-2 text-center text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.unit}
                              </th>
                            )}
                            {effectiveColumns.package && (
                              <th className="px-2 py-2 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.package}
                              </th>
                            )}
                            {effectiveColumns.quantity && (
                              <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.quantity}
                              </th>
                            )}
                            {effectiveColumns.packagesCount && (
                              <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.packagesCount}
                              </th>
                            )}
                            {effectiveColumns.gross && (
                              <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.gross}
                              </th>
                            )}
                            {effectiveColumns.net && (
                              <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.net}
                              </th>
                            )}
                            {effectiveColumns.unitPrice && (
                              <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.unitPrice}
                              </th>
                            )}
                            {effectiveColumns.total && (
                              <th className="px-2 py-2 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {totalColumnLabel}
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              {effectiveColumns.index && (
                                <td className="px-2 py-2 text-center">{index + 1}</td>
                              )}
                              {effectiveColumns.tnved && (
                                <td className="px-2 py-2">{item.tnvedCode || ''}</td>
                              )}
                              {effectiveColumns.plu && (
                                <td className="px-2 py-2">{item.pluCode || ''}</td>
                              )}
                              {effectiveColumns.name && (
                                <td className="px-2 py-2">{item.name || ''}</td>
                              )}
                              {effectiveColumns.unit && (
                                <td className="px-2 py-2 text-center">{item.unit || ''}</td>
                              )}
                              {effectiveColumns.package && (
                                <td className="px-2 py-2">{item.packageType || ''}</td>
                              )}
                              {effectiveColumns.quantity && (
                                <td className="px-2 py-2 text-right">{item.quantity != null && item.quantity !== 0 ? formatNumber(item.quantity) : ''}</td>
                              )}
                              {effectiveColumns.packagesCount && (
                                <td className="px-2 py-2 text-right">{item.packagesCount != null && item.packagesCount !== 0 ? formatNumber(item.packagesCount) : ''}</td>
                              )}
                              {effectiveColumns.gross && (
                                <td className="px-2 py-2 text-right">{formatNumber(item.grossWeight || 0)}</td>
                              )}
                              {effectiveColumns.net && (
                                <td className="px-2 py-2 text-right">{formatNumber(item.netWeight || 0)}</td>
                              )}
                              {effectiveColumns.unitPrice && (
                                <td className="px-2 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                              )}
                              {effectiveColumns.total && (
                                <td className="px-2 py-2 text-right font-semibold">
                                  {item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-white font-semibold border-t-2 border-gray-400 h-[35px]">
                            {leadingColumnsCount > 0 && (
                              <td className="px-2 pt-1.5 pb-2.5 text-center" colSpan={leadingColumnsCount} style={{ verticalAlign: 'top' }}>
                                Всего:
                              </td>
                            )}
                            {effectiveColumns.quantity && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {(() => { const t = items.reduce((sum, item) => sum + item.quantity, 0); return t !== 0 ? formatNumber(t) : ''; })()}
                              </td>
                            )}
                            {effectiveColumns.packagesCount && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {formatNumber(items.reduce((sum, item) => sum + (item.packagesCount ?? 0), 0))}
                              </td>
                            )}
                            {effectiveColumns.gross && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {formatNumber(items.reduce((sum, item) => sum + (item.grossWeight || 0), 0))}
                              </td>
                            )}
                            {effectiveColumns.net && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {formatNumber(items.reduce((sum, item) => sum + (item.netWeight || 0), 0))}
                              </td>
                            )}
                            {effectiveColumns.unitPrice && <td className="px-2 pt-1.5 pb-3" style={{ verticalAlign: 'top' }}></td>}
                            {effectiveColumns.total && (
                              <td className="px-2 pt-1.5 pb-3 text-right font-bold" style={{ verticalAlign: 'top' }}>
                                {formatNumberFixed(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                              </td>
                            )}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {effectiveColumns.total && (
                      <div className="mt-0 px-2 py-1.5 text-left text-sm bg-white invoice-sum-words">
                        Сумма прописью: {numberToWordsRu(items.reduce((sum, item) => sum + item.totalPrice, 0), invoiceCurrency)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="overflow-x-auto border border-black rounded-lg invoice-table-wrap flex flex-wrap justify-start items-start">
                      <table className="w-full text-sm items-table-compact border-0">
                        <thead className="text-left">
                          <tr className="bg-white text-gray-900 font-semibold border-b-2 border-gray-800">
                            {effectiveColumns.index && (
                              <th className="px-2 py-3 text-center text-xs font-semibold w-12" style={{ verticalAlign: 'top' }}>
                                {columnLabels.index}
                              </th>
                            )}
                            {effectiveColumns.tnved && (
                              <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.tnved}
                              </th>
                            )}
                            {effectiveColumns.plu && (
                              <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.plu}
                              </th>
                            )}
                            {effectiveColumns.name && (
                              <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.name}
                              </th>
                            )}
                            {effectiveColumns.unit && (
                              <th className="px-2 py-3 text-center text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.unit}
                              </th>
                            )}
                            {effectiveColumns.package && (
                              <th className="px-2 py-3 text-left text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.package}
                              </th>
                            )}
                            {effectiveColumns.quantity && (
                              <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.quantity}
                              </th>
                            )}
                            {effectiveColumns.packagesCount && (
                              <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.packagesCount}
                              </th>
                            )}
                            {effectiveColumns.gross && (
                              <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.gross}
                              </th>
                            )}
                            {effectiveColumns.net && (
                              <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.net}
                              </th>
                            )}
                            {effectiveColumns.unitPrice && (
                              <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.unitPrice}
                              </th>
                            )}
                            {effectiveColumns.total && (
                              <th className="px-2 py-3 text-right text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {totalColumnLabel}
                              </th>
                            )}
                            {effectiveColumns.actions && (
                              <th className="px-2 py-3 text-center text-xs font-semibold" style={{ verticalAlign: 'top' }}>
                                {columnLabels.actions}
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                              {effectiveColumns.index && (
                                <td className="px-2 py-2 text-center">{index + 1}</td>
                              )}
                              {effectiveColumns.tnved && (
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={item.tnvedCode || ''}
                                    onChange={(e) => handleItemChange(index, 'tnvedCode', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder="0810700001"
                                  />
                                </td>
                              )}
                              {effectiveColumns.plu && (
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={item.pluCode || ''}
                                    onChange={(e) => handleItemChange(index, 'pluCode', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder="4309371"
                                  />
                                </td>
                              )}
                              {effectiveColumns.name && (
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleNameChange(index, e.target.value)}
                                    list="invoice-tnved-products"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder="Наименование товара"
                                    required
                                  />
                                </td>
                              )}
                              {effectiveColumns.unit && (
                                <td className="px-2 py-2">
                                  <select
                                    value={item.unit || 'кг'}
                                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center bg-white"
                                    required
                                  >
                                    {UNIT_OPTIONS.map((u) => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                </td>
                              )}
                              {effectiveColumns.package && (
                                <td className="px-2 py-2">
                                  <select
                                    value={item.packageType || ''}
                                    onChange={(e) => handleItemChange(index, 'packageType', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                  >
                                    <option value="">— Вид упаковки —</option>
                                    {packagingTypes.map((p) => (
                                      <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                  </select>
                                </td>
                              )}
                              {effectiveColumns.quantity && (
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    value={item.quantity === 0 || item.quantity == null ? '' : item.quantity}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      handleItemChange(index, 'quantity', v === '' ? 0 : (parseFloat(v) || 0));
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder="0"
                                  />
                                </td>
                              )}
                              {effectiveColumns.packagesCount && (
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    value={item.packagesCount === undefined || item.packagesCount === null ? '' : item.packagesCount}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const num = raw === '' ? undefined : parseFloat(String(raw).replace(',', '.'));
                                      handleItemChange(index, 'packagesCount', isNaN(num as number) ? undefined : num);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                    min="0"
                                    step="0.01"
                                    placeholder=""
                                  />
                                </td>
                              )}
                              {effectiveColumns.gross && (
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={getGrossWeightDisplayValue(index, item)}
                                    onChange={(e) => handleGrossWeightChange(index, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyGrossWeightFormula(index);
                                      }
                                    }}
                                    onBlur={() => applyGrossWeightFormula(index)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                    placeholder="7802 yoki *8 (Enter)"
                                    title="Raqam yoki *8.5 — Enter bosganda Кол-во упаковки ga ko'paytiriladi, natija butun son"
                                  />
                                </td>
                              )}
                              {effectiveColumns.net && (
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={getNetWeightDisplayValue(index, item)}
                                    onChange={(e) => handleNetWeightChange(index, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyNetWeightFormula(index);
                                      }
                                    }}
                                    onBlur={() => applyNetWeightFormula(index)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                    placeholder="7150 yoki *1.2 (Enter)"
                                    title="Raqam yoki *1.2 — Enter: Brutto − (1.2 × Кол-во упаковки), natija butun son"
                                  />
                                </td>
                              )}
                              {effectiveColumns.unitPrice && (
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const num = parseFloat(String(raw).replace(',', '.'));
                                      handleItemChange(index, 'unitPrice', Number.isFinite(num) ? num : 0);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right"
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder=""
                                  />
                                </td>
                              )}
                              {effectiveColumns.total && (
                                <td className="px-2 py-2">
                                  <div className="text-right font-semibold text-xs">
                                    {item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}
                                  </div>
                                </td>
                              )}
                              {effectiveColumns.actions && (
                                <td className="px-2 py-2 text-center">
                                  {items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeItem(index)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-white font-semibold border-t-2 border-gray-400 h-[35px]">
                            {leadingColumnsCount > 0 && (
                              <td className="px-2 pt-1.5 pb-2.5 text-center" colSpan={leadingColumnsCount} style={{ verticalAlign: 'top' }}>
                                Всего:
                              </td>
                            )}
                            {effectiveColumns.quantity && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {(() => { const t = items.reduce((sum, item) => sum + item.quantity, 0); return t !== 0 ? formatNumber(t) : ''; })()}
                              </td>
                            )}
                            {effectiveColumns.packagesCount && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {formatNumber(items.reduce((sum, item) => sum + (item.packagesCount ?? 0), 0))}
                              </td>
                            )}
                            {effectiveColumns.gross && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {formatNumber(items.reduce((sum, item) => sum + (item.grossWeight || 0), 0))}
                              </td>
                            )}
                            {effectiveColumns.net && (
                              <td className="px-2 pt-1.5 pb-3 text-right" style={{ verticalAlign: 'top' }}>
                                {formatNumber(items.reduce((sum, item) => sum + (item.netWeight || 0), 0))}
                              </td>
                            )}
                            {effectiveColumns.unitPrice && <td className="px-2 pt-1.5 pb-3" style={{ verticalAlign: 'top' }}></td>}
                            {effectiveColumns.total && (
                              <td className="px-2 pt-1.5 pb-3 text-right font-bold" style={{ verticalAlign: 'top' }}>
                                {formatNumberFixed(items.reduce((sum, item) => sum + item.totalPrice, 0))}
                              </td>
                            )}
                            {effectiveColumns.actions && <td className="px-2 pt-1.5 pb-3" style={{ verticalAlign: 'top' }}></td>}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {effectiveColumns.total && (
                      <div className="mt-0 px-2 py-1.5 text-left text-sm bg-white invoice-sum-words">
                        Сумма прописью: {numberToWordsRu(items.reduce((sum, item) => sum + item.totalPrice, 0), invoiceCurrency)}
                      </div>
                    )}
                  </>
                )}
              </>


  );
}
