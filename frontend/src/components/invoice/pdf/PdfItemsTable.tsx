import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { formatNumber, formatNumberFixed, formatUnitPrice, numberToWordsRu, getCurrencySymbol } from '../invoiceUtils';

interface PdfItemsTableProps {
  items: any[];
  orderedVisibleColumns: string[];
  columnLabels: Record<string, string>;
  totalColumnLabel: string;
  invoiceCurrency: string;
  showSumWords: boolean;
  scale?: number;
}

const getCellText = (key: string, item: any): string => {
  switch (key) {
    case 'index': return '';
    case 'tnved': return item.tnvedCode || '';
    case 'plu': return item.pluCode || '';
    case 'name': return item.name || '';
    case 'unit': return item.unit || '';
    case 'package': return item.packageType || '';
    case 'quantity': return item.quantity === '-' ? '-' : (item.quantity != null && item.quantity !== 0 && item.quantity !== '' ? formatNumber(Number(item.quantity)) : '');
    case 'packagesCount': return item.packagesCount != null && item.packagesCount !== 0 ? formatNumber(item.packagesCount) : '';
    case 'gross': return formatNumber(item.grossWeight || 0);
    case 'net': return formatNumber(item.netWeight || 0);
    case 'unitPrice': return formatUnitPrice(item.unitPrice);
    case 'total': return item.totalPrice === 0 ? '' : formatNumberFixed(item.totalPrice);
    default:
      if (key.startsWith('custom_')) return item.customFields?.[key] || '';
      return '';
  }
};

// Kirill harflari lotin harflariga qaraganda ~1.3x kengroq — shu farqni hisobga olamiz
const effectiveLen = (text: string): number => {
  let w = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    w += code >= 0x0400 && code <= 0x04FF ? 1.3 : 1;
  }
  return Math.ceil(w);
};

const calcColumnFlex = (
  key: string,
  items: any[],
  columnLabels: Record<string, string>,
  totalColumnLabel: string
): number => {
  const headerLabel = key === 'total' ? totalColumnLabel : (columnLabels[key] || key);

  const getCellLen = (item: any): number => {
    if (key === 'index') return String(items.length).length + 1;
    if (key === 'name') return effectiveLen(item.name || '');
    if (key === 'package') return Math.min(effectiveLen(item.packageType || ''), 14);
    if (key.startsWith('custom_')) return Math.min(effectiveLen(item.customFields?.[key] || ''), 16);
    return effectiveLen(getCellText(key, item));
  };

  let flex = Math.max(
    effectiveLen(headerLabel),
    items.length > 0 ? Math.max(...items.map(getCellLen)) : 0,
    3
  );

  // tnved va name ustunlari yopishib qolmasligi uchun tnved ustuniga qo'shimcha kenglik (flex) beramiz
  if (key === 'tnved') {
    flex += 6;
  } else if (key === 'plu') {
    flex += 2;
  }

  return flex;
};

// A4 sahifa kengligi (595pt) - gorizontal padding (30*2) = 535pt
const PAGE_AVAILABLE_WIDTH = 535;
// Har bir katakchada gorizontal padding: paddingHorizontal:4 * 2 tomon = 8pt
const CELL_H_PADDING = 8;
// Roboto da kirill harf kengligi ≈ fontSize * 0.62
const CHAR_WIDTH_RATIO = 0.62;

const calcTableFontSize = (flexValues: number[], numColumns: number): 9 | 8 | 7 => {
  const totalFlex = flexValues.reduce((s, f) => s + f, 0);
  const usableWidth = PAGE_AVAILABLE_WIDTH - numColumns * CELL_H_PADDING;
  // Har bir flex birligiga to'g'ri keladigan kenlik
  const pixPerUnit = usableWidth / totalFlex;

  if (pixPerUnit >= 9 * CHAR_WIDTH_RATIO) return 9;
  if (pixPerUnit >= 8 * CHAR_WIDTH_RATIO) return 8;
  return 7;
};

const RIGHT_COLS = new Set(['quantity', 'packagesCount', 'gross', 'net', 'unitPrice', 'total']);
const CENTER_COLS = new Set(['index', 'unit']);

// View uchun layout stili (Yoga: flexDirection=column, alignItems=cross-axis)
const getColViewAlign = (key: string) => {
  if (RIGHT_COLS.has(key))  return { alignItems: 'flex-end' as const };
  if (CENTER_COLS.has(key)) return { alignItems: 'center' as const };
  return { alignItems: 'flex-start' as const };
};

// Text uchun (header label va packing list kabi ko'p qatorli matn uchun)
const getColTextAlign = (key: string) => {
  if (RIGHT_COLS.has(key))  return styles.textRight;
  if (CENTER_COLS.has(key)) return styles.textCenter;
  return styles.textLeft;
};

export const PdfItemsTable: React.FC<PdfItemsTableProps> = ({
  items,
  orderedVisibleColumns,
  columnLabels,
  totalColumnLabel,
  invoiceCurrency,
  showSumWords,
  scale = 1,
}) => {
  const sc = (v: number) => Math.round(v * scale);
  const SUM_COLUMNS = ['quantity', 'packagesCount', 'gross', 'net', 'total'];
  const firstSumColIdx = orderedVisibleColumns.findIndex(key => SUM_COLUMNS.includes(key));

  const flexMap: Record<string, number> = {};
  orderedVisibleColumns.forEach(key => {
    flexMap[key] = calcColumnFlex(key, items, columnLabels, totalColumnLabel);
  });

  const baseFontSize = calcTableFontSize(
    orderedVisibleColumns.map(k => flexMap[k]),
    orderedVisibleColumns.length
  );
  const fontSize = Math.max(6, Math.round(baseFontSize * scale));
  const cellPadV = Math.max(1, sc(4) - (scale < 1 ? 1 : 0));

  // Ustun uchun gorizontal joylashuv
  const jc = (key: string): 'flex-end' | 'center' | 'flex-start' =>
    RIGHT_COLS.has(key) ? 'flex-end' : CENTER_COLS.has(key) ? 'center' : 'flex-start';

  // Sof inline stil — StyleSheet aralashmaydi
  const hCell = (key: string) => ({
    flex: flexMap[key],
    paddingHorizontal: 4,
    paddingVertical: cellPadV,
    fontSize,
    fontWeight: 'bold' as const,
    flexDirection: 'row' as const,
    justifyContent: jc(key),
  });
  const bCell = (key: string) => ({
    flex: flexMap[key],
    paddingHorizontal: 4,
    paddingVertical: cellPadV,
    fontSize,
    flexDirection: 'row' as const,
    justifyContent: jc(key),
  });
  const fCell = (flex: number, justify: 'flex-end' | 'center' | 'flex-start' = 'flex-end') => ({
    flex,
    paddingHorizontal: 4,
    paddingVertical: cellPadV,
    fontSize,
    fontWeight: 'bold' as const,
    flexDirection: 'row' as const,
    justifyContent: justify,
  });

  return (
    <View>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeaderRow}>
          {orderedVisibleColumns.map((key) => (
            <View key={key} style={hCell(key)}>
              <Text>{key === 'total' ? totalColumnLabel : columnLabels[key]}</Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            {orderedVisibleColumns.map((key) => (
              <View key={key} style={bCell(key)}>
                <Text>{key === 'index' ? String(index + 1) : getCellText(key, item)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.tableFooterRow}>
          {orderedVisibleColumns.map((key, idx) => {
            if (firstSumColIdx !== -1 && idx < firstSumColIdx) {
              if (idx === 0) {
                const vsegoFlex = orderedVisibleColumns
                  .slice(0, firstSumColIdx)
                  .reduce((sum, k) => sum + flexMap[k], 0);
                return (
                  <View key="vsego" style={fCell(vsegoFlex, 'flex-end')}>
                    <Text>Всего:</Text>
                  </View>
                );
              }
              return null;
            }

            if (firstSumColIdx === -1) {
              if (idx === 0) {
                return (
                  <View key="vsego-only" style={fCell(1, 'flex-end')}>
                    <Text>Всего:</Text>
                  </View>
                );
              }
              return null;
            }

            let content = '';
            switch (key) {
              case 'quantity': {
                const t = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
                content = t !== 0 ? formatNumber(t) : '';
                break;
              }
              case 'packagesCount':
                content = formatNumber(items.reduce((s, i) => s + (i.packagesCount ?? 0), 0));
                break;
              case 'gross':
                content = formatNumber(items.reduce((s, i) => s + (i.grossWeight || 0), 0));
                break;
              case 'net':
                content = formatNumber(items.reduce((s, i) => s + (i.netWeight || 0), 0));
                break;
              case 'total':
                content = `${getCurrencySymbol(invoiceCurrency)} ${formatNumberFixed(items.reduce((s, i) => s + i.totalPrice, 0))}`;
                break;
            }

            return (
              <View key={key} style={fCell(flexMap[key], jc(key))}>
                <Text>{content}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {showSumWords && (
        <View style={{ fontSize: sc(7), marginTop: 0, marginBottom: sc(4), paddingLeft: sc(20) }}>
          <Text>Сумма прописью: {numberToWordsRu(items.reduce((s, i) => s + i.totalPrice, 0), invoiceCurrency)}</Text>
        </View>
      )}
    </View>
  );
};
