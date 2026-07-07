// matchers.ts
// Ikkala rule-engine (Invoice-vs-ST va Doc-vs-DB) uchun YAGONA taqqoslash
// funksiyalari. Tolerantlik chegaralari verification.config.ts dan olinadi,
// shu tufayli bir xil nomuvofiqlik ikki oqimda har xil natija bermaydi.

import { VERIFICATION_CONFIG } from './verification.config';
import { parseDateISO, normalizeInvoiceNumber } from './normalizers';

/* ===================== TEXT NORMALIZATION ===================== */

export function normalize(value: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kompaniya nomini manzil/rekvizitlardan tozalab ajratib oladi */
export function extractCompanyName(value: string | null): string {
  if (!value) return '';

  // Qo'shtirnoq ichidagi nom ustuvor
  const quoted = value.match(/"([^"]+)"/);
  if (quoted?.[1]) {
    return normalize(quoted[1]);
  }

  let text = normalize(value);

  const stopWords = [
    'республика',
    'узбекистан',
    'область',
    'район',
    'город',
    'г.',
    'улица',
    'ул',
    'дом',
    'д.',
    'стр',
    'кв',
    'индекс',
    'российская федерация',
  ];

  let cut = text.length;
  for (const w of stopWords) {
    const i = text.indexOf(w);
    if (i !== -1 && i < cut) cut = i;
  }

  text = text.substring(0, cut).trim();

  return text
    .replace(/^сп\s+/i, '')
    .replace(/^ooo\s+/i, '')
    .replace(/^ооо\s+/i, '')
    .trim();
}

export function sameCompany(a: string | null, b: string | null): boolean {
  return extractCompanyName(a) === extractCompanyName(b);
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-zа-яё0-9']+/i)
    .filter((t) => t.length > 1);
}

/** Token-Jaccard o'xshashligi (0..1) */
export function tokenJaccard(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

/* ===================== NUMERIC MATCHERS ===================== */

/** Og'irliklar: |a-b| <= max(absoluteKg, relative %) — yaxlitlash farqlarini kechiradi */
export function weightsMatch(a: number, b: number): boolean {
  const { absoluteKg, relative } = VERIFICATION_CONFIG.weight;
  const tolerance = Math.max(absoluteKg, Math.max(Math.abs(a), Math.abs(b)) * relative);
  return Math.abs(a - b) <= tolerance;
}

/** Joylar soni: aniq butun son tengligi */
export function countsMatch(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

/** Pul summalari: |a-b| <= max(absolute, relative %) */
export function moneyMatch(a: number, b: number): boolean {
  const { absolute, relative } = VERIFICATION_CONFIG.money;
  const tolerance = Math.max(absolute, Math.max(Math.abs(a), Math.abs(b)) * relative);
  return Math.abs(a - b) <= tolerance;
}

/** Invoys raqami: №/probel/registr/boshidagi nollarsiz solishtirish */
export function invoiceNumbersMatch(a: string, b: string): boolean {
  const ca = normalizeInvoiceNumber(a);
  const cb = normalizeInvoiceNumber(b);
  return ca !== '' && ca === cb;
}

/* ===================== NAME MATCHERS ===================== */

/**
 * Mahsulot nomi: normalize + containment yoki token-Jaccard.
 * Qo'lda kiritilgan DB qiymatlari uchun qat'iy tenglik ishlamaydi.
 */
export function productNamesMatch(docName: string, dbName: string): boolean {
  const a = normalize(docName);
  const b = normalize(dbName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return tokenJaccard(a, b) >= VERIFICATION_CONFIG.productName.jaccardThreshold;
}

/** Kompaniya nomi: qat'iy sameCompany yoki containment/token-Jaccard fallback */
export function companiesMatch(docValue: string, dbValue: string): boolean {
  if (sameCompany(docValue, dbValue)) return true;
  const a = extractCompanyName(docValue);
  const b = extractCompanyName(dbValue);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  return tokenJaccard(a, b) >= VERIFICATION_CONFIG.company.jaccardThreshold;
}

/* ===================== DATE MATCHERS ===================== */

/**
 * Sanalar tengligi — format farqidan qat'i nazar (2026-01-15 == 15.01.2026).
 * Ikkalasi ham parse bo'lmasa, oddiy string tengligiga qaytadi.
 */
export function datesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const pa = parseDateISO(a);
  const pb = parseDateISO(b);
  if (pa && pb) return pa === pb;
  return a.trim() === b.trim();
}

/**
 * `a` sanasi `b` dan oldin EMASligini tekshiradi (a >= b).
 * Birortasi parse bo'lmasa true qaytaradi — noaniq holatda xato ko'tarilmaydi.
 */
export function dateNotBefore(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  const pa = parseDateISO(a);
  const pb = parseDateISO(b);
  if (!pa || !pb) return true;
  return pa >= pb;
}
