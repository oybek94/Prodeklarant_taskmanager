// normalizers.ts
// Extraction natijalari va DB qiymatlarini taqqoslashdan OLDIN yagona
// kanonik ko'rinishga keltiruvchi pure funksiyalar. AI promptga "YYYY-MM-DD
// formatida yoz" deb iltimos qilishning o'zi yetarli emas — bu yerda
// deterministik parsing amalga oshiriladi.

import type {
  AnyExtraction,
  ExtractableDocType,
  InvoiceExtraction,
  ST1Extraction,
  FitoExtraction,
  CmrExtraction,
  TirExtraction,
} from './extraction.schemas';

const RU_MONTHS: Record<string, number> = {
  января: 1, январь: 1, янв: 1,
  февраля: 2, февраль: 2, фев: 2,
  марта: 3, март: 3, мар: 3,
  апреля: 4, апрель: 4, апр: 4,
  мая: 5, май: 5,
  июня: 6, июнь: 6, июн: 6,
  июля: 7, июль: 7, июл: 7,
  августа: 8, август: 8, авг: 8,
  сентября: 9, сентябрь: 9, сен: 9, сент: 9,
  октября: 10, октябрь: 10, окт: 10,
  ноября: 11, ноябрь: 11, ноя: 11, нояб: 11,
  декабря: 12, декабрь: 12, дек: 12,
};

const UZ_MONTHS: Record<string, number> = {
  yanvar: 1, fevral: 2, mart: 3, aprel: 4, may: 5, iyun: 6,
  iyul: 7, avgust: 8, sentabr: 9, sentyabr: 9, oktabr: 10, oktyabr: 10,
  noyabr: 11, dekabr: 12,
};

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

function toIso(year: number, month: number, day: number): string | null {
  if (!isValidDate(year, month, day)) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function expandYear(twoDigit: number): number {
  // 00-49 → 2000-lar, 50-99 → 1900-lar
  return twoDigit < 50 ? 2000 + twoDigit : 1900 + twoDigit;
}

/**
 * Har xil formatdagi sanani kanonik YYYY-MM-DD ga keltiradi.
 * Qo'llab-quvvatlanadi: YYYY-MM-DD, dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy,
 * ikki xonali yil, «15 января 2026 г.», «15 yanvar 2026».
 * Parse qilib bo'lmasa null qaytaradi — hech qachon taxmin qilmaydi.
 */
export function parseDateISO(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;

  // ISO: 2026-01-15 (vaqt qismi bo'lsa tashlab yuboriladi)
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t\s].*)?$/);
  if (iso) {
    return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy (yil 2 yoki 4 xonali)
  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\s*(?:г\.?|й\.?|y\.?)?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (dmy[3].length === 2) year = expandYear(year);
    return toIso(year, month, day);
  }

  // «15 января 2026 г.» / «15 yanvar 2026» / «15-yanvar 2026»
  const textual = text.match(/^(\d{1,2})[\s\-«»"]*([a-zа-яё']+)[\s.,]+(\d{4})\s*(?:г\.?|й\.?|yil)?$/i);
  if (textual) {
    const day = Number(textual[1]);
    const monthName = textual[2].replace(/\.$/, '');
    const year = Number(textual[3]);
    const month = RU_MONTHS[monthName] ?? UZ_MONTHS[monthName];
    if (month) return toIso(year, month, day);
    return null;
  }

  return null;
}

/**
 * Har xil formatdagi raqamni songa keltiradi.
 * "13 232,80" → 13232.8; "13,232.80" → 13232.8; "0,70" → 0.7; "1 500" → 1500.
 * Ikkala ajratgich bo'lsa oxirgisi kasr ajratgich deb olinadi.
 */
export function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  // Bo'shliq/NBSP/NNBSP — minglik ajratgichlar
  let s = String(raw)
    .trim()
    .replace(/[\s   ]/g, '');
  if (!s) return null;

  const negative = s.startsWith('-');
  s = s.replace(/^[-+]/, '');
  // Raqam, vergul va nuqtadan boshqa hamma narsani tashlaymiz (valyuta belgilari va h.k.)
  s = s.replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Ikkalasi ham bor: oxirgisi — kasr ajratgich
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const commaCount = (s.match(/,/g) ?? []).length;
    const digitsAfter = s.length - lastComma - 1;
    if (commaCount === 1 && digitsAfter !== 3) {
      // "0,70" / "1,5" — kasr
      s = s.replace(',', '.');
    } else {
      // "13,232" / "1,234,567" — minglik ajratgich
      s = s.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const dotCount = (s.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      // "1.234.567" — minglik ajratgich
      s = s.replace(/\./g, '');
    }
    // Bitta nuqta — kasr deb qoldiramiz
  }

  const value = Number(s);
  return Number.isFinite(value) ? (negative ? -value : value) : null;
}

/**
 * Og'irlikni kilogrammga keltiradi. unitHint bo'yicha tonna/gramm aniqlanadi;
 * hint bo'lmasa qiymat kg deb olinadi (promptga ishonmasdan deterministik).
 */
export function normalizeWeightKg(
  value: number | null | undefined,
  unitHint?: string | null
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const unit = (unitHint ?? '').trim().toLowerCase();
  if (!unit) return value;
  if (/^(т|тонн\w*|t|tonna|тн)\.?$/.test(unit) || unit === 'mt') return value * 1000;
  if (/^(г|гр|грамм\w*|g|gr|gramm)\.?$/.test(unit)) return value / 1000;
  return value; // kg va boshqa/noma'lum birliklar — o'zgarishsiz
}

/**
 * Invoys raqamini kanonik ko'rinishga keltiradi:
 * "№", "#", probel, registr va boshidagi nollar olib tashlanadi.
 */
export function normalizeInvoiceNumber(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(/[№#]/g, '')
    .replace(/\s+/g, '')
    .replace(/^0+(?=\w)/, '');
}

/* ===================== EXTRACTION POST-PASS ===================== */

/** Sana maydonini kanonlaydi; parse bo'lmasa asl qiymat qoladi (farq ko'rinsin) */
function canonDate(value: string | null): string | null {
  if (value === null) return null;
  return parseDateISO(value) ?? value;
}

function deepTrim<T>(value: T): T {
  if (typeof value === 'string') return value.trim() as T;
  if (Array.isArray(value)) return value.map((v) => deepTrim(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepTrim(v);
    return out as T;
  }
  return value;
}

/**
 * Extraction natijasiga post-normalizatsiya: barcha stringlar trim qilinadi,
 * sana maydonlari kanonik YYYY-MM-DD ga, valyuta ISO kodga keltiriladi.
 * analyzeDocument dan chaqiriladi — barcha iste'molchilar normalizatsiyalangan
 * ma'lumot oladi.
 */
export function normalizeExtraction(
  extracted: AnyExtraction,
  docType: ExtractableDocType
): AnyExtraction {
  const data = deepTrim(extracted);
  switch (docType) {
    case 'INVOICE': {
      const e = data as InvoiceExtraction;
      return {
        ...e,
        invoice_date: canonDate(e.invoice_date),
        currency: e.currency ? normalizeCurrency(e.currency) : null,
        products: e.products.filter((p) => p.name.length > 0),
      };
    }
    case 'ST': {
      const e = data as ST1Extraction;
      return {
        ...e,
        invoice_ref_date: canonDate(e.invoice_ref_date),
        certification_date: canonDate(e.certification_date),
        declaration_date: canonDate(e.declaration_date),
        products: e.products.filter((p) => p.name.length > 0),
      };
    }
    case 'FITO': {
      const e = data as FitoExtraction;
      return {
        ...e,
        issue_date: canonDate(e.issue_date),
        products: e.products.filter((p) => p.name.length > 0),
      };
    }
    case 'CMR': {
      const e = data as CmrExtraction;
      return { ...e, products: e.products.filter((p) => p.name.length > 0) };
    }
    case 'TIR': {
      const e = data as TirExtraction;
      return { ...e, products: e.products.filter((p) => p.name.length > 0) };
    }
  }
}

/** Valyuta yozuvini ISO kodga keltiradi ("долл США", "$", "у.е." → USD). */
export function normalizeCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (/(usd|доллар|долл|dollar|у\.?\s?е\.?|\$)/.test(s)) return 'USD';
  if (/(eur|евро|euro|€)/.test(s)) return 'EUR';
  if (/(rub|руб|рубл|₽)/.test(s)) return 'RUB';
  if (/(uzs|сум|so'?m|сўм)/.test(s)) return 'UZS';
  if (/(kzt|тенге|tenge)/.test(s)) return 'KZT';
  if (/(cny|юан|yuan|rmb)/.test(s)) return 'CNY';
  const code = s.toUpperCase().replace(/[^A-Z]/g, '');
  return code.length === 3 ? code : null;
}
