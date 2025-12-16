import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

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

  // KPI stats
  const kpiLogs = await prisma.kpiLog.findMany({
    where: {
      userId: workerId,
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
  });

  const totalKPI = kpiLogs.reduce((sum, log) => sum + log.amount, 0);
  const completedStages = kpiLogs.length;

  // Salary transactions
  const salaryTransactions = await prisma.transaction.findMany({
    where: {
      type: 'SALARY',
      workerId: workerId,
      date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
  });

  const totalSalary = salaryTransactions.reduce((sum, t) => sum + t.amount, 0);

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
    totalKPI,
    completedStages,
    totalSalary,
    tasksAssigned,
    kpiLogs: kpiLogs.map((log) => ({
      id: log.id,
      amount: log.amount,
      stageName: log.stageName,
      createdAt: log.createdAt,
    })),
    salaryTransactions: salaryTransactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      date: t.date,
      comment: t.comment,
    })),
  });
});

// Stage percentages mapping
const STAGE_PERCENTAGES: Record<string, number> = {
  'Invoys': 20,
  'Zayavka': 10,
  'TIR-SMR': 10,
  'ST': 5,
  'FITO': 5,
  'Deklaratsiya': 15,
  'Tekshirish': 15,
  'Topshirish': 10,
  'Pochta': 10,
};

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
  }

  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

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
  Object.keys(STAGE_PERCENTAGES).forEach(stageName => {
    stageStats[stageName] = {
      stageName,
      participationCount: 0,
      earnedAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      percentage: STAGE_PERCENTAGES[stageName],
    };
  });
  
  // Also initialize with alternative names
  stageStats['Xujjat_tekshirish'] = {
    stageName: 'Tekshirish',
    participationCount: 0,
    earnedAmount: 0,
    receivedAmount: 0,
    pendingAmount: 0,
    percentage: 15,
  };
  stageStats['Xujjat_topshirish'] = {
    stageName: 'Topshirish',
    participationCount: 0,
    earnedAmount: 0,
    receivedAmount: 0,
    pendingAmount: 0,
    percentage: 10,
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

  // Calculate participation count and earned amount
  for (const stage of completedStages) {
    let stageName = stage.name;
    let normalizedStageName = stageName;
    
    // Handle different naming conventions
    if (stageName === 'Xujjat_tekshirish' || stageName === 'Xujjat tekshirish' || stageName === 'Tekshirish') {
      normalizedStageName = 'Tekshirish';
    } else if (stageName === 'Xujjat_topshirish' || stageName === 'Xujjat topshirish' || stageName === 'Topshirish') {
      normalizedStageName = 'Topshirish';
    } else if (stageName === 'Fito' || stageName === 'FITO') {
      normalizedStageName = 'FITO';
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
        percentage: STAGE_PERCENTAGES[targetStageName] || 0,
      };
    }

    stageStats[targetStageName].participationCount += 1;

    // Calculate earned amount: workerPrice * percentage / 100
    const workerPrice = await getWorkerPrice(stage.task);
    const percentage = STAGE_PERCENTAGES[targetStageName] || 0;
    const earnedForThisStage = (workerPrice * percentage) / 100;
    stageStats[targetStageName].earnedAmount += earnedForThisStage;
  }

  // Calculate total received amount from SALARY transactions
  // Note: SALARY transactions are not tied to specific stages, so we add them to totalReceived only
  const totalReceivedFromSalary = salaryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Calculate pending amount and ensure percentage is correct
  Object.keys(stageStats).forEach(stageName => {
    const stats = stageStats[stageName];
    stats.pendingAmount = stats.earnedAmount - stats.receivedAmount;
    // Ensure percentage is always correct from STAGE_PERCENTAGES
    if (STAGE_PERCENTAGES[stageName] !== undefined) {
      stats.percentage = STAGE_PERCENTAGES[stageName];
    }
  });

  // Convert to array and sort by participation count
  const stageStatsArray = Object.values(stageStats)
    .filter(stats => stats.participationCount > 0)
    .sort((a, b) => b.participationCount - a.participationCount);

  // Calculate totals
  // totalReceived should be from SALARY transactions only
  const totals = {
    totalParticipation: stageStatsArray.reduce((sum, s) => sum + s.participationCount, 0),
    totalEarned: stageStatsArray.reduce((sum, s) => sum + s.earnedAmount, 0),
    totalReceived: totalReceivedFromSalary, // From SALARY transactions
    totalPending: stageStatsArray.reduce((sum, s) => sum + s.earnedAmount, 0) - totalReceivedFromSalary,
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
  const totalErrorAmount = errors.reduce((sum, error) => sum + Number(error.amount), 0);

  // Group by stage
  const errorsByStage: Record<string, { count: number; totalAmount: number }> = {};
  errors.forEach(error => {
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
    errors: errors.map(error => ({
      id: error.id,
      taskTitle: error.task.title,
      stageName: error.stageName,
      amount: Number(error.amount),
      comment: error.comment,
      date: error.date,
    })),
  });
});

export default router;

