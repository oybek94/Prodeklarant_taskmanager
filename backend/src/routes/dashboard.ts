import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { appCache, CACHE_TTL } from '../services/cache';
import { statsQuerySchema, toStatsFilters, getDashboardStats } from '../services/dashboard-stats.service';

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

    // Kesh: bir xil filtr uchun 5 daqiqa (dashboard bir vaqtda ko'p endpoint yuklaydi)
    const cacheKey = `dashboard:completed-summary:${branchId || ''}:${employeeId || ''}:${clientId || ''}`;
    const cachedSummary = appCache.get(cacheKey);
    if (cachedSummary) {
      return res.json(cachedSummary);
    }

    // Davr diapazonlarini oldindan hisoblaymiz — DB so'rovlarini shu oralik bilan cheklaymiz
    const periods = ['today', 'week', 'month', 'year'] as const;
    const rangeMap = new Map<typeof periods[number], ReturnType<typeof buildRangePair>>();
    for (const period of periods) {
      rangeMap.set(period, buildRangePair(period));
    }

    const allRanges = Array.from(rangeMap.values()).flatMap((pair) => [pair.current, pair.previous]);
    const minStart = allRanges.reduce((min, range) => (range.start < min ? range.start : min), allRanges[0].start);
    const maxEnd = allRanges.reduce((max, range) => (range.end > max ? range.end : max), allRanges[0].end);

    // Mustaqil ikki so'rovni parallel yuboramiz; ichma-ich stages'ni faqat
    // kerakli sana oralig'i bilan cheklaymiz (barcha tarixni yuklamaslik uchun).
    const [completedTasks, taskIds] = await Promise.all([
      prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          status: { in: completedStatuses },
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          stages: {
            where: {
              name: { in: ['Deklaratsiya', 'Pochta'] },
              status: 'TAYYOR',
              completedAt: { gte: minStart, lte: maxEnd },
            },
            select: { name: true, completedAt: true },
            orderBy: { completedAt: 'desc' },
          },
        },
      }),
      prisma.task.findMany({ where: baseTaskWhere, select: { id: true } }).then((tasks) => tasks.map((t) => t.id)),
    ]);

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

    appCache.set(cacheKey, result, CACHE_TTL.DASHBOARD_STATS);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching completed summary:', error);
    res.status(500).json({
      error: 'Yakunlangan ishlar statistikasi yuklanmadi',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /dashboard/stats — mantiq: services/dashboard-stats.service.ts
router.get('/stats', requireAuth(), async (req: AuthRequest, res) => {
  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return res.status(400).json({ error: `${first.path.join('.')}: ${first.message}` });
  }
  try {
    res.json(await getDashboardStats(toStatsFilters(parsed.data)));
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Frontend xatolikda ham bo'sh massivlarni kutadi
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
