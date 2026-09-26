import { Currency, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { psrIn, snapshotIn, taskUsdRate, taskFeeSelect } from './task-money';

/**
 * Mijoz qarzi (debitor) — yagona hisob. Qarz mijozning shartnoma valyutasida:
 *
 *   qarz = Σ(vazifa shartnoma summasi + PSR) − Σ(INCOME to'lovlar) + boshlang'ich qarz
 *
 * Oldin 4 joyda (Moliya /ceo-stats, mijozlar ro'yxati, mijoz kartochkasi, dashboard
 * eslatmalari) har xil nusxa bor edi va to'lovlar valyutasiga qaramay qo'shilardi:
 * USD shartnomali mijoz 1 000 000 so'm to'lasa, 1 000 000 USD to'lagan deb hisoblanardi.
 *
 * Valyutalar orasida o'tkazish:
 *  - vazifa summasi — vazifaning o'z snapshot kursi (task-money.ts);
 *  - to'lov — to'lov qatoridagi kurs/amount_uzs, bo'lmasa to'lov sanasidagi kurs;
 *  - boshlang'ich qarz — initialDebtInUzs, bo'lmasa joriy kurs.
 * Kursni topib bo'lmasa qator qo'shilmaydi va `skipped` da qaytadi (so'mni USD deb olmaymiz).
 */

type Num = Prisma.Decimal | number | null | undefined;
const n = (v: Num): number => Number(v ?? 0);

/** USD→UZS kursi berilgan sana uchun (yo'q bo'lsa null) */
export type UsdRateAt = (date: Date) => number | null;

/** Qarz hisobi uchun kerakli vazifa maydonlari — findMany select'ga qo'shing */
export const debtTaskSelect = {
  snapshotDealAmount: true,
  snapshotDealAmount_currency: true,
  snapshotDealAmount_amount_uzs: true,
  ...taskFeeSelect,
} satisfies Prisma.TaskSelect;

/** Qarz hisobi uchun kerakli to'lov maydonlari */
export const debtPaymentSelect = {
  amount: true,
  currency: true,
  date: true,
  amount_uzs: true,
  exchange_rate: true,
} satisfies Prisma.TransactionSelect;

export const debtClientSelect = {
  dealAmount: true,
  dealAmountCurrency: true,
  dealAmount_currency: true,
  initialDebt: true,
  initialDebtCurrency: true,
  initialDebtInUzs: true,
} satisfies Prisma.ClientSelect;

export interface DebtTask {
  hasPsr: boolean;
  snapshotDealAmount?: Num;
  snapshotDealAmount_currency?: Currency | null;
  snapshotDealAmount_amount_uzs?: Num;
  snapshotDealAmount_exchange_rate?: Num;
  snapshotDealAmountExchangeRate?: Num;
  snapshotPsrPrice?: Num;
  snapshotPsrPrice_currency?: Currency | null;
  snapshotPsrPrice_amount_uzs?: Num;
}

export interface DebtPayment {
  amount: Num;
  currency: Currency | null;
  date: Date;
  amount_uzs?: Num;
  exchange_rate?: Num;
}

export interface DebtClient {
  dealAmount?: Num;
  dealAmountCurrency?: Currency | null;
  dealAmount_currency?: Currency | null;
  initialDebt?: Num;
  initialDebtCurrency?: Currency | null;
  initialDebtInUzs?: Num;
  tasks: DebtTask[];
  transactions: DebtPayment[];
}

export interface ClientDebt {
  currency: Currency;
  totalDeal: number;
  totalPaid: number;
  initialDebt: number;
  debt: number;
  /** Kurs topilmagani uchun hisobga olinmagan to'lovlar soni */
  skipped: number;
}

export function clientDealCurrency(client: Pick<DebtClient, 'dealAmount_currency' | 'dealAmountCurrency'>): Currency {
  return client.dealAmount_currency || client.dealAmountCurrency || 'USD';
}

/** Vazifaning shartnoma summasi + PSR mijoz valyutasida */
export function taskChargeIn(task: DebtTask, dealCurrency: Currency, clientDealAmount: number): number {
  const base = task.snapshotDealAmount != null
    ? snapshotIn(
        { amount: task.snapshotDealAmount, currency: task.snapshotDealAmount_currency, amountUzs: task.snapshotDealAmount_amount_uzs },
        dealCurrency,
        dealCurrency,
        taskUsdRate(task),
      )
    : clientDealAmount;
  // Snapshot'siz eski vazifalarda PSR 10 (mijozlar ro'yxatidagi eski qoida saqlangan)
  const psr = task.snapshotPsrPrice != null ? psrIn(task, dealCurrency, dealCurrency) : (task.hasPsr ? 10 : 0);
  return base + psr;
}

/** To'lov summasi mijoz valyutasida; kurs topilmasa null */
export function paymentIn(tx: DebtPayment, dealCurrency: Currency, rateAt: UsdRateAt): number | null {
  const currency = tx.currency || 'UZS';
  const amount = n(tx.amount);
  if (currency === dealCurrency) return amount;

  const rowRate = n(tx.exchange_rate) > 1 ? n(tx.exchange_rate) : null;
  if (currency === 'USD') {
    // USD to'lov → so'm shartnoma
    if (tx.amount_uzs != null && n(tx.amount_uzs) > 0) return n(tx.amount_uzs);
    const rate = rowRate ?? rateAt(tx.date);
    return rate ? amount * rate : null;
  }
  // so'm to'lov → USD shartnoma
  const rate = rateAt(tx.date);
  return rate ? amount / rate : null;
}

/** Boshlang'ich qarz mijoz valyutasida */
export function initialDebtIn(client: DebtClient, dealCurrency: Currency, currentRate: number | null): number {
  if (!client.initialDebt) return 0;
  const debtCurrency = client.initialDebtCurrency || 'USD';
  const amount = n(client.initialDebt);
  if (debtCurrency === dealCurrency) return amount;
  if (dealCurrency === 'UZS') {
    if (client.initialDebtInUzs != null && n(client.initialDebtInUzs) > 0) return n(client.initialDebtInUzs);
    return currentRate ? amount * currentRate : 0;
  }
  // so'mdagi boshlang'ich qarz → USD shartnoma
  return currentRate ? amount / currentRate : 0;
}

export function computeClientDebt(client: DebtClient, rateAt: UsdRateAt, currentRate: number | null): ClientDebt {
  const currency = clientDealCurrency(client);
  const dealAmount = n(client.dealAmount);

  const totalDeal = client.tasks.reduce((sum, task) => sum + taskChargeIn(task, currency, dealAmount), 0);

  let totalPaid = 0;
  let skipped = 0;
  for (const tx of client.transactions) {
    const paid = paymentIn(tx, currency, rateAt);
    if (paid === null) skipped++;
    else totalPaid += paid;
  }

  const initialDebt = initialDebtIn(client, currency, currentRate);
  return { currency, totalDeal, totalPaid, initialDebt, debt: totalDeal - totalPaid + initialDebt, skipped };
}

/**
 * Barcha USD kurslarini bir marta yuklab, sana bo'yicha qidiradi (shu kun yoki undan oldingi
 * eng yaqin kurs; sanadan oldin kurs bo'lmasa — eng birinchisi).
 */
export async function loadUsdRateAt(): Promise<{ rateAt: UsdRateAt; latest: number | null }> {
  const rows = await prisma.exchangeRate.findMany({
    where: { currency: 'USD' },
    select: { date: true, rate: true },
    orderBy: { date: 'asc' },
  });
  return usdRateLookup(rows.map((r) => ({ date: r.date, rate: Number(r.rate) })));
}

export function usdRateLookup(rows: { date: Date; rate: number }[]): { rateAt: UsdRateAt; latest: number | null } {
  const valid = rows.filter((r) => r.rate > 0).sort((a, b) => a.date.getTime() - b.date.getTime());
  const rateAt: UsdRateAt = (date) => {
    if (valid.length === 0) return null;
    const t = date.getTime();
    let lo = 0;
    let hi = valid.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (valid[mid].date.getTime() <= t) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return valid[found === -1 ? 0 : found].rate;
  };
  return { rateAt, latest: valid.length ? valid[valid.length - 1].rate : null };
}
