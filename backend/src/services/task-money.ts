import { Currency, Prisma } from '@prisma/client';

/**
 * Vazifa snapshot summalarini valyutalar orasida o'qish.
 *
 * Qoida (2026-09-25 dan): to'lovlar — sertifikat, PSR, ishchi narxi, bojxona — doim
 * SO'MDA yoziladi (currency=UZS). Shartnoma summasi mijoz valyutasida qoladi.
 * Eski vazifalarda bu maydonlar mijoz valyutasida saqlangan — shuning uchun o'quvchi
 * HAR DOIM `*_currency` maydoniga qarashi kerak, xom raqamni emas.
 */

type Num = Prisma.Decimal | number | null | undefined;

export interface SnapshotMoney {
  /** snapshotX (asl qiymat) */
  amount: Num;
  /** snapshotX_currency; eski vazifalarda bo'sh bo'lishi mumkin */
  currency: Currency | null | undefined;
  /** snapshotX_amount_uzs */
  amountUzs: Num;
}

const n = (v: Num): number => Number(v ?? 0);

/** Vazifaning USD→UZS kursi (shartnoma snapshot'idan) */
export function taskUsdRate(task: {
  snapshotDealAmount_exchange_rate?: Num;
  snapshotDealAmountExchangeRate?: Num;
}): number | null {
  const rate = task.snapshotDealAmount_exchange_rate ?? task.snapshotDealAmountExchangeRate;
  return rate != null && Number(rate) > 0 ? Number(rate) : null;
}

/**
 * Snapshot summasini kerakli valyutada qaytaradi.
 * @param fallbackCurrency valyuta maydoni bo'sh eski yozuvlar uchun (mijoz valyutasi)
 * @param usdRate USD→UZS kursi; yo'q bo'lsa 1 (eski xatti-harakat bilan bir xil)
 */
export function snapshotIn(
  money: SnapshotMoney,
  fallbackCurrency: Currency,
  target: Currency,
  usdRate: number | null
): number {
  if (money.amount == null && money.amountUzs == null) return 0;
  const currency = money.currency ?? fallbackCurrency;
  const rate = usdRate ?? 1;

  if (target === 'UZS') {
    if (currency === 'UZS') return n(money.amountUzs ?? money.amount);
    return money.amountUzs != null ? n(money.amountUzs) : n(money.amount) * rate;
  }
  // target USD
  if (currency === 'USD') return n(money.amount);
  return n(money.amountUzs ?? money.amount) / rate;
}

export interface TaskPsrFields {
  hasPsr: boolean;
  snapshotPsrPrice?: Num;
  snapshotPsrPrice_currency?: Currency | null;
  snapshotPsrPrice_amount_uzs?: Num;
  snapshotDealAmount_exchange_rate?: Num;
  snapshotDealAmountExchangeRate?: Num;
}

/** PSR summasi kerakli valyutada (PSR yo'q bo'lsa 0) */
export function psrIn(task: TaskPsrFields, clientCurrency: Currency, target: Currency): number {
  if (!task.hasPsr) return 0;
  return snapshotIn(
    { amount: task.snapshotPsrPrice, currency: task.snapshotPsrPrice_currency, amountUzs: task.snapshotPsrPrice_amount_uzs },
    clientCurrency,
    target,
    taskUsdRate(task)
  );
}
