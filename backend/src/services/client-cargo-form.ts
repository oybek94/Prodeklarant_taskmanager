// Yuk ma'lumotlari: maydonlar tuzilmasi, kiritishni tekshirish va guruhga yuboriladigan xabar.
// Bu modul Telegram va bazaga bog'liq emas — shuning uchun alohida test qilinadi.
// Forma ikki qismdan iborat: umumiy sarlavha maydonlari va bir yoki bir nechta tovar bloki.

export type HeaderKey =
  | 'contract'
  | 'invoiceNumber'
  | 'deliveryTerms'
  | 'customsPlace'
  | 'destination'
  | 'vehicleNumber'
  | 'shipmentPlace'
  | 'orderNumber'
  | 'temperature'
  | 'sensorSerial';

export type ItemKey = 'product' | 'boxCount' | 'boxWeight' | 'palletCount' | 'palletWeight' | 'netto' | 'brutto' | 'price';

/** text — erkin matn, count — butun son, decimal — o'nli son */
export type FieldKind = 'text' | 'count' | 'decimal';

export interface FieldSpec<K extends string> {
  key: K;
  kind: FieldKind;
  /** Guruh xabaridagi qator nomi */
  label: string;
}

/** Sarlavha maydonlari guruh xabaridagi tartibda */
export const HEADER_FIELDS: readonly FieldSpec<HeaderKey>[] = [
  { key: 'contract', kind: 'text', label: 'Контракт' },
  { key: 'invoiceNumber', kind: 'text', label: 'Инвойс №' },
  { key: 'deliveryTerms', kind: 'text', label: 'Условия поставки' },
  { key: 'customsPlace', kind: 'text', label: 'Место там. очистки' },
  { key: 'destination', kind: 'text', label: 'Место назначения' },
  { key: 'vehicleNumber', kind: 'text', label: 'Номер автотранспорта' },
  { key: 'shipmentPlace', kind: 'text', label: 'Место отгрузки груза' },
  { key: 'orderNumber', kind: 'text', label: 'Номер заказа' },
  { key: 'temperature', kind: 'text', label: 'Температура' },
  { key: 'sensorSerial', kind: 'text', label: 'Серийный номер датчика' },
];

/** Har bir tovar bloki maydonlari */
export const ITEM_FIELDS: readonly FieldSpec<ItemKey>[] = [
  { key: 'product', kind: 'text', label: 'Наименование' },
  { key: 'boxCount', kind: 'count', label: 'Количество ящиков' },
  { key: 'boxWeight', kind: 'decimal', label: 'Общий вес ящиков' },
  { key: 'palletCount', kind: 'count', label: 'Количество поддонов' },
  { key: 'palletWeight', kind: 'decimal', label: 'Общий вес поддонов' },
  { key: 'netto', kind: 'decimal', label: 'Нетто' },
  { key: 'brutto', kind: 'decimal', label: 'Брутто' },
  { key: 'price', kind: 'decimal', label: 'Цена' },
];

export type CargoHeader = Partial<Record<HeaderKey, string>>;
export type CargoItem = Partial<Record<ItemKey, string>>;

export interface CargoData {
  header: CargoHeader;
  items: CargoItem[];
}

export const NUMERIC_HINT = 'Faqat son kiriting, masalan: 12 yoki 12,5';
export const COUNT_HINT = 'Faqat butun son kiriting, masalan: 120';

const MAX_TEXT_LENGTH = 200;

export type ParseResult = { ok: true; value: string } | { ok: false; error: string };

/** Avto nomer: bo'shliqlarsiz, katta harfda ("40232baa / 402332ba" → "40232BAA/402332BA") */
export function parseVehicleNumber(input: string): ParseResult {
  // Dasturdagi (invoys) qoida bilan bir xil: kirill harflari (lotinga o'xshash А, В, С ham) qabul qilinmaydi — CMR/TIR dagi raqam lotinda
  if (/[Ѐ-ӿ]/.test(input)) return { ok: false, error: 'Faqat lotin alifbosida yozing — kirill harflari qabul qilinmaydi' };
  const value = input.replace(/\s+/g, '').toUpperCase();
  if (!value) return { ok: false, error: 'Avto nomerini yozing' };
  if (value.length > 40) return { ok: false, error: 'Avto nomer juda uzun' };
  return { ok: true, value };
}

export function parseCount(input: string): ParseResult {
  const value = input.trim();
  if (!/^\d{1,7}$/.test(value)) return { ok: false, error: COUNT_HINT };
  return { ok: true, value: String(Number(value)) };
}

/** O'nli son. Vergul nuqtaga o'tkaziladi; qiymat matn bo'lib qoladi (hisob-kitob qilinmaydi) */
export function parseDecimal(input: string): ParseResult {
  const value = input.trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(value)) return { ok: false, error: NUMERIC_HINT };
  return { ok: true, value };
}

export function parseFreeText(input: string): ParseResult {
  const value = input.replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: "Bo'sh qiymat bo'lmaydi" };
  if (value.length > MAX_TEXT_LENGTH) return { ok: false, error: `Juda uzun (${MAX_TEXT_LENGTH} belgigacha)` };
  return { ok: true, value };
}

export function parseFieldInput(kind: FieldKind, key: HeaderKey | ItemKey, input: string): ParseResult {
  if (key === 'vehicleNumber') return parseVehicleNumber(input);
  if (kind === 'count') return parseCount(input);
  if (kind === 'decimal') return parseDecimal(input);
  return parseFreeText(input);
}

export interface ChoiceOption {
  text: string;
  /** Shartnomadagi qatorning asl indeksi (Условия поставки ↔ Место там. очистки juftligi uchun) */
  rawIndex: number;
}

/** Shartnomadagi ko'p qatorli maydonni (\n bilan ajratilgan) variantlarga ajratadi; bo'sh qatorlar tushadi, indeks saqlanadi */
export function splitContractLines(value: string | null | undefined): ChoiceOption[] {
  return String(value ?? '')
    .split('\n')
    .map((text, rawIndex) => ({ text: text.trim(), rawIndex }))
    .filter((o) => o.text.length > 0);
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const row = (label: string, value: string) => `${escapeHtml(label)}: <b>${escapeHtml(value)}</b>`;

/**
 * Guruhga yuboriladigan xabar (HTML). Faqat to'ldirilgan maydonlar, belgilangan tartibda.
 * Bo'sh tovar bloklari tushib qoladi, qolganlari 1 dan boshlab raqamlanadi. Hech narsa bo'lmasa null.
 */
export function formatCargoMessage(data: CargoData, currency: string | null): string | null {
  const headerLines = HEADER_FIELDS.flatMap((f) => {
    const value = data.header[f.key];
    return value ? [row(f.label, value)] : [];
  });

  const itemBlocks = data.items
    .map((item) =>
      ITEM_FIELDS.flatMap((f) => {
        const value = item[f.key];
        if (!value) return [];
        return [row(f.label, f.key === 'price' && currency ? `${value} ${currency}` : value)];
      })
    )
    .filter((lines) => lines.length > 0)
    .map((lines, i) => [`<b>Товар ${i + 1}</b>`, ...lines].join('\n'));

  if (headerLines.length === 0 && itemBlocks.length === 0) return null;

  const parts = ['🚛 <b>Данные о грузе</b>'];
  if (headerLines.length > 0) parts.push(headerLines.join('\n'));
  parts.push(...itemBlocks);
  return parts.join('\n\n');
}
