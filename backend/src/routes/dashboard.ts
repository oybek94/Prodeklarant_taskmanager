import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', requireAuth(), async (req: AuthRequest, res) => {
  const { startDate, endDate, branchId, workerId } = req.query;
  const where: any = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }
  if (branchId) where.branchId = parseInt(branchId as string);
  if (workerId) {
    where.stages = { some: { assignedTo: parseInt(workerId as string) } };
  }

  // Tasks by status
  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  // New tasks (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newTasks = await prisma.task.count({
    where: { ...where, createdAt: { gte: today } },
  });

  // Completed tasks
  const completedTasks = await prisma.task.count({
    where: { ...where, status: 'COMPLETED' },
  });

  // Process statistics (stages)
  const processStats = await prisma.taskStage.groupBy({
    by: ['status'],
    where: {
      task: where,
    },
    _count: true,
  });

  // Worker activity (KPI logs)
  const workerActivity = await prisma.kpiLog.groupBy({
    by: ['userId'],
    where: {
      createdAt: where.createdAt,
    },
    _sum: { amount: true },
    _count: true,
  });

  const workerDetails = await prisma.user.findMany({
    where: { id: { in: workerActivity.map((w) => w.userId) } },
    select: { id: true, name: true },
  });

  const workerActivityWithNames = workerActivity.map((w) => ({
    userId: w.userId,
    name: workerDetails.find((d) => d.id === w.userId)?.name || 'Unknown',
    totalKPI: w._sum.amount || 0,
    completedStages: w._count,
  }));

  // Financial statistics
  const financialStats = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      date: where.createdAt ? { gte: where.createdAt.gte, lte: where.createdAt.lte } : undefined,
      branchId: branchId ? parseInt(branchId as string) : undefined,
    },
    _sum: { amount: true },
  });

  res.json({
    newTasks,
    completedTasks,
    tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count })),
    processStats: processStats.map((p) => ({ status: p.status, count: p._count })),
    workerActivity: workerActivityWithNames,
    financialStats: financialStats.map((f) => ({ type: f.type, total: f._sum.amount || 0 })),
  });
});

// Charts data
router.get('/charts', requireAuth(), async (req: AuthRequest, res) => {
  const { period = 'daily', startDate, endDate, branchId } = req.query;
  const where: any = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }
  if (branchId) where.branchId = parseInt(branchId as string);

  // Tasks completed by time
  const tasksCompleted = await prisma.task.findMany({
    where: { ...where, status: 'COMPLETED' },
    select: { createdAt: true },
  });

  // KPI by worker
  const kpiByWorker = await prisma.kpiLog.groupBy({
    by: ['userId'],
    where: {
      createdAt: where.createdAt,
    },
    _sum: { amount: true },
  });

  const workers = await prisma.user.findMany({
    where: { id: { in: kpiByWorker.map((k) => k.userId) } },
    select: { id: true, name: true },
  });

  // Transactions by type/time
  const transactionsByType = await prisma.transaction.groupBy({
    by: ['type', 'date'],
    where: {
      date: where.createdAt ? { gte: where.createdAt.gte, lte: where.createdAt.lte } : undefined,
      branchId: branchId ? parseInt(branchId as string) : undefined,
    },
    _sum: { amount: true },
  });

  res.json({
    tasksCompleted: tasksCompleted.map((t) => ({
      date: t.createdAt.toISOString().split('T')[0],
    })),
    kpiByWorker: kpiByWorker.map((k) => ({
      userId: k.userId,
      name: workers.find((w) => w.id === k.userId)?.name || 'Unknown',
      total: k._sum.amount || 0,
    })),
    transactionsByType: transactionsByType.map((t) => ({
      type: t.type,
      date: t.date.toISOString().split('T')[0],
      amount: t._sum.amount || 0,
    })),
  });
});

export default router;

