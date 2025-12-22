import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Prisma, Currency } from '@prisma/client';
import { fetchLatestRate, setManualRate, getExchangeRate } from '../services/currency';

const router = Router();

// Balanslar - har bir valyuta uchun alohida
router.get('/balance', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const balances = await prisma.accountBalance.findMany({
      orderBy: [{ currency: 'asc' }, { type: 'asc' }],
    });

    // Agar balanslar bo'lmasa, default yaratish
    // CARD faqat UZS bo'lishi mumkin, shuning uchun CARD-USD yaratilmaydi
    if (balances.length === 0) {
      await prisma.accountBalance.createMany({
        data: [
          { type: 'CASH', balance: 0, currency: 'USD' },
          { type: 'CASH', balance: 0, currency: 'UZS' },
          { type: 'CARD', balance: 0, currency: 'UZS' },
        ],
      });
      const newBalances = await prisma.accountBalance.findMany({
        orderBy: [{ currency: 'asc' }, { type: 'asc' }],
      });
      return res.json({
        byCurrency: {
          USD: newBalances.filter(b => b.currency === 'USD'),
          UZS: newBalances.filter(b => b.currency === 'UZS'),
        },
        all: newBalances,
      });
    }

    // CARD-USD balanslarini filtrlash (ko'rsatmaslik)
    const filteredBalances = balances.filter(b => !(b.type === 'CARD' && b.currency === 'USD'));

    // Valyuta bo'yicha guruhlash (CARD-USD ni olib tashlash)
    const balancesByCurrency: Record<string, any[]> = {};
    filteredBalances.forEach(balance => {
      const currency = balance.currency;
      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = [];
      }
      balancesByCurrency[currency].push(balance);
    });

    res.json({
      byCurrency: balancesByCurrency,
      all: filteredBalances,
    });
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ 
      error: 'Balanslarni yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Balansni yangilash
const updateBalanceSchema = z.object({
  type: z.enum(['CASH', 'CARD']),
  balance: z.number(),
  currency: z.enum(['USD', 'UZS']),
}).refine(
  (data) => !(data.type === 'CARD' && data.currency === 'USD'),
  {
    message: 'Karta faqat UZS valyutasida bo\'lishi mumkin',
    path: ['currency'],
  }
);

router.post('/balance', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = updateBalanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const balance = await prisma.accountBalance.upsert({
      where: {
        type_currency: {
          type: parsed.data.type,
          currency: parsed.data.currency,
        },
      },
      update: {
        balance: new Prisma.Decimal(parsed.data.balance),
      },
      create: {
        type: parsed.data.type,
        balance: new Prisma.Decimal(parsed.data.balance),
        currency: parsed.data.currency,
      },
    });

    res.json(balance);
  } catch (error: any) {
    console.error('Error updating balance:', error);
    res.status(500).json({ 
      error: 'Balansni yangilashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Qarzlar ro'yxati
router.get('/debts', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const debts = await prisma.debt.findMany({
      orderBy: { date: 'desc' },
    });

    // Qarzdorlar ma'lumotlarini olish
    const debtsWithDetails = await Promise.all(
      debts.map(async (debt) => {
        let debtorName = 'Noma\'lum';
        let debtorInfo: any = null;

        if (debt.debtorType === 'CLIENT') {
          const client = await prisma.client.findUnique({
            where: { id: debt.debtorId },
            select: { id: true, name: true, phone: true },
          });
          if (client) {
            debtorName = client.name;
            debtorInfo = client;
          }
        } else if (debt.debtorType === 'WORKER' || debt.debtorType === 'CERTIFICATE_WORKER') {
          const user = await prisma.user.findUnique({
            where: { id: debt.debtorId },
            select: { id: true, name: true, email: true, phone: true, role: true },
          });
          if (user) {
            debtorName = user.name;
            debtorInfo = user;
          }
        }

        return {
          ...debt,
          debtorName,
          debtorInfo,
        };
      })
    );

    res.json(debtsWithDetails);
  } catch (error: any) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ 
      error: 'Qarzlarni yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Qarz qo'shish/yangilash
const debtSchema = z.object({
  debtorType: z.enum(['CLIENT', 'WORKER', 'CERTIFICATE_WORKER', 'OTHER']),
  debtorId: z.number(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'UZS']),
  comment: z.string().optional(),
  date: z.coerce.date(),
});

router.post('/debt', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = debtSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const debt = await prisma.debt.create({
      data: {
        debtorType: parsed.data.debtorType,
        debtorId: parsed.data.debtorId,
        amount: new Prisma.Decimal(parsed.data.amount),
        currency: parsed.data.currency,
        comment: parsed.data.comment,
        date: parsed.data.date,
      },
    });

    res.status(201).json(debt);
  } catch (error: any) {
    console.error('Error creating debt:', error);
    res.status(500).json({ 
      error: 'Qarz qo\'shishda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Qarzni yangilash
router.patch('/debt/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updateData: any = {};

    if (req.body.amount !== undefined) {
      updateData.amount = new Prisma.Decimal(req.body.amount);
    }
    if (req.body.comment !== undefined) {
      updateData.comment = req.body.comment;
    }
    if (req.body.date !== undefined) {
      updateData.date = new Date(req.body.date);
    }

    const debt = await prisma.debt.update({
      where: { id },
      data: updateData,
    });

    res.json(debt);
  } catch (error: any) {
    console.error('Error updating debt:', error);
    res.status(500).json({ 
      error: 'Qarzni yangilashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Qarzni o'chirish
router.delete('/debt/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.debt.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ 
      error: 'Qarzni o\'chirishda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Umumiy statistika - har bir valyuta uchun alohida
router.get('/statistics', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const currencies: Currency[] = ['USD', 'UZS'];
    const statistics: Record<string, any> = {};

    for (const currency of currencies) {
      // Balanslar
      const balances = await prisma.accountBalance.findMany({
        where: { currency },
      });
      const totalBalance = balances.reduce((sum, b) => sum + Number(b.balance), 0);
      const cashBalance = balances.find(b => b.type === 'CASH')?.balance || 0;
      const cardBalance = balances.find(b => b.type === 'CARD')?.balance || 0;

      // Qarzlar
      const allDebts = await prisma.debt.findMany({
        where: { currency },
      });
      const totalDebt = allDebts.reduce((sum, d) => sum + Number(d.amount), 0);
      
      // Qarzlar bo'yicha guruhlash
      const debtsByType = allDebts.reduce((acc: any, debt) => {
        acc[debt.debtorType] = (acc[debt.debtorType] || 0) + Number(debt.amount);
        return acc;
      }, {});

      // Mijozlardan qarz (Client modelidan) - faqat shu valyutadagi
      const clients = await prisma.client.findMany({
        where: {
          dealAmountCurrency: currency,
        },
        include: {
          tasks: {
            select: {
              id: true,
              hasPsr: true,
            },
          },
          transactions: {
            where: { 
              type: 'INCOME',
              currency,
            },
            select: {
              amount: true,
              currency: true,
            },
          },
        },
      });

      let clientDebts = 0;
      for (const client of clients) {
        const dealAmount = Number(client.dealAmount || 0);
        const totalTasks = client.tasks.length;
        const tasksWithPsr = client.tasks.filter(t => t.hasPsr).length;
        const totalDealAmount = (dealAmount * totalTasks) + (10 * tasksWithPsr);
        const totalPaid = client.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const debt = totalDealAmount - totalPaid;
        if (debt > 0) {
          clientDebts += debt;
        }
      }

      // Sof balans
      const netBalance = totalBalance - totalDebt - clientDebts;

      statistics[currency] = {
        balances: {
          total: totalBalance,
          cash: Number(cashBalance),
          card: Number(cardBalance),
        },
        debts: {
          total: totalDebt + clientDebts,
          fromDebtTable: totalDebt,
          fromClients: clientDebts,
          byType: debtsByType,
        },
        netBalance,
      };
    }

    res.json(statistics);
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Statistikani yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Valyuta kurslari
router.get('/exchange-rates', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const rates = await prisma.currencyExchangeRate.findMany({
      orderBy: { date: 'desc' },
      take: 30, // Oxirgi 30 ta kurs
    });

    res.json(rates);
  } catch (error: any) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ 
      error: 'Kurslarni yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Kurs yangilash (API'dan)
router.post('/exchange-rates/fetch', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    await fetchLatestRate();
    res.json({ message: 'Kurs muvaffaqiyatli yangilandi' });
  } catch (error: any) {
    console.error('Error fetching latest rate:', error);
    res.status(500).json({ 
      error: 'Kursni yangilashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Qo'lda kurs kiritish
const setRateSchema = z.object({
  fromCurrency: z.enum(['USD', 'UZS']),
  toCurrency: z.enum(['USD', 'UZS']),
  rate: z.number().positive(),
  date: z.coerce.date().optional(),
});

router.post('/exchange-rates', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = setRateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    await setManualRate(
      parsed.data.fromCurrency,
      parsed.data.toCurrency,
      parsed.data.rate,
      parsed.data.date
    );

    res.json({ message: 'Kurs muvaffaqiyatli saqlandi' });
  } catch (error: any) {
    console.error('Error setting rate:', error);
    res.status(500).json({ 
      error: 'Kursni saqlashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Valyuta konvertatsiya qilish
const convertCurrencySchema = z.object({
  fromType: z.enum(['CASH', 'CARD']),
  fromCurrency: z.enum(['USD', 'UZS']),
  toType: z.enum(['CASH', 'CARD']),
  toCurrency: z.enum(['USD', 'UZS']),
  amount: z.number().positive(),
  rate: z.number().positive(), // Kurs ayriboshlash jarayonida belgilanadi
  comment: z.string().optional(),
  date: z.coerce.date().optional(),
});

router.post('/convert-currency', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = convertCurrencySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { fromType, fromCurrency, toType, toCurrency, amount, rate, comment, date } = parsed.data;

    // Validatsiya: CARD faqat UZS bo'lishi mumkin
    if (fromType === 'CARD' && fromCurrency === 'USD') {
      return res.status(400).json({ error: 'Karta faqat UZS valyutasida bo\'lishi mumkin' });
    }
    if (toType === 'CARD' && toCurrency === 'USD') {
      return res.status(400).json({ error: 'Karta faqat UZS valyutasida bo\'lishi mumkin' });
    }

    // Konvertatsiya qilingan summani hisoblash
    const convertedAmount = fromCurrency === 'USD' && toCurrency === 'UZS'
      ? amount * rate // USD -> UZS: amount * rate
      : amount / rate; // UZS -> USD: amount / rate

    // Transaction yaratish va balanslarni yangilash
    const result = await prisma.$transaction(async (tx) => {
      // Kursni saqlash (agar kerak bo'lsa)
      const targetDate = date || new Date();
      targetDate.setHours(0, 0, 0, 0);
      
      await setManualRate(fromCurrency, toCurrency, rate, targetDate);

      // From balansni topish
      const fromBalance = await tx.accountBalance.findUnique({
        where: {
          type_currency: {
            type: fromType,
            currency: fromCurrency,
          },
        },
      });

      if (!fromBalance) {
        throw new Error(`${fromType}-${fromCurrency} balans topilmadi`);
      }

      if (Number(fromBalance.balance) < amount) {
        throw new Error(`Yetarli mablag' yo'q. Mavjud: ${fromBalance.balance}, Kerak: ${amount}`);
      }

      // To balansni topish yoki yaratish
      const toBalance = await tx.accountBalance.findUnique({
        where: {
          type_currency: {
            type: toType,
            currency: toCurrency,
          },
        },
      });

      // From balansdan ayirish
      const newFromBalance = new Prisma.Decimal(fromBalance.balance).minus(amount);
      await tx.accountBalance.update({
        where: { id: fromBalance.id },
        data: { balance: newFromBalance },
      });

      // To balansga qo'shish
      if (toBalance) {
        const newToBalance = new Prisma.Decimal(toBalance.balance).plus(convertedAmount);
        await tx.accountBalance.update({
          where: { id: toBalance.id },
          data: { balance: newToBalance },
        });
      } else {
        await tx.accountBalance.create({
          data: {
            type: toType,
            currency: toCurrency,
            balance: new Prisma.Decimal(convertedAmount),
          },
        });
      }

      // Konvertatsiya transaction'ini yaratish (EXPENSE va INCOME)
      const convertComment = comment || `Konvertatsiya: ${fromCurrency} -> ${toCurrency} (kurs: ${rate})`;
      
      const expenseTransaction = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: new Prisma.Decimal(amount),
          currency: fromCurrency,
          paymentMethod: fromType,
          comment: convertComment,
          date: date || new Date(),
          expenseCategory: 'Valyuta konvertatsiyasi',
        },
      });

      // INCOME transaction - comment'da "Konvertatsiya" bo'lgani uchun clientId majburiy emas
      const incomeTransaction = await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: new Prisma.Decimal(convertedAmount),
          currency: toCurrency,
          paymentMethod: toType,
          comment: convertComment,
          date: date || new Date(),
          clientId: null, // Konvertatsiya uchun clientId yo'q
        },
      });

      return {
        fromBalance: {
          ...fromBalance,
          balance: newFromBalance,
        },
        toBalance: toBalance ? {
          ...toBalance,
          balance: new Prisma.Decimal(toBalance.balance).plus(convertedAmount),
        } : {
          type: toType,
          currency: toCurrency,
          balance: new Prisma.Decimal(convertedAmount),
        },
        convertedAmount: Number(convertedAmount),
        transactions: [expenseTransaction, incomeTransaction],
      };
    });

    res.json({
      message: 'Valyuta muvaffaqiyatli konvertatsiya qilindi',
      ...result,
    });
  } catch (error: any) {
    console.error('Error converting currency:', error);
    res.status(500).json({ 
      error: 'Valyuta konvertatsiyasida xatolik yuz berdi',
      details: error.message 
    });
  }
});

export default router;

