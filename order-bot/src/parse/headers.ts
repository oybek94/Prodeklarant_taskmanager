/**
 * Zakaz jadvalidagi sarlavhalarni kanonik kalitlarga moslashtirish.
 *
 * Sarlavhalar ikki tilli ("Order # / № заказа") va ichida qator uzilishi bo'lishi
 * mumkin ("Class/<br>Класс"), shuning uchun aniq tenglik emas, substring qidiruvi
 * ishlatiladi.
 */

export type FieldKey =
  | 'supplier'
  | 'orderNumber'
  | 'productRu'
  | 'plu'
  | 'size'
  | 'price'
  | 'currency'
  | 'warehouse'
  | 'warehouseAddress'
  | 'etd'
  | 'eta';

type Rule = {
  key: FieldKey;
  /** Shu satrlardan biri sarlavhada uchrasa — moslik. */
  include: string[];
  /** Bu satrlardan biri uchrasa — moslik BEKOR qilinadi. */
  exclude?: string[];
  /** Substring emas, to'liq tenglik talab qilinadi. */
  exact?: boolean;
};

/**
 * Tartib MUHIM: aniqroq qoida oldin turadi va ustunni "band qiladi",
 * shu sababli umumiyroq qoida uni yutib yubormaydi.
 *
 *   "Склад" satri "Адрес склада" ichida ham bor
 *   "ETA"   satri "ETA DC / РЦ"   ichida ham bor
 */
const RULES: Rule[] = [
  // --- Ustunni yutib yuborishi mumkin bo'lganlar birinchi ---
  { key: 'warehouseAddress', include: ['warehouse address', 'адрес склада'] },
  { key: 'warehouse', include: ['warehouse', 'склад'], exclude: ['address', 'адрес'] },

  { key: 'etd', include: ['etd', 'дата выхода'] },
  { key: 'eta', include: ['eta', 'дата прихода'], exclude: ['etd', ' dc', 'dc /', 'рц'] },

  // --- Qolganlari ---
  { key: 'orderNumber', include: ['order #', '№ заказа'], exclude: ['contract', 'контракт'] },
  { key: 'supplier', include: ['supplier', 'поставщик'] },
  { key: 'productRu', include: ['in russian', 'на русском'] },
  { key: 'plu', include: ['plu'], exact: true },
  { key: 'size', include: ['size /', 'калибр'] },
  { key: 'price', include: ['price /', 'цена за ед'] },
  { key: 'currency', include: ['currency', 'валюта'] },
];

/** Jadval "zakaz jadvali" deb tanilishi uchun shu maydonlar bo'lishi shart. */
export const REQUIRED_KEYS: FieldKey[] = ['orderNumber', 'plu', 'supplier'];

const matches = (header: string, rule: Rule): boolean => {
  if (rule.exclude?.some((bad) => header.includes(bad))) return false;
  if (rule.exact) return rule.include.some((good) => header === good);
  return rule.include.some((good) => header.includes(good));
};

/**
 * Normallashtirilgan (lowercase) sarlavhalar ro'yxatidan
 * kalit -> ustun indeksi xaritasini quradi.
 *
 * Har bir ustun ko'pi bilan bitta kalitga biriktiriladi.
 */
export const mapHeaders = (headers: string[]): Partial<Record<FieldKey, number>> => {
  const result: Partial<Record<FieldKey, number>> = {};
  const claimed = new Set<number>();

  for (const rule of RULES) {
    for (let i = 0; i < headers.length; i++) {
      if (claimed.has(i)) continue;
      const header = headers[i];
      if (!header) continue;
      if (!matches(header, rule)) continue;
      result[rule.key] = i;
      claimed.add(i);
      break;
    }
  }

  return result;
};

/** Sarlavha qatori zakaz jadvaliniki ekanini tekshiradi. */
export const isOrderHeaderRow = (headers: string[]): boolean => {
  const map = mapHeaders(headers);
  return REQUIRED_KEYS.every((key) => map[key] !== undefined);
};
