import React from 'react';
import { formatNumber, formatNumberFixed, formatUnitPrice } from './invoiceUtils';

const UNIT_OPTIONS = ['кг', 'шт.', 'л', 'пог.м', 'м2', 'м3', 'компл', 'пар'];

interface InvoiceItemRowProps {
  item: any;
  packagingTypes: { id: string; name: string; code?: string }[];
  index: number;
  isReadonly: boolean;
  orderedVisibleColumns: string[];
  colIndexMap: Record<string, number>;
  showItemErrors?: boolean;
  handleItemChange: (index: number, key: string, value: any) => void;
  handleNameChange: (index: number, name: string) => void;
  handlePackagesCountChange: (index: number, val: string) => void;
  applyPackagesCountFormula: (index: number) => void;
  getPackagesCountDisplayValue: (index: number, item: any) => string;
  handleGrossWeightChange: (index: number, val: string) => void;
  applyGrossWeightFormula: (index: number) => void;
  getGrossWeightDisplayValue: (index: number, item: any) => string;
  handleNetWeightChange: (index: number, val: string) => void;
  applyNetWeightFormula: (index: number) => void;
  getNetWeightDisplayValue: (index: number, item: any) => string;
  handleCustomFieldChange: (index: number, key: string, value: string) => void;
  removeItem: (index: number) => void;
  handleCellKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  showRemoveButton: boolean;
}

export const InvoiceItemRow: React.FC<InvoiceItemRowProps> = React.memo(({
  item,
  index,
  isReadonly,
  orderedVisibleColumns,
  colIndexMap,
  showItemErrors,
  handleItemChange,
  handleNameChange,
  handlePackagesCountChange,
  applyPackagesCountFormula,
  getPackagesCountDisplayValue,
  handleGrossWeightChange,
  applyGrossWeightFormula,
  getGrossWeightDisplayValue,
  handleNetWeightChange,
  applyNetWeightFormula,
  getNetWeightDisplayValue,
  handleCustomFieldChange,
  removeItem,
  handleCellKeyDown,
  showRemoveButton,
  packagingTypes,
}) => {
  if (isReadonly) {
    return (
      <tr className="border-b border-gray-200">
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
              return <td key={key} className="px-2 py-4 text-right">{item.quantity === '-' ? '-' : (item.quantity != null && item.quantity !== 0 && item.quantity !== '' ? formatNumber(Number(item.quantity)) : '')}</td>;
            case 'shtCount':
              return <td key={key} className="px-2 py-4 text-right">{item.customFields?.shtCount ? formatNumber(Number(item.customFields.shtCount)) : ''}</td>;
            case 'packagesCount':
              return <td key={key} className="px-2 py-4 text-right">{item.packagesCount != null && item.packagesCount !== 0 ? formatNumber(item.packagesCount) : ''}</td>;
            case 'gross':
              return <td key={key} className="px-2 py-4 text-right">{formatNumber(item.grossWeight || 0)}</td>;
            case 'net':
              return <td key={key} className="px-2 py-4 text-right">{formatNumber(item.netWeight || 0)}</td>;
            case 'unitPrice':
              return <td key={key} className="px-2 py-4 text-right">{formatUnitPrice(item.unitPrice)}</td>;
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
    );
  }

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
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
                <input type="text" inputMode="decimal" value={('_quantityStr' in item && (item as any)._quantityStr !== undefined) ? (item as any)._quantityStr : (item.quantity === 0 || item.quantity == null ? '' : item.quantity)} onChange={(e) => { const v = e.target.value; handleItemChange(index, '_quantityStr' as any, v); if (v === '' || v === '-') { handleItemChange(index, 'quantity', v); } else { const parsed = parseFloat(v.replace(',','.')); handleItemChange(index, 'quantity', isNaN(parsed) ? v : parsed); } }} onBlur={() => handleItemChange(index, '_quantityStr' as any, undefined)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="-" data-nav-row={index} data-nav-col={colIndexMap.quantity} onKeyDown={handleCellKeyDown} />
              </td>
            );
          case 'shtCount':
            return (
              <td key={key} className="px-2 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.customFields?.shtCount ?? ''}
                  onChange={(e) => {
                     const v = e.target.value.replace(',', '.');
                     if (v === '' || /^\d*\.?\d*$/.test(v)) {
                       handleCustomFieldChange(index, 'shtCount', v);
                     }
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right bg-blue-50 focus:bg-white"
                  placeholder="0"
                  disabled={item.unit !== 'шт' && item.unit !== 'шт.'}
                  data-nav-row={index}
                  data-nav-col={colIndexMap.shtCount}
                  onKeyDown={handleCellKeyDown}
                />
              </td>
            );
          case 'packagesCount':
            return (
              <td key={key} className="px-2 py-2">
                <input type="text" inputMode="decimal" value={getPackagesCountDisplayValue(index, item)} onChange={(e) => handlePackagesCountChange(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPackagesCountFormula(index); } else { handleCellKeyDown(e); } }} onBlur={() => applyPackagesCountFormula(index)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="" title="/100 — Enter: Brutto / 100 natijasini yozadi" data-nav-row={index} data-nav-col={colIndexMap.packagesCount} />
              </td>
            );
          case 'gross':
            return (
              <td key={key} className="px-2 py-2">
                <input type="text" inputMode="decimal" value={getGrossWeightDisplayValue(index, item)} onChange={(e) => handleGrossWeightChange(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyGrossWeightFormula(index); } else { handleCellKeyDown(e); } }} onBlur={() => applyGrossWeightFormula(index)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right" placeholder="7802 yoki *8 (Enter)" title="Raqam, *8.5 yoki =22500 — *8.5: Кол-во×8.5 (yaxlit); =22500: 22500 dan boshqa qatorlar bruttosi ayiriladi (saqlanadi)" data-nav-row={index} data-nav-col={colIndexMap.gross} />
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
                {showRemoveButton && (
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
  );
});
