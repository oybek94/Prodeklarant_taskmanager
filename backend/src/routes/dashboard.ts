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
    where: { ...where, status: 'TAYYOR' },
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
    where: { id: { in: workerActivity.map((w: any) => w.userId) } },
    select: { id: true, name: true },
  });

  const workerActivityWithNames = workerActivity.map((w: any) => ({
    userId: w.userId,
    name: workerDetails.find((d: any) => d.id === w.userId)?.name || 'Unknown',
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

  // Payment reminders - clients with due payments
  // Get all clients with their tasks and transactions
  const allClients = await prisma.client.findMany({
    include: {
      tasks: {
        select: {
          id: true,
          createdAt: true,
          hasPsr: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      transactions: {
        where: { type: 'INCOME' },
        select: {
          amount: true,
          date: true,
        },
      },
    },
  });

  const paymentReminders = allClients
    .map((client) => {
      // Calculate current debt for all clients
      const dealAmount = Number(client.dealAmount || 0);
      const totalTasks = client.tasks.length;
      const tasksWithPsr = client.tasks.filter((t: any) => t.hasPsr).length;
      const totalDealAmount = (dealAmount * totalTasks) + (10 * tasksWithPsr);
      const totalPaid = client.transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      const currentDebt = totalDealAmount - totalPaid;

      // If client has no debt, skip
      if (currentDebt <= 0) {
        return null;
      }

      let isDue = false;
      let dueReason = '';

      // Check if client has credit terms
      if (client.creditType && client.creditLimit && client.creditStartDate) {
        const creditLimit = Number(client.creditLimit);

        if (client.creditType === 'TASK_COUNT') {
          // Nasiya: ma'lum bir ish sonigacha
          const tasksAfterCreditStart = client.tasks.filter(
            (task) => new Date(task.createdAt) >= new Date(client.creditStartDate!)
          );
          const taskCount = tasksAfterCreditStart.length;
          
          if (taskCount >= creditLimit) {
            isDue = true;
            dueReason = `${creditLimit} ta ishdan keyin to'lov kerak (${taskCount} ta ish bajarildi). Joriy qardorlik: $${currentDebt.toFixed(2)}`;
          }
        } else if (client.creditType === 'AMOUNT') {
          // Nasiya: ma'lum bir summagacha
          if (currentDebt >= creditLimit) {
            isDue = true;
            dueReason = `Qardorlik ${creditLimit.toFixed(2)} ga yetdi (Joriy qardorlik: $${currentDebt.toFixed(2)})`;
          }
        }
      } else {
        // Client without credit terms - if they have debt, they need to pay
        // Only show if they have tasks (active client)
        if (totalTasks > 0 && currentDebt > 0) {
          isDue = true;
          dueReason = `Shartnomaga ko'ra to'lov qilish kerak. Joriy qardorlik: $${currentDebt.toFixed(2)}`;
        }
      }

      if (isDue) {
        return {
          clientId: client.id,
          clientName: client.name,
          phone: client.phone,
          creditType: client.creditType || 'NONE',
          creditLimit: client.creditLimit ? Number(client.creditLimit) : null,
          dueReason,
          creditStartDate: client.creditStartDate || client.createdAt,
          currentDebt: currentDebt,
        };
      }
      return null;
    })
    .filter((reminder) => reminder !== null);

  res.json({
    newTasks,
    completedTasks,
    tasksByStatus: tasksByStatus.map((t: any) => ({ status: t.status, count: t._count })),
    processStats: processStats.map((p: any) => ({ status: p.status, count: p._count })),
    workerActivity: workerActivityWithNames,
    financialStats: financialStats.map((f: any) => ({ type: f.type, total: f._sum.amount || 0 })),
    paymentReminders,
  });
});

// Charts data
router.get('/charts', requireAuth(), async (req: AuthRequest, res) => {
  const { period = 'monthly', startDate, endDate, branchId } = req.query;
  const where: any = {};
  
  // Set date range based on period if not provided
  const now = new Date();
  if (!startDate && !endDate) {
    if (period === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);
      where.createdAt = { gte: weekAgo };
    } else if (period === 'monthly') {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 29);
      monthAgo.setHours(0, 0, 0, 0);
      where.createdAt = { gte: monthAgo };
    } else if (period === 'yearly') {
      const yearAgo = new Date(now);
      yearAgo.setMonth(yearAgo.getMonth() - 11);
      yearAgo.setDate(1);
      yearAgo.setHours(0, 0, 0, 0);
      where.createdAt = { gte: yearAgo };
    }
  } else {
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
  }
  
  if (branchId) where.branchId = parseInt(branchId as string);

  // Tasks completed by time - include both TAYYOR and YAKUNLANDI (archived) tasks
  const tasksCompleted = await prisma.task.findMany({
    where: { 
      ...where, 
      status: { in: ['TAYYOR', 'YAKUNLANDI'] }
    },
    select: { createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
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
    where: { id: { in: kpiByWorker.map((k: any) => k.userId) } },
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

  // Also get archived tasks from ArchiveDocument (if they have archivedAt date)
  const archivedTasks = await prisma.archiveDocument.findMany({
    where: {
      archivedAt: where.createdAt ? { gte: where.createdAt.gte, lte: where.createdAt.lte } : undefined,
    },
    select: { archivedAt: true },
    distinct: ['taskId'],
  });

  // Combine both completed and archived tasks
  const allCompletedTasks = [
    ...tasksCompleted.map((t: any) => ({
      date: t.createdAt.toISOString().split('T')[0],
    })),
    ...archivedTasks.map((a: any) => ({
      date: a.archivedAt.toISOString().split('T')[0],
    })),
  ];

  res.json({
    tasksCompleted: allCompletedTasks,
    kpiByWorker: kpiByWorker.map((k: any) => ({
      userId: k.userId,
      name: workers.find((w: any) => w.id === k.userId)?.name || 'Unknown',
      total: k._sum.amount || 0,
    })),
    transactionsByType: transactionsByType.map((t: any) => ({
      type: t.type,
      date: t.date.toISOString().split('T')[0],
      amount: t._sum.amount || 0,
    })),
  });
});

export default router;

