import { Prisma } from '@prisma/client';

type DecimalInput = Prisma.Decimal | number | string | null | undefined;

/** Transaction / KpiLog qatoridagi pul maydonlari (hammasi ixtiyoriy — select'ga bog'liq) */
export interface MoneyRow {
  amount_uzs?: DecimalInput;
  convertedUzsAmount?: DecimalInput;
  amount?: DecimalInput;
  currency?: string | null;
  amount_original?: DecimalInput;
  currency_universal?: string | null;
  exchange_rate?: DecimalInput;
  exchangeRate?: DecimalInput;
}

export const ZERO = new Prisma.Decimal(0);

const toDecimal = (value: DecimalInput): Prisma.Decimal | null =>
  value === null || value === undefined || value === '' ? null : new Prisma.Decimal(value);

/**
 * Qatorning so'mdagi (buxgalteriya) summasini qaytaradi yoki `null` — agar uni
 * ishonchli hisoblab bo'lmasa.
 *
 * Ilgari `Number(tx.amount_uzs || tx.convertedUzsAmount || tx.amount || 0)` ishlatilardi:
 *  - amount_uzs yo'q bo'lsa USD summa (`amount`/`amount_original`) so'm deb qo'shilardi —
 *    100 USD → 100 so'm (yoki aksincha kurs bilan ~12 000x xato);
 *  - `||` haqiqiy 0 ni ham "yo'q" deb o'tkazib yuborardi;
 *  - float yig'indi Decimal(…,2) aniqligini yo'qotardi.
 */
export function amountInUzs(row: MoneyRow): Prisma.Decimal | null {
  const stored = toDecimal(row.amount_uzs) ?? toDecimal(row.convertedUzsAmount);
  if (stored) return stored;

  // Summa va valyuta juftlikda: amount_original ↔ currency_universal, amount ↔ currency
  const universal = toDecimal(row.amount_original);
  const original = universal ?? toDecimal(row.amount);
  if (!original) return null;

  const currency = universal ? row.currency_universal : row.currency;
  if (currency === 'UZS') return original;

  const rate = toDecimal(row.exchange_rate) ?? toDecimal(row.exchangeRate);
  if (currency && rate && rate.greaterThan(0)) return original.times(rate);

  // Valyuta noma'lum yoki kurs yo'q — so'm deb taxmin qilmaymiz
  return null;
}

/**
 * Qatorlar yig'indisi so'mda. So'mga o'girib bo'lmaydigan qatorlar yig'indiga
 * qo'shilmaydi va `skipped` da qaytariladi (jimgina boshqa valyutani aralashtirish o'rniga).
 */
export function sumUzs(rows: MoneyRow[]): { total: Prisma.Decimal; skipped: number } {
  let total = ZERO;
  let skipped = 0;
  for (const row of rows) {
    const uzs = amountInUzs(row);
    if (uzs) total = total.plus(uzs);
    else skipped++;
  }
  return { total, skipped };
}

/** Bir martalik ogohlantirish: qaysi hisobotda nechta qator so'mga o'girilmadi */
export function warnSkippedUzs(context: string, skipped: number): void {
  if (skipped > 0) {
    console.warn(`[money] ${context}: ${skipped} ta qator so'mga o'girilmadi (amount_uzs yo'q, valyuta/kurs noma'lum) — yig'indiga qo'shilmadi`);
  }
}

/** Faqat JSON javob chegarasida: Decimal → number (2 xona) */
export const toMoneyNumber = (value: Prisma.Decimal): number => value.toDecimalPlaces(2).toNumber();
