import React, { type RefObject, useMemo, useState } from 'react';
import type { InvoiceItem, ViewTab, VisibleColumns, ColumnLabels, ColumnLabelKey, InvoiceFormData } from './types';
import { UNIT_OPTIONS, DEFAULT_COLUMN_LABELS } from './types';
import { formatNumber, formatNumberFixed, formatUnitPrice, numberToWordsRu, getCurrencySymbol } from './invoiceUtils';
import { InvoiceWeightSummary } from './InvoiceWeightSummary';
import { ExportPriceCalculator } from './ExportPriceCalculator';
import { InvoiceItemRow } from './InvoiceItemRow';
import { useTableKeyboardNav } from './hooks/useTableKeyboardNav';
import { Icon } from '@iconify/react';
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
  handlePackagesCountChange: (index: number, value: string) => void;
  applyPackagesCountFormula: (index: number) => void;
  getPackagesCountDisplayValue: (index: number, item: InvoiceItem) => string;
  packagingTypes: { id: string; name: string; code?: string }[];
  applyMassNetWeightFormula: (packageType: string, tareWeight: number) => void;
  form: InvoiceFormData;
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>;
  showItemErrors?: boolean;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = React.memo(({
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
  handlePackagesCountChange,
  applyPackagesCountFormula,
  getPackagesCountDisplayValue,
  packagingTypes,
  applyMassNetWeightFormula,
  form,
  setForm,
  showItemErrors,
}) => {
  const isReadonly = isPdfMode || viewTab === 'spec' || viewTab === 'packing';
  const { tableRef, handleCellKeyDown } = useTableKeyboardNav();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newColLabel, setNewColLabel] = useState('');

  const [massPackageType, setMassPackageType] = useState('');
  const [massTareWeight, setMassTareWeight] = useState('');
  
  const tareRules: Array<{packageType: string, tareWeight: number}> = Array.isArray(form.additionalInfo?.tareRules) ? form.additionalInfo.tareRules : [];

  const handleApplyMassTare = () => {
    if (!massPackageType) {
      toast.error("Qadoq turini tanlang");
      return;
    }
    const tare = parseFloat(massTareWeight.replace(',', '.'));
    if (isNaN(tare) || tare < 0) {
      toast.error("Yaroqli vazn kiriting");
      return;
    }
    
    const newRules = [...tareRules];
    const existingIdx = newRules.findIndex(r => r.packageType === massPackageType);
    if (existingIdx >= 0) {
      newRules[existingIdx].tareWeight = tare;
    } else {
      newRules.push({ packageType: massPackageType, tareWeight: tare });
    }
    
    setForm(prev => ({
      ...prev,
      additionalInfo: { ...prev.additionalInfo, tareRules: newRules }
    }));

    applyMassNetWeightFormula(massPackageType, tare);
    setMassPackageType('');
    setMassTareWeight('');
    toast.success(`${massPackageType} uchun umumiy qoida qo'shildi`);
  };

  const handleRemoveTareRule = (index: number) => {
    const newRules = [...tareRules];
    newRules.splice(index, 1);
    setForm(prev => ({
      ...prev,
      additionalInfo: { ...prev.additionalInfo, tareRules: newRules }
    }));
  };

  const handleTakeScreenshot = async () => {
    const element = document.getElementById('invoice-screenshot-area');
    if (!element) {
      toast.error("Skrinshot olinadigan hudud topilmadi");
      return;
    }
    
    try {
      const toastId = toast.loading("Nusxa olinmoqda...");
      // html2canvas-pro: Tailwind v4 oklch()/color-mix() ranglarini qo'llab-quvvatlaydi
      const { default: html2canvas } = await import('html2canvas-pro');
      
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
    const cols = columnOrder.filter((key) => {
      if (key === 'actions' && isReadonly) return false;
      return effectiveColumns[key as keyof VisibleColumns];
    });
    const hasSht = items.some(i => i.unit === 'шт' || i.unit === 'шт.');
    if (hasSht && !cols.includes('shtCount')) {
      const qIdx = cols.indexOf('quantity');
      if (qIdx !== -1) {
        cols.splice(qIdx + 1, 0, 'shtCount');
      } else {
        cols.push('shtCount');
      }
    }
    return cols;
  }, [columnOrder, effectiveColumns, isReadonly, items]);

  // Build a column-index map based on which columns are currently visible
  // so arrow-left / arrow-right skip hidden columns.
  const colIndexMap = useMemo(() => {
    const map: Partial<Record<keyof VisibleColumns | 'shtCount', number>> = {};
    let idx = 0;
    for (const key of orderedVisibleColumns) {
      if (key === 'actions' || key === 'index' || key === 'total') continue;
      map[key as keyof VisibleColumns | 'shtCount'] = idx++;
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedVisibleColumns]);

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
            case 'shtCount':
              return (
                <th key={key} className={`px-2 ${py} text-right text-xs font-semibold`} style={{ verticalAlign: 'top' }}>
                  шт
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
                      const t = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                      return t !== 0 ? formatNumber(t) : '';
                    })()}
                  </td>
                );
              case 'shtCount':
                return (
                  <td key={key} className="px-2 py-1 text-right" style={{ verticalAlign: 'top' }}>
                    {(() => {
                      const t = items.reduce((sum, i) => sum + (Number(i.customFields?.shtCount) || 0), 0);
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
    <div className="mb-8 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 sm:gap-0">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {tareRules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-blue-50/80 dark:bg-blue-900/30 px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm text-sm w-max">
              <span className="font-semibold text-blue-800 dark:text-blue-300">{rule.packageType}:</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">{rule.tareWeight} kg</span>
              <button
                type="button"
                onClick={() => handleRemoveTareRule(idx)}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-0.5 rounded transition-colors ml-1"
                title="O'chirish"
              >
                <Icon icon="lucide:x" className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 bg-blue-50/50 dark:bg-blue-900/20 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm no-screenshot w-full sm:w-auto">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 ml-1 whitespace-nowrap hidden md:inline">Ommaviy Tara:</span>
            <select
              className="px-2 py-1.5 border border-blue-200 dark:border-blue-700 rounded text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 min-w-[120px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={massPackageType}
              onChange={(e) => setMassPackageType(e.target.value)}
            >
              <option value="">Qadoq turi...</option>
              {packagingTypes.map((pt) => (
                <option key={pt.id} value={pt.name}>{pt.name}</option>
              ))}
            </select>
            <div className="relative">
              <input
                type="text"
                className="px-2 py-1.5 border border-blue-200 dark:border-blue-700 rounded text-sm w-20 text-center bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.5"
                value={massTareWeight}
                onChange={(e) => setMassTareWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyMassTare();
                  }
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">kg</span>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 bg-blue-600 dark:bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm active:bg-blue-800 dark:active:bg-blue-700"
              onClick={handleApplyMassTare}
            >
              Qo'llash
            </button>
          </div>
        </div>
        {viewTab === 'invoice' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
                    <InvoiceItemRow
                      key={index}
                      item={item}
                      index={index}
                      isReadonly={true}
                      orderedVisibleColumns={orderedVisibleColumns}
                      colIndexMap={colIndexMap as Record<string, number>}
                      showItemErrors={showItemErrors}
                      handleItemChange={handleItemChange as any}
                      handleNameChange={handleNameChange}
                      handlePackagesCountChange={handlePackagesCountChange}
                      applyPackagesCountFormula={applyPackagesCountFormula}
                      getPackagesCountDisplayValue={getPackagesCountDisplayValue}
                      handleGrossWeightChange={handleGrossWeightChange}
                      applyGrossWeightFormula={applyGrossWeightFormula}
                      getGrossWeightDisplayValue={getGrossWeightDisplayValue}
                      handleNetWeightChange={handleNetWeightChange}
                      applyNetWeightFormula={applyNetWeightFormula}
                      getNetWeightDisplayValue={getNetWeightDisplayValue}
                      handleCustomFieldChange={handleCustomFieldChange}
                      removeItem={removeItem}
                      handleCellKeyDown={handleCellKeyDown}
                      showRemoveButton={items.length > 1}
                      packagingTypes={packagingTypes}
                    />
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
                    <InvoiceItemRow
                      key={index}
                      item={item}
                      index={index}
                      isReadonly={false}
                      orderedVisibleColumns={orderedVisibleColumns}
                      colIndexMap={colIndexMap as Record<string, number>}
                      showItemErrors={showItemErrors}
                      handleItemChange={handleItemChange as any}
                      handleNameChange={handleNameChange}
                      handlePackagesCountChange={handlePackagesCountChange}
                      applyPackagesCountFormula={applyPackagesCountFormula}
                      getPackagesCountDisplayValue={getPackagesCountDisplayValue}
                      handleGrossWeightChange={handleGrossWeightChange}
                      applyGrossWeightFormula={applyGrossWeightFormula}
                      getGrossWeightDisplayValue={getGrossWeightDisplayValue}
                      handleNetWeightChange={handleNetWeightChange}
                      applyNetWeightFormula={applyNetWeightFormula}
                      getNetWeightDisplayValue={getNetWeightDisplayValue}
                      handleCustomFieldChange={handleCustomFieldChange}
                      removeItem={removeItem}
                      handleCellKeyDown={handleCellKeyDown}
                      showRemoveButton={items.length > 1}
                      packagingTypes={packagingTypes}
                    />
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
});
