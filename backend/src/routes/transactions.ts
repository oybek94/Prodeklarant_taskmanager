import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Prisma, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getLatestExchangeRate, getExchangeRate } from '../services/exchange-rate';
import { validateMonetaryFields, calculateAmountUzs } from '../services/monetary-validation';

const router = Router();

const baseSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'SALARY']),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'UZS']), // Original currency
  exchangeRate: z.number().positive().optional(), // Optional - will auto-fetch if not provided
  exchangeSource: z.enum(['CBU', 'MANUAL']).optional(), // Optional - defaults to CBU
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
  comment: z.string().optional(),
  date: z.coerce.date(),
  clientId: z.number().optional(),
  workerId: z.number().optional(),
  expenseCategory: z.string().optional(),
  taskId: z.number().optional(),
  branchId: z.number().optional(),
});

router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  const { type } = req.query;
  const user = req.user;
  
  // Build where clause based on user role
  const where: any = {};
  
  if (type) {
    where.type = type as any;
  }
  
  // If user is not ADMIN, show only transactions where they are the worker
  if (user && user.role !== 'ADMIN') {
    where.workerId = user.id;
  }
  
  const items = await prisma.transaction.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      worker: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });
  res.json(items);
});

router.get('/stats/monthly', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { view, currency } = req.query; // 'accounting' or 'operational' (default: accounting)
    const useAccountingView = view !== 'operational';

  const now = new Date();
  // Current month: from first day of current month to end of current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  currentMonthEnd.setHours(23, 59, 59, 999);

  // Last month: from first day of last month to end of last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  // Build where clause with currency filter
  const currentMonthWhere: any = {
    date: { gte: currentMonthStart, lte: currentMonthEnd },
  };
  const lastMonthWhere: any = {
    date: { gte: lastMonthStart, lte: lastMonthEnd },
  };

  if (currency) {
    currentMonthWhere.currency_universal = currency;
    lastMonthWhere.currency_universal = currency;
  }

  // Get transactions for current month
  const currentMonthTransactions = await prisma.transaction.findMany({
    where: currentMonthWhere,
    select: {
      id: true,
      type: true,
      amount_original: true,
      currency_universal: true,
      exchange_rate: true,
      exchange_source: true,
      amount_uzs: true,
      date: true,
    },
  });

  // Get transactions for last month
  const lastMonthTransactions = await prisma.transaction.findMany({
    where: lastMonthWhere,
    select: {
      id: true,
      type: true,
      amount_original: true,
      currency_universal: true,
      exchange_rate: true,
      exchange_source: true,
      amount_uzs: true,
      date: true,
    },
  });

  // Calculate stats using amount_uzs (accounting base currency)
  const calculateStats = (transactions: any[]) => {
    let income = 0;
    let expense = 0;
    let salary = 0;
    const exchangeRates = new Set<string>();

    for (const tx of transactions) {
      // Always use amount_uzs for accounting calculations
      const amount = Number(tx.amount_uzs || tx.convertedUzsAmount || tx.amount || 0);
      
      // Track exchange rates used
      if (tx.exchange_rate) {
        exchangeRates.add(`${tx.exchange_rate}-${tx.exchange_source || 'CBU'}`);
      }

      if (tx.type === 'INCOME') {
        income += amount;
      } else if (tx.type === 'EXPENSE') {
        expense += amount;
      } else if (tx.type === 'SALARY') {
        salary += amount;
      }
    }

    return { income, expense, salary, exchangeRates: Array.from(exchangeRates) };
  };

  const current = calculateStats(currentMonthTransactions);
  const last = calculateStats(lastMonthTransactions);

  const totalExpense = current.expense + current.salary;
  const net = current.income - totalExpense;

  const lastTotalExpense = last.expense + last.salary;
  const lastNet = last.income - lastTotalExpense;

  // Calculate percentage changes
  const incomeChange = last.income > 0 ? ((current.income - last.income) / last.income) * 100 : (current.income > 0 ? 100 : 0);
  const expenseChange = lastTotalExpense > 0 ? ((totalExpense - lastTotalExpense) / lastTotalExpense) * 100 : (totalExpense > 0 ? 100 : 0);
  const netChange = lastNet !== 0 ? ((net - lastNet) / Math.abs(lastNet)) * 100 : (net !== 0 ? (net > 0 ? 100 : -100) : 0);

  // Calculate operational view (USD) if requested
  let operational: any = null;
  if (!useAccountingView) {
    // For operational view, convert UZS amounts to USD using current rate
    try {
      const currentUsdToUzsRate = await getLatestExchangeRate('USD', 'UZS');
      const usdRate = Number(currentUsdToUzsRate);
      
      operational = {
        income: {
          current: current.income / usdRate,
          change: incomeChange, // Percentage change is same
        },
        expense: {
          current: totalExpense / usdRate,
          change: expenseChange,
        },
        net: {
          current: net / usdRate,
          change: netChange,
        },
        currency: 'USD',
      };
    } catch (error) {
      console.error('Error calculating operational view:', error);
    }
  }

  res.json({
    view: useAccountingView ? 'accounting' : 'operational',
    accounting: {
      currency: 'UZS',
      income: {
        current: current.income,
        change: incomeChange,
      },
      expense: {
        current: totalExpense,
        change: expenseChange,
      },
      net: {
        current: net,
        change: netChange,
      },
    },
    ...(operational && { operational }),
    metadata: {
      exchangeRatesUsed: current.exchangeRates.map(rate => {
        const [value, source] = rate.split('-');
        return { rate: parseFloat(value), source };
      }),
      transactionCount: {
        current: currentMonthTransactions.length,
        last: lastMonthTransactions.length,
      },
      filters: {
        currency: currency || null,
      },
    },
  });
  } catch (error: any) {
    console.error('Error fetching monthly stats:', error);
    res.status(500).json({ 
      error: 'Oylik statistikani yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Get worker salary statistics (for ADMIN only)
router.get('/worker-stats', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    // Get all KPI logs (total earned) - use amount_uzs for accounting
    const allKpiLogs = await prisma.kpiLog.findMany({});
    const totalEarned = allKpiLogs.reduce((sum: number, log: any) => sum + Number(log.amount_uzs || log.convertedUzsAmount || log.amount || 0), 0);

    // Get all SALARY transactions (total paid) - use amount_uzs for accounting
    const allSalaryTransactions = await prisma.transaction.findMany({
      where: {
        type: 'SALARY',
      },
    });
    const totalPaid = allSalaryTransactions.reduce((sum: number, t: any) => sum + Number(t.amount_uzs || t.convertedUzsAmount || t.amount || 0), 0);

    // Calculate total pending
    const totalPending = totalEarned - totalPaid;

    res.json({
      totalEarned,
      totalPaid,
      totalPending,
    });
  } catch (error: any) {
    console.error('Error fetching worker stats:', error);
    res.status(500).json({ 
      error: 'Ish xaqi statistikasini yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;
  // Validation by type
  // INCOME uchun clientId majburiy, lekin konvertatsiya uchun istisno (comment'da "Konvertatsiya" bo'lsa)
  if (data.type === 'INCOME' && !data.clientId && !data.comment?.includes('Konvertatsiya')) {
    return res.status(400).json({ error: 'clientId required for INCOME' });
  }
  if (data.type === 'EXPENSE' && !data.expenseCategory) {
    return res.status(400).json({ error: 'expenseCategory required for EXPENSE' });
  }
  if (data.type === 'SALARY' && !data.workerId) {
    return res.status(400).json({ error: 'workerId required for SALARY' });
  }
  // CARD faqat UZS bo'lishi mumkin
  if (data.paymentMethod === 'CARD' && data.currency === 'USD') {
    return res.status(400).json({ error: 'Karta faqat UZS valyutasida bo\'lishi mumkin' });
  }

  // Determine currency from request body, default to USD
  let originalCurrency: Currency = (data.currency as Currency) || 'USD';

  const originalAmount = new Decimal(data.amount);
  const exchangeSource: ExchangeSource = (data.exchangeSource as ExchangeSource) || 'CBU';

  // Get or calculate exchange rate
  let exchangeRate: Decimal;
  if (data.exchangeRate) {
    exchangeRate = new Decimal(data.exchangeRate);
  } else {
    // Auto-fetch exchange rate for transaction date if not provided
    // Use transaction date instead of current date
    const transactionDate = data.date || new Date();
    try {
      exchangeRate = await getExchangeRate(transactionDate, originalCurrency, 'UZS', undefined, exchangeSource);
    } catch (error) {
      return res.status(400).json({
        error: `Exchange rate is required for currency ${originalCurrency}. Failed to fetch rate for date ${transactionDate.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // If UZS, exchange rate must be 1
  if (originalCurrency === 'UZS' && !exchangeRate.eq(1)) {
    exchangeRate = new Decimal(1);
  }

  // Calculate converted UZS amount
  const amountUzs = calculateAmountUzs(originalAmount, originalCurrency, exchangeRate);

  // Validate universal monetary fields
  const validation = validateMonetaryFields({
    amount_original: originalAmount,
    currency: originalCurrency,
    exchange_rate: exchangeRate,
    amount_uzs: amountUzs,
  });

  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Monetary validation failed',
      details: validation.errors,
    });
  }

  // Transaction yaratish va balansni yangilash
  const result = await prisma.$transaction(async (tx) => {
    // Transaction yaratish
    const created = await tx.transaction.create({
      data: {
        type: data.type,
        // Keep old fields for backward compatibility
        amount: originalAmount,
        currency: originalCurrency,
        originalAmount,
        originalCurrency,
        exchangeRate,
        convertedUzsAmount: amountUzs,
        // Universal monetary fields
        amount_original: originalAmount,
        currency_universal: originalCurrency,
        exchange_rate: exchangeRate,
        amount_uzs: amountUzs,
        exchange_source: exchangeSource,
        paymentMethod: data.paymentMethod ?? null,
        comment: data.comment,
        date: data.date,
        clientId: data.clientId ?? null,
        workerId: data.workerId ?? null,
        expenseCategory: data.expenseCategory ?? null,
        taskId: data.taskId ?? null,
        branchId: data.branchId ?? null,
      },
    });

    // Balansni yangilash (faqat paymentMethod bo'lsa) - use amount_uzs for accounting balance
    // Internal accounting always uses UZS as base currency
    if (data.paymentMethod) {
      const amount = amountUzs; // Use UZS amount for balance updates
      const balanceChange = data.type === 'INCOME' ? amount : amount.negated();

      // Balansni topish yoki yaratish
      const existingBalance = await tx.accountBalance.findUnique({
          where: {
            type_currency: {
              type: data.paymentMethod,
              currency: originalCurrency,
            },
          },
      });

      if (existingBalance) {
        // Mavjud balansni yangilash
        const newBalance = new Prisma.Decimal(existingBalance.balance).plus(balanceChange);
        await tx.accountBalance.update({
          where: { id: existingBalance.id },
          data: { balance: newBalance },
        });
      } else {
        // Yangi balans yaratish
        await tx.accountBalance.create({
          data: {
            type: data.paymentMethod,
            currency: 'UZS', // Always use UZS for accounting balances
            balance: balanceChange,
          },
        });
      }
    }

    return created;
  });

  // If this is a SALARY transaction, also create a WorkerPayment record
  if (data.type === 'SALARY' && data.workerId) {
    try {
      const { createWorkerPayment } = await import('../services/worker-payment');
      await createWorkerPayment(
        data.workerId,
        originalCurrency,
        originalAmount,
        {
          exchangeRate: exchangeRate,
          paymentDate: data.date,
          comment: data.comment || undefined,
        }
      );
    } catch (error) {
      console.error('Failed to create WorkerPayment record for SALARY transaction:', error);
      // Don't fail the transaction creation, just log the error
    }
  }

  res.status(201).json(result);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.transaction.findUnique({
    where: { id },
    include: { client: true, worker: true },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  
  // Eski transaction'ni olish
  const oldTransaction = await prisma.transaction.findUnique({
    where: { id },
  });
  
  if (!oldTransaction) {
    return res.status(404).json({ error: 'Transaction topilmadi' });
  }

  // Prevent exchange_rate updates on existing transactions (immutability)
  if (req.body.exchangeRate !== undefined) {
    return res.status(400).json({ 
      error: 'Cannot update exchange_rate on existing transaction. Exchange rates are immutable after save.' 
    });
  }

  const parsed = baseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;
  if (data.type === 'INCOME' && !data.clientId) {
    return res.status(400).json({ error: 'clientId required for INCOME' });
  }
  if (data.type === 'EXPENSE' && !data.expenseCategory) {
    return res.status(400).json({ error: 'expenseCategory required for EXPENSE' });
  }
  if (data.type === 'SALARY' && !data.workerId) {
    return res.status(400).json({ error: 'workerId required for SALARY' });
  }
  // CARD faqat UZS bo'lishi mumkin
  if (data.paymentMethod === 'CARD' && data.currency === 'USD') {
    return res.status(400).json({ error: 'Karta faqat UZS valyutasida bo\'lishi mumkin' });
  }

  // Determine currency from request body, default to USD
  let originalCurrency: Currency = (data.currency as Currency) || 'USD';

  const originalAmount = new Decimal(data.amount);
  const exchangeSource: ExchangeSource = (data.exchangeSource as ExchangeSource) || 'CBU';

  // Get or calculate exchange rate
  // For updates, use existing transaction's exchange rate (immutable)
  let exchangeRate: Decimal;
  if (oldTransaction.exchange_rate) {
    exchangeRate = oldTransaction.exchange_rate;
  } else if (oldTransaction.exchangeRate) {
    exchangeRate = new Decimal(oldTransaction.exchangeRate);
  } else {
    // Fallback: use transaction date for rate lookup
    const transactionDate = data.date || oldTransaction.date;
    try {
      exchangeRate = await getExchangeRate(transactionDate, originalCurrency, 'UZS', undefined, exchangeSource);
    } catch (error) {
      return res.status(400).json({
        error: `Exchange rate is required for currency ${originalCurrency}. Failed to fetch rate for date ${transactionDate.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // If UZS, exchange rate must be 1
  if (originalCurrency === 'UZS' && !exchangeRate.eq(1)) {
    exchangeRate = new Decimal(1);
  }

  const amountUzs = calculateAmountUzs(originalAmount, originalCurrency, exchangeRate);

  const validation = validateMonetaryFields({
    amount_original: originalAmount,
    currency: originalCurrency,
    exchange_rate: exchangeRate,
    amount_uzs: amountUzs,
  });

  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Monetary validation failed',
      details: validation.errors,
    });
  }

  // Transaction yangilash va balansni to'g'rilash
  const result = await prisma.$transaction(async (tx) => {
    // Eski balansni qaytarish (agar paymentMethod bo'lsa)
    if (oldTransaction.paymentMethod) {
      const oldAmount = new Prisma.Decimal(oldTransaction.originalAmount || oldTransaction.amount);
      const oldCurrency = oldTransaction.originalCurrency || oldTransaction.currency;
      const oldBalanceChange = oldTransaction.type === 'INCOME' 
        ? oldAmount.negated() 
        : oldAmount;

      const oldBalance = await tx.accountBalance.findUnique({
        where: {
          type_currency: {
            type: oldTransaction.paymentMethod,
            currency: oldCurrency,
          },
        },
      });

      if (oldBalance) {
        const newBalance = new Prisma.Decimal(oldBalance.balance).plus(oldBalanceChange);
        await tx.accountBalance.update({
          where: { id: oldBalance.id },
          data: { balance: newBalance },
        });
      }
    }

    // Transaction yangilash
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        type: data.type,
        // Keep old fields for backward compatibility
        amount: originalAmount,
        currency: originalCurrency,
        originalAmount,
        originalCurrency,
        exchangeRate,
        convertedUzsAmount: amountUzs,
        // Universal monetary fields
        amount_original: originalAmount,
        currency_universal: originalCurrency,
        exchange_rate: exchangeRate,
        amount_uzs: amountUzs,
        exchange_source: exchangeSource,
        paymentMethod: data.paymentMethod ?? null,
        comment: data.comment,
        date: data.date,
        clientId: data.clientId ?? null,
        workerId: data.workerId ?? null,
        expenseCategory: data.expenseCategory ?? null,
        taskId: data.taskId ?? null,
        branchId: data.branchId ?? null,
      },
    });

    // Yangi balansni yangilash (agar paymentMethod bo'lsa)
    if (data.paymentMethod) {
      const newAmount = originalAmount;
      const newBalanceChange = data.type === 'INCOME' ? newAmount : newAmount.negated();

      const existingBalance = await tx.accountBalance.findUnique({
          where: {
            type_currency: {
              type: data.paymentMethod,
              currency: originalCurrency,
            },
          },
      });

      if (existingBalance) {
        const newBalance = new Prisma.Decimal(existingBalance.balance).plus(newBalanceChange);
        await tx.accountBalance.update({
          where: { id: existingBalance.id },
          data: { balance: newBalance },
        });
      } else {
        await tx.accountBalance.create({
          data: {
            type: data.paymentMethod,
            currency: originalCurrency,
            balance: newBalanceChange,
          },
        });
      }
    }

    return updated;
  });

  res.json(result);
});

router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  
  // Eski transaction'ni olish
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction topilmadi' });
  }

  // Transaction o'chirish va balansni qaytarish
  await prisma.$transaction(async (tx) => {
    // Balansni qaytarish (agar paymentMethod bo'lsa)
    if (transaction.paymentMethod) {
      const amount = new Prisma.Decimal(transaction.originalAmount || transaction.amount);
      const currency = transaction.originalCurrency || transaction.currency;
      const balanceChange = transaction.type === 'INCOME' 
        ? amount.negated() 
        : amount;

      const balance = await tx.accountBalance.findUnique({
        where: {
          type_currency: {
            type: transaction.paymentMethod,
            currency: currency,
          },
        },
      });

      if (balance) {
        const newBalance = new Prisma.Decimal(balance.balance).plus(balanceChange);
        await tx.accountBalance.update({
          where: { id: balance.id },
          data: { balance: newBalance },
        });
      }
    }

    // Transaction o'chirish
    await tx.transaction.delete({ where: { id } });
  });

  res.status(204).send();
});

export default router;

