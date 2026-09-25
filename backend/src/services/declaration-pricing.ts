import { ContractPaymentType, Currency, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { shouldDeductGovernmentFees } from './contract-payment-split';

/**
 * Deklaratsiya bosqichi narxi (BXM × koeffitsient).
 *
 * - Bojxona to'lovi snapshot'i — SO'MDA (BXM so'mda × koef + ish vaqtidan tashqari 103 000).
 * - CASH_ALL_INCLUSIVE shartnomada mijoz summasiga (koef − 1) × BXM va ish vaqtidan
 *   tashqari qo'shimcha qo'shiladi — MIJOZ valyutasida (bu mijozga qo'yiladigan narx).
 *
 * Bosqichni TAYYOR qilishda va Deklaratsiyadan keyin mijoz almashtirilganda ishlatiladi.
 */

export const DEFAULT_BXM = { amountUsd: 34.4, amountUzs: 412000 };
export const AFTER_HOURS_EXTRA = { USD: 8.5, UZS: 103000 } as const;

export interface DeclarationClient {
  dealAmount: Prisma.Decimal | null;
  dealAmount_currency: Currency | null;
  dealAmountCurrency: Currency | null;
  dealAmount_amount_uzs: Prisma.Decimal | null;
  dealAmount_exchange_rate: Prisma.Decimal | null;
  dealAmountExchangeRate: Prisma.Decimal | null;
  contractPaymentType: ContractPaymentType | null;
}

export const declarationClientSelect = {
  dealAmount: true,
  dealAmount_currency: true,
  dealAmountCurrency: true,
  dealAmount_amount_uzs: true,
  dealAmount_exchange_rate: true,
  dealAmountExchangeRate: true,
  contractPaymentType: true,
} satisfies Prisma.ClientSelect;

interface TaskRates {
  snapshotDealAmount_exchange_rate: Prisma.Decimal | null;
  snapshotDealAmountExchangeRate: Prisma.Decimal | null;
}

const clientCurrencyOf = (c: DeclarationClient): Currency => c.dealAmount_currency || c.dealAmountCurrency || 'USD';

/** Mijozning asosiy shartnoma summasi (qo'shimchalarsiz) va uning so'mdagi qiymati */
export function baseDealOf(client: DeclarationClient, task: TaskRates): { amount: number; uzs: number } {
  const amount = client.dealAmount ? Number(client.dealAmount) : 0;
  if (clientCurrencyOf(client) !== 'USD') {
    return { amount, uzs: Number(client.dealAmount_amount_uzs ?? amount) };
  }
  const rate = Number(client.dealAmount_exchange_rate || client.dealAmountExchangeRate
    || task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1);
  return { amount, uzs: Number(client.dealAmount_amount_uzs ?? amount * rate) };
}

/** Bojxona to'lovi snapshot maydonlari (so'mda) */
export function customsUzsFields(amountUzs: number) {
  return {
    snapshotCustomsPayment: amountUzs,
    snapshotCustomsPaymentExchangeRate: new Decimal(1),
    snapshotCustomsPayment_amount_original: amountUzs,
    snapshotCustomsPayment_currency: 'UZS' as const,
    snapshotCustomsPayment_exchange_rate: 1,
    snapshotCustomsPayment_amount_uzs: amountUzs,
    snapshotCustomsPayment_exchange_source: 'MANUAL' as const,
  };
}

/** Deklaratsiya TAYYOR bo'lganda vazifaga yoziladigan maydonlar (sof funksiya) */
export function declarationCompletedFields(params: {
  client: DeclarationClient;
  task: TaskRates;
  multiplier: number;
  afterHoursDeclaration: boolean;
  afterHoursPayer: 'CLIENT' | 'COMPANY';
  bxm: { amountUsd: number; amountUzs: number };
}) {
  const { client, task, multiplier, afterHoursDeclaration, afterHoursPayer, bxm } = params;
  const currency = clientCurrencyOf(client);

  const customsUzs = bxm.amountUzs * multiplier + (afterHoursDeclaration ? AFTER_HOURS_EXTRA.UZS : 0);

  // Faqat CASH_ALL_INCLUSIVE (legacy) turida mijoz summasiga davlat to'lovi qo'shimchalari kiradi.
  // Xizmat haqi turlarida (TRANSFER_ONLY/CASH_ONLY/MIXED) mijoz davlat to'lovini o'zi to'laydi.
  const includeInDeal = shouldDeductGovernmentFees(client.contractPaymentType || 'CASH_ALL_INCLUSIVE');
  const base = baseDealOf(client, task);
  const clientPaysAfterHours = afterHoursDeclaration && afterHoursPayer === 'CLIENT';
  const bxmForClient = currency === 'USD' ? bxm.amountUsd : bxm.amountUzs;
  const extraBxm = multiplier > 1 ? (multiplier - 1) * bxmForClient : 0;

  const dealAmount = includeInDeal
    ? base.amount + extraBxm + (clientPaysAfterHours ? AFTER_HOURS_EXTRA[currency] : 0)
    : base.amount;
  const dealAmountUzs = includeInDeal
    ? base.uzs + (multiplier - 1) * bxm.amountUzs + (clientPaysAfterHours ? AFTER_HOURS_EXTRA.UZS : 0)
    : base.uzs;

  return {
    customsPaymentMultiplier: multiplier,
    afterHoursDeclaration,
    afterHoursPayer,
    ...customsUzsFields(customsUzs),
    snapshotDealAmount: dealAmount,
    snapshotDealAmount_amount_uzs: dealAmountUzs,
  };
}

/** Deklaratsiya TAYYOR → BOSHLANMAGAN qaytarilganda */
export function declarationResetFields(client: DeclarationClient, task: TaskRates) {
  const base = baseDealOf(client, task);
  return {
    afterHoursDeclaration: false,
    customsPaymentMultiplier: null,
    ...customsUzsFields(0),
    snapshotDealAmount: base.amount,
    snapshotDealAmount_amount_uzs: base.uzs,
  };
}

/** `at` paytida amalda bo'lgan BXM */
export async function bxmAt(tx: Prisma.TransactionClient, at: Date): Promise<{ amountUsd: number; amountUzs: number }> {
  const config = await tx.bXMConfig.findFirst({
    where: { effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: 'desc' },
  });
  return config
    ? { amountUsd: Number(config.amountUsd), amountUzs: Number(config.amountUzs) }
    : DEFAULT_BXM;
}
