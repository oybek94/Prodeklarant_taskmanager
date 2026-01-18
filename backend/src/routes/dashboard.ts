import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { TaskStatus } from '@prisma/client';

const router = Router();

const getStartOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as start
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const buildRangePair = (period: 'today' | 'week' | 'month' | 'year') => {
  const now = new Date();
  let currentStart = new Date(now);
  if (period === 'today') {
    currentStart.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    currentStart = getStartOfWeek(now);
  } else if (period === 'month') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentStart.setHours(0, 0, 0, 0);
  } else {
    currentStart = new Date(now.getFullYear(), 0, 1);
    currentStart.setHours(0, 0, 0, 0);
  }

  const currentEnd = new Date(now);
  const duration = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - duration - 1);
  const previousEnd = new Date(previousStart.getTime() + duration);

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
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
    include: {
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
    },
  });

  const paymentReminders = allClients
    .map((client) => {
      const dealCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';
      const dealAmount = Number(client.dealAmount || 0);

      const totalDealAmount = client.tasks.reduce((sum: number, task: any) => {
        const baseAmount = task.snapshotDealAmount != null ? Number(task.snapshotDealAmount) : dealAmount;
        const psrAmount = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
        return sum + baseAmount + psrAmount;
      }, 0);

      const totalPaid = client.transactions
        .filter((t: any) => t.currency === dealCurrency)
        .reduce((sum, t) => sum + Number(t.amount), 0);

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
        if (client.tasks.length > 0 && currentDebt > 0) {
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

    res.json({
      newTasks,
      completedTasks,
      tasksByStatus: tasksByStatus.map((t: any) => ({ status: t.status, count: t._count })),
      processStats: processStats.map((p: any) => ({ status: p.status, count: p._count })),
      workerActivity: workerActivityWithNames,
      financialStats: financialStatsArray,
      paymentReminders,
      todayNetProfit,
      weeklyNetProfit,
      monthlyNetProfit,
      yearlyNetProfit,
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

export default router;

