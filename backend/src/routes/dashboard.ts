import { Router } from 'express';
import { prisma } from '../prisma';
import { calculateTotalPaidUsd, calculateTotalEarnedUsd } from '../services/worker-payment';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { TaskStatus } from '@prisma/client';

const router = Router();

const buildRangePair = (period: 'today' | 'week' | 'month' | 'year') => {
  const now = new Date();
  
  if (period === 'today') {
    const currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 1);
    
    return {
      current: { start: currentStart, end: now },
      previous: { start: previousStart, end: new Date(previousStart.getTime() + (now.getTime() - currentStart.getTime())) },
    };
  } else if (period === 'week') {
    const currentStart = new Date(now);
    const dayIndex = (currentStart.getDay() + 6) % 7;
    currentStart.setDate(currentStart.getDate() - dayIndex);
    currentStart.setHours(0, 0, 0, 0);
    
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    const previousEnd = new Date(previousStart.getTime() + (now.getTime() - currentStart.getTime()));
    
    return {
      current: { start: currentStart, end: now },
      previous: { start: previousStart, end: previousEnd },
    }
  } else if (period === 'month') {
    const currentStart = new Date(now);
    currentStart.setFullYear(now.getFullYear(), now.getMonth(), 1);
    currentStart.setHours(0, 0, 0, 0);
    
    const previousStart = new Date(currentStart);
    previousStart.setFullYear(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(previousStart.getTime() + (now.getTime() - currentStart.getTime()));

    return {
      current: { start: currentStart, end: now },
      previous: { start: previousStart, end: previousEnd },
    }
  } else {
    const currentStart = new Date(now.getFullYear(), 0, 1);
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return {
      current: { start: currentStart, end: now },
      previous: { start: previousStart, end: previousEnd },
    };
  }
};

const calcDeltaPercent = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
};

router.get('/completed-summary', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { branchId, employeeId, clientId } = req.query;
    const baseTaskWhere: any = {};

    if (branchId) baseTaskWhere.branchId = Number(branchId);
    if (clientId) baseTaskWhere.clientId = Number(clientId);
    if (employeeId) {
      baseTaskWhere.stages = { some: { assignedToId: Number(employeeId) } };
    }

    const completedStatuses = ['TAYYOR', 'YAKUNLANDI'];

    const loadTaskIds = async () => {
      const tasks = await prisma.task.findMany({
        where: baseTaskWhere,
        select: { id: true },
      });
      return tasks.map((task) => task.id);
    };

    const completedTasks = await prisma.task.findMany({
      where: {
        ...baseTaskWhere,
        status: { in: completedStatuses },
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        stages: {
          where: { name: { in: ['Deklaratsiya', 'Pochta'] }, status: 'TAYYOR' },
          select: { name: true, completedAt: true },
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    const getCompletionDate = (task: typeof completedTasks[number]) => {
      if (task.status === 'TAYYOR') {
        const stage = task.stages.find((item) => item.name === 'Deklaratsiya' && item.completedAt);
        if (stage?.completedAt) {
          return stage.completedAt;
        }
      }
      if (task.status === 'YAKUNLANDI') {
        const stage = task.stages.find((item) => item.name === 'Pochta' && item.completedAt);
        if (stage?.completedAt) {
          return stage.completedAt;
        }
      }
      // If no completion stage timestamp exists, do not count it as completed today.
      return null;
    };

    const completionDates = completedTasks.map((task) => ({
      id: task.id,
      date: getCompletionDate(task),
    }));

    const periods = ['today', 'week', 'month', 'year'] as const;
    const rangeMap = new Map<typeof periods[number], ReturnType<typeof buildRangePair>>();
    for (const period of periods) {
      rangeMap.set(period, buildRangePair(period));
    }

    const allRanges = Array.from(rangeMap.values()).flatMap((pair) => [pair.current, pair.previous]);
    const minStart = allRanges.reduce((min, range) => (range.start < min ? range.start : min), allRanges[0].start);
    const maxEnd = allRanges.reduce((max, range) => (range.end > max ? range.end : max), allRanges[0].end);

    const taskIds = await loadTaskIds();
    const archivedDocs = taskIds.length > 0
      ? await prisma.archiveDocument.findMany({
        where: {
          taskId: { in: taskIds },
          archivedAt: { gte: minStart, lte: maxEnd },
        },
        select: { taskId: true, archivedAt: true },
        orderBy: { archivedAt: 'asc' },
      })
      : [];

    const countRange = (range: { start: Date; end: Date }) => {
      const countedTaskIds = new Set<number>();
      let count = 0;

      // First, count tasks from completionDates
      for (const item of completionDates) {
        if (item.date && item.date >= range.start && item.date <= range.end) {
          count += 1;
          countedTaskIds.add(item.id);
        }
      }

      // Group archived docs by taskId to avoid double counting
      // (one task can have multiple documents archived)
      const archivedTaskIds = new Set<number>();
      for (const doc of archivedDocs) {
        if (doc.archivedAt >= range.start && doc.archivedAt <= range.end) {
          archivedTaskIds.add(doc.taskId);
        }
      }

      // Add archived tasks that weren't already counted
      for (const taskId of archivedTaskIds) {
        if (!countedTaskIds.has(taskId)) {
          count += 1;
          countedTaskIds.add(taskId);
        }
      }

      return count;
    };

    const buildSeries = (period: typeof periods[number], range: { start: Date; end: Date }) => {
      let labels: string[] = [];
      let data: number[] = [];

      if (period === 'today') {
        labels = Array.from({ length: 24 }, (_, idx) => `${idx}`.padStart(2, '0'));
        data = Array.from({ length: 24 }, () => 0);
        for (const item of completionDates) {
          if (item.date && item.date >= range.start && item.date <= range.end) {
            const hour = item.date.getHours();
            data[hour] += 1;
          }
        }
        for (const doc of archivedDocs) {
          if (doc.archivedAt >= range.start && doc.archivedAt <= range.end) {
            const hour = doc.archivedAt.getHours();
            if (!completionDates.find((item) => item.id === doc.taskId)) {
              data[hour] += 1;
            }
          }
        }
        return { labels, data };
      }

      if (period === 'year') {
        const startYear = range.start.getFullYear();
        labels = Array.from({ length: 12 }, (_, idx) => `${startYear}-${String(idx + 1).padStart(2, '0')}`);
        data = Array.from({ length: 12 }, () => 0);
        for (const item of completionDates) {
          if (item.date && item.date >= range.start && item.date <= range.end && item.date.getFullYear() === startYear) {
            data[item.date.getMonth()] += 1;
          }
        }
        for (const doc of archivedDocs) {
          if (doc.archivedAt >= range.start && doc.archivedAt <= range.end && doc.archivedAt.getFullYear() === startYear) {
            if (!completionDates.find((item) => item.id === doc.taskId)) {
              data[doc.archivedAt.getMonth()] += 1;
            }
          }
        }
        return { labels, data };
      }

      const cursor = new Date(range.start);
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= range.end) {
        labels.push(cursor.toISOString().split('T')[0]);
        data.push(0);
        cursor.setDate(cursor.getDate() + 1);
      }

      const indexByDate = new Map(labels.map((label, idx) => [label, idx]));
      for (const item of completionDates) {
        if (item.date && item.date >= range.start && item.date <= range.end) {
          const key = item.date.toISOString().split('T')[0];
          const index = indexByDate.get(key);
          if (index !== undefined) data[index] += 1;
        }
      }
      for (const doc of archivedDocs) {
        if (doc.archivedAt >= range.start && doc.archivedAt <= range.end) {
          const key = doc.archivedAt.toISOString().split('T')[0];
          const index = indexByDate.get(key);
          if (index !== undefined && !completionDates.find((item) => item.id === doc.taskId)) {
            data[index] += 1;
          }
        }
      }
      return { labels, data };
    };
    const result: Record<string, { count: number; deltaPercent: number | null; series: { labels: string[]; data: number[] } }> = {};

    for (const period of periods) {
      const rangePair = rangeMap.get(period)!;
      const [currentCount, previousCount] = await Promise.all([
        countRange(rangePair.current),
        countRange(rangePair.previous),
      ]);
      result[period] = {
        count: currentCount,
        deltaPercent: calcDeltaPercent(currentCount, previousCount),
        series: buildSeries(period, rangePair.current),
      };
    }

    // Override "today" to match Tasks page logic (count by createdAt)
    // Use UTC to avoid timezone issues between server and client
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(todayEnd.getDate() - 1);

    const [todayCreatedCount, yesterdayCreatedCount] = await Promise.all([
      prisma.task.count({
        where: {
          ...baseTaskWhere,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.task.count({
        where: {
          ...baseTaskWhere,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        },
      }),
    ]);

    result.today = {
      count: todayCreatedCount,
      deltaPercent: calcDeltaPercent(todayCreatedCount, yesterdayCreatedCount),
      series: result.today.series,
    };

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching completed summary:', error);
    res.status(500).json({
      error: 'Yakunlangan ishlar statistikasi yuklanmadi',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

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

    // Helper function to calculate worker ranking for a date range
    const calculateWorkerRanking = async (startDate: Date, endDate: Date) => {
      // Get all workers (DEKLARANT, ADMIN, MANAGER, CERTIFICATE_WORKER roles)
      const allWorkers = await prisma.user.findMany({
        where: {
          role: {
            in: ['DEKLARANT', 'ADMIN'],
          },
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Get completed stages count for each worker in the date range
      const completedStagesByWorker = await prisma.taskStage.findMany({
        where: {
          status: 'TAYYOR',
          assignedToId: { not: null },
          completedAt: { not: null, gte: startDate, lte: endDate },
          ...(branchId ? { task: { branchId: parseInt(branchId as string) } } : {}),
          ...(workerId ? { assignedToId: parseInt(workerId as string) } : {}),
        },
        select: { assignedToId: true, taskId: true },
      });

      // Create a map of workerId -> completedStages count
      const completedStagesMap = new Map<number, number>();
      // Create a map of workerId -> Set of unique taskIds
      const uniqueTasksMap = new Map<number, Set<number>>();

      completedStagesByWorker.forEach((item) => {
        if (item.assignedToId !== null) {
          const currentCount = completedStagesMap.get(item.assignedToId) || 0;
          completedStagesMap.set(item.assignedToId, currentCount + 1);

          if (!uniqueTasksMap.has(item.assignedToId)) {
            uniqueTasksMap.set(item.assignedToId, new Set<number>());
          }
          uniqueTasksMap.get(item.assignedToId)!.add(item.taskId);
        }
      });

      // Add Bounty XP from Task Errors generated in the same date range
      const bountyXpByWorker = await prisma.taskError.groupBy({
        by: ['createdById'],
        where: { adminRatedAt: { gte: startDate, lte: endDate } },
        _sum: { bountyXp: true }
      });
      
      bountyXpByWorker.forEach((item) => {
        if (item.createdById !== null) {
          const currentCount = completedStagesMap.get(item.createdById) || 0;
          completedStagesMap.set(item.createdById, currentCount + (item._sum.bountyXp || 0));
        }
      });

      // Get error count for each worker in the date range
      const errorsByWorker = await prisma.taskError.groupBy({
        by: ['workerId'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: true
      });

      const errorCountMap = new Map<number, number>();
      errorsByWorker.forEach((item) => {
        errorCountMap.set(item.workerId, item._count);
      });

      // Combine all workers with their completed stages count (0 if no completed stages)
      const ranking = allWorkers.map((worker) => ({
        userId: worker.id,
        name: worker.name,
        completedStages: completedStagesMap.get(worker.id) || 0,
        invoiceCount: uniqueTasksMap.get(worker.id)?.size || 0,
        errorCount: errorCountMap.get(worker.id) || 0,
      }));

      // Sort by completed stages (descending), then by name (ascending) for tie-breaking
      return ranking.sort((a, b) => {
        if (b.completedStages !== a.completedStages) {
          return b.completedStages - a.completedStages;
        }
        return a.name.localeCompare(b.name);
      });
    };

    // Calculate rankings for different periods
    const rankingNow = new Date();
    const rankingTodayStart = new Date(rankingNow.getFullYear(), rankingNow.getMonth(), rankingNow.getDate(), 0, 0, 0, 0);
    const rankingTodayEnd = new Date(rankingNow.getFullYear(), rankingNow.getMonth(), rankingNow.getDate(), 23, 59, 59, 999);

    // Weekly: Monday to today
    const rankingWeekStart = new Date(rankingTodayStart);
    const rankingWeekDayIndex = (rankingTodayStart.getDay() + 6) % 7; // Monday = 0
    rankingWeekStart.setDate(rankingTodayStart.getDate() - rankingWeekDayIndex);

    // Monthly: First day of month to today
    const rankingMonthStart = new Date(rankingNow.getFullYear(), rankingNow.getMonth(), 1, 0, 0, 0, 0);

    // Yearly: First day of year to today
    const rankingYearStart = new Date(rankingNow.getFullYear(), 0, 1, 0, 0, 0, 0);

    const [weeklyRanking, monthlyRanking, yearlyRanking] = await Promise.all([
      calculateWorkerRanking(rankingWeekStart, rankingTodayEnd),
      calculateWorkerRanking(rankingMonthStart, rankingTodayEnd),
      calculateWorkerRanking(rankingYearStart, rankingTodayEnd),
    ]);

    const workerCompletionRanking = {
      weekly: weeklyRanking,
      monthly: monthlyRanking,
      yearly: yearlyRanking,
    };

    // Worker error ranking was removed from stats
    const workerErrorRanking = {
      weekly: [],
      monthly: [],
      yearly: [],
    };

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

    const workerActivityList = Object.values(workerActivity) as any[];
    const workerIds = workerActivityList.map((w) => w.userId);

    const workerDetails = await prisma.user.findMany({
      where: { id: { in: workerIds } },
      select: { id: true, name: true },
    });

    const workerActivityWithNames = workerActivityList.map((w: any) => ({
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
    const financialStatsArray = Object.entries(financialStats).map(([type, data]: [string, any]) => {
      const exchangeRatesSet = data.exchangeRates as Set<string>;
      return {
        type,
        total: data.total,
        currency: 'UZS',
        exchangeRatesUsed: Array.from(exchangeRatesSet).map((rate: string) => {
          const [value, source] = rate.split('-');
          return { rate: parseFloat(value), source };
        }),
      };
    });

    // Payment reminders - clients with due payments
    // Get all clients with their tasks and transactions
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        dealAmount: true,
        dealAmountCurrency: true,
        creditType: true,
        creditLimit: true,
        creditStartDate: true,
        initialDebt: true,
        initialDebtCurrency: true,
        initialDebtInUzs: true,
        tasks: {
          select: {
            id: true,
            createdAt: true,
            hasPsr: true,
            snapshotDealAmount: true,
            snapshotPsrPrice: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        transactions: {
          where: { type: 'INCOME' },
          select: {
            amount: true,
            date: true,
            currency: true,
          },
        },
      }
    });

    const paymentReminders = allClients
      .map((client: any) => {
        const dealCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';
        const dealAmount = Number(client.dealAmount || 0);

        const totalDealAmount = (client).tasks.reduce((sum: number, task: any) => {
          const baseAmount = task.snapshotDealAmount != null ? Number(task.snapshotDealAmount) : dealAmount;
          const psrAmount = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
          return sum + baseAmount + psrAmount;
        }, 0);

        const totalPaid = (client).transactions
          .reduce((sum: any, t: any) => sum + Number(t.amount), 0);

        let initialDebt = 0;
        if ((client).initialDebt) {
          const clientInitialDebtCurrency = (client).initialDebtCurrency || 'USD';
          if (clientInitialDebtCurrency === dealCurrency) {
            initialDebt = Number((client).initialDebt);
          } else {
            initialDebt = (client).initialDebtInUzs && dealCurrency === 'UZS'
              ? Number((client).initialDebtInUzs)
              : Number((client).initialDebt);
          }
        }

        const currentDebt = totalDealAmount - totalPaid + initialDebt;

        // If client has no debt, skip (using 0.01 to handle floating point inaccuracies)
        if (currentDebt <= 0.01) {
          return null;
        }

        let isDue = false;
        let dueReason = '';

        // Check if client has credit terms
        if (client.creditType && client.creditLimit && client.creditStartDate) {
          const creditLimit = Number(client.creditLimit);

          if (client.creditType === 'TASK_COUNT') {
            // Nasiya: ma'lum bir ish sonigacha
            const tasksAfterCreditStart = (client).tasks.filter(
              (task: any) => new Date(task.createdAt) >= new Date(client.creditStartDate!)
            );
            const taskCount = tasksAfterCreditStart.length;

            if (taskCount >= creditLimit) {
              isDue = true;
              dueReason = `${creditLimit} ta ishdan keyin to'lov kerak (${taskCount} ta ish bajarildi).`;
            }
          } else if (client.creditType === 'AMOUNT') {
            // Nasiya: ma'lum bir summagacha
            if (currentDebt >= creditLimit) {
              isDue = true;
              dueReason = `Qardorlik ${creditLimit.toFixed(2)} ga yetdi.`;
            }
          }
        } else {
          // Client without credit terms - if they have debt, they need to pay
          // Only show if they have tasks (active client)
          if ((client).tasks.length > 0 && currentDebt > 0) {
            isDue = true;
            dueReason = `Shartnomaga ko'ra to'lov qilish kerak.`;
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
            currency: dealCurrency,
          };
        }
        return null;
      })
      .filter((reminder) => reminder !== null);

    // Calculate today's and weekly net profit from completed tasks created in range
    // Use UTC to avoid timezone issues between server and client
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const weekStart = new Date(todayStart);
    const weekDayIndex = (todayStart.getUTCDay() + 6) % 7; // Monday = 0
    weekStart.setUTCDate(todayStart.getUTCDate() - weekDayIndex);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));

    const sumNetProfitForRange = async (start: Date, end: Date) => {
      // Only calculate net profit for completed tasks (TAYYOR or YAKUNLANDI)
      const completedStatuses: TaskStatus[] = [TaskStatus.TAYYOR, TaskStatus.YAKUNLANDI];

      const rangeTasks = await prisma.task.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: completedStatuses }, // Only completed tasks
          ...(branchId ? { branchId: parseInt(branchId as string) } : {}),
        },
        select: {
          id: true,
          status: true,
          hasPsr: true,
          snapshotDealAmount: true,
          snapshotPsrPrice: true,
          snapshotCertificatePayment: true,
          snapshotWorkerPrice: true,
          snapshotCustomsPayment: true,
          client: {
            select: {
              dealAmount: true,
              dealAmount_currency: true,
              dealAmountCurrency: true,
            },
          },
        },
      });

      // Debug logging
      console.log(`[Dashboard] sumNetProfitForRange: Found ${rangeTasks.length} completed tasks in range ${start.toISOString()} to ${end.toISOString()}`);

      let usd = 0;
      let uzs = 0;
      let usdCount = 0;
      let uzsCount = 0;

      for (const task of rangeTasks) {
        const client = task.client;
        const clientCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';

        // Use snapshot values if available, otherwise fallback to client dealAmount
        const baseDealAmount = task.snapshotDealAmount != null
          ? Number(task.snapshotDealAmount)
          : Number(client.dealAmount || 0);
        const psrAmount = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
        const dealAmount = baseDealAmount + psrAmount;
        const certificatePayment = Number(task.snapshotCertificatePayment || 0);
        const workerPrice = Number(task.snapshotWorkerPrice || 0);
        const customsPayment = Number(task.snapshotCustomsPayment || 0);
        const branchPayments = certificatePayment + workerPrice + psrAmount + customsPayment;
        const netProfit = dealAmount - branchPayments;

        // Debug logging for first few tasks
        if (usdCount + uzsCount < 3) {
          console.log(`[Dashboard] Task ${task.id}: baseDealAmount=${baseDealAmount}, psrAmount=${psrAmount}, dealAmount=${dealAmount}, branchPayments=${branchPayments}, netProfit=${netProfit}, currency=${clientCurrency}`);
        }

        // Count all completed tasks, even if net profit is 0 or negative
        // This ensures accurate reporting
        if (clientCurrency === 'USD') {
          usd += netProfit;
          usdCount += 1;
        } else {
          uzs += netProfit;
          uzsCount += 1;
        }
      }

      console.log(`[Dashboard] sumNetProfitForRange result: USD=${usd} (${usdCount} tasks), UZS=${uzs} (${uzsCount} tasks)`);

      return { usd, uzs, usdCount, uzsCount };
    };

    const [todayNetProfit, weeklyNetProfit, monthlyNetProfit, yearlyNetProfit] = await Promise.all([
      sumNetProfitForRange(todayStart, todayEnd),
      sumNetProfitForRange(weekStart, todayEnd),
      sumNetProfitForRange(monthStart, todayEnd),
      sumNetProfitForRange(yearStart, todayEnd),
    ]);

    // Tasks by branch statistics - use separate where condition without date filters
    // to show all tasks by branch regardless of date filters
    const branchWhere: any = {};
    if (branchId) branchWhere.branchId = parseInt(branchId as string);
    if (workerId) {
      branchWhere.stages = { some: { assignedTo: parseInt(workerId as string) } };
    }

    // Debug: Check total tasks
    const totalTasksCount = await prisma.task.count({ where: branchWhere });
    console.log('[Dashboard] Total tasks count:', totalTasksCount);

    // Debug: branchId null checks removed for schema compatibility

    const tasksByBranch = await prisma.task.groupBy({
      by: ['branchId'],
      where: branchWhere,
      _count: true,
    });

    console.log('[Dashboard] tasksByBranch raw:', JSON.stringify(tasksByBranch, null, 2));
    console.log('[Dashboard] tasksByBranch length:', tasksByBranch.length);

    // Get branch details
    const branchIds = tasksByBranch.map((t: any) => t.branchId).filter((id: any) => id !== null);
    console.log('[Dashboard] branchIds extracted:', branchIds);

    const branchDetails = branchIds.length > 0
      ? await prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      })
      : [];

    console.log('[Dashboard] branchDetails found:', JSON.stringify(branchDetails, null, 2));
    console.log('[Dashboard] branchDetails count:', branchDetails.length);

    const tasksByBranchWithNames = tasksByBranch.map((t: any) => {
      if (t.branchId === null) {
        return {
          branchId: null,
          branchName: 'Filial belgilanmagan',
          count: t._count,
        };
      }
      return {
        branchId: t.branchId,
        branchName: branchDetails.find((b: any) => b.id === t.branchId)?.name || 'Noma\'lum',
        count: t._count,
      };
    });

    console.log('[Dashboard] tasksByBranchWithNames:', JSON.stringify(tasksByBranchWithNames, null, 2));
    console.log('[Dashboard] tasksByBranchWithNames length:', tasksByBranchWithNames.length);

    // Ensure tasksByBranch is always an array
    const finalTasksByBranch = Array.isArray(tasksByBranchWithNames)
      ? tasksByBranchWithNames
      : [];

    console.log('[Dashboard] Final tasksByBranch being sent:', JSON.stringify(finalTasksByBranch, null, 2));

    const DEFAULT_CERTIFIER_FEES = {
      st1Rate: 95000,
      fitoRate: 80000,
      aktRate: 25000,
    };

    let certifierDebt: any = null;
    const oltiariqBranch = await prisma.branch.findFirst({
      where: { name: 'Oltiariq' },
      select: { id: true, name: true },
    });

    if (oltiariqBranch) {
      const certifierModel = (prisma as any).certifierFeeConfig;
      const certifierConfigs = certifierModel
        ? await certifierModel.findMany({
            where: { branchId: oltiariqBranch.id },
            orderBy: { createdAt: 'asc' }
          })
        : [];
        
      const latestCertifierConfig =
        certifierConfigs.length > 0 ? certifierConfigs[certifierConfigs.length - 1] : null;

      const certifierRates = {
        st1Rate: Number(latestCertifierConfig?.st1Rate ?? DEFAULT_CERTIFIER_FEES.st1Rate),
        fitoRate: Number(latestCertifierConfig?.fitoRate ?? DEFAULT_CERTIFIER_FEES.fitoRate),
        aktRate: Number(latestCertifierConfig?.aktRate ?? DEFAULT_CERTIFIER_FEES.aktRate),
      };

      const taskCount = await prisma.task.count({
        where: { branchId: oltiariqBranch.id },
      });

      const accrued = { st1: 0, fito: 0, akt: 0 };
      if (certifierConfigs.length === 0) {
        accrued.st1 = taskCount * DEFAULT_CERTIFIER_FEES.st1Rate;
        accrued.fito = taskCount * DEFAULT_CERTIFIER_FEES.fitoRate;
        accrued.akt = taskCount * DEFAULT_CERTIFIER_FEES.aktRate;
      } else {
        const firstConfig = certifierConfigs[0];
        const beforeFirstCount = await prisma.task.count({
          where: {
            branchId: oltiariqBranch.id,
            createdAt: { lt: firstConfig.createdAt },
          },
        });
        accrued.st1 += beforeFirstCount * Number(firstConfig.st1Rate);
        accrued.fito += beforeFirstCount * Number(firstConfig.fitoRate);
        accrued.akt += beforeFirstCount * Number(firstConfig.aktRate);

        for (let i = 0; i < certifierConfigs.length; i += 1) {
          const config = certifierConfigs[i];
          const start = config.createdAt;
          const end = certifierConfigs[i + 1]?.createdAt;
          const count = await prisma.task.count({
            where: {
              branchId: oltiariqBranch.id,
              createdAt: end ? { gte: start, lt: end } : { gte: start },
            },
          });
          accrued.st1 += count * Number(config.st1Rate);
          accrued.fito += count * Number(config.fitoRate);
          accrued.akt += count * Number(config.aktRate);
        }
      }
      const accruedTotal = accrued.st1 + accrued.fito + accrued.akt;

      const payments = await prisma.transaction.findMany({
        where: {
          type: 'EXPENSE',
          expenseCategory: { not: null },
        },
        select: {
          expenseCategory: true,
          amount_uzs: true,
          convertedUzsAmount: true,
          amount: true,
          branchId: true,
        },
      });

      const paid = { st1: 0, fito: 0, akt: 0 };
      for (const tx of payments) {
        if (tx.branchId && tx.branchId !== oltiariqBranch.id) {
          continue;
        }
        const amount = Number(tx.amount_uzs || tx.convertedUzsAmount || tx.amount || 0);
        const rawCategory = tx.expenseCategory || '';
        const normalized = rawCategory.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (normalized.startsWith('ST1')) {
          paid.st1 += amount;
        } else if (normalized.startsWith('FITO')) {
          paid.fito += amount;
        } else if (normalized.startsWith('AKT')) {
          paid.akt += amount;
        }
      }
      const paidTotal = paid.st1 + paid.fito + paid.akt;

      const remaining = {
        st1: Math.max(accrued.st1 - paid.st1, 0),
        fito: Math.max(accrued.fito - paid.fito, 0),
        akt: Math.max(accrued.akt - paid.akt, 0),
      };
      const remainingTotal = remaining.st1 + remaining.fito + remaining.akt;

      certifierDebt = {
        branchId: oltiariqBranch.id,
        branchName: oltiariqBranch.name,
        taskCount,
        rates: certifierRates,
        accrued: { ...accrued, total: accruedTotal },
        paid: { ...paid, total: paidTotal },
        remaining: { ...remaining, total: remainingTotal },
      };
    }

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
    const normalizeStageName = (stageName: string) => {
      if (stageName === 'Xujjat_tekshirish' || stageName === 'Xujjat tekshirish' || stageName === 'Tekshirish') {
        return 'Tekshirish';
      }
      if (stageName === 'Xujjat_topshirish' || stageName === 'Xujjat topshirish' || stageName === 'Topshirish') {
        return 'Topshirish';
      }
      if (stageName === 'ST' || stageName === 'Fito' || stageName === 'FITO' || stageName === 'Sertifikat olib chiqish') {
        return 'Sertifikat olib chiqish';
      }
      return stageName;
    };
    const kpiConfigs = await prisma.kpiConfig.findMany();
    const stagePriceMap = new Map<string, number>();
    kpiConfigs.forEach((config) => {
      stagePriceMap.set(config.stageName, Number(config.price));
    });

    const workerDebtUsers = await prisma.user.findMany({
      where: {
        active: true,
        role: {
          in: ['DEKLARANT', 'ADMIN'],
        },
      },
      select: { id: true, name: true },
    });

    const workerDebtsRaw = await Promise.all(
      workerDebtUsers.map(async (worker) => {
        const [paid, earnedNet] = await Promise.all([
          calculateTotalPaidUsd(worker.id),
          calculateTotalEarnedUsd(worker.id),
        ]);

        const previousYear = 2024;
        const lastYear = new Date().getFullYear() - 1;
        let previousDebt = await prisma.previousYearWorkerDebt.findFirst({
          where: { workerId: worker.id, year: previousYear },
        });
        if (!previousDebt && lastYear !== previousYear) {
          previousDebt = await prisma.previousYearWorkerDebt.findFirst({
            where: { workerId: worker.id, year: lastYear },
          });
        }

        const previousEarned = Number(previousDebt?.totalEarned || 0);
        const previousPaid = Number(previousDebt?.totalPaid || 0);

        const netEarnedThisYear = Number(earnedNet);
        const totalPaidThisYear = Number(paid);
        const pending = netEarnedThisYear + previousEarned - (totalPaidThisYear + previousPaid);

        return {
          userId: worker.id,
          name: worker.name,
          totalEarnedUsd: netEarnedThisYear + previousEarned,
          totalPaidUsd: totalPaidThisYear + previousPaid,
          pendingUsd: pending,
        };
      })
    );

    const workerDebts = workerDebtsRaw;

    res.json({
      newTasks,
      completedTasks,
      tasksByStatus: tasksByStatus.map((t: any) => ({ status: t.status, count: t._count })),
      processStats: processStats.map((p: any) => ({ status: p.status, count: p._count })),
      workerActivity: workerActivityWithNames,
      workerCompletionRanking,
      workerErrorRanking,
      workerDebts,
      financialStats: financialStatsArray,
      paymentReminders,
      certifierDebt,
      yearlyGoalTarget: (await (prisma as any).yearlyGoalConfig?.findUnique?.({
        where: { year: new Date().getFullYear() },
      }))?.targetTasks ?? 2000,
      todayNetProfit,
      weeklyNetProfit,
      monthlyNetProfit,
      yearlyNetProfit,
      tasksByBranch: finalTasksByBranch,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    // Return partial data with empty arrays to prevent frontend errors
    res.status(500).json({
      error: 'Dashboard statistikalarini yuklashda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error),
      newTasks: 0,
      completedTasks: 0,
      tasksByStatus: [],
      processStats: [],
      workerActivity: [],
      financialStats: [],
      paymentReminders: [],
      tasksByBranch: [],
      certifierDebt: null,
      workerDebts: [],
      yearlyGoalTarget: 2000,
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
  let previousDateRange: { start: Date; end: Date } = { start: now, end: now };

  // Determine date range based on period
  if (period === 'weekly') {
    // Monday to today
    const start = new Date(now);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end };

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + diff);
    prevEnd.setHours(23, 59, 59, 999);
    previousDateRange = { start: prevStart, end: prevEnd };
  } else if (period === 'monthly') {
    // From month start to today
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end };

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    prevStart.setHours(0, 0, 0, 0);
    const daysInPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
    const dayOfMonth = Math.min(now.getDate(), daysInPrevMonth);
    const prevEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), dayOfMonth);
    prevEnd.setHours(23, 59, 59, 999);
    previousDateRange = { start: prevStart, end: prevEnd };
  } else if (period === 'yearly') {
    // From year start to today
    const start = new Date(now.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end };

    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevStart.setHours(0, 0, 0, 0);
    const prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    prevEnd.setHours(23, 59, 59, 999);
    previousDateRange = { start: prevStart, end: prevEnd };
  }

  // Override with custom dates if provided
  if (startDate) dateRange.start = new Date(startDate as string);
  if (endDate) dateRange.end = new Date(endDate as string);

  // Tasklar yaratilgan sanasi bo'yicha hisoblash
  const baseWhere: any = {};
  if (branchId) baseWhere.branchId = parseInt(branchId as string);

  const loadCreatedTasks = async (range: { start: Date; end: Date }) => {
    const tasks = await prisma.task.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: range.start, lte: range.end },
      },
      select: {
        createdAt: true,
      },
    });

    return tasks
      .map((task) => ({
        date: task.createdAt.toISOString().split('T')[0],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const tasksCompleted = await loadCreatedTasks(dateRange);
  const previousTasksCompleted = await loadCreatedTasks(previousDateRange);

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
    previousDateRange: {
      start: previousDateRange.start.toISOString(),
      end: previousDateRange.end.toISOString(),
    },
    tasksCompleted,
    previousTasksCompleted,
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

router.get('/premium-stats', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { branchId, employeeId } = req.query;

    const baseWhere: any = {};
    if (branchId) baseWhere.branchId = Number(branchId);
    if (employeeId) {
      baseWhere.stages = { some: { assignedToId: Number(employeeId) } };
    }

    // 1. Top Clients (by Task count)
    const topClientsGrouping = await prisma.task.groupBy({
      by: ['clientId'],
      where: baseWhere,
      _count: { _all: true }
    });

    const clientIds = topClientsGrouping.map(g => g.clientId);
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true }
    });

    const topClientsRaw = topClientsGrouping.map(g => ({
      clientId: g.clientId,
      count: g._count._all || 0,
      name: clients.find(c => c.id === g.clientId)?.name || 'Noma\'lum Mijoz'
    }));
    
    const topClients = topClientsRaw.filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    // 2. Task Process Types by Worker (Ishchilar va Rejimlar - TaskStage bo'yicha)
    const stageWorkersGrouping = await prisma.taskStage.groupBy({
      by: ['assignedToId', 'name'],
      where: {
        ...(employeeId ? { assignedToId: Number(employeeId) } : {}),
        assignedToId: { not: null }
      },
      _count: { _all: true }
    });

    const processUserIds = [...new Set(stageWorkersGrouping.map((g: any) => g.assignedToId))];
    const processUsers = await prisma.user.findMany({
      where: { id: { in: processUserIds as number[] } },
      select: { id: true, name: true }
    });

    const activeTasks = processUsers.map((u: any) => {
      const userGroup = stageWorkersGrouping.filter((g: any) => g.assignedToId === u.id);
      const sortedStages = userGroup.sort((a: any, b: any) => b._count._all - a._count._all).slice(0, 3);
      
      const stagesData = sortedStages.map((s: any) => ({
        name: s.name,
        count: s._count._all
      }));

      const total = userGroup.reduce((sum: number, g: any) => sum + g._count._all, 0);
      
      return {
        name: u.name,
        stages: stagesData,
        total
      };
    }).sort((a: any, b: any) => b.total - a.total).slice(0, 7); // Top 7 workers

    // 3. Github-style Daily Activity
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const dailyActivityGrouping = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        ...baseWhere,
        createdAt: { gte: sixMonthsAgo }
      },
      _count: { _all: true }
    });

    // Group to Date "YYYY-MM-DD"
    const activityMap = new Map<string, number>();
    for (const item of dailyActivityGrouping) {
      const d = item.createdAt.toISOString().split('T')[0];
      activityMap.set(d, (activityMap.get(d) || 0) + item._count._all);
    }
    const githubActivity = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));

    // 4. Process Times 
    const todayForTimeStats = new Date();
    todayForTimeStats.setHours(0, 0, 0, 0);

    const recentCompletedStages = await prisma.taskStage.findMany({
      where: {
        status: 'TAYYOR',
        completedAt: { gte: todayForTimeStats },
        startedAt: { not: null },
        ...(employeeId ? { assignedToId: Number(employeeId) } : {})
      },
      select: {
        name: true,
        startedAt: true,
        completedAt: true
      },
      orderBy: { completedAt: 'desc' },
      take: 2000
    });

    const stageTimesStats = new Map<string, { totalMs: number, count: number }>();
    
    for(const stage of recentCompletedStages) {
         if (stage.startedAt && stage.completedAt) {
             const diffMs = stage.completedAt.getTime() - stage.startedAt.getTime();
             if (diffMs > 1000) { 
                 if (!stageTimesStats.has(stage.name)) {
                     stageTimesStats.set(stage.name, { totalMs: 0, count: 0 });
                 }
                 const s = stageTimesStats.get(stage.name)!;
                 s.totalMs += diffMs;
                 s.count += 1;
             }
         }
    }

    const processTimes = Array.from(stageTimesStats.entries()).map(([name, data]) => ({
         name: name,
         averageMinutes: Math.round(data.totalMs / data.count / 60000)
    })).sort((a,b) => b.averageMinutes - a.averageMinutes);

    // Calculate average total task duration
    const recentCompletedTasks = await prisma.task.findMany({
       where: {
         status: { in: ['TAYYOR', 'YAKUNLANDI'] },
         updatedAt: { gte: todayForTimeStats },
         ...baseWhere
       },
       select: {
         createdAt: true,
         stages: {
           where: { status: 'TAYYOR', completedAt: { not: null } },
           orderBy: { completedAt: 'desc' },
           take: 1,
           select: { completedAt: true }
         }
       },
       orderBy: { createdAt: 'desc' },
       take: 500
    });
    
    let totalTaskMs = 0;
    let validTaskCount = 0;
    for (const t of recentCompletedTasks) {
       if (t.stages.length > 0 && t.stages[0].completedAt && t.stages[0].completedAt >= todayForTimeStats) {
           const diff = t.stages[0].completedAt.getTime() - t.createdAt.getTime();
           if (diff > 60000) { // filter out fake created-and-completed same minute checks
               totalTaskMs += diff;
               validTaskCount++;
           }
       }
    }

    const averageTaskTotalMinutes = validTaskCount > 0 ? Math.round(totalTaskMs / validTaskCount / 60000) : 0;

    res.json({
      topClients,
      activeTasks,
      githubActivity,
      processTimes,
      averageTaskTotalMinutes
    });

  } catch (error) {
    console.error('Error fetching premium stats:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
