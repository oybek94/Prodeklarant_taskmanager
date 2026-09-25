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

/** Vazifa to'lovlarini o'qish uchun kerakli maydonlar — findMany select'ga qo'shing */
export const taskFeeSelect = {
  hasPsr: true,
  snapshotDealAmount_exchange_rate: true,
  snapshotDealAmountExchangeRate: true,
  snapshotCertificatePayment: true,
  snapshotCertificatePayment_currency: true,
  snapshotCertificatePayment_amount_uzs: true,
  snapshotPsrPrice: true,
  snapshotPsrPrice_currency: true,
  snapshotPsrPrice_amount_uzs: true,
  snapshotWorkerPrice: true,
  snapshotWorkerPrice_currency: true,
  snapshotWorkerPrice_amount_uzs: true,
  snapshotCustomsPayment: true,
  snapshotCustomsPayment_currency: true,
  snapshotCustomsPayment_amount_uzs: true,
} satisfies Prisma.TaskSelect;

export type TaskFeeFields = Prisma.TaskGetPayload<{ select: typeof taskFeeSelect }>;

type FeeKey = 'snapshotCertificatePayment' | 'snapshotPsrPrice' | 'snapshotWorkerPrice' | 'snapshotCustomsPayment';

/** Bitta to'lov kerakli valyutada */
export function feeIn(task: TaskFeeFields, key: FeeKey, clientCurrency: Currency, target: Currency): number {
  return snapshotIn(
    { amount: task[key], currency: task[`${key}_currency`], amountUzs: task[`${key}_amount_uzs`] },
    clientCurrency,
    target,
    taskUsdRate(task)
  );
}

/** Vazifaning barcha to'lovlari kerakli valyutada (PSR — faqat hasPsr bo'lsa) */
export function taskFeesIn(task: TaskFeeFields, clientCurrency: Currency, target: Currency) {
  return {
    certificate: feeIn(task, 'snapshotCertificatePayment', clientCurrency, target),
    psr: task.hasPsr ? feeIn(task, 'snapshotPsrPrice', clientCurrency, target) : 0,
    worker: feeIn(task, 'snapshotWorkerPrice', clientCurrency, target),
    customs: feeIn(task, 'snapshotCustomsPayment', clientCurrency, target),
  };
}
