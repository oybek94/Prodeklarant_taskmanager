import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getWorkerPaymentReport } from '../services/worker-payment';

const router = Router();

// Stage fixed prices mapping (USD)
const STAGE_FIXED_PRICES: Record<string, number> = {
  'Invoys': 3.0,
  'Zayavka': 3.0,
  'TIR-SMR': 1.5,
  'Sertifikat olib chiqish': 1.25,
  'Deklaratsiya': 2.0,
  'Tekshirish': 2.0,
  'Topshirish': 1.25,
  'Pochta': 1.0,
};

// GET /api/workers - Get all workers (users with DEKLARANT or ADMIN role)
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    // If user is not ADMIN, show only their own data
    const where: any = {};
    if (user && user.role !== 'ADMIN') {
      where.id = user.id;
    }
    
    const workers = await prisma.user.findMany({
      where: {
        ...where,
        role: {
          in: ['DEKLARANT', 'ADMIN', 'MANAGER'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        position: true,
        salary: true,
        active: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    res.json(workers);
  } catch (error: any) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// O'tgan yil qarzlarini boshqarish - IMPORTANT: Bu endpoint'lar /:id/stats dan OLDIN bo'lishi kerak
// GET /api/workers/:id/previous-year-debt - Bitta ishchining o'tgan yil qarzini olish
router.get('/:id/previous-year-debt', requireAuth(), async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear() - 1;

    console.log('Previous year debt request:', { workerId, year: targetYear });

    const debt = await prisma.previousYearWorkerDebt.findUnique({
      where: {
        workerId_year: {
          workerId: workerId,
          year: targetYear,
        },
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

    console.log('Previous year debt found:', debt);

    // Agar ma'lumotlar topilmasa, barcha yillar uchun qidirib ko'ramiz
    if (!debt) {
      const allDebts = await prisma.previousYearWorkerDebt.findMany({
        where: {
          workerId: workerId,
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
      console.log('All previous year debts for worker:', allDebts);
    }

    res.json(debt || null);
  } catch (error: any) {
    console.error('Error loading previous year debt:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

router.get('/:id/stats', requireAuth(), async (req, res) => {
  const workerId = parseInt(req.params.id);
  const { period = 'month', startDate, endDate } = req.query;

  let dateFilter: any = {};
  const now = new Date();

  if (period === 'day') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    dateFilter = { gte: today };
  } else if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { gte: weekAgo };
  } else if (period === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { gte: monthAgo };
  } else if (period === 'year') {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    dateFilter = { gte: yearAgo };
  } else if (period === 'all') {
    dateFilter = {}; // No date filtering, include all history
  }

  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  const completedStagesData = await prisma.taskStage.findMany({
    where: {
      assignedToId: workerId,
      status: 'TAYYOR',
      completedAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    select: {
      name: true,
      completedAt: true,
    },
  });
  const completedStages = completedStagesData.length;

  // KPI summasini KpiLog'dan olamiz (o'sha paytdagi tarif); yangi tariflar eski ishtiroklarga ta'sir qilmasin
  const kpiLogs = await prisma.kpiLog.findMany({
    where: {
      userId: workerId,
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      currency_universal: 'USD', // Only count USD earnings
    },
    select: {
      id: true,
      amount_original: true, // USD amount
      stageName: true,
      createdAt: true,
    },
  });
  const totalKPI = kpiLogs.reduce((sum, log) => sum + Number((log as any).amount_original ?? (log as any).amount ?? 0), 0);

  // Get worker payment report - USD values only
  const paymentReport = await getWorkerPaymentReport(workerId, {
    startDate: Object.keys(dateFilter).length > 0 ? dateFilter.gte : undefined,
    endDate: Object.keys(dateFilter).length > 0 ? dateFilter.lte : undefined,
  });

  const totalSalary = Number(paymentReport.totalPaidUsd); // USD equivalent

  // Tasks assigned
  const tasksAssigned = await prisma.taskStage.count({
    where: {
      assignedToId: workerId,
      status: 'TAYYOR',
      completedAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
  });

  res.json({
    period,
    totalKPI, // USD
    completedStages,
    totalSalary, // USD equivalent
    totalPaid: totalSalary, // USD equivalent (alias for backward compatibility)
    totalEarned: Number(paymentReport.totalEarnedUsd), // USD
    pending: Number(paymentReport.difference), // USD
    tasksAssigned,
    kpiLogs: kpiLogs.map((log: any) => ({
      id: log.id,
      amount: Number(log.amount_original ?? log.amount ?? 0), // USD only
      stageName: log.stageName,
      createdAt: log.createdAt,
    })),
    payments: paymentReport.payments.map((p: any) => ({
      id: p.id,
      earnedAmountUsd: p.earnedAmountUsd, // USD
      paidAmountUsd: p.paidAmountUsd, // USD equivalent
      paidCurrency: p.paidCurrency,
      paymentDate: p.paymentDate,
      comment: p.comment,
    })),
  });
});

router.get('/:id/stage-stats', requireAuth(), async (req, res) => {
  const workerId = parseInt(req.params.id);
  const { period = 'month', startDate, endDate } = req.query;

  let dateFilter: any = {};
  const now = new Date();

  if (period === 'day') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    dateFilter = { gte: today };
  } else if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { gte: weekAgo };
  } else if (period === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { gte: monthAgo };
  } else if (period === 'year') {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    dateFilter = { gte: yearAgo };
  } else if (period === 'all') {
    dateFilter = {}; // No date filtering, include all history
  }

  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  // Load fixed stage prices from KPI configs (fallback when KpiLog is missing for old data)
  const kpiConfigs = await prisma.kpiConfig.findMany();
  const stagePriceMap = new Map<string, number>();
  kpiConfigs.forEach((config) => {
    stagePriceMap.set(config.stageName, Number(config.price));
  });

  // Get all completed stages for this worker
  const completedStages = await prisma.taskStage.findMany({
    where: {
      assignedToId: workerId,
      status: 'TAYYOR',
      completedAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    include: {
      task: {
        select: {
          id: true,
          branchId: true,
          snapshotWorkerPrice: true,
          createdAt: true,
        },
      },
    },
  });

  // Eski jarayonlar uchun summa KpiLog'dan (o'sha paytdagi tarif), yangi tariflar ta'sir qilmasin
  const kpiLogs = await prisma.kpiLog.findMany({
    where: {
      userId: workerId,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    },
    select: { taskId: true, stageName: true, amount: true },
  });
  const normalizeKpiStageName = (name: string): string => {
    if (name === 'Xujjat_tekshirish' || name === 'Xujjat tekshirish' || name === 'Tekshirish') return 'Tekshirish';
    if (name === 'Xujjat_topshirish' || name === 'Xujjat topshirish' || name === 'Topshirish') return 'Topshirish';
    if (name === 'ST' || name === 'Fito' || name === 'FITO' || name === 'Sertifikat olib chiqish') return 'Sertifikat olib chiqish';
    return name;
  };
  const kpiLogAmountByTaskAndStage = new Map<string, number>();
  kpiLogs.forEach((log) => {
    const key = `${log.taskId}-${normalizeKpiStageName(log.stageName)}`;
    kpiLogAmountByTaskAndStage.set(key, Number(log.amount));
  });

  // Get all SALARY transactions for this worker (money received)
  const salaryTransactions = await prisma.transaction.findMany({
    where: {
      type: 'SALARY',
      workerId: workerId,
      date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
  });

  // Group by stage name
  const stageStats: Record<string, {
    stageName: string;
    participationCount: number;
    earnedAmount: number;
    receivedAmount: number;
    pendingAmount: number;
    percentage: number;
  }> = {};

  // Initialize all stages
  Object.keys(STAGE_FIXED_PRICES).forEach(stageName => {
    stageStats[stageName] = {
      stageName,
      participationCount: 0,
      earnedAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      percentage: 0,
    };
  });
  
  // Also initialize with alternative names
  stageStats['Xujjat_tekshirish'] = {
    stageName: 'Tekshirish',
    participationCount: 0,
    earnedAmount: 0,
    receivedAmount: 0,
    pendingAmount: 0,
    percentage: 0,
  };
  stageStats['Xujjat_topshirish'] = {
    stageName: 'Topshirish',
    participationCount: 0,
    earnedAmount: 0,
    receivedAmount: 0,
    pendingAmount: 0,
    percentage: 0,
  };

  // Cache for state payment lookup to avoid repetitive queries
  const statePaymentCache = new Map<string, number>();

  const getWorkerPrice = async (task: { branchId: number; createdAt: Date; snapshotWorkerPrice: any }) => {
    if (task.snapshotWorkerPrice !== null && task.snapshotWorkerPrice !== undefined) {
      return Number(task.snapshotWorkerPrice);
    }
    const cacheKey = `${task.branchId}-${task.createdAt.toISOString()}`;
    if (statePaymentCache.has(cacheKey)) {
      return statePaymentCache.get(cacheKey)!;
    }
    const statePayment = await prisma.statePayment.findFirst({
      where: {
        branchId: task.branchId,
        createdAt: { lte: task.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });
    const price = statePayment ? Number(statePayment.workerPrice) : 0;
    statePaymentCache.set(cacheKey, price);
    return price;
  };

  // Calculate participation count and earned amount from completed stages
  for (const stage of completedStages) {
    let stageName = stage.name;
    let normalizedStageName = stageName;
    
    // Handle different naming conventions
    if (stageName === 'Xujjat_tekshirish' || stageName === 'Xujjat tekshirish' || stageName === 'Tekshirish') {
      normalizedStageName = 'Tekshirish';
    } else if (stageName === 'Xujjat_topshirish' || stageName === 'Xujjat topshirish' || stageName === 'Topshirish') {
      normalizedStageName = 'Topshirish';
    } else if (stageName === 'ST' || stageName === 'Fito' || stageName === 'FITO' || stageName === 'Sertifikat olib chiqish') {
      normalizedStageName = 'Sertifikat olib chiqish';
    }
    
    // Use normalized name for stats
    const targetStageName = normalizedStageName;
    
    if (!stageStats[targetStageName]) {
      stageStats[targetStageName] = {
        stageName: targetStageName,
        participationCount: 0,
        earnedAmount: 0,
        receivedAmount: 0,
        pendingAmount: 0,
        percentage: 0,
      };
    }

    stageStats[targetStageName].participationCount += 1;

    // Bosqich tugaganda KpiLog'da saqlangan summa (o'sha paytdagi tarif); yangi tariflar eski ishtiroklarga ta'sir qilmasin
    const logKey = `${stage.task.id}-${targetStageName}`;
    const earnedForStage =
      kpiLogAmountByTaskAndStage.get(logKey) ??
      stagePriceMap.get(targetStageName) ??
      STAGE_FIXED_PRICES[targetStageName] ??
      0;
    stageStats[targetStageName].earnedAmount += earnedForStage;
  }

  // Get worker payment report for paid amounts (USD equivalent)
  const paymentReport = await getWorkerPaymentReport(workerId, {
    startDate: Object.keys(dateFilter).length > 0 ? dateFilter.gte : undefined,
    endDate: Object.keys(dateFilter).length > 0 ? dateFilter.lte : undefined,
  });
  
  const totalReceivedFromSalary = Number(paymentReport.totalPaidUsd); // USD equivalent

  // Calculate pending amount and ensure percentage is correct
  Object.keys(stageStats).forEach(stageName => {
    const stats = stageStats[stageName];
    stats.pendingAmount = stats.earnedAmount - stats.receivedAmount;
    // Keep percentage at 0 since fixed pricing is used
  });

  // Convert to array and sort by participation count; har bir bosqich uchun joriy tarifni (Sozlamalar) qo'shamiz
  const stageStatsArray = Object.values(stageStats)
    .filter(stats => stats.participationCount > 0)
    .sort((a, b) => b.participationCount - a.participationCount)
    .map(stats => ({
      ...stats,
      tariffUsd: stagePriceMap.get(stats.stageName) ?? STAGE_FIXED_PRICES[stats.stageName] ?? 0,
    }));

  // Calculate totals - all amounts in USD; jami tasklar soni (bir xil taskda bir necha bosqich bo‘lsa ham 1 task)
  const totalEarned = stageStatsArray.reduce((sum, s) => sum + s.earnedAmount, 0);
  const uniqueTaskIds = new Set(completedStages.map((s) => s.task.id));
  const totals = {
    totalParticipation: stageStatsArray.reduce((sum, s) => sum + s.participationCount, 0),
    totalTasks: uniqueTaskIds.size,
    totalEarned, // USD
    totalReceived: totalReceivedFromSalary, // USD equivalent from WorkerPayment
    totalPending: totalEarned - totalReceivedFromSalary, // USD
  };

  res.json({
    period,
    stageStats: stageStatsArray,
    totals,
  });
});

// Get error statistics for a worker
router.get('/:id/error-stats', requireAuth(), async (req, res) => {
  const workerId = parseInt(req.params.id);
  const { period = 'month', startDate, endDate } = req.query;

  let dateFilter: any = {};
  const now = new Date();

  if (period === 'day') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    dateFilter = { gte: today };
  } else if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { gte: weekAgo };
  } else if (period === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { gte: monthAgo };
  } else if (period === 'year') {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    dateFilter = { gte: yearAgo };
  } else if (period === 'all') {
    dateFilter = {}; // No date filtering, include all history
  }

  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  // Get all errors for this worker
  const errors = await prisma.taskError.findMany({
    where: {
      workerId: workerId,
      date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  const totalErrors = errors.length;
  const totalErrorAmount = errors.reduce((sum: number, error: any) => sum + Number(error.amount), 0);

  // Group by stage
  const errorsByStage: Record<string, { count: number; totalAmount: number }> = {};
  errors.forEach((error: any) => {
    if (!errorsByStage[error.stageName]) {
      errorsByStage[error.stageName] = { count: 0, totalAmount: 0 };
    }
    errorsByStage[error.stageName].count += 1;
    errorsByStage[error.stageName].totalAmount += Number(error.amount);
  });

  res.json({
    period,
    totalErrors,
    totalErrorAmount,
    errorsByStage: Object.entries(errorsByStage).map(([stageName, stats]) => ({
      stageName,
      count: stats.count,
      totalAmount: stats.totalAmount,
    })),
    errors: errors.map((error: any) => ({
      id: error.id,
      taskTitle: error.task.title,
      stageName: error.stageName,
      amount: Number(error.amount),
      comment: error.comment,
      date: error.date,
    })),
  });
});

// GET /api/workers/previous-year-debts - Barcha ishchilarning o'tgan yil qarzlarini olish
router.get('/previous-year-debts', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear() - 1;

    const debts = await prisma.previousYearWorkerDebt.findMany({
      where: {
        year: targetYear,
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
      orderBy: {
        worker: {
          name: 'asc',
        },
      },
    });

    res.json(debts);
  } catch (error: any) {
    console.error('Error loading previous year debts:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /api/workers/previous-year-debts - O'tgan yil qarzini yaratish/yangilash
router.post('/previous-year-debts', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { workerId, totalEarned, totalPaid, year, comment } = req.body;

    if (!workerId || totalEarned === undefined || totalPaid === undefined) {
      return res.status(400).json({ error: 'workerId, totalEarned va totalPaid majburiy' });
    }

    // Yilni integer'ga o'zgartirish
    const targetYear = year ? parseInt(year.toString(), 10) : new Date().getFullYear() - 1;
    if (isNaN(targetYear)) {
      return res.status(400).json({ error: 'Yil noto\'g\'ri formatda' });
    }
    const balance = Number(totalEarned) - Number(totalPaid);

    const debt = await prisma.previousYearWorkerDebt.upsert({
      where: {
        workerId_year: {
          workerId: parseInt(workerId),
          year: targetYear,
        },
      },
      update: {
        totalEarned: Number(totalEarned),
        totalPaid: Number(totalPaid),
        balance: balance,
        comment: comment || null,
        updatedAt: new Date(),
      },
      create: {
        workerId: parseInt(workerId),
        totalEarned: Number(totalEarned),
        totalPaid: Number(totalPaid),
        balance: balance,
        year: targetYear,
        currency: 'USD',
        comment: comment || null,
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

    res.json(debt);
  } catch (error: any) {
    console.error('Error saving previous year debt:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

