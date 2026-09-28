import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { appCache, CACHE_TTL } from '../services/cache';
import { statsQuerySchema, toStatsFilters, getDashboardStats } from '../services/dashboard-stats.service';
import {
  addDays,
  endOfTashkentDay,
  startOfTashkentDay,
  startOfTashkentMonth,
  startOfTashkentWeek,
  startOfTashkentYear,
  tashkentDate,
  tashkentDateKey,
  tashkentParts,
} from '../utils/tashkent-time';

const router = Router();

type SummaryPeriod = 'today' | 'week' | 'month' | 'year';
type DateRangeT = { start: Date; end: Date };

/**
 * Joriy davr (boshidan hozirgacha) va o'tgan davrning xuddi shuncha qismi — Toshkent vaqti.
 * O'tgan davr oxiri joriy davr boshidan oshmaydi (masalan, 31-mart vs fevral).
 */
const buildRangePair = (period: SummaryPeriod, now = new Date()) => {
  let currentStart: Date;
  let previousStart: Date;
  if (period === 'today') {
    currentStart = startOfTashkentDay(now);
    previousStart = addDays(currentStart, -1);
  } else if (period === 'week') {
    currentStart = startOfTashkentWeek(now);
    previousStart = addDays(currentStart, -7);
  } else if (period === 'month') {
    currentStart = startOfTashkentMonth(now);
    const p = tashkentParts(now);
    previousStart = tashkentDate(p.year, p.month - 1, 1);
  } else {
    currentStart = startOfTashkentYear(now);
    previousStart = tashkentDate(tashkentParts(now).year - 1, 0, 1);
  }
  const elapsed = now.getTime() - currentStart.getTime();
  const previousEnd = new Date(Math.min(previousStart.getTime() + elapsed, currentStart.getTime() - 1));
  return {
    current: { start: currentStart, end: now },
    previous: { start: previousStart, end: previousEnd },
  };
};

const calcDeltaPercent = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
};

const inRange = (date: Date, range: DateRangeT) => date >= range.start && date <= range.end;

/** Mini-grafik: bugun — soatlar, yil — oylar, hafta/oy — kunlar (Toshkent vaqti) */
const buildSeries = (period: SummaryPeriod, range: DateRangeT, dates: Date[]) => {
  if (period === 'today') {
    const data = Array.from({ length: 24 }, () => 0);
    for (const date of dates) data[tashkentParts(date).hour] += 1;
    return { labels: Array.from({ length: 24 }, (_, idx) => `${idx}`.padStart(2, '0')), data };
  }

  if (period === 'year') {
    const year = tashkentParts(range.start).year;
    const data = Array.from({ length: 12 }, () => 0);
    for (const date of dates) data[tashkentParts(date).month] += 1;
    return { labels: Array.from({ length: 12 }, (_, idx) => `${year}-${String(idx + 1).padStart(2, '0')}`), data };
  }

  const labels: string[] = [];
  for (let cursor = range.start; cursor <= range.end; cursor = addDays(cursor, 1)) {
    labels.push(tashkentDateKey(cursor));
  }
  const indexByDate = new Map(labels.map((label, idx) => [label, idx]));
  const data = labels.map(() => 0);
  for (const date of dates) {
    const index = indexByDate.get(tashkentDateKey(date));
    if (index !== undefined) data[index] += 1;
  }
  return { labels, data };
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

    const now = new Date();
    const periods: SummaryPeriod[] = ['today', 'week', 'month', 'year'];
    const rangeMap = new Map(periods.map((period) => [period, buildRangePair(period, now)]));

    // "Bugun" — yaratilgan vazifalar; hafta/oy/yil — yakunlangan. Yakunlanishlar oralig'i:
    const completionRanges = (['week', 'month', 'year'] as const).flatMap((p) => {
      const pair = rangeMap.get(p)!;
      return [pair.current, pair.previous];
    });
    const minStart = new Date(Math.min(...completionRanges.map((r) => r.start.getTime())));
    const todayPair = rangeMap.get('today')!;

    // Ichma-ich stages faqat kerakli sana oralig'i bilan (barcha tarixni yuklamaslik uchun).
    // Arxiv hujjatlari: avval sana oralig'idagi hujjatlar olinadi, keyin faqat ularning tasklari
    // (mavjud + filtrga mos) tekshiriladi. ArchiveDocument'da task relation yo'q — o'chirilgan
    // task arxivi sanalmasligi uchun tekshiruv shart.
    const [completedTasks, archivedDocsInRange, createdTasks] = await Promise.all([
      prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          status: { in: completedStatuses },
        },
        select: {
          id: true,
          status: true,
          stages: {
            where: {
              name: { in: ['Deklaratsiya', 'Pochta'] },
              status: 'TAYYOR',
              completedAt: { gte: minStart, lte: now },
            },
            select: { name: true, completedAt: true },
            orderBy: { completedAt: 'desc' },
          },
        },
      }),
      prisma.archiveDocument.findMany({
        where: { archivedAt: { gte: minStart, lte: now } },
        select: { taskId: true, archivedAt: true },
        orderBy: { archivedAt: 'asc' },
      }),
      prisma.task.findMany({
        where: { ...baseTaskWhere, createdAt: { gte: todayPair.previous.start, lte: now } },
        select: { createdAt: true },
      }),
    ]);

    // TAYYOR — Deklaratsiya, YAKUNLANDI — Pochta bosqichi yakunlangan vaqt
    const completionDates = completedTasks.flatMap((task) => {
      const stageName = task.status === 'TAYYOR' ? 'Deklaratsiya' : 'Pochta';
      const stage = task.stages.find((item) => item.name === stageName && item.completedAt);
      return stage?.completedAt ? [{ id: task.id, date: stage.completedAt }] : [];
    });

    const archivedTaskIds = [...new Set(archivedDocsInRange.map((doc) => doc.taskId))];
    const validArchivedTaskIds = archivedTaskIds.length > 0
      ? new Set((await prisma.task.findMany({
        where: { ...baseTaskWhere, id: { in: archivedTaskIds } },
        select: { id: true },
      })).map((t) => t.id))
      : new Set<number>();
    const archivedDocs = archivedDocsInRange.filter((doc) => validArchivedTaskIds.has(doc.taskId));

    /**
     * Davrdagi yakunlanishlar: bosqich yakunlangan tasklar + davrda arxivlangan, lekin
     * bosqich bo'yicha sanalmagan tasklar (bir task — bir marta, eng erta arxiv sanasi).
     * Son ham, mini-grafik ham shu bitta ro'yxatdan — oldin ular bir-biriga mos kelmasdi.
     */
    const completionsInRange = (range: DateRangeT): Date[] => {
      const counted = new Set<number>();
      const dates: Date[] = [];
      for (const item of completionDates) {
        if (inRange(item.date, range)) {
          counted.add(item.id);
          dates.push(item.date);
        }
      }
      for (const doc of archivedDocs) {
        if (inRange(doc.archivedAt, range) && !counted.has(doc.taskId)) {
          counted.add(doc.taskId);
          dates.push(doc.archivedAt);
        }
      }
      return dates;
    };

    const createdInRange = (range: DateRangeT): Date[] =>
      createdTasks.map((t) => t.createdAt).filter((date) => inRange(date, range));

    const result: Record<string, { count: number; deltaPercent: number | null; series: { labels: string[]; data: number[] } }> = {};
    for (const period of periods) {
      const pair = rangeMap.get(period)!;
      const datesIn = period === 'today' ? createdInRange : completionsInRange;
      const current = datesIn(pair.current);
      const previous = datesIn(pair.previous);
      result[period] = {
        count: current.length,
        deltaPercent: calcDeltaPercent(current.length, previous.length),
        series: buildSeries(period, pair.current, current),
      };
    }

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
      workerCompletionRanking: { weekly: [], monthly: [], yearly: [] },
      tasksByBranch: [],
      yearlyGoalTarget: 2000,
    });
  }
});

// Charts data
router.get('/charts', requireAuth(), async (req: AuthRequest, res) => {
  const { period = 'monthly', startDate, endDate, branchId } = req.query;
  const now = new Date();
  const todayEnd = endOfTashkentDay(now);
  const p = tashkentParts(now);
  let dateRange: { start: Date; end: Date };
  let previousDateRange: { start: Date; end: Date };

  // Joriy davr boshidan bugun oxirigacha va o'tgan davrning mos qismi (Toshkent vaqti)
  if (period === 'weekly') {
    const start = startOfTashkentWeek(now);
    dateRange = { start, end: todayEnd };
    const prevStart = addDays(start, -7);
    previousDateRange = { start: prevStart, end: addDays(todayEnd, -7) };
  } else if (period === 'yearly') {
    dateRange = { start: startOfTashkentYear(now), end: todayEnd };
    previousDateRange = {
      start: tashkentDate(p.year - 1, 0, 1),
      end: tashkentDate(p.year - 1, p.month, p.day, 23, 59, 59, 999),
    };
  } else {
    dateRange = { start: startOfTashkentMonth(now), end: todayEnd };
    const daysInPrevMonth = tashkentParts(tashkentDate(p.year, p.month, 0)).day;
    previousDateRange = {
      start: tashkentDate(p.year, p.month - 1, 1),
      end: tashkentDate(p.year, p.month - 1, Math.min(p.day, daysInPrevMonth), 23, 59, 59, 999),
    };
  }

  // Override with custom dates if provided
  if (startDate) dateRange.start = new Date(startDate as string);
  if (endDate) dateRange.end = new Date(endDate as string);

  // Tasklar yaratilgan sanasi bo'yicha — kun kesimida serverda yig'iladi
  // (oldin har bir task uchun alohida qator yuborilardi)
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

    const countByDate = new Map<string, number>();
    for (const task of tasks) {
      const date = tashkentDateKey(task.createdAt);
      countByDate.set(date, (countByDate.get(date) || 0) + 1);
    }
    return [...countByDate.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  try {
    const [tasksCompleted, previousTasksCompleted] = await Promise.all([
      loadCreatedTasks(dateRange),
      loadCreatedTasks(previousDateRange),
    ]);

    res.json({
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        // Grafik o'qi uchun Toshkent kunlari (brauzer vaqt zonasiga bog'liq emas)
        startKey: tashkentDateKey(dateRange.start),
        endKey: tashkentDateKey(dateRange.end),
      },
      previousDateRange: {
        start: previousDateRange.start.toISOString(),
        end: previousDateRange.end.toISOString(),
      },
      tasksCompleted,
      previousTasksCompleted,
    });
  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    res.status(500).json({ error: 'Grafik ma\'lumotlari yuklanmadi' });
  }
});

router.get('/premium-stats', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { branchId, employeeId } = req.query;

    const cacheKey = `dashboard:premium-stats:${branchId || ''}:${employeeId || ''}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const baseWhere: any = {};
    if (branchId) baseWhere.branchId = Number(branchId);
    if (employeeId) {
      baseWhere.stages = { some: { assignedToId: Number(employeeId) } };
    }

    const now = new Date();
    const sixMonthsAgo = addDays(now, -180);
    // Bajaruvchilar kesimi — so'nggi 30 kun; vaqt ko'rsatkichlari — so'nggi 7 kun
    // (oldin faqat bugun edi — ertalab doim bo'sh turardi)
    const workersSince = addDays(startOfTashkentDay(now), -29);
    const timeStatsSince = addDays(startOfTashkentDay(now), -6);

    // Bir-biriga bog'liq bo'lmagan so'rovlar parallel (oldin 7 ta ketma-ket edi)
    const [topClientsGrouping, stageWorkersGrouping, dailyActivityTasks, recentCompletedStages, recentCompletedTasks] = await Promise.all([
      // 1. Top Clients (by Task count)
      prisma.task.groupBy({
        by: ['clientId'],
        where: baseWhere,
        _count: { _all: true }
      }),
      // 2. Task Process Types by Worker (Ishchilar va Rejimlar - TaskStage bo'yicha)
      prisma.taskStage.groupBy({
        by: ['assignedToId', 'name'],
        where: {
          ...(employeeId ? { assignedToId: Number(employeeId) } : {}),
          assignedToId: { not: null },
          status: 'TAYYOR',
          completedAt: { gte: workersSince },
        },
        _count: { _all: true }
      }),
      // 3. Github-style Daily Activity (createdAt timestamp bo'yicha groupBy har task uchun
      // alohida guruh qaytarardi — oddiy select bir xil natija, arzonroq)
      prisma.task.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: sixMonthsAgo }
        },
        select: { createdAt: true }
      }),
      // 4. Process Times
      prisma.taskStage.findMany({
        where: {
          status: 'TAYYOR',
          completedAt: { gte: timeStatsSince },
          startedAt: { not: null },
          ...(employeeId ? { assignedToId: Number(employeeId) } : {})
        },
        select: {
          name: true,
          startedAt: true,
          completedAt: true
        },
        orderBy: { completedAt: 'desc' },
        take: 5000
      }),
      // 5. Average total task duration
      prisma.task.findMany({
        where: {
          status: { in: ['TAYYOR', 'YAKUNLANDI'] },
          updatedAt: { gte: timeStatsSince },
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
        take: 2000
      }),
    ]);

    const processUserIds = [...new Set(stageWorkersGrouping.map((g) => g.assignedToId))].filter((id): id is number => id !== null);
    const [clients, processUsers] = await Promise.all([
      prisma.client.findMany({
        where: { id: { in: topClientsGrouping.map(g => g.clientId) } },
        select: { id: true, name: true }
      }),
      prisma.user.findMany({
        where: { id: { in: processUserIds } },
        select: { id: true, name: true }
      }),
    ]);

    const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
    const sortedClients = topClientsGrouping
      .map(g => ({
        clientId: g.clientId as number | null,
        count: g._count._all || 0,
        name: clientNameById.get(g.clientId) || 'Noma\'lum Mijoz'
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);
    // Diagramma yuzlab bo'lakka bo'linmasligi uchun: eng kattalari + "Boshqalar"
    const TOP_CLIENTS_LIMIT = 8;
    const otherClientsCount = sortedClients.slice(TOP_CLIENTS_LIMIT).reduce((sum, c) => sum + c.count, 0);
    const topClients = [
      ...sortedClients.slice(0, TOP_CLIENTS_LIMIT),
      ...(otherClientsCount > 0 ? [{ clientId: null, count: otherClientsCount, name: 'Boshqalar' }] : []),
    ];

    const activeTasks = processUsers.map((u) => {
      const userGroup = stageWorkersGrouping.filter((g) => g.assignedToId === u.id);
      const sortedStages = [...userGroup].sort((a, b) => b._count._all - a._count._all).slice(0, 3);

      return {
        name: u.name,
        stages: sortedStages.map((s) => ({ name: s.name, count: s._count._all })),
        total: userGroup.reduce((sum, g) => sum + g._count._all, 0)
      };
    }).sort((a, b) => b.total - a.total).slice(0, 7); // Top 7 workers

    // Group to Date "YYYY-MM-DD"
    const activityMap = new Map<string, number>();
    for (const item of dailyActivityTasks) {
      const d = tashkentDateKey(item.createdAt);
      activityMap.set(d, (activityMap.get(d) || 0) + 1);
    }
    const githubActivity = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));

    const stageTimesStats = new Map<string, { totalMs: number, count: number }>();
    for (const stage of recentCompletedStages) {
      if (stage.startedAt && stage.completedAt) {
        const diffMs = stage.completedAt.getTime() - stage.startedAt.getTime();
        if (diffMs > 1000) {
          const s = stageTimesStats.get(stage.name) ?? { totalMs: 0, count: 0 };
          s.totalMs += diffMs;
          s.count += 1;
          stageTimesStats.set(stage.name, s);
        }
      }
    }

    const processTimes = Array.from(stageTimesStats.entries()).map(([name, data]) => ({
      name: name,
      averageMinutes: Math.round(data.totalMs / data.count / 60000)
    })).sort((a, b) => b.averageMinutes - a.averageMinutes);

    let totalTaskMs = 0;
    let validTaskCount = 0;
    for (const t of recentCompletedTasks) {
      if (t.stages.length > 0 && t.stages[0].completedAt && t.stages[0].completedAt >= timeStatsSince) {
        const diff = t.stages[0].completedAt.getTime() - t.createdAt.getTime();
        if (diff > 60000) { // filter out fake created-and-completed same minute checks
          totalTaskMs += diff;
          validTaskCount++;
        }
      }
    }

    const averageTaskTotalMinutes = validTaskCount > 0 ? Math.round(totalTaskMs / validTaskCount / 60000) : 0;

    const result = {
      topClients,
      activeTasks,
      githubActivity,
      processTimes,
      averageTaskTotalMinutes
    };
    appCache.set(cacheKey, result, CACHE_TTL.DASHBOARD_STATS);
    res.json(result);

  } catch (error) {
    console.error('Error fetching premium stats:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;
