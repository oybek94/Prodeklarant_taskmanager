import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', requireAuth(), async (req: AuthRequest, res) => {
  try {
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

  // Worker activity (KPI logs) - use amount_original (USD) for worker earnings display
  const kpiLogs = await prisma.kpiLog.findMany({
    where: {
      createdAt: where.createdAt,
    },
    select: {
      userId: true,
      amount_original: true,
      amount_uzs: true,
    },
  });

  // Group by userId
  const workerActivity = kpiLogs.reduce((acc: any, log: any) => {
    const userId = log.userId;
    if (!acc[userId]) {
      acc[userId] = { userId, totalKPI: 0, totalKPIUzs: 0, count: 0 };
    }
    acc[userId].totalKPI += Number(log.amount_original || log.amount || 0); // USD for worker display
    acc[userId].totalKPIUzs += Number(log.amount_uzs || 0); // UZS for accounting
    acc[userId].count++;
    return acc;
  }, {});

  const workerDetails = await prisma.user.findMany({
    where: { id: { in: workerActivity.map((w: any) => w.userId) } },
    select: { id: true, name: true },
  });

  const workerActivityWithNames = Object.values(workerActivity).map((w: any) => ({
    userId: w.userId,
    name: workerDetails.find((d: any) => d.id === w.userId)?.name || 'Unknown',
    totalKPI: w.totalKPI || 0, // USD for worker display
    totalKPIUzs: w.totalKPIUzs || 0, // UZS for accounting
    completedStages: w.count || 0,
  }));

  // Financial statistics - use amount_uzs for accounting calculations
  const financialTransactions = await prisma.transaction.findMany({
    where: {
      date: where.createdAt ? { gte: where.createdAt.gte, lte: where.createdAt.lte } : undefined,
      branchId: branchId ? parseInt(branchId as string) : undefined,
    },
    select: {
      type: true,
      amount_uzs: true,
      amount_original: true,
      currency_universal: true,
      exchange_rate: true,
      exchange_source: true,
    },
  });

  // Group by type and sum amount_uzs (accounting base currency)
  const financialStats = financialTransactions.reduce((acc: any, tx: any) => {
    const type = tx.type;
    if (!acc[type]) {
      acc[type] = { total: 0, exchangeRates: new Set<string>() };
    }
    acc[type].total += Number(tx.amount_uzs || tx.convertedUzsAmount || tx.amount_original || 0);
    if (tx.exchange_rate) {
      acc[type].exchangeRates.add(`${tx.exchange_rate}-${tx.exchange_source || 'CBU'}`);
    }
    return acc;
  }, {});

  // Convert to array format with exchange rate info
  const financialStatsArray = Object.entries(financialStats).map(([type, data]: [string, any]) => ({
    type,
    total: data.total,
    currency: 'UZS',
    exchangeRatesUsed: Array.from(data.exchangeRates).map((rate: string) => {
      const [value, source] = rate.split('-');
      return { rate: parseFloat(value), source };
    }),
  }));

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
      financialStats: financialStatsArray,
      paymentReminders,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Dashboard statistikalarini yuklashda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Charts data
router.get('/charts', requireAuth(), async (req: AuthRequest, res) => {
  const { period = 'monthly', startDate, endDate, branchId } = req.query;
  const where: any = {};
  if (branchId) where.branchId = parseInt(branchId as string);

  const now = new Date();
  let dateRange: { start: Date; end: Date } = { start: now, end: now };

  // Determine date range based on period
  if (period === 'weekly') {
    // Last 7 days
    dateRange.end = new Date(now);
    dateRange.end.setHours(23, 59, 59, 999);
    dateRange.start = new Date(now);
    dateRange.start.setDate(dateRange.start.getDate() - 6);
    dateRange.start.setHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    // Current month - all days
    dateRange.start = new Date(now.getFullYear(), now.getMonth(), 1);
    dateRange.start.setHours(0, 0, 0, 0);
    dateRange.end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    dateRange.end.setHours(23, 59, 59, 999);
  } else if (period === 'yearly') {
    // Current year - all months
    dateRange.start = new Date(now.getFullYear(), 0, 1);
    dateRange.start.setHours(0, 0, 0, 0);
    dateRange.end = new Date(now.getFullYear() + 1, 0, 0); // Last day of current year
    dateRange.end.setHours(23, 59, 59, 999);
  }

  // Override with custom dates if provided
  if (startDate) dateRange.start = new Date(startDate as string);
  if (endDate) dateRange.end = new Date(endDate as string);

  // For TAYYOR tasks, we need to filter by when they became TAYYOR (not when created)
  // So we'll get all TAYYOR tasks and filter by their completion date later
  const baseWhere: any = {};
  if (branchId) baseWhere.branchId = parseInt(branchId as string);

  // Tasks completed by time - include both TAYYOR and archived tasks (YAKUNLANDI)
  // Get TAYYOR tasks with their stages to find when they became TAYYOR
  const tasksCompleted = await prisma.task.findMany({
    where: { ...baseWhere, status: 'TAYYOR' },
    select: { 
      id: true,
      createdAt: true, 
      updatedAt: true,
      stages: {
        where: { name: 'Deklaratsiya', status: 'TAYYOR' },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
  });

  // Get TAYYOR task dates - use Deklaratsiya completedAt if available, otherwise updatedAt
  // Filter by date range to only include tasks completed within the range
  const tayyorTasks = tasksCompleted
    .map((task: any) => {
      let completionDate = task.updatedAt; // Default to updatedAt
      
      // If Deklaratsiya stage is completed, use that date (most accurate)
      if (task.stages && task.stages.length > 0 && task.stages[0].completedAt) {
        completionDate = task.stages[0].completedAt;
      }
      
      return {
        date: completionDate.toISOString().split('T')[0],
        completionDate: completionDate,
      };
    })
    .filter((task: any) => {
      // Only include tasks completed within the date range
      return task.completionDate >= dateRange.start && task.completionDate <= dateRange.end;
    })
    .map((task: any) => ({
      date: task.date,
    }));

  // Get YAKUNLANDI (archived) tasks with their stages to find when they were completed
  const yakunlandiTasks = await prisma.task.findMany({
    where: { ...baseWhere, status: 'YAKUNLANDI' },
    select: { 
      id: true,
      updatedAt: true,
      stages: {
        where: { name: 'Pochta', status: 'TAYYOR' },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
  });

  // Get YAKUNLANDI task dates - use Pochta completedAt if available, otherwise updatedAt
  const yakunlandiTasksWithDates = yakunlandiTasks
    .map((task: any) => {
      let completionDate = task.updatedAt; // Default to updatedAt
      
      // If Pochta stage is completed, use that date (most accurate)
      if (task.stages && task.stages.length > 0 && task.stages[0].completedAt) {
        completionDate = task.stages[0].completedAt;
      }
      
      return {
        date: completionDate.toISOString().split('T')[0],
        completionDate: completionDate,
      };
    })
    .filter((task: any) => {
      // Only include tasks completed within the date range
      return task.completionDate >= dateRange.start && task.completionDate <= dateRange.end;
    })
    .map((task: any) => ({
      date: task.date,
    }));

  // Get archived tasks from ArchiveDocument as backup (for tasks that might not have YAKUNLANDI status)
  // Get all archived documents and group by taskId to get the earliest archivedAt date
  const allArchivedDocs = await prisma.archiveDocument.findMany({
    where: {
      archivedAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    select: {
      taskId: true,
      archivedAt: true,
    },
    orderBy: {
      archivedAt: 'asc',
    },
  });

  // Group by taskId and get the earliest archivedAt date for each task
  const archivedTasksMap = new Map<number, Date>();
  for (const doc of allArchivedDocs) {
    if (!archivedTasksMap.has(doc.taskId)) {
      archivedTasksMap.set(doc.taskId, doc.archivedAt);
    }
  }

  // Convert to array format and filter out tasks that are already in yakunlandiTasksWithDates
  const yakunlandiTaskIds = new Set(yakunlandiTasks.map((t: any) => t.id));
  const archivedTasks = Array.from(archivedTasksMap.entries())
    .filter(([taskId]) => !yakunlandiTaskIds.has(taskId))
    .map(([taskId, archivedAt]) => ({
      date: archivedAt.toISOString().split('T')[0],
    }));

  // Combine all completed tasks (TAYYOR + YAKUNLANDI + ArchiveDocument)
  const allCompletedTasks = [
    ...tayyorTasks,
    ...yakunlandiTasksWithDates,
    ...archivedTasks,
  ];

  // Sort by date to ensure proper ordering
  allCompletedTasks.sort((a, b) => {
    return a.date.localeCompare(b.date);
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
      date: { gte: dateRange.start, lte: dateRange.end },
      branchId: branchId ? parseInt(branchId as string) : undefined,
    },
    _sum: { amount: true },
  });

  res.json({
    period,
    dateRange: {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    },
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

