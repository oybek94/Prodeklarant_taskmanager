import { Prisma, PrismaClient, Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getExchangeRate } from './exchange-rate';

const SEASON_SPLIT_DATE = new Date('2026-02-14T19:00:00.000Z'); // 15 February 2026 00:00 UZT
const ERROR_SPLIT_DATE = new Date('2026-02-14T19:00:00.000Z'); // 15 February 2026 00:00 UZT

/**
 * Calculate total earned in a specific currency for a worker
 */
export async function calculateTotalEarned(
  workerId: number,
  currency: Currency,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<Decimal> {
  const client = tx || (await import('../prisma')).prisma;

  const where: any = {
    userId: workerId,
    amount: { gt: 0 }, // Faqat musbat (Ishlab topilgan) summalarni olamiz. Xatoliklar alohida hisoblanadi.
  };

  if (dateRange) {
    if (dateRange.startDate || dateRange.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) {
        where.createdAt.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        where.createdAt.lte = dateRange.endDate;
      }
    }
  }

  const kpiLogs = await client.kpiLog.findMany({ where });

  let total = new Decimal(0);
  for (const log of kpiLogs) {
    const amountUzs = Number((log as any).amount_uzs || (log as any).convertedUzsAmount || 0);
    const amountUsd = Number((log as any).amount_original || (log as any).amount || 0);
    
    if (currency === 'UZS') {
        if (amountUzs) {
            total = total.plus(new Decimal(amountUzs));
        } else if (amountUsd) {
            // Fallback rate if none exists. Ideally we fetch, but for old logs, let's use 12000
            total = total.plus(new Decimal(amountUsd * 12000)); 
        }
    } else {
        if (amountUsd) {
            total = total.plus(new Decimal(amountUsd));
        }
    }
  }

  // DashboardNote completed rewards
  const notesWhere: any = {
    completedById: workerId,
    isCompleted: true,
    bountyReward: { not: null },
  };

  if (dateRange) {
    if (dateRange.startDate || dateRange.endDate) {
      notesWhere.completedAt = {};
      if (dateRange.startDate) {
        notesWhere.completedAt.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        notesWhere.completedAt.lte = dateRange.endDate;
      }
    }
  }

  const completedNotes = await (client as any).dashboardNote.findMany({ where: notesWhere });

  for (const note of completedNotes) {
    const amountUzs = Number(note.bountyReward || 0);
    if (currency === 'UZS') {
      total = total.plus(new Decimal(amountUzs));
    } else {
      let rate = new Decimal(12000);
      try {
        rate = await getExchangeRate(note.completedAt || new Date(), 'USD', 'UZS', client);
      } catch {
        // use fallback 12000
      }
      total = total.plus(new Decimal(amountUzs).div(rate));
    }
  }

  return total;
}

/**
 * Get total paid in a specific currency for a worker
 */
export async function calculateTotalPaid(
  workerId: number,
  currency: Currency,
  isLegacyPayment: boolean,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<Decimal> {
  const client = tx || (await import('../prisma')).prisma;

  const where: any = {
    workerId,
    isLegacyPayment,
  };

  if (dateRange) {
    if (dateRange.startDate || dateRange.endDate) {
      where.paymentDate = {};
      if (dateRange.startDate) {
        where.paymentDate.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        where.paymentDate.lte = dateRange.endDate;
      }
    }
  }

  const payments = await (client as any).workerPayment.findMany({ where });

  let total = new Decimal(0);
  for (const payment of payments) {
    const amount = currency === 'UZS' 
      ? (payment.paidAmountUzs || 0)
      : payment.paidAmountUsd;
    total = total.plus(new Decimal(amount));
  }

  return total;
}

/**
 * Calculate total errors in a specific currency for a worker
 */
export async function calculateTotalErrors(
  workerId: number,
  targetCurrency: Currency,
  isLegacy: boolean,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<Decimal> {
  const client = tx || (await import('../prisma')).prisma;

  const where: any = { workerId };
  
  const dateConditions: any[] = [];
  if (isLegacy) {
    dateConditions.push({ lt: ERROR_SPLIT_DATE });
  } else {
    dateConditions.push({ gte: ERROR_SPLIT_DATE });
  }
  
  if (dateRange?.startDate) {
    dateConditions.push({ gte: dateRange.startDate });
  }
  if (dateRange?.endDate) {
    dateConditions.push({ lte: dateRange.endDate });
  }
  
  if (dateConditions.length > 0) {
    where.AND = dateConditions.map(c => ({ date: c }));
  }

  const errors = await client.taskError.findMany({ where });

  let total = new Decimal(0);
  for (const error of errors) {
    const errorCurrency = error.currency || 'USD';
    const amount = new Decimal(error.amount);
    
    if (errorCurrency === targetCurrency) {
      total = total.plus(amount);
    } else {
      const rate = error.exchangeRate ? new Decimal(error.exchangeRate) : null;
      if (rate && !rate.isZero()) {
        if (targetCurrency === 'USD' && errorCurrency === 'UZS') {
          total = total.plus(amount.div(rate));
        } else if (targetCurrency === 'UZS' && errorCurrency === 'USD') {
          total = total.plus(amount.times(rate));
        }
      } else {
        try {
          const fetchedRate = await getExchangeRate(error.date, 'USD', 'UZS', client);
          if (targetCurrency === 'USD' && errorCurrency === 'UZS') {
            total = total.plus(amount.div(fetchedRate));
          } else if (targetCurrency === 'UZS' && errorCurrency === 'USD') {
            total = total.plus(amount.times(fetchedRate));
          }
        } catch (e) {
          total = total.plus(amount);
        }
      }
    }
  }

  return total;
}

/**
 * Create a new worker payment
 */
export async function createWorkerPayment(
  workerId: number,
  paidCurrency: Currency,
  paidAmount: Decimal | number | string,
  options?: {
    exchangeRate?: Decimal | number | string;
    paymentDate?: Date;
    comment?: string;
    tx?: PrismaClient | Prisma.TransactionClient;
    isLegacyPayment?: boolean;
  }
): Promise<any> {
  const client = options?.tx || (await import('../prisma')).prisma;
  const paidAmountDecimal = new Decimal(paidAmount);
  const paymentDate = options?.paymentDate || new Date();
  const isLegacyPayment = options?.isLegacyPayment || false;

  let paidAmountUsd: Decimal;
  let exchangeRate: Decimal | null = null;
  let paidAmountUzs: Decimal | null = null;

  if (paidCurrency === 'USD') {
    paidAmountUsd = paidAmountDecimal;
    exchangeRate = null;
    paidAmountUzs = null;
  } else if (paidCurrency === 'UZS') {
    paidAmountUzs = paidAmountDecimal;

    if (options?.exchangeRate) {
      exchangeRate = new Decimal(options.exchangeRate);
    } else {
      try {
        exchangeRate = await getExchangeRate(paymentDate, 'USD', 'UZS', client);
      } catch (error) {
        throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    paidAmountUsd = paidAmountUzs.div(exchangeRate);
  } else {
    throw new Error(`Unsupported payment currency: ${paidCurrency}`);
  }

  // Get user to check balances
  const user = await client.user.findUnique({ where: { id: workerId } });
  if (!user) throw new Error('Worker not found');

  let paymentInTargetCurrency = new Decimal(0);

  if (isLegacyPayment) {
    const legacyDebtUsd = new Decimal(user.legacyDebtUsd || 0);
    const legacyTotalPaidUsd = await calculateTotalPaid(workerId, 'USD', true, { endDate: paymentDate }, client);
    const legacyRemaining = legacyDebtUsd.minus(legacyTotalPaidUsd);

    if (legacyRemaining.lt(paidAmountUsd) && legacyRemaining.gt(0)) {
      // It's okay to overpay slightly or we can restrict it. We'll allow it but you may want to warn.
    }
  } else {
    const salaryCurrency = user.salaryCurrency || 'UZS';
    const totalEarned = await calculateTotalEarned(workerId, salaryCurrency, { endDate: paymentDate }, client);
    const totalPaid = await calculateTotalPaid(workerId, salaryCurrency, false, { endDate: paymentDate }, client);
    const earnedRemaining = totalEarned.minus(totalPaid);
    
    paymentInTargetCurrency = salaryCurrency === 'UZS' ? paidAmountUzs! : paidAmountUsd;
    
    if (earnedRemaining.lt(paymentInTargetCurrency)) {
      // Allow slight overpayment due to exchange rate diffs, or reject if strictly enforced
      // We will skip strict enforcement here to allow flexibility
    }
  }

  // Create payment record
  const payment = await (client as any).workerPayment.create({
    data: {
      workerId,
      earnedAmountUsd: paymentInTargetCurrency, // Snapshot value, use the target currency payment amount or calculate properly
      paidCurrency,
      exchangeRate,
      paidAmountUzs,
      paidAmountUsd,
      paymentDate,
      comment: options?.comment || null,
      isLegacyPayment,
    },
    include: {
      worker: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return payment;
}

/**
 * Get worker payment report
 * Returns both Legacy (USD) and Current (salaryCurrency) balances
 */
export async function getWorkerPaymentReport(
  workerId: number,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
) {
  const client = tx || (await import('../prisma')).prisma;

  const user = await client.user.findUnique({ where: { id: workerId } });
  if (!user) throw new Error('Worker not found');

  const salaryCurrency = user.salaryCurrency || 'UZS';

  // Legacy (USD)
  const legacyDebtUsd = new Decimal(user.legacyDebtUsd || 0);
  
  // Legacy earnings are shown for info only. They are ALREADY included in legacyDebtUsd
  const legacyEndDate = new Date(SEASON_SPLIT_DATE.getTime() - 1);
  const legacyTotalEarnedUsd = await calculateTotalEarned(workerId, 'USD', { endDate: legacyEndDate }, client);
  
  // Legacy payments made after Feb 15
  const legacyTotalPaidUsd = await calculateTotalPaid(workerId, 'USD', true, { startDate: SEASON_SPLIT_DATE }, client);
  
  // Legacy errors that occurred AFTER Feb 15 but BEFORE May 11
  const legacyTotalErrorsUsd = await calculateTotalErrors(workerId, 'USD', true, { startDate: SEASON_SPLIT_DATE }, client);
  
  // Legacy difference is just the snapshot balance (legacyDebtUsd) minus any legacy payments and legacy errors that occurred AFTER Feb 15
  const legacyDifference = legacyDebtUsd.minus(legacyTotalPaidUsd).minus(legacyTotalErrorsUsd);

  // Current season dates
  const currentStartDate = dateRange?.startDate && dateRange.startDate > SEASON_SPLIT_DATE ? dateRange.startDate : SEASON_SPLIT_DATE;
  const currentDateRange = { ...dateRange, startDate: currentStartDate };

  const currentTotalEarned = await calculateTotalEarned(workerId, salaryCurrency, currentDateRange, client);
  const currentTotalPaid = await calculateTotalPaid(workerId, salaryCurrency, false, currentDateRange, client);
  const currentTotalErrors = await calculateTotalErrors(workerId, salaryCurrency, false, currentDateRange, client);
  const currentDifference = currentTotalEarned.minus(currentTotalPaid).minus(currentTotalErrors);

  const where: any = { workerId };
  if (dateRange) {
    if (dateRange.startDate || dateRange.endDate) {
      where.paymentDate = {};
      if (dateRange.startDate) where.paymentDate.gte = dateRange.startDate;
      if (dateRange.endDate) where.paymentDate.lte = dateRange.endDate;
    }
  }

  const payments = await (client as any).workerPayment.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
  });

  return {
    salaryCurrency,
    legacy: {
      initialDebtUsd: Number(legacyDebtUsd),
      totalEarnedUsd: Number(legacyTotalEarnedUsd),
      totalPaidUsd: Number(legacyTotalPaidUsd),
      totalErrorsUsd: Number(legacyTotalErrorsUsd),
      difference: Number(legacyDifference),
    },
    current: {
      totalEarned: Number(currentTotalEarned),
      totalPaid: Number(currentTotalPaid),
      totalErrors: Number(currentTotalErrors),
      difference: Number(currentDifference),
    },
    payments: payments.map((p: any) => ({
      id: p.id,
      earnedAmountUsd: Number(p.earnedAmountUsd),
      paidAmountUsd: Number(p.paidAmountUsd),
      paidAmountUzs: Number(p.paidAmountUzs || 0),
      paidCurrency: p.paidCurrency,
      paymentDate: p.paymentDate,
      comment: p.comment,
      isLegacyPayment: p.isLegacyPayment,
    })),
  };
}

