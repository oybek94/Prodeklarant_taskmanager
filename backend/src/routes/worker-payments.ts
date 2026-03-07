import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createWorkerPayment, getWorkerPaymentReport } from '../services/worker-payment';

const router = Router();

// Create payment schema
const createPaymentSchema = z.object({
  workerId: z.number().int().positive(),
  paidCurrency: z.enum(['USD', 'UZS']),
  paidAmount: z.number().positive(),
  exchangeRate: z.number().positive().optional(),
  paymentDate: z.coerce.date().optional(),
  comment: z.string().optional(),
});

// POST /api/worker-payments - Create new worker payment
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { workerId, paidCurrency, paidAmount, exchangeRate, paymentDate, comment } = parsed.data;

    // Verify worker exists
    const worker = await prisma.user.findUnique({
      where: { id: workerId },
      select: { id: true, name: true, role: true },
    });

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Validate worker role
    if (worker.role !== 'DEKLARANT' && worker.role !== 'ADMIN') {
      return res.status(400).json({ error: 'User is not a worker' });
    }

    // Validate currency-specific rules
    if (paidCurrency === 'UZS' && !exchangeRate) {
      // Exchange rate will be auto-fetched in createWorkerPayment if not provided
    }

    // Create payment
    const payment = await createWorkerPayment(
      workerId,
      paidCurrency as Currency,
      new Decimal(paidAmount),
      {
        exchangeRate: exchangeRate ? new Decimal(exchangeRate) : undefined,
        paymentDate,
        comment,
      }
    );

    // Return payment (USD values only, never expose UZS accounting values)
    res.status(201).json({
      id: payment.id,
      workerId: payment.workerId,
      earnedAmountUsd: Number(payment.earnedAmountUsd),
      paidCurrency: payment.paidCurrency,
      paidAmountUsd: Number(payment.paidAmountUsd),
      paymentDate: payment.paymentDate,
      comment: payment.comment,
      createdAt: payment.createdAt,
      worker: payment.worker,
      // Never expose: paidAmountUzs, exchangeRate
    });
  } catch (error: any) {
    console.error('Error creating worker payment:', error);
    res.status(500).json({
      error: error.message || 'Failed to create worker payment',
    });
  }
});

// GET /api/worker-payments/:workerId - Get payment history for worker
router.get('/:workerId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    const { startDate, endDate } = req.query;

    // Check authorization
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Workers can only see their own payments, admins can see all
    if (user.role !== 'ADMIN' && user.id !== workerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dateRange =
      startDate || endDate
        ? {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
          }
        : undefined;

    const report = await getWorkerPaymentReport(workerId, dateRange);

    // Return USD values only (never expose UZS accounting values)
    res.json({
      totalEarnedUsd: Number(report.totalEarnedUsd),
      totalPaidUsd: Number(report.totalPaidUsd),
      difference: Number(report.difference),
      payments: report.payments,
    });
  } catch (error: any) {
    console.error('Error fetching worker payments:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch worker payments',
    });
  }
});

// GET /api/worker-payments/:workerId/report - Get worker payment report
router.get('/:workerId/report', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    const { startDate, endDate } = req.query;

    // Check authorization
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Workers can only see their own reports, admins can see all
    if (user.role !== 'ADMIN' && user.id !== workerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dateRange =
      startDate || endDate
        ? {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
          }
        : undefined;

    const report = await getWorkerPaymentReport(workerId, dateRange);

    // Return USD values only (never expose UZS accounting values)
    res.json({
      totalEarnedUsd: Number(report.totalEarnedUsd),
      totalPaidUsd: Number(report.totalPaidUsd),
      difference: Number(report.difference),
      payments: report.payments,
    });
  } catch (error: any) {
    console.error('Error fetching worker payment report:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch worker payment report',
    });
  }
});

export default router;

