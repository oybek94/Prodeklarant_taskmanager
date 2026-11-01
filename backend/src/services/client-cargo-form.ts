// Yuk ma'lumotlari boti: forma qadamlari, kiritishni tekshirish va guruhga yuboriladigan xabar.
// Bu modul Telegram va bazaga bog'liq emas — shuning uchun alohida test qilinadi.

export type CargoFieldKey =
  | 'vehicleNumber'
  | 'buyer'
  | 'city'
  | 'product'
  | 'boxCount'
  | 'boxWeight'
  | 'palletCount'
  | 'palletWeight'
  | 'netto'
  | 'price'
  | 'customs'
  | 'unloading';

export type CargoData = Partial<Record<CargoFieldKey, string>>;

/** text — erkin matn, count — butun son, decimal — o'nli son, choice — ro'yxatdan tanlash yoki yozish */
export type CargoStepKind = 'text' | 'count' | 'decimal' | 'choice';

export interface CargoStep {
  key: CargoFieldKey;
  kind: CargoStepKind;
  /** Guruh xabaridagi qator nomi */
  label: string;
  /** Botning savoli */
  question: string;
}

export const CARGO_STEPS: readonly CargoStep[] = [
  { key: 'vehicleNumber', kind: 'text', label: 'Avto nomer', question: '🚛 Avto nomerini yozing (masalan: 40232BAA/402332BA)' },
  { key: 'buyer', kind: 'choice', label: 'Sotib oluvchi', question: '👤 Sotib oluvchini tanlang' },
  { key: 'city', kind: 'choice', label: 'Shahar', question: "📍 Qaysi shaharga? Ro'yxatdan tanlang yoki o'zingiz yozing" },
  { key: 'product', kind: 'choice', label: 'Mahsulot', question: '🍎 Mahsulot nomini tanlang yoki yangisini yozing' },
  { key: 'boxCount', kind: 'count', label: 'Yashik soni', question: '📦 Yashik sonini yozing (faqat son)' },
  { key: 'boxWeight', kind: 'decimal', label: "Yashiklar jami og'irligi", question: "⚖️ Yashiklar jami og'irligini yozing (faqat son)" },
  { key: 'palletCount', kind: 'count', label: 'Poddon soni', question: '🟫 Poddon sonini yozing (faqat son)' },
  { key: 'palletWeight', kind: 'decimal', label: "Poddon jami og'irligi", question: "⚖️ Poddon jami og'irligini yozing (faqat son)" },
  { key: 'netto', kind: 'decimal', label: 'Netto', question: '⚖️ Netto og\'irlikni yozing (faqat son)' },
  { key: 'price', kind: 'decimal', label: 'Narxi', question: '💰 Narxini yozing (faqat son)' },
  { key: 'customs', kind: 'choice', label: 'Таможня', question: "🛃 Таможня (место там. очистки): ro'yxatdan tanlang yoki o'zingiz yozing" },
  { key: 'unloading', kind: 'choice', label: 'Выгрузка', question: "📥 Выгрузка (место назначения): ro'yxatdan tanlang yoki o'zingiz yozing" },
];

export const NUMERIC_HINT = 'Faqat son kiriting, masalan: 12 yoki 12,5';
export const COUNT_HINT = 'Faqat butun son kiriting, masalan: 120';

const MAX_TEXT_LENGTH = 200;

export type ParseResult = { ok: true; value: string } | { ok: false; error: string };

/** Avto nomer: bo'shliqlarsiz, katta harfda ("40232baa / 402332ba" → "40232BAA/402332BA") */
export function parseVehicleNumber(input: string): ParseResult {
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
  if (!value) return { ok: false, error: 'Bo\'sh qiymat bo\'lmaydi' };
  if (value.length > MAX_TEXT_LENGTH) return { ok: false, error: `Juda uzun (${MAX_TEXT_LENGTH} belgigacha)` };
  return { ok: true, value };
}

export function parseStepInput(kind: CargoStepKind, key: CargoFieldKey, input: string): ParseResult {
  if (key === 'vehicleNumber') return parseVehicleNumber(input);
  if (kind === 'count') return parseCount(input);
  if (kind === 'decimal') return parseDecimal(input);
  return parseFreeText(input);
}

export interface ChoiceOption {
  text: string;
  /** Shartnomadagi qatorning asl indeksi (shahar ↔ bojxona juftligi uchun) */
  rawIndex: number;
}

/** Shartnomadagi ko'p qatorli maydonni (\n bilan ajratilgan) variantlarga ajratadi; bo'sh qatorlar tushadi, indeks saqlanadi */
export function splitContractLines(value: string | null | undefined): ChoiceOption[] {
  return String(value ?? '')
    .split('\n')
    .map((text, rawIndex) => ({ text: text.trim(), rawIndex }))
    .filter((o) => o.text.length > 0);
}

/** Tanlangan shaharning (deliveryTerms) juftidagi bojxona qatori birinchi turadi */
export function orderCustomsOptions(options: ChoiceOption[], cityRawIndex: number | undefined): ChoiceOption[] {
  if (cityRawIndex === undefined) return options;
  const paired = options.find((o) => o.rawIndex === cityRawIndex);
  if (!paired) return options;
  return [paired, ...options.filter((o) => o !== paired)];
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Guruhga yuboriladigan xabar (HTML). Faqat to'ldirilgan maydonlar, 1→12 tartibida. Hech narsa bo'lmasa null. */
export function formatCargoMessage(data: CargoData, currency: string | null): string | null {
  const lines: string[] = [];
  for (const step of CARGO_STEPS) {
    const raw = data[step.key];
    if (!raw) continue;
    const shown = step.key === 'price' && currency ? `${raw} ${currency}` : raw;
    lines.push(`${escapeHtml(step.label)}: <b>${escapeHtml(shown)}</b>`);
  }
  if (lines.length === 0) return null;
  return ['🚛 <b>Yuk ma\'lumoti</b>', '', ...lines].join('\n');
}
