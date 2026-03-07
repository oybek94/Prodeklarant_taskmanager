import { Prisma, PrismaClient, Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getExchangeRate } from './exchange-rate';

/**
 * Calculate total earned USD for a worker
 * Sums all KpiLog entries where currency_universal='USD'
 */
export async function calculateTotalEarnedUsd(
  workerId: number,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<Decimal> {
  const client = tx || (await import('../prisma')).prisma;

  const where: any = {
    userId: workerId,
    currency_universal: 'USD', // Only count USD earnings
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

  const kpiLogs = await client.kpiLog.findMany({
    where,
    // Select all fields to access both old and new
  });

  let total = new Decimal(0);
  for (const log of kpiLogs) {
    const amount = (log as any).amount_original || (log as any).amount;
    if (amount) {
      total = total.plus(new Decimal(amount));
    }
  }

  return total;
}

/**
 * Get total paid USD for a worker (sum of all WorkerPayment.paidAmountUsd)
 */
export async function calculateTotalPaidUsd(
  workerId: number,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<Decimal> {
  const client = tx || (await import('../prisma')).prisma;

  const where: any = {
    workerId,
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

  const payments = await (client as any).workerPayment.findMany({
    where,
    select: {
      paidAmountUsd: true,
    },
  });

  let total = new Decimal(0);
  for (const payment of payments) {
    total = total.plus(new Decimal(payment.paidAmountUsd));
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
  }
): Promise<any> {
  const client = options?.tx || (await import('../prisma')).prisma;
  const paidAmountDecimal = new Decimal(paidAmount);
  const paymentDate = options?.paymentDate || new Date();

  let paidAmountUsd: Decimal;
  let exchangeRate: Decimal | null = null;
  let paidAmountUzs: Decimal | null = null;

  if (paidCurrency === 'USD') {
    // USD payment - no conversion needed
    paidAmountUsd = paidAmountDecimal;
    exchangeRate = null;
    paidAmountUzs = null;
  } else if (paidCurrency === 'UZS') {
    // UZS payment - need to convert to USD equivalent
    paidAmountUzs = paidAmountDecimal;

    if (options?.exchangeRate) {
      exchangeRate = new Decimal(options.exchangeRate);
    } else {
      // Fetch exchange rate at payment date
      try {
        exchangeRate = await getExchangeRate(paymentDate, 'USD', 'UZS', client);
      } catch (error) {
        throw new Error(
          `Failed to get exchange rate for payment date ${paymentDate.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Convert UZS to USD: paidAmountUsd = paidAmountUzs / exchangeRate
    paidAmountUsd = paidAmountUzs.div(exchangeRate);
  } else {
    throw new Error(`Unsupported payment currency: ${paidCurrency}. Only USD and UZS are supported.`);
  }

  // Calculate earned amount up to this point (total earned minus previous payments)
  const totalEarnedUsd = await calculateTotalEarnedUsd(workerId, { endDate: paymentDate }, client);
  const totalPaidUsd = await calculateTotalPaidUsd(workerId, { endDate: paymentDate }, client);
  const earnedAmountUsd = totalEarnedUsd.minus(totalPaidUsd);

  // Validate: earned amount should be >= paid amount
  if (earnedAmountUsd.lt(paidAmountUsd)) {
    throw new Error(
      `Payment amount (${paidAmountUsd.toString()} USD) exceeds earned amount (${earnedAmountUsd.toString()} USD)`
    );
  }

  // Create payment record
  const payment = await (client as any).workerPayment.create({
    data: {
      workerId,
      earnedAmountUsd,
      paidCurrency,
      exchangeRate,
      paidAmountUzs,
      paidAmountUsd,
      paymentDate,
      comment: options?.comment || null,
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
 * Returns USD values only (never exposes UZS accounting values)
 */
export async function getWorkerPaymentReport(
  workerId: number,
  dateRange?: { startDate?: Date; endDate?: Date },
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<{
  totalEarnedUsd: Decimal;
  totalPaidUsd: Decimal;
  difference: Decimal;
  payments: Array<{
    id: number;
    earnedAmountUsd: number;
    paidAmountUsd: number;
    paidCurrency: Currency;
    paymentDate: Date;
    comment: string | null;
  }>;
}> {
  const client = tx || (await import('../prisma')).prisma;

  const totalEarnedUsd = await calculateTotalEarnedUsd(workerId, dateRange, client);
  const totalPaidUsd = await calculateTotalPaidUsd(workerId, dateRange, tx || client);
  const difference = totalEarnedUsd.minus(totalPaidUsd);

  const where: any = {
    workerId,
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

  const payments = await (client as any).workerPayment.findMany({
    where,
    orderBy: {
      paymentDate: 'desc',
    },
    select: {
      id: true,
      earnedAmountUsd: true,
      paidAmountUsd: true,
      paidCurrency: true,
      paymentDate: true,
      comment: true,
      // Never expose: paidAmountUzs, exchangeRate (these are accounting/internal only)
    },
  });

  return {
    totalEarnedUsd,
    totalPaidUsd,
    difference,
    payments: payments.map((p) => ({
      id: p.id,
      earnedAmountUsd: Number(p.earnedAmountUsd),
      paidAmountUsd: Number(p.paidAmountUsd),
      paidCurrency: p.paidCurrency,
      paymentDate: p.paymentDate,
      comment: p.comment,
    })),
  };
}

