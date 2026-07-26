import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { formatNumber, formatNumberFixed, formatUnitPrice, numberToWordsRu, getCurrencySymbol, sumItemTotals } from '../invoiceUtils';

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
    case 'shtCount': return item.customFields?.shtCount != null ? formatNumber(Number(item.customFields.shtCount)) : '';
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
  const headerLabel = key === 'total' ? totalColumnLabel : (key === 'shtCount' ? 'шт' : (columnLabels[key] || key));

  const getCellLen = (item: any): number => {
    if (key === 'index') return String(items.length).length + 1;
    if (key === 'name') return effectiveLen(item.name || '');
    if (key === 'package') return Math.min(effectiveLen(item.packageType || ''), 14);
    if (key.startsWith('custom_') || key === 'shtCount') return Math.min(effectiveLen(getCellText(key, item) || ''), 16);
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

// Jadval matnining bazaviy o'lchami — hujjatning umumiy `scale` iga qarab
// kattalashadi/kichrayadi, lekin ustun kengligidan oshmaydi (`fitTableFontSize`).
const BASE_TABLE_FONT = 9;
// Kenglik yetarli bo'lsa jadval matni shu o'lchamgacha o'sishi mumkin
const MAX_TABLE_FONT = 12;
// Ustunlar juda tor bo'lsa ham matn shundan kichraymaydi (uzun so'z ustun
// paddingiga chiqib ketishi mumkin — bu ilgaridan shunday)
const MIN_TABLE_FONT = 7;
// Umumiy `scale` juda kichik bo'lganda (kontent 1-betga sig'masa) mutlaq quyi chegara
const ABSOLUTE_MIN_TABLE_FONT = 6;

/**
 * Roboto'da o'lchangan o'rtacha belgi kengligi (em, 1pt shrift uchun).
 * Manba: `public/fonts/Roboto-Regular.ttf` metrikasi (fontkit).
 * Qalin (Bold) variant ~2% kengroq — qiymatlar yuqoriga qarab yaxlitlangan.
 */
const emOfChar = (code: number): number => {
  if (code >= 0x30 && code <= 0x39) return 0.58;   // 0-9
  if (code >= 0x0410 && code <= 0x042F) return 0.72; // А-Я
  if (code >= 0x0430 && code <= 0x044F) return 0.61; // а-я
  if (code === 0x0401 || code === 0x0451) return 0.72; // Ё/ё
  if (code >= 0x41 && code <= 0x5A) return 0.65;   // A-Z
  if (code >= 0x61 && code <= 0x7A) return 0.51;   // a-z
  return 0.31;                                     // tinish belgilari, bo'shliq
};

const emWidth = (text: string): number => {
  let w = 0;
  for (const ch of text) w += emOfChar(ch.codePointAt(0) || 0);
  return w;
};

/** Matndagi eng uzun BO'LINMAYDIGAN so'z kengligi (em) */
const widestWordEm = (text: string): number => {
  let max = 0;
  for (const word of String(text || '').split(/\s+/)) {
    if (word) max = Math.max(max, emWidth(word));
  }
  return max;
};

/**
 * Ustun kengliklariga sig'adigan eng katta shrift.
 *
 * Katak matni bir necha qatorga bo'linishi normal holat — masalan
 * "Кол-во упаковки" sarlavhasi ikki qatorda chiqadi. Shuning uchun chegara
 * butun matn emas, eng uzun BO'LINMAYDIGAN so'z ustunga sig'ishi bilan
 * belgilanadi. (Ilgari butun matn bir qatorga sig'ishi talab qilinardi va
 * belgi kengligi ham ~45% oshirib olinardi — natijada 11 ustunli oddiy
 * invoysda jadval doim eng kichik 7pt da qolib ketardi.)
 */
const fitTableFontSize = (
  columns: string[],
  flexMap: Record<string, number>,
  longestWordEm: Record<string, number>
): number => {
  const totalFlex = columns.reduce((s, key) => s + flexMap[key], 0);
  let cap = MAX_TABLE_FONT;

  for (const key of columns) {
    const wordEm = longestWordEm[key];
    if (wordEm <= 0) continue;
    // Katak paddingi (2×4pt) zaxira sifatida qoldiriladi: juda uzun so'z unga
    // chiqib ketsa ham qo'shni ustun matniga tegmaydi
    const colWidth = (PAGE_AVAILABLE_WIDTH * flexMap[key]) / totalFlex;
    cap = Math.min(cap, colWidth / wordEm);
  }

  return Math.max(MIN_TABLE_FONT, Math.min(MAX_TABLE_FONT, Math.floor(cap)));
};

const RIGHT_COLS = new Set(['quantity', 'shtCount', 'packagesCount', 'gross', 'net', 'unitPrice', 'total']);
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
  const SUM_COLUMNS = ['quantity', 'shtCount', 'packagesCount', 'gross', 'net', 'total'];
  const firstSumColIdx = orderedVisibleColumns.findIndex(key => SUM_COLUMNS.includes(key));

  const uniqueUnits = Array.from(new Set(items.map(i => i.unit).filter(Boolean)));
  let unitPriceLabel = columnLabels.unitPrice || 'Цена за ед.изм.';
  if (uniqueUnits.length === 1) {
    const u = uniqueUnits[0];
    if (u === 'кор.' || u === 'кор') unitPriceLabel = 'Цена за коробку';
    else if (u === 'упак.' || u === 'упак') unitPriceLabel = 'Цена за упаковку';
    else if (u === 'шт.' || u === 'шт') unitPriceLabel = 'Цена за шт.';
    else unitPriceLabel = `Цена за ${u}`;
  }
  const effectiveColumnLabels: Record<string, string> = { ...columnLabels, unitPrice: unitPriceLabel };

  const flexMap: Record<string, number> = {};
  orderedVisibleColumns.forEach(key => {
    flexMap[key] = calcColumnFlex(key, items, effectiveColumnLabels, totalColumnLabel);
  });

  // Har bir ustundagi eng uzun bo'linmaydigan so'z (sarlavha + kataklar bo'yicha)
  const longestWordEm: Record<string, number> = {};
  orderedVisibleColumns.forEach(key => {
    const headerLabel = key === 'total' ? totalColumnLabel : (key === 'shtCount' ? 'шт' : effectiveColumnLabels[key]);
    let max = widestWordEm(headerLabel);
    items.forEach(item => { max = Math.max(max, widestWordEm(getCellText(key, item))); });
    longestWordEm[key] = max;
  });

  // Jadval matni umumiy `scale` bilan birga o'zgaradi, lekin ustun kengligidan
  // oshmaydi
  const widthCap = fitTableFontSize(orderedVisibleColumns, flexMap, longestWordEm);
  const fontSize = Math.max(
    ABSOLUTE_MIN_TABLE_FONT,
    Math.min(widthCap, Math.round(BASE_TABLE_FONT * scale))
  );
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
              <Text>{key === 'total' ? totalColumnLabel : (key === 'shtCount' ? 'шт' : effectiveColumnLabels[key])}</Text>
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
              const isLastBeforeSum = idx === firstSumColIdx - 1;
              return (
                <View key={key} style={fCell(flexMap[key], isLastBeforeSum ? 'flex-end' : 'center')}>
                  <Text>{isLastBeforeSum ? 'Всего:' : ''}</Text>
                </View>
              );
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
              case 'shtCount': {
                const sum = items.reduce((s, i) => s + (Number(i.customFields?.shtCount) || 0), 0);
                content = sum !== 0 ? formatNumber(sum) : '';
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
                content = `${getCurrencySymbol(invoiceCurrency)} ${formatNumberFixed(sumItemTotals(items))}`;
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
          <Text>Сумма прописью: {numberToWordsRu(sumItemTotals(items), invoiceCurrency)}</Text>
        </View>
      )}
    </View>
  );
};
