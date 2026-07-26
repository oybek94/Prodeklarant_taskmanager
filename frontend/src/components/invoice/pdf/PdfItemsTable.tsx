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

// A4 sahifa kengligi (pt)
const A4_WIDTH = 595.28;
// PdfStyles.page.paddingHorizontal — `scale` bilan birga o'zgaradi
const PAGE_H_PADDING = 30;
// styles.table borderWidth: 1 (chap + o'ng)
const TABLE_BORDER = 1;
// Har bir katakchada gorizontal padding: paddingHorizontal:4 × 2 tomon = 8pt.
// Ustun kengligi taqsimlanganda bu joy ZAXIRA qilib qo'yiladi — shu sababli
// qo'shni ustunlar matni yopishib qolmaydi.
const CELL_H_PADDING = 8;

/**
 * Jadval uchun haqiqiy mavjud kenglik. Sahifaning gorizontal paddingi `scale`
 * bilan o'zgaradi (masalan scale=1.4 da 30 → 42), shuning uchun bu qiymatni
 * qat'iy 535pt deb olish mumkin emas — aks holda katta masshtabda ustunlar
 * hisoblanganidan tor bo'lib matn yopishib qoladi.
 */
const tableWidth = (scale: number): number =>
  A4_WIDTH - 2 * Math.round(PAGE_H_PADDING * scale) - 2 * TABLE_BORDER;

// Jadval matnining bazaviy o'lchami — hujjatning umumiy `scale` iga qarab
// kattalashadi/kichrayadi, lekin ustunlarga sig'ishi shart (`fitTable`).
const BASE_TABLE_FONT = 9;
/**
 * Jadval matnining QAT'IY yuqori chegarasi.
 *
 * DIQQAT: bu qiymat 12 → 11 → 10 qilib tushirilganda PDF'da HECH NARSA
 * o'zgarmagan edi. Sabab — real invoyslarda chegara umuman ishlamaydi:
 * standart 13 ustunli jadvalda `fitTable` kenglik bo'yicha o'lchamni baribir
 * 8pt (yuqori masshtabda 7pt) gacha tushiradi, ya'ni `preferred` 10 bo'lsa ham
 * natija 8 chiqadi. Chegara faqat 8pt dan PAST bo'lgandagina haqiqiy ta'sir
 * qiladi — shuning uchun 7pt.
 *
 * Ya'ni jadval matni endi hujjat masshtabi bilan kattalashmaydi: 7pt — eng
 * kattasi, `fitTable` esa kerak bo'lsa yanada kichraytiradi.
 */
const MAX_TABLE_FONT = 7;
// Quyi chegara: ustunlar juda ko'p bo'lsa ham matn bundan kichraymaydi
const ABSOLUTE_MIN_TABLE_FONT = 6;

/**
 * Roboto'da belgi kengligi (em — 1pt shrift uchun). Qiymatlar
 * `public/fonts/Roboto-{Regular,Bold}.ttf` metrikasidan (fontkit) olingan;
 * jadval sarlavhasi qalin bo'lgani uchun ikkisining KATTASI ishlatiladi.
 *
 * Alohida belgilar muhim: masalan `№` — 1.02em, ya'ni oddiy tinish belgisidan
 * 3 baravar keng. Ilgari hammasi 0.31em deb olinganda "№" ustuni kerakligidan
 * tor chiqib, matn qo'shni ustunga yopishardi.
 */
const WIDE_CHARS: Record<string, number> = {
  '№': 1.03, '%': 0.74, '&': 0.66, '#': 0.62, '–': 0.66, '—': 1.0,
  '+': 0.57, '=': 0.57, '$': 0.58, '€': 0.58, '?': 0.50, '*': 0.46,
  '/': 0.42, '\\': 0.42, '«': 0.50, '»': 0.50, '°': 0.39, '-': 0.39,
  '(': 0.36, ')': 0.36, '[': 0.29, ']': 0.29,
};
/** Ma'lum bo'lmagan belgi uchun xavfsiz (kengaytirilgan) qiymat */
const EM_UNKNOWN = 0.62;
/** Tinish belgilari va bo'shliq */
const EM_PUNCT = 0.30;
const NARROW_CHARS = new Set([' ', '.', ',', ':', ';', '!', '|', "'", '"']);

const emOfChar = (ch: string): number => {
  const wide = WIDE_CHARS[ch];
  if (wide !== undefined) return wide;
  if (NARROW_CHARS.has(ch)) return EM_PUNCT;

  const code = ch.codePointAt(0) || 0;
  if (code >= 0x30 && code <= 0x39) return 0.58;      // 0-9
  if (code >= 0x0410 && code <= 0x042F) return 0.72;  // А-Я
  if (code >= 0x0430 && code <= 0x044F) return 0.61;  // а-я
  if (code === 0x0401 || code === 0x0451) return 0.72; // Ё/ё
  if (code >= 0x41 && code <= 0x5A) return 0.65;      // A-Z
  if (code >= 0x61 && code <= 0x7A) return 0.51;      // a-z
  return EM_UNKNOWN;
};

/**
 * Kenglik hisobi taxminiy (har bir belgi uchun o'rtacha qiymat), shuning uchun
 * ustunga kichik zaxira qo'shiladi — model 2-3% xato qilsa ham matn yopishmaydi.
 */
const WIDTH_SAFETY = 1.04;

const emWidth = (text: string): number => {
  let w = 0;
  for (const ch of text) w += emOfChar(ch);
  return w * WIDTH_SAFETY;
};

/**
 * Qator YANGI SATRGA bo'linishi mumkin bo'lgan joylar: oddiy bo'shliq, tab,
 * yangi satr. `U+00A0` (uzilmas bo'shliq) va `U+202F` ATAYLAB kiritilmagan —
 * `formatNumber` (`toLocaleString('ru-RU')`) minglikni aynan uzilmas bo'shliq
 * bilan ajratadi ("229 800"), ya'ni bu matn bo'linmaydi va butunligicha bir
 * qatorga sig'ishi kerak.
 */
const BREAKABLE_SPACE = /[ \t\n\r\f\v]+/;

/** Matndagi eng uzun BO'LINMAYDIGAN bo'lak kengligi (em) */
const widestWordEm = (text: string): number => {
  let max = 0;
  for (const word of String(text || '').split(BREAKABLE_SPACE)) {
    if (word) max = Math.max(max, emWidth(word));
  }
  return max;
};

/**
 * "Всего" qatoridagi qiymat. Yig'indi har qanday alohida katakdan KATTA bo'ladi
 * (masalan Брутто: 20 577 → 246 924), shuning uchun ustun kengligini hisoblashda
 * ham shu matn hisobga olinishi shart.
 */
const getFooterText = (key: string, items: any[], invoiceCurrency: string): string => {
  const sumOf = (pick: (item: any) => number): number =>
    items.reduce((s, item) => s + (Number(pick(item)) || 0), 0);

  switch (key) {
    case 'quantity': {
      const t = sumOf(i => i.quantity);
      return t !== 0 ? formatNumber(t) : '';
    }
    case 'shtCount': {
      const t = sumOf(i => i.customFields?.shtCount);
      return t !== 0 ? formatNumber(t) : '';
    }
    case 'packagesCount':
      return formatNumber(sumOf(i => i.packagesCount ?? 0));
    case 'gross':
      return formatNumber(sumOf(i => i.grossWeight));
    case 'net':
      return formatNumber(sumOf(i => i.netWeight));
    case 'total':
      return `${getCurrencySymbol(invoiceCurrency)} ${formatNumberFixed(sumItemTotals(items))}`;
    default:
      return '';
  }
};

/**
 * Ustunning kenglik talabi (em — 1pt shrift uchun; haqiqiy kenglik = em × shrift).
 */
interface ColumnDemand {
  /**
   * ZARURIY minimum: eng uzun BO'LINMAYDIGAN so'z. Ustun bundan tor bo'lsa so'z
   * ustundan tashqariga chiqib qo'shni ustun matniga yopishadi.
   */
  min: number;
  /**
   * QULAY kenglik: matn ko'pi bilan `WRAP_LINES` qatorga bo'linadi. Uzun matnli
   * ustun (masalan "Наименование товара") butun matnini bir qatorga sig'diradigan
   * kenglikni TALAB QILMAYDI — u baribir qatorga bo'linadi.
   */
  want: number;
}

/** Uzun matn ideal taqsimlashda shuncha qatorga bo'linishi mumkin deb hisoblanadi */
const WRAP_LINES = 2;
/** Hech bir ustunning zaruriy minimumi jadval kengligining shu ulushidan oshmaydi */
const MAX_MIN_SHARE = 0.3;

const columnDemand = (
  key: string,
  items: any[],
  columnLabels: Record<string, string>,
  totalColumnLabel: string,
  invoiceCurrency: string,
  /** Shu ustunda "Всего:" yozuvi chiqadimi (yig'indi ustunlaridan oldingi ustun) */
  hasTotalLabel: boolean
): ColumnDemand => {
  const headerLabel = key === 'total'
    ? totalColumnLabel
    : (key === 'shtCount' ? 'шт' : (columnLabels[key] || key));

  // `index` ustunida getCellText bo'sh qaytaradi — chiziladigan qiymat tartib raqami
  const cellTexts = key === 'index'
    ? [String(items.length)]
    : items.map(item => getCellText(key, item));

  const texts = [
    headerLabel,
    ...cellTexts,
    getFooterText(key, items, invoiceCurrency),
    hasTotalLabel ? 'Всего:' : '',
  ];

  let word = 0;
  let full = 0;
  for (const text of texts) {
    word = Math.max(word, widestWordEm(text));
    full = Math.max(full, emWidth(String(text || '')));
  }

  const min = Math.max(word, 1);
  return { min, want: Math.max(min, full / WRAP_LINES) };
};

/**
 * Ustun kengliklarini taqsimlash: har bir ustun avval ZARURIY minimumini oladi,
 * qolgan joy esa "qulay kenglik"gacha yetishmagan qismga proporsional bo'linadi.
 *
 * Ilgari kenglik butun sarlavha/qiymat uzunligiga proporsional taqsimlanardi.
 * Natijada "Наименование товара" yoki "Общая сумма в Долл. США" kabi uzun matnli
 * ustunlar keragidan ko'p joy olib, "Брутто"/"Нетто" kabi tor ustunlar matni
 * yopishib qolardi.
 *
 * @returns ustun kengliklari (pt) yoki `null` — bu shriftda minimumlar sig'masa
 */
const allocateColumnWidths = (
  columns: string[],
  demands: Record<string, ColumnDemand>,
  fontSize: number,
  available: number
): number[] | null => {
  const minWidths = columns.map(key => demands[key].min * fontSize + CELL_H_PADDING);
  const wantWidths = columns.map(key => demands[key].want * fontSize + CELL_H_PADDING);

  const sumMin = minWidths.reduce((s, w) => s + w, 0);
  if (sumMin > available) return null;

  const sumGap = columns.reduce((s, _key, i) => s + (wantWidths[i] - minWidths[i]), 0);
  const extra = available - sumMin;

  // Qulay kenglikkacha yetishmagan qismga proporsional taqsimlash
  const ratio = sumGap > 0 ? Math.min(1, extra / sumGap) : 0;
  const widths = minWidths.map((w, i) => w + (wantWidths[i] - w) * ratio);

  // Hamma ustun qulay kenglikka yetgan bo'lsa, qolgan joyni proporsional to'ldiramiz
  // (jadval sahifa kengligini to'liq egallashi kerak)
  const used = widths.reduce((s, w) => s + w, 0);
  const left = available - used;
  if (left > 0.5) return widths.map(w => w + (left * w) / used);

  return widths;
};

/**
 * Ustunlarga sig'adigan eng katta shriftni topib, kengliklarni taqsimlaydi.
 * `preferred` — hujjatning umumiy masshtabidan kelib chiqqan xohlanadigan o'lcham.
 */
const fitTable = (
  columns: string[],
  demands: Record<string, ColumnDemand>,
  preferred: number,
  available: number
): { fontSize: number; widths: number[] } => {
  for (let size = preferred; size >= ABSOLUTE_MIN_TABLE_FONT; size--) {
    const widths = allocateColumnWidths(columns, demands, size, available);
    if (widths) return { fontSize: size, widths };
  }

  // Eng kichik shriftda ham sig'masa (ustun juda ko'p yoki juda uzun so'zlar bor):
  // minimumlarga proporsional taqsimlaymiz — uzun so'z ustundan chiqib ketadi
  const mins = columns.map(key => Math.min(demands[key].min, MAX_MIN_SHARE * available));
  const sum = mins.reduce((s, w) => s + w, 0) || 1;
  return {
    fontSize: ABSOLUTE_MIN_TABLE_FONT,
    widths: mins.map(w => (available * w) / sum),
  };
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

  // Har bir ustunning kenglik talabi (zaruriy minimum + qulay kenglik)
  const demands: Record<string, ColumnDemand> = {};
  orderedVisibleColumns.forEach((key, idx) => {
    demands[key] = columnDemand(
      key, items, effectiveColumnLabels, totalColumnLabel, invoiceCurrency,
      firstSumColIdx > 0 && idx === firstSumColIdx - 1
    );
  });

  // Xohlanadigan shrift — hujjatning umumiy masshtabidan; kenglik yetmasa
  // `fitTable` uni kichraytiradi va shu shriftga mos kengliklarni taqsimlaydi
  const preferred = Math.min(
    MAX_TABLE_FONT,
    Math.max(ABSOLUTE_MIN_TABLE_FONT, Math.round(BASE_TABLE_FONT * scale))
  );
  const { fontSize, widths } = fitTable(orderedVisibleColumns, demands, preferred, tableWidth(scale));

  // Yoga kengliklarni flex ga proporsional taqsimlaydi; yig'indi sahifa
  // kengligiga teng bo'lgani uchun har bir ustun aynan hisoblangan kenglikni oladi
  const flexMap: Record<string, number> = {};
  orderedVisibleColumns.forEach((key, i) => { flexMap[key] = widths[i]; });
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

            const content = getFooterText(key, items, invoiceCurrency);

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
