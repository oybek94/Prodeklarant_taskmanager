import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { appCache, CACHE_TTL } from './cache';
import { endOfTashkentDay, startOfTashkentMonth, startOfTashkentWeek, tashkentDate, tashkentParts } from '../utils/tashkent-time';

/**
 * GET /dashboard/stats — bosh sahifa statistikasi.
 *
 * Har bir bo'lim alohida funksiya va bir-biriga bog'liq emas, shuning uchun
 * getDashboardStats ularni parallel hisoblaydi. Javob shakli frontend
 * (useDashboardStats) kutgani bilan bir xil — maydon qo'shish/o'chirishda u yerni ham tekshiring.
 */

const positiveInt = z.coerce.number().int().positive();
const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'Sana noto\'g\'ri' });

export const statsQuerySchema = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  branchId: positiveInt.optional(),
  workerId: positiveInt.optional(),
});

export interface StatsFilters {
  startDate?: Date;
  endDate?: Date;
  branchId?: number;
  workerId?: number;
}

export function toStatsFilters(q: z.infer<typeof statsQuerySchema>): StatsFilters {
  return {
    startDate: q.startDate ? new Date(q.startDate) : undefined,
    endDate: q.endDate ? new Date(q.endDate) : undefined,
    branchId: q.branchId,
    workerId: q.workerId,
  };
}

/** Filial + xodim filtri. Xodim — vazifada unga biriktirilgan bosqich bo'lsa. */
function taskScopeWhere(f: StatsFilters): Prisma.TaskWhereInput {
  return {
    ...(f.branchId ? { branchId: f.branchId } : {}),
    // Oldin `assignedTo: <raqam>` edi (relation) — workerId yuborilsa Prisma xatosi bilan 500
    ...(f.workerId ? { stages: { some: { assignedToId: f.workerId } } } : {}),
  };
}

/** Filial bo'yicha vazifalar — sana filtrisiz (barcha davr) */
async function getTasksByBranch(f: StatsFilters) {
  const tasksByBranch = await prisma.task.groupBy({ by: ['branchId'], where: taskScopeWhere(f), _count: true });
  const branchIds = tasksByBranch.map((t) => t.branchId).filter((id): id is number => id !== null);
  const branches = branchIds.length > 0
    ? await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(branches.map((b) => [b.id, b.name]));

  return tasksByBranch.map((t) => t.branchId === null
    ? { branchId: null, branchName: 'Filial belgilanmagan', count: t._count }
    : { branchId: t.branchId, branchName: nameById.get(t.branchId) || 'Noma\'lum', count: t._count });
}

// ─── Xodimlar reytingi (XP) ────────────────────────────────────────

export interface WorkerRankingRow {
  userId: number;
  name: string;
  completedStages: number;
  invoiceCount: number;
  errorCount: number;
}

/**
 * XP = bajarilgan bosqichlar + bounty (xato topgan +, xato qilgan −) + eslatma XP
 * (+ yillik reytingda medal XP). Qarang: memory xp-dynamic-sources.
 */
export async function calculateWorkerRanking(
  startDate: Date,
  endDate: Date,
  f: StatsFilters,
  includeMedalXp = false
): Promise<WorkerRankingRow[]> {
  const [allWorkers, completedStages, ratedErrors, noteXp, medalXp, errorsByWorker] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['DEKLARANT', 'ADMIN', 'MANAGER', 'CERTIFICATE_WORKER'] }, active: true },
      select: { id: true, name: true },
    }),
    prisma.taskStage.findMany({
      where: {
        status: 'TAYYOR',
        assignedToId: f.workerId ?? { not: null },
        completedAt: { not: null, gte: startDate, lte: endDate },
        ...(f.branchId ? { task: { branchId: f.branchId } } : {}),
      },
      select: { assignedToId: true, taskId: true },
    }),
    // Xatoni topgan (createdById) XP oladi, xato qilgan (workerId) XP yo'qotadi.
    prisma.taskError.findMany({
      where: { adminRatedAt: { gte: startDate, lte: endDate } },
      select: { createdById: true, workerId: true, bountyXp: true },
    }),
    prisma.dashboardNote.groupBy({
      by: ['completedById'],
      where: { isCompleted: true, completedAt: { gte: startDate, lte: endDate }, xpReward: { not: null } },
      _sum: { xpReward: true },
    }),
    // Medal XP faqat yillik reytingda; haftalik/oylik — faqat qilingan ishlar
    includeMedalXp
      ? prisma.userMedal.groupBy({
          by: ['userId'],
          where: { awardedAt: { gte: startDate, lte: endDate } },
          _sum: { xpBonus: true },
        })
      : Promise.resolve([]),
    prisma.taskError.groupBy({
      by: ['workerId'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    }),
  ]);

  const xp = new Map<number, number>();
  const addXp = (userId: number, amount: number) => xp.set(userId, (xp.get(userId) || 0) + amount);
  const uniqueTasks = new Map<number, Set<number>>();

  for (const s of completedStages) {
    if (s.assignedToId === null) continue;
    addXp(s.assignedToId, 1);
    if (!uniqueTasks.has(s.assignedToId)) uniqueTasks.set(s.assignedToId, new Set());
    uniqueTasks.get(s.assignedToId)!.add(s.taskId);
  }
  for (const err of ratedErrors) {
    const amount = err.bountyXp || 0;
    if (amount === 0 || err.workerId === null) continue;
    if (err.workerId !== err.createdById && err.createdById !== null) addXp(err.createdById, amount);
    // Xato qilgan ishchidan ayiramiz (o'z xatosi bo'lsa ham — jarima)
    addXp(err.workerId, -amount);
  }
  for (const n of noteXp) {
    if (n.completedById !== null) addXp(n.completedById, n._sum.xpReward || 0);
  }
  for (const md of medalXp) {
    addXp(md.userId, md._sum.xpBonus || 0);
  }

  const errorCount = new Map<number, number>();
  for (const e of errorsByWorker) {
    if (e.workerId !== null) errorCount.set(e.workerId, e._count);
  }

  return allWorkers
    .map((w) => ({
      userId: w.id,
      name: w.name,
      completedStages: xp.get(w.id) || 0,
      invoiceCount: uniqueTasks.get(w.id)?.size || 0,
      errorCount: errorCount.get(w.id) || 0,
    }))
    .sort((a, b) => (b.completedStages - a.completedStages) || a.name.localeCompare(b.name));
}

async function getWorkerCompletionRanking(f: StatsFilters) {
  // Toshkent vaqti — server TZ ga bog'liq emas
  const now = new Date();
  const todayEnd = endOfTashkentDay(now);
  // Hafta: dushanbadan
  const weekStart = startOfTashkentWeek(now);
  const monthStart = startOfTashkentMonth(now);
  // Mavsum: 1-maydan. Yanvar–aprelda joriy yilning 1-mayi hali kelmagan — o'tgan yilniki
  // (oldin shu oylarda mavsum boshi kelajakda bo'lib, yillik reyting bo'sh chiqardi)
  const thisYearSeason = tashkentDate(tashkentParts(now).year, 4, 1);
  const seasonStart = thisYearSeason <= now ? thisYearSeason : tashkentDate(tashkentParts(now).year - 1, 4, 1);

  const [weekly, monthly, yearly] = await Promise.all([
    calculateWorkerRanking(weekStart, todayEnd, f),
    calculateWorkerRanking(monthStart, todayEnd, f),
    calculateWorkerRanking(seasonStart, todayEnd, f, true),
  ]);
  return { weekly, monthly, yearly };
}

const DEFAULT_YEARLY_GOAL = 2000;

async function getYearlyGoalTarget(): Promise<number> {
  const goal = await prisma.yearlyGoalConfig.findUnique({ where: { year: new Date().getFullYear() } });
  return goal?.targetTasks ?? DEFAULT_YEARLY_GOAL;
}

// ─── Yig'uvchi ─────────────────────────────────────────────────────

export async function getDashboardStats(f: StatsFilters) {
  const cacheKey = `dashboard:stats:${f.startDate?.toISOString() ?? ''}:${f.endDate?.toISOString() ?? ''}:${f.branchId ?? ''}:${f.workerId ?? ''}`;
  const cached = appCache.get(cacheKey);
  if (cached) return cached;

  const [workerCompletionRanking, tasksByBranch, yearlyGoalTarget] = await Promise.all([
    getWorkerCompletionRanking(f),
    getTasksByBranch(f),
    getYearlyGoalTarget(),
  ]);

  // Faqat dashboard ishlatadigan maydonlar. Oldin moliya, sof foyda, xodimlar
  // qarzi, mijozlar qarzi ham hisoblanib, har qanday xodimga yuborilardi.
  const responseData = { workerCompletionRanking, tasksByBranch, yearlyGoalTarget };

  appCache.set(cacheKey, responseData, CACHE_TTL.DASHBOARD_STATS);
  return responseData;
}
