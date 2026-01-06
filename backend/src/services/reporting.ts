import { Decimal, Currency, ExchangeSource } from '@prisma/client';
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getLatestExchangeRate, getExchangeRate } from './exchange-rate';

/**
 * View modes for financial reporting
 */
export type ReportingView = 'accounting' | 'operational';

/**
 * Report filters for querying transactions
 */
export interface ReportFilters {
  currency?: Currency;
  startDate?: Date;
  endDate?: Date;
  clientId?: number;
  workerId?: number;
  certifierId?: number; // User with CERTIFICATE_WORKER role
  transactionType?: 'INCOME' | 'EXPENSE' | 'SALARY';
  expenseCategory?: string;
}

/**
 * Transaction with exchange rate information
 */
export interface TransactionWithRate {
  id: number;
  type: 'INCOME' | 'EXPENSE' | 'SALARY';
  amount_original: number;
  currency_universal: Currency;
  exchange_rate: number | null;
  exchange_source: ExchangeSource | null;
  exchange_date: Date;
  amount_uzs: number;
  date: Date;
  comment?: string | null;
  expenseCategory?: string | null;
  paymentMethod?: 'CASH' | 'CARD' | null;
  client?: {
    id: number;
    name: string;
  } | null;
  worker?: {
    id: number;
    name: string;
    role: string;
  } | null;
  // Operational view fields
  operationalAmount?: number;
  operationalCurrency?: Currency;
}

/**
 * Exchange rate metadata
 */
export interface ExchangeRateMetadata {
  rate: number;
  source: ExchangeSource;
  transactionCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Report result with accounting and operational views
 */
export interface ReportResult {
  accounting: {
    total: number;
    currency: 'UZS';
    transactions: TransactionWithRate[];
  };
  operational: {
    total: number;
    currency: Currency;
    transactions: TransactionWithRate[];
  };
  metadata: {
    dateRange: { start: Date | null; end: Date | null };
    filters: ReportFilters;
    exchangeRatesUsed: ExchangeRateMetadata[];
    transactionCount: number;
  };
}

/**
 * Get accounting view - all amounts in UZS
 */
export function getAccountingView(data: {
  originalAmount?: Decimal | number | null;
  originalCurrency?: Currency | string | null;
  convertedUzsAmount?: Decimal | number | null;
}): {
  amount: number;
  currency: 'UZS';
  originalAmount?: number;
  originalCurrency?: Currency | string;
} {
  const converted = Number(data.convertedUzsAmount || data.originalAmount || 0);
  
  return {
    amount: converted,
    currency: 'UZS',
    originalAmount: data.originalAmount ? Number(data.originalAmount) : undefined,
    originalCurrency: data.originalCurrency || undefined,
  };
}

/**
 * Get operational view - amounts in original currency
 */
export function getOperationalView(data: {
  originalAmount?: Decimal | number | null;
  originalCurrency?: Currency | string | null;
  convertedUzsAmount?: Decimal | number | null;
}): {
  amount: number;
  currency: Currency | string;
  convertedUzsAmount?: number;
} {
  const original = Number(data.originalAmount || 0);
  const currency = (data.originalCurrency || 'USD') as Currency;
  
  return {
    amount: original,
    currency,
    convertedUzsAmount: data.convertedUzsAmount ? Number(data.convertedUzsAmount) : undefined,
  };
}

/**
 * Get display amount based on view mode
 */
export function getDisplayAmount(
  data: {
    originalAmount?: Decimal | number | null;
    originalCurrency?: Currency | string | null;
    convertedUzsAmount?: Decimal | number | null;
  },
  view: ReportingView = 'accounting'
): {
  amount: number;
  currency: Currency | string;
  displayLabel: string;
} {
  if (view === 'accounting') {
    const accounting = getAccountingView(data);
    return {
      amount: accounting.amount,
      currency: accounting.currency,
      displayLabel: `UZS (Accounting)`,
    };
  } else {
    const operational = getOperationalView(data);
    return {
      amount: operational.amount,
      currency: operational.currency,
      displayLabel: `${operational.currency} (Operational)`,
    };
  }
}

/**
 * Transform transaction for reporting view
 */
export function transformTransactionForView(
  transaction: any,
  view: ReportingView = 'accounting'
) {
  const displayData = getDisplayAmount({
    originalAmount: transaction.originalAmount || transaction.amount,
    originalCurrency: transaction.originalCurrency || transaction.currency,
    convertedUzsAmount: transaction.convertedUzsAmount,
  }, view);

  return {
    ...transaction,
    displayAmount: displayData.amount,
    displayCurrency: displayData.currency,
    displayLabel: displayData.displayLabel,
  };
}

/**
 * Transform client deal amount for reporting view
 */
export function transformClientDealAmountForView(
  client: any,
  view: ReportingView = 'accounting'
) {
  if (!client.dealAmount) {
    return { displayAmount: 0, displayCurrency: 'UZS', displayLabel: 'N/A' };
  }

  const displayData = getDisplayAmount({
    originalAmount: client.dealAmount,
    originalCurrency: client.dealAmountCurrency,
    convertedUzsAmount: client.dealAmountInUzs,
  }, view);

  return {
    ...client,
    displayDealAmount: displayData.amount,
    displayDealCurrency: displayData.currency,
    displayDealLabel: displayData.displayLabel,
  };
}

/**
 * Build where clause for filtering transactions
 */
function buildTransactionWhere(filters: ReportFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = filters.startDate;
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.date.lte = endDate;
    }
  }

  // Currency filter
  if (filters.currency) {
    where.currency_universal = filters.currency;
  }

  // Transaction type filter
  if (filters.transactionType) {
    where.type = filters.transactionType;
  }

  // Client filter
  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  // Worker filter
  if (filters.workerId) {
    where.workerId = filters.workerId;
  }

  // Expense category filter
  if (filters.expenseCategory) {
    where.expenseCategory = filters.expenseCategory;
  }

  return where;
}

/**
 * Transform transaction to TransactionWithRate format
 */
function transformTransaction(tx: any): TransactionWithRate {
  const amountOriginal = Number(tx.amount_original || tx.originalAmount || tx.amount || 0);
  const currencyUniversal = tx.currency_universal || tx.originalCurrency || tx.currency || 'USD';
  const exchangeRate = tx.exchange_rate ? Number(tx.exchange_rate) : null;
  const exchangeSource = tx.exchange_source || null;
  const amountUzs = Number(tx.amount_uzs || tx.convertedUzsAmount || amountOriginal || 0);

  // Calculate operational amount
  let operationalAmount = amountOriginal;
  let operationalCurrency: Currency = currencyUniversal as Currency;

  // If currency is UZS, convert to USD for operational view (using current rate)
  if (currencyUniversal === 'UZS') {
    // For operational view, we'll convert UZS to USD using current rate
    // This will be handled in the report generation function
    operationalAmount = amountUzs; // Will be converted later
    operationalCurrency = 'UZS';
  }

  return {
    id: tx.id,
    type: tx.type,
    amount_original: amountOriginal,
    currency_universal: currencyUniversal as Currency,
    exchange_rate: exchangeRate,
    exchange_source: exchangeSource,
    exchange_date: tx.date || tx.createdAt,
    amount_uzs: amountUzs,
    date: tx.date,
    comment: tx.comment,
    expenseCategory: tx.expenseCategory,
    paymentMethod: tx.paymentMethod,
    client: tx.client ? {
      id: tx.client.id,
      name: tx.client.name,
    } : null,
    worker: tx.worker ? {
      id: tx.worker.id,
      name: tx.worker.name,
      role: tx.worker.role,
    } : null,
    operationalAmount,
    operationalCurrency,
  };
}

/**
 * Aggregate exchange rates used in transactions
 */
function aggregateExchangeRates(transactions: TransactionWithRate[]): ExchangeRateMetadata[] {
  const rateMap = new Map<string, {
    rate: number;
    source: ExchangeSource | null;
    dates: Date[];
    count: number;
  }>();

  transactions.forEach(tx => {
    if (tx.exchange_rate !== null) {
      const key = `${tx.exchange_rate}-${tx.exchange_source || 'UNKNOWN'}`;
      if (!rateMap.has(key)) {
        rateMap.set(key, {
          rate: tx.exchange_rate,
          source: tx.exchange_source || 'CBU',
          dates: [],
          count: 0,
        });
      }
      const entry = rateMap.get(key)!;
      entry.dates.push(tx.date);
      entry.count++;
    }
  });

  return Array.from(rateMap.values()).map(entry => ({
    rate: entry.rate,
    source: entry.source || 'CBU',
    transactionCount: entry.count,
    dateRange: {
      start: new Date(Math.min(...entry.dates.map(d => d.getTime()))),
      end: new Date(Math.max(...entry.dates.map(d => d.getTime()))),
    },
  })).sort((a, b) => a.dateRange.start.getTime() - b.dateRange.start.getTime());
}

/**
 * Convert UZS amounts to USD for operational view
 */
async function convertUzsToUsdForOperational(
  transactions: TransactionWithRate[],
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<TransactionWithRate[]> {
  const client = tx || prisma;
  
  // Get current exchange rate for UZS to USD conversion
  let currentRate: Decimal;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usdToUzsRate = await getExchangeRate(today, 'USD', 'UZS', client as any);
    // Inverse: 1 UZS = 1/USD_RATE USD
    currentRate = new Decimal(1).div(usdToUzsRate);
  } catch (error) {
    console.error('Error fetching exchange rate for operational view:', error);
    // Fallback: use rate of 1 if we can't fetch
    currentRate = new Decimal(1);
  }

  return transactions.map(tx => {
    if (tx.currency_universal === 'UZS' && tx.operationalCurrency === 'UZS') {
      // Convert UZS to USD for operational view
      const usdAmount = Number(tx.amount_uzs) * Number(currentRate);
      return {
        ...tx,
        operationalAmount: usdAmount,
        operationalCurrency: 'USD' as Currency,
      };
    }
    return tx;
  });
}

/**
 * Generate profit report
 */
export async function generateProfitReport(
  filters: ReportFilters = {},
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<ReportResult> {
  const client = tx || prisma;
  
  // Build where clause
  const where = buildTransactionWhere(filters);

  // Get income transactions
  const incomeWhere = { ...where, type: 'INCOME' as const };
  const incomeTransactions = await (client as any).transaction.findMany({
    where: incomeWhere,
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Get expense transactions (both EXPENSE and SALARY)
  const expenseWhere = {
    ...where,
    type: { in: ['EXPENSE', 'SALARY'] as const },
  };
  const expenseTransactions = await (client as any).transaction.findMany({
    where: expenseWhere,
    include: {
      worker: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Transform transactions
  const allTransactions = [
    ...incomeTransactions.map(transformTransaction),
    ...expenseTransactions.map(transformTransaction),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate accounting totals (always UZS)
  const accountingIncome = incomeTransactions.reduce((sum: number, tx: any) => {
    return sum + Number(tx.amount_uzs || tx.convertedUzsAmount || tx.amount || 0);
  }, 0);

  const accountingExpenses = expenseTransactions.reduce((sum: number, tx: any) => {
    return sum + Number(tx.amount_uzs || tx.convertedUzsAmount || tx.amount || 0);
  }, 0);

  const accountingProfit = accountingIncome - accountingExpenses;

  // Calculate operational totals
  const operationalTransactions = await convertUzsToUsdForOperational(allTransactions, client as any);
  
  const operationalIncome = operationalTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + (tx.operationalAmount || 0), 0);

  const operationalExpenses = operationalTransactions
    .filter(tx => tx.type === 'EXPENSE' || tx.type === 'SALARY')
    .reduce((sum, tx) => sum + (tx.operationalAmount || 0), 0);

  const operationalProfit = operationalIncome - operationalExpenses;

  // Aggregate exchange rates
  const exchangeRatesUsed = aggregateExchangeRates(allTransactions);

  // Determine operational currency (most common currency or USD)
  const operationalCurrency: Currency = filters.currency || 'USD';

  return {
    accounting: {
      total: accountingProfit,
      currency: 'UZS',
      transactions: allTransactions,
    },
    operational: {
      total: operationalProfit,
      currency: operationalCurrency,
      transactions: operationalTransactions,
    },
    metadata: {
      dateRange: {
        start: filters.startDate || null,
        end: filters.endDate || null,
      },
      filters,
      exchangeRatesUsed,
      transactionCount: allTransactions.length,
    },
  };
}

/**
 * Generate expense report
 */
export async function generateExpenseReport(
  filters: ReportFilters = {},
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<ReportResult> {
  const client = tx || prisma;
  
  // Build where clause for expenses only
  const where = {
    ...buildTransactionWhere(filters),
    type: { in: ['EXPENSE', 'SALARY'] as const },
  };

  // Handle certifier filter
  if (filters.certifierId) {
    // Filter by worker who is a CERTIFICATE_WORKER
    where.workerId = filters.certifierId;
    const worker = await (client as any).user.findUnique({
      where: { id: filters.certifierId },
      select: { role: true },
    });
    if (worker?.role !== 'CERTIFICATE_WORKER') {
      // If worker is not a certifier, return empty result
      return {
        accounting: { total: 0, currency: 'UZS', transactions: [] },
        operational: { total: 0, currency: 'USD', transactions: [] },
        metadata: {
          dateRange: { start: filters.startDate || null, end: filters.endDate || null },
          filters,
          exchangeRatesUsed: [],
          transactionCount: 0,
        },
      };
    }
  }

  const transactions = await (client as any).transaction.findMany({
    where,
    include: {
      worker: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const transformedTransactions = transactions.map(transformTransaction);
  const operationalTransactions = await convertUzsToUsdForOperational(transformedTransactions, client as any);

  // Calculate totals
  const accountingTotal = transformedTransactions.reduce((sum, tx) => sum + tx.amount_uzs, 0);
  const operationalTotal = operationalTransactions.reduce((sum, tx) => sum + (tx.operationalAmount || 0), 0);

  const exchangeRatesUsed = aggregateExchangeRates(transformedTransactions);
  const operationalCurrency: Currency = filters.currency || 'USD';

  return {
    accounting: {
      total: accountingTotal,
      currency: 'UZS',
      transactions: transformedTransactions,
    },
    operational: {
      total: operationalTotal,
      currency: operationalCurrency,
      transactions: operationalTransactions,
    },
    metadata: {
      dateRange: {
        start: filters.startDate || null,
        end: filters.endDate || null,
      },
      filters,
      exchangeRatesUsed,
      transactionCount: transformedTransactions.length,
    },
  };
}

/**
 * Generate balance report
 */
export async function generateBalanceReport(
  filters: ReportFilters = {},
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<ReportResult> {
  const client = tx || prisma;
  
  const where = buildTransactionWhere(filters);

  const transactions = await (client as any).transaction.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const transformedTransactions = transactions.map(transformTransaction);
  const operationalTransactions = await convertUzsToUsdForOperational(transformedTransactions, client as any);

  // Calculate balance (income - expenses)
  const income = transformedTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount_uzs, 0);

  const expenses = transformedTransactions
    .filter(tx => tx.type === 'EXPENSE' || tx.type === 'SALARY')
    .reduce((sum, tx) => sum + tx.amount_uzs, 0);

  const accountingBalance = income - expenses;

  const operationalIncome = operationalTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + (tx.operationalAmount || 0), 0);

  const operationalExpenses = operationalTransactions
    .filter(tx => tx.type === 'EXPENSE' || tx.type === 'SALARY')
    .reduce((sum, tx) => sum + (tx.operationalAmount || 0), 0);

  const operationalBalance = operationalIncome - operationalExpenses;

  const exchangeRatesUsed = aggregateExchangeRates(transformedTransactions);
  const operationalCurrency: Currency = filters.currency || 'USD';

  return {
    accounting: {
      total: accountingBalance,
      currency: 'UZS',
      transactions: transformedTransactions,
    },
    operational: {
      total: operationalBalance,
      currency: operationalCurrency,
      transactions: operationalTransactions,
    },
    metadata: {
      dateRange: {
        start: filters.startDate || null,
        end: filters.endDate || null,
      },
      filters,
      exchangeRatesUsed,
      transactionCount: transformedTransactions.length,
    },
  };
}

/**
 * Generate transaction report with exchange rates
 */
export async function generateTransactionReport(
  filters: ReportFilters = {},
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<ReportResult> {
  const client = tx || prisma;
  
  const where = buildTransactionWhere(filters);

  const transactions = await (client as any).transaction.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const transformedTransactions = transactions.map(transformTransaction);
  const operationalTransactions = await convertUzsToUsdForOperational(transformedTransactions, client as any);

  const accountingTotal = transformedTransactions.reduce((sum, tx) => sum + tx.amount_uzs, 0);
  const operationalTotal = operationalTransactions.reduce((sum, tx) => sum + (tx.operationalAmount || 0), 0);

  const exchangeRatesUsed = aggregateExchangeRates(transformedTransactions);
  const operationalCurrency: Currency = filters.currency || 'USD';

  return {
    accounting: {
      total: accountingTotal,
      currency: 'UZS',
      transactions: transformedTransactions,
    },
    operational: {
      total: operationalTotal,
      currency: operationalCurrency,
      transactions: operationalTransactions,
    },
    metadata: {
      dateRange: {
        start: filters.startDate || null,
        end: filters.endDate || null,
      },
      filters,
      exchangeRatesUsed,
      transactionCount: transformedTransactions.length,
    },
  };
}

