import React, { type RefObject, useMemo, useState } from 'react';
import type { InvoiceItem, ViewTab, VisibleColumns, ColumnLabels, ColumnLabelKey, InvoiceFormData } from './types';
import { UNIT_OPTIONS, DEFAULT_COLUMN_LABELS } from './types';
import { formatNumber, formatNumberFixed, numberToWordsRu, getCurrencySymbol } from './invoiceUtils';
import { InvoiceWeightSummary } from './InvoiceWeightSummary';
import { ExportPriceCalculator } from './ExportPriceCalculator';
import { useTableKeyboardNav } from './hooks/useTableKeyboardNav';
import { Icon } from '@iconify/react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

interface InvoiceItemsTableProps {
  viewTab: ViewTab;
  isPdfMode: boolean;
  canEditEffective: boolean;
  items: InvoiceItem[];
  effectiveColumns: VisibleColumns;
  visibleColumns: VisibleColumns;
  columnLabels: ColumnLabels;
  columnOrder: string[];
  customColumns: string[];
  moveColumn: (fromIndex: number, toIndex: number) => void;
  onAddCustomColumn: (label: string) => void;
  onRemoveCustomColumn: (key: string) => void;
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
  handleCustomFieldChange: (index: number, key: string, value: string) => void;
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
  showItemErrors?: boolean;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  viewTab,
  isPdfMode,
  canEditEffective,
  items,
  effectiveColumns,
  visibleColumns,
  columnLabels,
  columnOrder,
  customColumns,
  moveColumn,
  onAddCustomColumn,
  onRemoveCustomColumn,
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
  handleCustomFieldChange,
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
  showItemErrors,
}) => {
  const isReadonly = isPdfMode || viewTab === 'spec' || viewTab === 'packing';
  const { tableRef, handleCellKeyDown } = useTableKeyboardNav();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newColLabel, setNewColLabel] = useState('');

  const handleTakeScreenshot = async () => {
    const element = document.getElementById('invoice-screenshot-area');
    if (!element) {
      toast.error("Skrinshot olinadigan hudud topilmadi");
      return;
    }
    
    try {
      const toastId = toast.loading("Nusxa olinmoqda...");
      
      const originalArea = document.getElementById('invoice-screenshot-area');
      const originalInputs = originalArea ? Array.from(originalArea.querySelectorAll('input, textarea, select')) : [];
      originalInputs.forEach((el, i) => el.setAttribute('data-html2canvas-id', `input-${i}`));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => {
          return el.classList.contains('no-screenshot');
        },
        onclone: (clonedDoc) => {
          const clonedArea = clonedDoc.getElementById('invoice-screenshot-area');
          if (clonedArea) {
            clonedArea.style.padding = '24px 32px';
            clonedArea.style.boxSizing = 'border-box';
          }
          
          originalInputs.forEach((origEl) => {
            const id = origEl.getAttribute('data-html2canvas-id');
            const clonedEl = clonedDoc.querySelector(`[data-html2canvas-id="${id}"]`);
            if (!clonedEl) return;
            
            if (clonedEl.tagName === 'INPUT' || clonedEl.tagName === 'TEXTAREA') {
              const clonedInput = clonedEl as HTMLInputElement;
              if (clonedInput.type !== 'checkbox' && clonedInput.type !== 'radio' && clonedInput.type !== 'hidden') {
                const div = clonedDoc.createElement('div');
                div.textContent = (origEl as HTMLInputElement).value || '';
                div.className = origEl.className;
                div.style.boxSizing = 'border-box';
                div.style.overflow = 'visible';
                div.style.whiteSpace = clonedEl.tagName === 'TEXTAREA' ? 'pre-wrap' : 'nowrap';
                div.style.border = 'none';
                div.style.background = 'transparent';
                
                const computedStyle = window.getComputedStyle(origEl);
                div.style.textAlign = computedStyle.textAlign;
                div.style.padding = computedStyle.padding;
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                if (computedStyle.textAlign === 'right') div.style.justifyContent = 'flex-end';
                else if (computedStyle.textAlign === 'center') div.style.justifyContent = 'center';
                
                clonedEl.parentNode?.replaceChild(div, clonedEl);
              }
            } else if (clonedEl.tagName === 'SELECT') {
              const div = clonedDoc.createElement('div');
              const origSelect = origEl as HTMLSelectElement;
              const selected = origSelect.selectedIndex >= 0 ? origSelect.options[origSelect.selectedIndex] : null;
              div.textContent = selected ? selected.text : '';
              div.className = origEl.className;
              div.style.boxSizing = 'border-box';
              div.style.overflow = 'visible';
              div.style.whiteSpace = 'nowrap';
              div.style.border = 'none';
              div.style.background = 'transparent';
              
              const computedStyle = window.getComputedStyle(origEl);
              div.style.textAlign = computedStyle.textAlign;
              div.style.padding = computedStyle.padding;
              div.style.display = 'flex';
              div.style.alignItems = 'center';
              if (computedStyle.textAlign === 'right') div.style.justifyContent = 'flex-end';
              else if (computedStyle.textAlign === 'center') div.style.justifyContent = 'center';

              clonedEl.parentNode?.replaceChild(div, clonedEl);
            }
          });
        }
      });

      originalInputs.forEach((el) => el.removeAttribute('data-html2canvas-id'));
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Rasm yaratishda xatolik", { id: toastId });
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success("Skrinshot nusxalandi! CTRL+V orqali joylashingiz mumkin.", { id: toastId, duration: 4000 });
        } catch (err) {
          console.error("Clipboard xatoligi:", err);
          toast.error("Nusxalashda xatolik. Brauzer ruxsat bermagan bo'lishi mumkin.", { id: toastId });
        }
      }, 'image/png');
    } catch (error) {
      console.error("Screenshot xatoligi:", error);
      toast.error("Skrinshot olishda xatolik yuz berdi");
    }
  };



  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter((key) => {
      if (key === 'actions' && isReadonly) return false;
      return effectiveColumns[key as keyof VisibleColumns];
    });
  }, [columnOrder, effectiveColumns, isReadonly]);

  // Build a column-index map based on which columns are currently visible
  // so arrow-left / arrow-right skip hidden columns.
  const colIndexMap = useMemo(() => {
    const map: Partial<Record<keyof VisibleColumns, number>> = {};
    let idx = 0;
    for (const key of columnOrder) {
      if (key === 'actions' || key === 'index' || key === 'total') continue;
      if (effectiveColumns[key as keyof VisibleColumns]) {
        map[key as keyof VisibleColumns] = idx++;
      }
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveColumns, columnOrder]);

  const renderTableHeader = (py: string) => (
    <thead className="text-left">
      <tr className="bg-white text-gray-900 font-semibold border-b-2 border-gray-800">
        {orderedVisibleColumns.map((key) => {
          switch (key) {
            case 'index':
              return (
                <th key={key} className={`px-2 ${py} text-center text-xs font-semibold w-12`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.index}
                </th>
              );
            case 'tnved':
              return (
                <th key={key} className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.tnved}
                </th>
              );
            case 'plu':
              return (
                <th key={key} className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.plu}
                </th>
              );
            case 'name':
              return (
                <th key={key} className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.name}
                </th>
              );
            case 'unit':
              return (
                <th key={key} className={`px-2 ${py} text-center text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.unit}
                </th>
              );
            case 'package':
              return (
                <th key={key} className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.package}
                </th>
              );
            case 'quantity':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.quantity}
                </th>
              );
            case 'packagesCount':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.packagesCount}
                </th>
              );
            case 'gross':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.gross}
                </th>
              );
            case 'net':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.net}
                </th>
              );
            case 'unitPrice':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.unitPrice}
                </th>
              );
            case 'total':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  {totalColumnLabel}
                </th>
              );
            case 'actions':
              return (
                <th key={key} className={`px-2 ${py} text-center text-xs font-semibold no-screenshot`} style={{ verticalAlign: 'top' }}>
                  {columnLabels.actions}
                </th>
              );
            default:
              if (key.startsWith('custom_')) {
                return (
                  <th key={key} className={`px-2 ${py} text-left text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                    {columnLabels[key]}
                  </th>
                );
              }
              return null;
          }
        })}
      </tr>
    </thead>
  );

  const renderTableFooter = () => {
    const SUM_COLUMNS = ['quantity', 'packagesCount', 'gross', 'net', 'total'];
    const firstSumColIdx = orderedVisibleColumns.findIndex(key => SUM_COLUMNS.includes(key));

    return (
      <tfoot>
        <tr className="bg-white font-semibold border-t-2 border-gray-800">
          {firstSumColIdx > 0 && (
            <td className="px-2 py-1 text-center" colSpan={firstSumColIdx} style={{ verticalAlign: 'top' }}>
              Всего:
            </td>
          )}
          {firstSumColIdx === -1 && (
            <td className="px-2 py-1 text-center" colSpan={orderedVisibleColumns.length} style={{ verticalAlign: 'top' }}>
              Всего:
            </td>
          )}
          {firstSumColIdx !== -1 && orderedVisibleColumns.slice(firstSumColIdx).map((key) => {
            switch (key) {
              case 'quantity':
                return (
                  <td key={key} className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
                    {(() => {
                      const t = items.reduce((sum, i) => sum + i.quantity, 0);
                      return t !== 0 ? formatNumber(t) : '';
                    })()}
                  </td>
                );
              case 'packagesCount':
                return (
                  <td key={key} className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
                    {formatNumber(items.reduce((sum, i) => sum + (i.packagesCount ?? 0), 0))}
                  </td>
                );
              case 'gross':
                return (
                  <td key={key} className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
                    {formatNumber(items.reduce((sum, i) => sum + (i.grossWeight || 0), 0))}
                  </td>
                );
              case 'net':
                return (
                  <td key={key} className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
                    {formatNumber(items.reduce((sum, i) => sum + (i.netWeight || 0), 0))}
                  </td>
                );
              case 'total':
                return (
                  <td key={key} className="px-2 py-1 text-right font-bold" style={{ verticalAlign: 'top' }}>
                    {getCurrencySymbol(invoiceCurrency)} {formatNumberFixed(items.reduce((sum, i) => sum + i.totalPrice, 0))}
                  </td>
                );
              case 'unitPrice':
              case 'actions':
                return <td key={key} className="px-2 py-1" style={{ verticalAlign: 'top' }}></td>;
              default:
                if (key.startsWith('custom_')) {
                  return <td key={key} className="px-2 py-1" style={{ verticalAlign: 'top' }}></td>;
                }
                return null;
            }
          })}
        </tr>
      </tfoot>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div></div>
        {viewTab === 'invoice' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTakeScreenshot}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-1 font-medium no-screenshot"
              title="Invoys ma'lumotlarini rasmga olib nusxalash"
            >
              <Icon icon="lucide:camera" className="w-4 h-4" />
              Nusxa olish
            </button>
            {canEditEffective && (
              <>
                <details ref={columnsDropdownRef} open={columnsDropdownOpen} className="relative no-screenshot">
                  <summary
                    className="list-none cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    onClick={(e) => { e.preventDefault(); setColumnsDropdownOpen((prev) => !prev); }}
                  >
                    Ustunlar
                  </summary>
                  <div className="absolute right-0 mt-2 w-96 max-h-[75vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-20">
                    <div className="mb-2 pb-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ustunlar tartibi va nomi
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {columnOrder.map((key, idx) => (
                        <div
                          key={key}
                          className={`flex items-center gap-2 py-1 px-1.5 hover:bg-gray-50 rounded transition-colors group ${
                            dragOverIndex === idx ? 'border-b-2 border-blue-500' : ''
                          } ${draggedIndex === idx ? 'opacity-50' : ''}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(idx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedIndex !== null && draggedIndex !== idx) {
                              moveColumn(draggedIndex, idx);
                            }
                            setDraggedIndex(null);
                            setDragOverIndex(null);
                          }}
                        >
                          {/* Drag Handle */}
                          <div
                            draggable
                            onDragStart={(e) => {
                              setDraggedIndex(idx);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
                            title="Ustun tartibini o'zgartirish uchun sudrang"
                          >
                            <Icon icon="lucide:grip-vertical" className="w-4 h-4" />
                          </div>

                          <input 
                            type="checkbox" 
                            checked={visibleColumns[key] ?? false} 
                            onChange={() => setVisibleColumnsAndPersist((prev) => ({ ...prev, [key]: !prev[key] }))} 
                            className="shrink-0 rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-4 h-4 cursor-pointer" 
                          />
                          
                          <input 
                            type="text" 
                            value={columnLabels[key] || ''} 
                            onChange={(e) => setColumnLabels((prev) => ({ ...prev, [key]: e.target.value }))} 
                            className="flex-1 min-w-0 px-2 py-1 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded text-xs font-medium text-gray-800" 
                            placeholder={DEFAULT_COLUMN_LABELS[key as keyof typeof DEFAULT_COLUMN_LABELS] || 'Ustun nomi'} 
                          />

                          {key.startsWith('custom_') && (
                            <button
                              type="button"
                              onClick={() => onRemoveCustomColumn(key)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                              title="Ustunni o'chirish"
                            >
                              <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Yangi ustun qo'shish qismi */}
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">
                        Yangi ustun qo'shish
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newColLabel}
                          onChange={(e) => setNewColLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newColLabel.trim()) {
                                onAddCustomColumn(newColLabel.trim());
                                setNewColLabel('');
                              }
                            }
                          }}
                          placeholder="Ustun nomi (masalan: Izoh)"
                          className="flex-1 px-2 py-1.5 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded text-xs text-gray-800"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (newColLabel.trim()) {
                              onAddCustomColumn(newColLabel.trim());
                              setNewColLabel('');
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1"
                        >
                          <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                          Qo'shish
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
                <button type="button" onClick={addItem} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm no-screenshot">
                  Qator qo'shish
                </button>
              </>
            )}
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
                      {orderedVisibleColumns.map((key) => {
                        switch (key) {
                          case 'index':
                            return <td key={key} className="px-2 py-4 text-center">{index + 1}</td>;
                          case 'tnved':
                            return <td key={key} className="px-2 py-4">{item.tnvedCode || ''}</td>;
                          case 'plu':
                            return <td key={key} className="px-2 py-4">{item.pluCode || ''}</td>;
                          case 'name':
                            return (
                              <td key={key} className="px-2 py-4">
                                <div>{item.name || ''}</div>
                              </td>
                            );
                          case 'unit':
                            return <td key={key} className="px-2 py-4 text-center">{item.unit || ''}</td>;
                          case 'package':
                            return <td key={key} className="px-2 py-4">{item.packageType || ''}</td>;
                          case 'quantity':
                            return <td key={key} className="px-2 py-4 text-right">{item.quantity != null && item.quantity !== 0 ? formatNumber(item.quantity) : ''}</td>;
                          case 'packagesCount':
                            return <td key={key} className="px-2 py-4 text-right">{item.packagesCount != null && item.packagesCount !== 0 ? formatNumber(item.packagesCount) : ''}</td>;
                          case 'gross':
                            return <td key={key} className="px-2 py-4 text-right">{formatNumber(item.grossWeight || 0)}</td>;
                          case 'net':
                            return <td key={key} className="px-2 py-4 text-right">{formatNumber(item.netWeight || 0)}</td>;
                          case 'unitPrice':
                            return <td key={key} className="px-2 py-4 text-right">{formatNumber(item.unitPrice)}</td>;
                          case 'total':
                            return <td key={key} className="px-2 py-4 text-right font-semibold">{item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}</td>;
                          default:
                            if (key.startsWith('custom_')) {
                              return (
                                <td key={key} className="px-2 py-4">
                                  {item.customFields?.[key] || ''}
                                </td>
                              );
                            }
                            return null;
                        }
                      })}
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
              <table ref={tableRef} className="w-full text-sm items-table-compact border-0">
                {renderTableHeader('py-3')}
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      {orderedVisibleColumns.map((key) => {
                        switch (key) {
                          case 'index':
                            return <td key={key} className="px-2 py-2 text-center">{index + 1}</td>;
                          case 'tnved':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="text" value={item.tnvedCode || ''} onChange={(e) => handleItemChange(index, 'tnvedCode', e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${showItemErrors && !item.tnvedCode?.trim() ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="0810700001" data-nav-row={index} data-nav-col={colIndexMap.tnved} onKeyDown={handleCellKeyDown} />
                              </td>
                            );
                          case 'plu':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="text" value={item.pluCode || ''} onChange={(e) => handleItemChange(index, 'pluCode', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" placeholder="4309371" data-nav-row={index} data-nav-col={colIndexMap.plu} onKeyDown={handleCellKeyDown} />
                              </td>
                            );
                          case 'name':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="text" value={item.name} onChange={(e) => handleNameChange(index, e.target.value)} list="invoice-tnved-products" className={`w-full px-2 py-1 border rounded text-xs ${showItemErrors && !item.name?.trim() ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Наименование товара" required data-nav-row={index} data-nav-col={colIndexMap.name} onKeyDown={handleCellKeyDown} />
                              </td>
                            );
                          case 'unit':
                            return (
                              <td key={key} className="px-2 py-2">
                                <select value={item.unit || 'кг'} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center bg-white" required data-nav-row={index} data-nav-col={colIndexMap.unit} onKeyDown={handleCellKeyDown}>
                                  {UNIT_OPTIONS.map((u) => (<option key={u} value={u}>{u}</option>))}
                                </select>
                              </td>
                            );
                          case 'package':
                            return (
                              <td key={key} className="px-2 py-2">
                                <select value={item.packageType || ''} onChange={(e) => handleItemChange(index, 'packageType', e.target.value)} className={`w-full px-2 py-1 border rounded text-xs ${showItemErrors && !item.packageType?.trim() ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`} data-nav-row={index} data-nav-col={colIndexMap.package} onKeyDown={handleCellKeyDown}>
                                  <option value="">— Вид упаковки —</option>
                                  {packagingTypes.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
                                </select>
                              </td>
                            );
                          case 'quantity':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={('_quantityStr' in item && (item as any)._quantityStr !== undefined) ? (item as any)._quantityStr : (item.quantity === 0 || item.quantity == null ? '' : item.quantity)} onChange={(e) => { const v = e.target.value; handleItemChange(index, '_quantityStr' as any, v); handleItemChange(index, 'quantity', v === '' ? 0 : (parseFloat(v.replace(',','.')) || 0)); }} onBlur={() => handleItemChange(index, '_quantityStr' as any, undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" min="0" step="any" required placeholder="0" data-nav-row={index} data-nav-col={colIndexMap.quantity} onKeyDown={handleCellKeyDown} />
                              </td>
                            );
                          case 'packagesCount':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={('_packagesCountStr' in item && (item as any)._packagesCountStr !== undefined) ? (item as any)._packagesCountStr : (item.packagesCount === undefined || item.packagesCount === null ? '' : item.packagesCount)} onChange={(e) => { const raw = e.target.value; handleItemChange(index, '_packagesCountStr' as any, raw); const num = raw === '' ? undefined : parseFloat(String(raw).replace(',', '.')); handleItemChange(index, 'packagesCount', isNaN(num as number) ? undefined : num); }} onBlur={() => handleItemChange(index, '_packagesCountStr' as any, undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" min="0" step="any" placeholder="" data-nav-row={index} data-nav-col={colIndexMap.packagesCount} onKeyDown={handleCellKeyDown} />
                              </td>
                            );
                          case 'gross':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="text" inputMode="decimal" value={getGrossWeightDisplayValue(index, item)} onChange={(e) => handleGrossWeightChange(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyGrossWeightFormula(index); } else { handleCellKeyDown(e); } }} onBlur={() => applyGrossWeightFormula(index)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="7802 yoki *8 (Enter)" title="Raqam yoki *8.5 — Enter bosganda Кол-во упаковки ga ko'paytiriladi, natija butun son" data-nav-row={index} data-nav-col={colIndexMap.gross} />
                              </td>
                            );
                          case 'net':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="text" inputMode="decimal" value={getNetWeightDisplayValue(index, item)} onChange={(e) => handleNetWeightChange(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyNetWeightFormula(index); } else { handleCellKeyDown(e); } }} onBlur={() => applyNetWeightFormula(index)} className={`w-full px-2 py-1 border rounded text-xs text-right ${showItemErrors && !(Number(item.netWeight) > 0) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="7150 yoki *1.2 (Enter)" title="Raqam yoki *1.2 — Enter: Brutto − (1.2 × Кол-во упаковки), natija butun son" data-nav-row={index} data-nav-col={colIndexMap.net} />
                              </td>
                            );
                          case 'unitPrice':
                            return (
                              <td key={key} className="px-2 py-2">
                                <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} value={('_unitPriceStr' in item && (item as any)._unitPriceStr !== undefined) ? (item as any)._unitPriceStr : (item.unitPrice === 0 ? '' : item.unitPrice)} onChange={(e) => { const raw = e.target.value; handleItemChange(index, '_unitPriceStr' as any, raw); const num = parseFloat(String(raw).replace(',', '.')); handleItemChange(index, 'unitPrice', Number.isFinite(num) ? num : 0); }} onBlur={() => handleItemChange(index, '_unitPriceStr' as any, undefined)} className={`w-full px-2 py-1 border rounded text-xs text-right ${showItemErrors && !(Number(item.unitPrice) > 0) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} min="0" step="any" required placeholder="" data-nav-row={index} data-nav-col={colIndexMap.unitPrice} onKeyDown={handleCellKeyDown} />
                              </td>
                            );
                          case 'total':
                            return (
                              <td key={key} className="px-2 py-2">
                                <div className={`text-right font-semibold text-xs px-2 py-1 rounded ${showItemErrors && !(Number(item.totalPrice) > 0) ? 'border border-red-500 bg-red-50' : ''}`}>{item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice)}</div>
                              </td>
                            );
                          case 'actions':
                            return (
                              <td key={key} className="px-2 py-2 text-center no-screenshot">
                                {items.length > 1 && (
                                  <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800 text-sm">✕</button>
                                )}
                              </td>
                            );
                          default:
                            if (key.startsWith('custom_')) {
                              return (
                                <td key={key} className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={item.customFields?.[key] || ''}
                                    onChange={(e) => handleCustomFieldChange(index, key, e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder=""
                                    data-nav-row={index}
                                    data-nav-col={colIndexMap[key]}
                                    onKeyDown={handleCellKeyDown}
                                  />
                                </td>
                              );
                            }
                            return null;
                        }
                      })}
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
            vehicleWeight={form.vehicleWeight}
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
