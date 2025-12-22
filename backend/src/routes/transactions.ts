import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

const baseSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'SALARY']),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'UZS']), // Majburiy
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

router.get('/stats/monthly', async (req, res) => {
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

  // Current month stats
  const currentMonthIncome = await prisma.transaction.aggregate({
    where: {
      type: 'INCOME',
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { amount: true },
  });

  const currentMonthExpense = await prisma.transaction.aggregate({
    where: {
      type: 'EXPENSE',
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { amount: true },
  });

  const currentMonthSalary = await prisma.transaction.aggregate({
    where: {
      type: 'SALARY',
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { amount: true },
  });

  // Last month stats for comparison
  const lastMonthIncome = await prisma.transaction.aggregate({
    where: {
      type: 'INCOME',
      date: { gte: lastMonthStart, lte: lastMonthEnd },
    },
    _sum: { amount: true },
  });

  const lastMonthExpense = await prisma.transaction.aggregate({
    where: {
      type: 'EXPENSE',
      date: { gte: lastMonthStart, lte: lastMonthEnd },
    },
    _sum: { amount: true },
  });

  const lastMonthSalary = await prisma.transaction.aggregate({
    where: {
      type: 'SALARY',
      date: { gte: lastMonthStart, lte: lastMonthEnd },
    },
    _sum: { amount: true },
  });

  // Convert Decimal to Number
  const income = Number(currentMonthIncome._sum.amount || 0);
  const expense = Number(currentMonthExpense._sum.amount || 0);
  const salary = Number(currentMonthSalary._sum.amount || 0);
  const totalExpense = expense + salary;
  const net = income - totalExpense;

  const lastIncome = Number(lastMonthIncome._sum.amount || 0);
  const lastExpense = Number(lastMonthExpense._sum.amount || 0);
  const lastSalary = Number(lastMonthSalary._sum.amount || 0);
  const lastTotalExpense = lastExpense + lastSalary;
  const lastNet = lastIncome - lastTotalExpense;

  // Calculate percentage changes
  const incomeChange = lastIncome > 0 ? ((income - lastIncome) / lastIncome) * 100 : (income > 0 ? 100 : 0);
  const expenseChange = lastTotalExpense > 0 ? ((totalExpense - lastTotalExpense) / lastTotalExpense) * 100 : (totalExpense > 0 ? 100 : 0);
  const netChange = lastNet !== 0 ? ((net - lastNet) / Math.abs(lastNet)) * 100 : (net !== 0 ? (net > 0 ? 100 : -100) : 0);

  res.json({
    income: {
      current: income,
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
  });
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

  // Transaction yaratish va balansni yangilash
  const result = await prisma.$transaction(async (tx) => {
    // Transaction yaratish
    const created = await tx.transaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        currency: data.currency || 'USD',
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

    // Balansni yangilash (faqat paymentMethod bo'lsa)
    if (data.paymentMethod) {
      const amount = new Prisma.Decimal(data.amount);
      const balanceChange = data.type === 'INCOME' ? amount : amount.negated();

      // Balansni topish yoki yaratish
      const existingBalance = await tx.accountBalance.findUnique({
          where: {
            type_currency: {
              type: data.paymentMethod,
              currency: data.currency,
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
            currency: data.currency,
            balance: balanceChange,
          },
        });
      }
    }

    return created;
  });

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

  // Transaction yangilash va balansni to'g'rilash
  const result = await prisma.$transaction(async (tx) => {
    // Eski balansni qaytarish (agar paymentMethod bo'lsa)
    if (oldTransaction.paymentMethod) {
      const oldAmount = new Prisma.Decimal(oldTransaction.amount);
      const oldBalanceChange = oldTransaction.type === 'INCOME' 
        ? oldAmount.negated() 
        : oldAmount;

      const oldBalance = await tx.accountBalance.findUnique({
        where: {
          type_currency: {
            type: oldTransaction.paymentMethod,
            currency: oldTransaction.currency,
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
        amount: data.amount,
        currency: data.currency || 'USD',
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
      const newAmount = new Prisma.Decimal(data.amount);
      const newBalanceChange = data.type === 'INCOME' ? newAmount : newAmount.negated();

      const existingBalance = await tx.accountBalance.findUnique({
          where: {
            type_currency: {
              type: data.paymentMethod,
              currency: data.currency,
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
            currency: data.currency || 'USD',
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
      const amount = new Prisma.Decimal(transaction.amount);
      const balanceChange = transaction.type === 'INCOME' 
        ? amount.negated() 
        : amount;

      const balance = await tx.accountBalance.findUnique({
        where: {
          type_currency: {
            type: transaction.paymentMethod,
            currency: transaction.currency,
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

