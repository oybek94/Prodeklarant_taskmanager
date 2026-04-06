import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { PaymentMethod, TransactionType } from '@prisma/client';

export const getDebtPersons = async (req: Request, res: Response) => {
    try {
        const persons = await prisma.debtPerson.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(persons);
    } catch (error) {
        res.status(500).json({ error: 'Shaxslarni olishda xato yuz berdi' });
    }
};

export const createDebt = async (req: Request, res: Response) => {
  try {
    const { name, amount, currency, comment, date, dueDate, originalAmount, exchangeRate, convertedUzsAmount, originalCurrency, exchange_source } = req.body;

    if (!name || !amount || !currency || !date) {
      return res.status(400).json({ error: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    let person = await prisma.debtPerson.findUnique({ where: { name: name.trim() } });
    if (!person) {
        person = await prisma.debtPerson.create({ data: { name: name.trim() } });
    }

    const debt = await prisma.debt.create({
      data: {
        debtPersonId: person.id,
        amount: Number(amount),
        currency,
        comment,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        originalAmount: originalAmount ? Number(originalAmount) : null,
        originalCurrency,
        exchangeRate: exchangeRate ? Number(exchangeRate) : null,
        convertedUzsAmount: convertedUzsAmount ? Number(convertedUzsAmount) : null,
        exchange_source
      }
    });

    res.status(201).json(debt);
  } catch (error) {
    console.error('Qarz yaratish xatosi:', error);
    res.status(500).json({ error: 'Qarzni yaratishda xato yuz berdi' });
  }
};

export const getDebts = async (req: Request, res: Response) => {
  try {
    const { status } = req.query; // status: 'active', 'paid'
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Fetch all records with payments to filter by status correctly
    // Since calculating 'remaining' is done in memory
    const allDebts = await prisma.debt.findMany({
      include: {
        person: true,
        payments: true
      },
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } as any },
        { date: 'desc' }
      ]
    });

    const processedDebts = allDebts.map(debt => {
      const totalPaid = debt.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(debt.amount) - totalPaid;

      return {
        ...debt,
        name: debt.person.name,
        totalPaid,
        remaining
      };
    });
    
    let filteredDebts = processedDebts;
    if (status === 'active') {
      filteredDebts = processedDebts.filter(d => d.remaining > 0);
    } else if (status === 'paid') {
      filteredDebts = processedDebts.filter(d => d.remaining <= 0);
    }

    const total = filteredDebts.length;
    const paginatedDebts = filteredDebts.slice(skip, skip + limit);

    res.json({
      debts: paginatedDebts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Qarzlarni olish xatosi:', error);
    res.status(500).json({ error: 'Qarzlarni olishda xato yuz berdi' });
  }
};


export const getDebtById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const debt = await prisma.debt.findUnique({
            where: { id: Number(id) },
            include: {
                person: true,
                payments: {
                    orderBy: { date: 'desc' },
                    include: { transaction: true }
                }
            }
        });

        if (!debt) {
            return res.status(404).json({ error: 'Qarz topilmadi' });
        }

        const totalPaid = debt.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remaining = Number(debt.amount) - totalPaid;

        res.json({
            ...debt,
            name: debt.person.name,
            totalPaid,
            remaining
        });

    } catch (error) {
        console.error('Qarzni olish xatosi:', error);
        res.status(500).json({ error: 'Qarzni olishda xato yuz berdi' });
    }
};

export const updateDebt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.date) updateData.date = new Date(updateData.date);
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);

    const updated = await prisma.debt.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Qarzni yangilashda xato yuz berdi' });
  }
};

export const deleteDebt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.debt.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Qarzni o\'chirishda xato yuz berdi' });
  }
};

export const addDebtPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, currency, paymentMethod, comment, date, exchangeRate, convertedUzsAmount, originalAmount } = req.body;

        if (!amount || !currency || !date) {
            return res.status(400).json({ error: 'Barcha majburiy maydonlarni to\'ldiring' });
        }

        const debt = await prisma.debt.findUnique({ where: { id: Number(id) } });
        if (!debt) return res.status(404).json({ error: 'Qarz topilmadi' });

        const tType = req.body.transactionType as TransactionType || (Number(debt.amount) > 0 ? 'INCOME' : 'EXPENSE');
        
        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    type: tType,
                    amount: Number(amount),
                    currency,
                    paymentMethod: paymentMethod as PaymentMethod || 'CASH',
                    comment: comment || `Qarz to'lovi. Qarz ID: ${id}`,
                    date: new Date(date),
                    originalAmount: originalAmount ? Number(originalAmount) : null,
                    originalCurrency: debt.currency,
                    exchangeRate: exchangeRate ? Number(exchangeRate) : null,
                    convertedUzsAmount: convertedUzsAmount ? Number(convertedUzsAmount) : null,
                    clientId: null,
                    workerId: null,
                }
            });

            const debtPayment = await tx.debtPayment.create({
                data: {
                    debtId: Number(id),
                    transactionId: transaction.id,
                    amount: Number(amount),
                    currency,
                    paymentMethod: paymentMethod as PaymentMethod || 'CASH',
                    comment,
                    date: new Date(date),
                    exchangeRate: exchangeRate ? Number(exchangeRate) : null,
                    convertedUzsAmount: convertedUzsAmount ? Number(convertedUzsAmount) : null,
                    originalAmount: originalAmount ? Number(originalAmount) : null,
                }
            });

            return debtPayment;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('To\'lov qo\'shish xatosi:', error);
        res.status(500).json({ error: 'To\'lov qo\'shishda xato yuz berdi' });
    }
};

export const getDebtDashboard = async (req: Request, res: Response) => {
  try {
    const debts = await prisma.debt.findMany({
      include: {
        payments: true
      }
    });

    const latestRate = await prisma.currencyExchangeRate.findFirst({
      where: { fromCurrency: 'USD', toCurrency: 'UZS' },
      orderBy: { date: 'desc' }
    });
    const currentRate = latestRate ? Number(latestRate.rate) : 12500;

    let totalActiveDebtUsd = 0;
    let totalPaidUsd = 0;
    
    debts.forEach(d => {
      const paid = d.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(d.amount) - paid;
      
      let remainingInUsd = remaining;
      let paidInUsd = paid;

      if (d.currency === 'UZS') {
          remainingInUsd = remaining / currentRate;
          paidInUsd = paid / currentRate;
      }

      totalPaidUsd += paidInUsd;
      if (remainingInUsd > 0) totalActiveDebtUsd += remainingInUsd;
    });

    res.json({
      totalActiveDebtUsd,
      totalPaidUsd,
      totalDebtsCount: debts.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Dashboard xatosi' });
  }
};
