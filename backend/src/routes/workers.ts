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

export default router;

