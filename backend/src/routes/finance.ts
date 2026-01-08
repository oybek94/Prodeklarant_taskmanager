import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Prisma, Currency } from '@prisma/client';
// ExchangeSource enum from Prisma schema
type ExchangeSource = 'CBU' | 'MANUAL';
import { Decimal } from '@prisma/client/runtime/library';
import { upsertExchangeRate, getLatestExchangeRate, fetchAndSaveDailyRate, getExchangeRate } from '../services/exchange-rate';
import { validateExchangeRateImmutability } from '../services/monetary-validation';

const router = Router();

// Balanslar - har bir valyuta uchun alohida
router.get('/balance', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, currency, view } = req.query;
    const useAccountingView = view !== 'operational';

    // Get account balances
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

    // Get transaction history if filters provided
    let transactionHistory: any[] = [];
    let exchangeRatesUsed: any[] = [];
    
    if (startDate || endDate || currency) {
      const txWhere: any = {};
      if (startDate) txWhere.date = { ...txWhere.date, gte: new Date(startDate as string) };
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        txWhere.date = { ...txWhere.date, lte: end };
      }
      if (currency) txWhere.currency_universal = currency;

      transactionHistory = await prisma.transaction.findMany({
        where: txWhere,
        select: {
          id: true,
          type: true,
          amount_original: true,
          currency_universal: true,
          exchange_rate: true,
          exchange_source: true,
          amount_uzs: true,
          date: true,
          paymentMethod: true,
        } as any,
        orderBy: { date: 'desc' },
        take: 100, // Limit to recent 100 transactions
      });

      // Aggregate exchange rates
      const rateMap = new Map<string, { rate: number; source: string; count: number; dates: Date[] }>();
      transactionHistory.forEach((tx: any) => {
        if (tx.exchange_rate) {
          const key = `${tx.exchange_rate}-${tx.exchange_source || 'CBU'}`;
          if (!rateMap.has(key)) {
            rateMap.set(key, {
              rate: Number(tx.exchange_rate),
              source: tx.exchange_source || 'CBU',
              count: 0,
              dates: [],
            });
          }
          const entry = rateMap.get(key)!;
          entry.count++;
          entry.dates.push(tx.date);
        }
      });

      exchangeRatesUsed = Array.from(rateMap.values()).map(entry => ({
        rate: entry.rate,
        source: entry.source,
        transactionCount: entry.count,
        dateRange: {
          start: new Date(Math.min(...entry.dates.map(d => new Date(d).getTime()))),
          end: new Date(Math.max(...entry.dates.map(d => new Date(d).getTime()))),
        },
      }));
    }

    // Valyuta bo'yicha guruhlash (CARD-USD ni olib tashlash)
    const balancesByCurrency: Record<string, any[]> = {};
    filteredBalances.forEach(balance => {
      const currency = balance.currency;
      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = [];
      }
      balancesByCurrency[currency].push(balance);
    });

    const response: any = {
      view: useAccountingView ? 'accounting' : 'operational',
      byCurrency: balancesByCurrency,
      all: filteredBalances,
    };

    if (transactionHistory.length > 0) {
      response.transactionHistory = transactionHistory;
      response.exchangeRatesUsed = exchangeRatesUsed;
      response.metadata = {
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          currency: currency || null,
        },
        transactionCount: transactionHistory.length,
      };
    }

    res.json(response);
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
    const rates = await (prisma as any).exchangeRate.findMany({
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

// Get exchange rate for a specific date
router.get('/exchange-rates/for-date', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    
    console.log('[ExchangeRate] Request received:', { date, query: req.query });
    
    if (!date) {
      console.log('[ExchangeRate] Missing date parameter');
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    let targetDate: Date;
    try {
      // Parse date string and normalize to UTC midnight to avoid timezone issues
      const dateStr = date as string;
      targetDate = new Date(dateStr + 'T00:00:00.000Z'); // Parse as UTC
      if (isNaN(targetDate.getTime())) {
        console.log('[ExchangeRate] Invalid date format:', date);
        return res.status(400).json({ error: 'Invalid date format' });
      }
      // Ensure it's at UTC midnight
      targetDate.setUTCHours(0, 0, 0, 0);
      console.log('[ExchangeRate] Parsed date (UTC):', targetDate.toISOString(), 'Original:', dateStr);
    } catch (error) {
      console.log('[ExchangeRate] Date parsing error:', error);
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Get exchange rate for the specified date (or most recent before that date)
    let rate: Decimal;
    try {
      console.log('[ExchangeRate] Fetching rate for date:', targetDate.toISOString());
      rate = await getExchangeRate(targetDate, 'USD', 'UZS');
      console.log('[ExchangeRate] Rate found:', rate.toString());
    } catch (error: any) {
      console.error('[ExchangeRate] Error getting exchange rate from database:', error);
      console.error('[ExchangeRate] Error stack:', error?.stack);
      
      // If no rate found in database, try to fetch from CBU API directly
      try {
        console.log('[ExchangeRate] Trying to fetch from CBU API directly');
        const { fetchRateFromCBU } = await import('../services/exchange-rate');
        const cbuRate = await fetchRateFromCBU(targetDate);
        
        if (cbuRate) {
          console.log('[ExchangeRate] CBU API rate found:', cbuRate.toString());
          // Save to database for future use
          try {
            await upsertExchangeRate(targetDate, cbuRate, 'CBU');
            console.log('[ExchangeRate] Rate saved to database');
          } catch (saveError) {
            console.error('[ExchangeRate] Error saving rate to database:', saveError);
          }
          
          return res.status(200).json({
            rate: Number(cbuRate),
            date: targetDate.toISOString().split('T')[0],
            currency: 'USD',
            toCurrency: 'UZS',
            source: 'CBU',
            fallback: false,
          });
        }
      } catch (cbuError: any) {
        console.error('[ExchangeRate] CBU API fetch failed:', cbuError);
      }
      
      // If CBU API also failed, try to get the latest rate from database as fallback
      try {
        console.log('[ExchangeRate] Trying to get latest rate from database as fallback');
        const latestRate = await getLatestExchangeRate('USD', 'UZS');
        console.log('[ExchangeRate] Latest rate found:', latestRate.toString());
        // Return 200 with fallback flag - don't return 404 if we have a fallback rate
        return res.status(200).json({
          rate: Number(latestRate),
          date: targetDate.toISOString().split('T')[0],
          currency: 'USD',
          toCurrency: 'UZS',
          fallback: true,
          message: 'Berilgan sana uchun kurs topilmadi, eng so\'nggi kurs ishlatildi',
        });
      } catch (fallbackError: any) {
        console.error('[ExchangeRate] Fallback also failed:', fallbackError);
        return res.status(404).json({ 
          error: 'Kurs topilmadi',
          details: error.message || 'Berilgan sana uchun valyuta kursi topilmadi va eng so\'nggi kurs ham topilmadi'
        });
      }
    }

    res.json({
      rate: Number(rate),
      date: targetDate.toISOString().split('T')[0],
      currency: 'USD',
      toCurrency: 'UZS',
    });
  } catch (error: any) {
    console.error('[ExchangeRate] Unexpected error:', error);
    console.error('[ExchangeRate] Error stack:', error?.stack);
    res.status(500).json({ 
      error: 'Kursni yuklashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Kurs yangilash (API'dan) - fetches from CBU and saves
// Changed to requireAuth() instead of requireAuth('ADMIN') so Dashboard can fetch today's rate
router.post('/exchange-rates/fetch', requireAuth(), async (_req: AuthRequest, res) => {
  try {
    // Always fetch today's rate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('[ExchangeRate] Fetching today\'s rate from CBU API, date:', today.toISOString().split('T')[0]);
    const rate = await fetchAndSaveDailyRate(today);
    
    res.json({ 
      message: 'Kurs muvaffaqiyatli yangilandi',
      rate: Number(rate),
      date: today.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('[ExchangeRate] Error fetching latest rate:', error);
    res.status(500).json({ 
      error: 'Kursni yangilashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Qo'lda kurs kiritish (manual rate entry)
const setRateSchema = z.object({
  rate: z.number().positive(),
  date: z.coerce.date().optional(),
  source: z.enum(['CBU', 'MANUAL']).optional(),
});

router.post('/exchange-rates', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = setRateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const date = parsed.data.date || new Date();
    const rate = new Decimal(parsed.data.rate);
    const source = (parsed.data.source as ExchangeSource) || 'MANUAL';

    // Check immutability - cannot update rates for past dates
    const existingRate = await (prisma as any).exchangeRate.findUnique({
      where: {
        currency_date: {
          currency: 'USD',
          date: date,
        },
      },
    });

    if (existingRate) {
      const immutabilityCheck = validateExchangeRateImmutability(existingRate.date, date);
      if (!immutabilityCheck.isValid) {
        return res.status(400).json({
          error: 'Exchange rate immutability violation',
          details: immutabilityCheck.errors,
        });
      }
    }

    await upsertExchangeRate(date, rate, source);

    res.json({ message: 'Kurs muvaffaqiyatli saqlandi' });
  } catch (error: any) {
    console.error('Error setting rate:', error);
    res.status(500).json({ 
      error: 'Kursni saqlashda xatolik yuz berdi',
      details: error.message 
    });
  }
});

// Update exchange rate (with immutability check)
router.put('/exchange-rates/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = setRateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existingRate = await (prisma as any).exchangeRate.findUnique({
      where: { id },
    });

    if (!existingRate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    // Check immutability - cannot update rates for past dates
    const immutabilityCheck = validateExchangeRateImmutability(existingRate.date);
    if (!immutabilityCheck.isValid) {
      return res.status(400).json({
        error: 'Cannot update historical exchange rate',
        details: immutabilityCheck.errors,
      });
    }

    const rate = new Decimal(parsed.data.rate);
    const source = (parsed.data.source as ExchangeSource) || existingRate.source;

    await (prisma as any).exchangeRate.update({
      where: { id },
      data: {
        rate,
        source,
      },
    });

    res.json({ message: 'Kurs muvaffaqiyatli yangilandi' });
  } catch (error: any) {
    console.error('Error updating rate:', error);
    res.status(500).json({ 
      error: 'Kursni yangilashda xatolik yuz berdi',
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

      // Kursni saqlash (correct way: use upsertExchangeRate service)
      // Note: upsertExchangeRate only handles USD to UZS rates
      if (fromCurrency === 'USD' && toCurrency === 'UZS') {
        await upsertExchangeRate(targetDate, rate, 'MANUAL');
      }

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

