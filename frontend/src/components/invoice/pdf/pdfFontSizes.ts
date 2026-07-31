/**
 * PDF bo'limlari uchun QO'LDA belgilanadigan shrift o'lchamlari.
 *
 * Odatda hujjatning barcha matni bitta global `scale` bilan boshqariladi:
 * `renderFittedInvoicePdf` sahifani o'lchab, 1-betga sig'adigan eng katta
 * masshtabni tanlaydi (qarang: `pdfFit.tsx`). Ba'zan esa aniq o'lcham kerak
 * bo'ladi — masalan rekvizitlar bloki mijoz talabiga ko'ra aynan 8pt bo'lishi
 * kerak.
 *
 * Shu sababli har bir bo'lim uchun o'lchamni qo'lda belgilash mumkin. Belgilangan
 * o'lcham QAT'IY: `scale` unga ta'sir qilmaydi. Auto-fit qolgan bo'limlarni
 * moslashtiradi; hech qanday masshtabda sig'masa hujjat bir necha betga bo'linadi
 * (`READABLE_FALLBACK_SCALE`) — bu ataylab, chunki o'lchamni foydalanuvchi
 * tanlagan.
 */
import { scaleFont } from './pdfScale';

export type PdfSectionKey = 'parties' | 'additionalInfo' | 'itemsTable' | 'notes';

/** Kalit yo'q yoki `undefined` — "Avto", ya'ni hozirgi (masshtabli) xatti-harakat */
export type PdfFontSizes = Partial<Record<PdfSectionKey, number>>;

/** Modal shu ro'yxatdan quriladi — tartib UI'dagi tartib bilan bir xil */
export const PDF_FONT_SECTIONS: ReadonlyArray<{ key: PdfSectionKey; label: string }> = [
  { key: 'parties', label: 'Rekvizitlar' },
  { key: 'additionalInfo', label: "Qo'shimcha ma'lumotlar" },
  { key: 'itemsTable', label: "Mahsulot ma'lumotlari jadvali" },
  { key: 'notes', label: 'Особые примечания' },
];

/**
 * Ruxsat etilgan oraliq. Quyi chegara `pdfScale.MIN_SCALE` (9pt × 0.4 ≈ 4pt) dan
 * biroz yuqoriroq — 4pt matn o'qilmaydi va uni ataylab tanlashning ma'nosi yo'q.
 * Yuqori chegara A4 sahifada bir bo'lim butun betni egallamasligi uchun.
 */
export const PDF_FONT_MIN = 5;
export const PDF_FONT_MAX = 14;

const SECTION_KEYS = new Set<string>(PDF_FONT_SECTIONS.map((s) => s.key));

/**
 * Bazadan (`additionalInfo.pdfFontSizes`) kelgan qiymatni tozalash. Noma'lum
 * kalit, butun bo'lmagan yoki oraliqdan tashqari qiymat e'tiborsiz qoldiriladi —
 * bunday maydon "Avto" bo'lib qoladi.
 */
export const sanitizePdfFontSizes = (raw: unknown): PdfFontSizes => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const result: PdfFontSizes = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!SECTION_KEYS.has(key)) continue;
    const size = Number(value);
    if (!Number.isInteger(size) || size < PDF_FONT_MIN || size > PDF_FONT_MAX) continue;
    result[key as PdfSectionKey] = size;
  }
  return result;
};

/**
 * Bo'lim matni uchun shrift o'lchami.
 *
 * @param override qo'lda belgilangan o'lcham (pt) yoki `undefined` — "Avto"
 * @param base     "Avto" holatidagi bazaviy o'lcham
 * @param scale    hujjatning umumiy masshtabi
 */
export const sectionFont = (override: number | undefined, base: number, scale: number): number =>
  override ?? scaleFont(base, scale);

/**
 * Bo'lim SARLAVHASI uchun shrift. Sarlavha matndan bir pog'ona kattaroq bo'ladi
 * ("Дополнительная информация" 10pt / satrlar 9pt), qo'lda o'lcham berilganda ham
 * shu ierarxiya saqlanadi.
 */
export const sectionTitleFont = (
  override: number | undefined,
  base: number,
  scale: number
): number =>
  override !== undefined ? Math.min(PDF_FONT_MAX, override + 1) : scaleFont(base, scale);
