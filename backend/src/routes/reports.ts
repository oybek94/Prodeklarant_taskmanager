import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Currency } from '@prisma/client';
import {
  generateProfitReport,
  generateExpenseReport,
  generateBalanceReport,
  generateTransactionReport,
  ReportFilters,
} from '../services/reporting';

const router = Router();

// Query parameter validation schema
const reportQuerySchema = z.object({
  currency: z.enum(['USD', 'UZS']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  clientId: z.coerce.number().optional(),
  workerId: z.coerce.number().optional(),
  certifierId: z.coerce.number().optional(),
  transactionType: z.enum(['INCOME', 'EXPENSE', 'SALARY']).optional(),
  expenseCategory: z.string().optional(),
  view: z.enum(['both', 'accounting', 'operational']).optional().default('both'),
});

/**
 * Parse query parameters to ReportFilters
 */
function parseReportFilters(query: any): ReportFilters {
  const parsed = reportQuerySchema.parse(query);
  
  return {
    currency: parsed.currency,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    clientId: parsed.clientId,
    workerId: parsed.workerId,
    certifierId: parsed.certifierId,
    transactionType: parsed.transactionType,
    expenseCategory: parsed.expenseCategory,
  };
}

// GET /api/reports/profit - Profit report
router.get('/profit', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const parsed = reportQuerySchema.parse(req.query);
    const view = parsed.view || 'both';

    const result = await generateProfitReport(filters);

    // Return view based on query parameter
    if (view === 'accounting') {
      return res.json({
        view: 'accounting',
        total: result.accounting.total,
        currency: result.accounting.currency,
        transactions: result.accounting.transactions,
        metadata: result.metadata,
      });
    } else if (view === 'operational') {
      return res.json({
        view: 'operational',
        total: result.operational.total,
        currency: result.operational.currency,
        transactions: result.operational.transactions,
        metadata: result.metadata,
      });
    } else {
      // Return both views
      return res.json(result);
    }
  } catch (error: any) {
    console.error('Error generating profit report:', error);
    res.status(500).json({
      error: 'Foyda hisobotini yaratishda xatolik yuz berdi',
      details: error.message,
    });
  }
});

// GET /api/reports/expense - Expense report
router.get('/expense', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const parsed = reportQuerySchema.parse(req.query);
    const view = parsed.view || 'both';

    const result = await generateExpenseReport(filters);

    if (view === 'accounting') {
      return res.json({
        view: 'accounting',
        total: result.accounting.total,
        currency: result.accounting.currency,
        transactions: result.accounting.transactions,
        metadata: result.metadata,
      });
    } else if (view === 'operational') {
      return res.json({
        view: 'operational',
        total: result.operational.total,
        currency: result.operational.currency,
        transactions: result.operational.transactions,
        metadata: result.metadata,
      });
    } else {
      return res.json(result);
    }
  } catch (error: any) {
    console.error('Error generating expense report:', error);
    res.status(500).json({
      error: 'Xarajat hisobotini yaratishda xatolik yuz berdi',
      details: error.message,
    });
  }
});

// GET /api/reports/balance - Balance report
router.get('/balance', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const parsed = reportQuerySchema.parse(req.query);
    const view = parsed.view || 'both';

    const result = await generateBalanceReport(filters);

    if (view === 'accounting') {
      return res.json({
        view: 'accounting',
        total: result.accounting.total,
        currency: result.accounting.currency,
        transactions: result.accounting.transactions,
        metadata: result.metadata,
      });
    } else if (view === 'operational') {
      return res.json({
        view: 'operational',
        total: result.operational.total,
        currency: result.operational.currency,
        transactions: result.operational.transactions,
        metadata: result.metadata,
      });
    } else {
      return res.json(result);
    }
  } catch (error: any) {
    console.error('Error generating balance report:', error);
    res.status(500).json({
      error: 'Balans hisobotini yaratishda xatolik yuz berdi',
      details: error.message,
    });
  }
});

// GET /api/reports/transactions - Transaction report with exchange rates
router.get('/transactions', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const parsed = reportQuerySchema.parse(req.query);
    const view = parsed.view || 'both';

    const result = await generateTransactionReport(filters);

    if (view === 'accounting') {
      return res.json({
        view: 'accounting',
        total: result.accounting.total,
        currency: result.accounting.currency,
        transactions: result.accounting.transactions,
        metadata: result.metadata,
      });
    } else if (view === 'operational') {
      return res.json({
        view: 'operational',
        total: result.operational.total,
        currency: result.operational.currency,
        transactions: result.operational.transactions,
        metadata: result.metadata,
      });
    } else {
      return res.json(result);
    }
  } catch (error: any) {
    console.error('Error generating transaction report:', error);
    res.status(500).json({
      error: 'Transaction hisobotini yaratishda xatolik yuz berdi',
      details: error.message,
    });
  }
});

// GET /api/reports/summary - Combined summary report
router.get('/summary', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const filters = parseReportFilters(req.query);

    // Generate all reports
    const [profit, expense, balance, transactions] = await Promise.all([
      generateProfitReport(filters),
      generateExpenseReport(filters),
      generateBalanceReport(filters),
      generateTransactionReport(filters),
    ]);

    res.json({
      profit: {
        accounting: { total: profit.accounting.total, currency: profit.accounting.currency },
        operational: { total: profit.operational.total, currency: profit.operational.currency },
      },
      expense: {
        accounting: { total: expense.accounting.total, currency: expense.accounting.currency },
        operational: { total: expense.operational.total, currency: expense.operational.currency },
      },
      balance: {
        accounting: { total: balance.accounting.total, currency: balance.accounting.currency },
        operational: { total: balance.operational.total, currency: balance.operational.currency },
      },
      transactionCount: transactions.metadata.transactionCount,
      exchangeRatesUsed: transactions.metadata.exchangeRatesUsed,
      metadata: {
        dateRange: filters.startDate || filters.endDate
          ? { start: filters.startDate || null, end: filters.endDate || null }
          : null,
        filters,
      },
    });
  } catch (error: any) {
    console.error('Error generating summary report:', error);
    res.status(500).json({
      error: 'Umumiy hisobot yaratishda xatolik yuz berdi',
      details: error.message,
    });
  }
});

export default router;

