import { Prisma, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { getWorkerPaymentReport } from './worker-payment';
import { amountInUzs, toMoneyNumber, warnSkippedUzs, ZERO } from '../utils/money';
import { appCache, CACHE_TTL } from './cache';
import { shouldDeductGovernmentFees } from './contract-payment-split';
import { taskFeeSelect, taskFeesIn, psrIn } from './task-money';

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

type DateRange = { gte?: Date; lte?: Date };

function createdAtRange(f: StatsFilters): DateRange | undefined {
  if (!f.startDate && !f.endDate) return undefined;
  return { gte: f.startDate, lte: f.endDate };
}

/** Filial + xodim filtri. Xodim — vazifada unga biriktirilgan bosqich bo'lsa. */
function taskScopeWhere(f: StatsFilters): Prisma.TaskWhereInput {
  return {
    ...(f.branchId ? { branchId: f.branchId } : {}),
    // Oldin `assignedTo: <raqam>` edi (relation) — workerId yuborilsa Prisma xatosi bilan 500
    ...(f.workerId ? { stages: { some: { assignedToId: f.workerId } } } : {}),
  };
}

// ─── Vazifa hisoblari ───────────────────────────────────────────────

async function getTaskCounts(f: StatsFilters) {
  const range = createdAtRange(f);
  const where: Prisma.TaskWhereInput = { ...taskScopeWhere(f), ...(range ? { createdAt: range } : {}) };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [tasksByStatus, newTasks, completedTasks, processStats] = await Promise.all([
    prisma.task.groupBy({ by: ['status'], where, _count: true }),
    prisma.task.count({ where: { ...where, createdAt: { gte: today } } }),
    prisma.task.count({ where: { ...where, status: 'TAYYOR' } }),
    prisma.taskStage.groupBy({ by: ['status'], where: { task: where }, _count: true }),
  ]);

  return {
    newTasks,
    completedTasks,
    tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count })),
    processStats: processStats.map((p) => ({ status: p.status, count: p._count })),
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
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  // Hafta: dushanbadan
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  // Mavsum: 1-maydan
  const seasonStart = new Date(now.getFullYear(), 4, 1, 0, 0, 0, 0);

  const [weekly, monthly, yearly] = await Promise.all([
    calculateWorkerRanking(weekStart, todayEnd, f),
    calculateWorkerRanking(monthStart, todayEnd, f),
    calculateWorkerRanking(seasonStart, todayEnd, f, true),
  ]);
  return { weekly, monthly, yearly };
}

// ─── Xodimlar faolligi (KPI) ───────────────────────────────────────

/** Eslatma bounty (so'm) ni USD ko'rinishga o'girish uchun taxminiy kurs */
const NOTE_BOUNTY_UZS_PER_USD = 12500;

async function getWorkerActivity(f: StatsFilters) {
  const range = createdAtRange(f);
  const [kpiLogs, completedNotes] = await Promise.all([
    prisma.kpiLog.findMany({
      where: { createdAt: range },
      select: { userId: true, amount_original: true, amount_uzs: true },
    }),
    prisma.dashboardNote.findMany({
      where: { isCompleted: true, bountyReward: { not: null }, ...(range ? { completedAt: range } : {}) },
      select: { completedById: true, bountyReward: true },
    }),
  ]);

  const activity = new Map<number, { totalKPI: number; totalKPIUzs: number; count: number }>();
  const bucket = (userId: number) => {
    let b = activity.get(userId);
    if (!b) activity.set(userId, (b = { totalKPI: 0, totalKPIUzs: 0, count: 0 }));
    return b;
  };

  for (const log of kpiLogs) {
    const b = bucket(log.userId);
    b.totalKPI += Number(log.amount_original || 0); // USD — xodimga ko'rsatish uchun
    b.totalKPIUzs += Number(log.amount_uzs || 0); // UZS — buxgalteriya uchun
    b.count++;
  }
  for (const note of completedNotes) {
    if (note.completedById === null) continue;
    const b = bucket(note.completedById);
    const rewardUzs = Number(note.bountyReward || 0);
    b.totalKPI += rewardUzs / NOTE_BOUNTY_UZS_PER_USD;
    b.totalKPIUzs += rewardUzs;
    b.count++;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...activity.keys()] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  // userId bo'yicha o'sish tartibi — oldingi obyekt-kalitli guruhlash bilan bir xil
  return [...activity.entries()].sort(([a], [b]) => a - b).map(([userId, b]) => ({
    userId,
    name: nameById.get(userId) || 'Unknown',
    totalKPI: b.totalKPI,
    totalKPIUzs: b.totalKPIUzs,
    completedStages: b.count,
  }));
}

// ─── Moliya ────────────────────────────────────────────────────────

async function getFinancialStats(f: StatsFilters) {
  const range = createdAtRange(f);
  const transactions = await prisma.transaction.findMany({
    where: { date: range, branchId: f.branchId },
    select: {
      type: true,
      amount_uzs: true,
      convertedUzsAmount: true,
      amount: true,
      currency: true,
      exchangeRate: true,
      amount_original: true,
      currency_universal: true,
      exchange_rate: true,
      exchange_source: true,
    },
  });

  // Tur bo'yicha so'mdagi yig'indi (Decimal). So'mga o'girib bo'lmaydigan qator
  // (USD, kurs yo'q) so'm deb qo'shilmaydi.
  const byType: Record<string, { total: Prisma.Decimal; exchangeRates: Set<string> }> = {};
  let skipped = 0;
  for (const tx of transactions) {
    const b = (byType[tx.type] ??= { total: ZERO, exchangeRates: new Set<string>() });
    const uzs = amountInUzs(tx);
    if (uzs) b.total = b.total.plus(uzs);
    else skipped++;
    if (tx.exchange_rate) b.exchangeRates.add(`${tx.exchange_rate}-${tx.exchange_source || 'CBU'}`);
  }
  warnSkippedUzs('dashboard financialStats', skipped);

  return Object.entries(byType).map(([type, data]) => ({
    type,
    total: toMoneyNumber(data.total),
    currency: 'UZS',
    exchangeRatesUsed: [...data.exchangeRates].map((rate) => {
      const [value, source] = rate.split('-');
      return { rate: parseFloat(value), source };
    }),
  }));
}

export interface PaymentReminder {
  clientId: number;
  clientName: string;
  phone: string | null;
  creditType: string;
  creditLimit: number | null;
  dueReason: string;
  creditStartDate: Date;
  currentDebt: number;
  currency: string;
}

/** To'lov muddati kelgan mijozlar (qarz > 0 va nasiya sharti bajarilgan) */
async function getPaymentReminders() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      dealAmount: true,
      dealAmountCurrency: true,
      creditType: true,
      creditLimit: true,
      creditStartDate: true,
      initialDebt: true,
      initialDebtCurrency: true,
      initialDebtInUzs: true,
      tasks: {
        select: { id: true, createdAt: true, snapshotDealAmount: true, ...taskFeeSelect },
        orderBy: { createdAt: 'asc' },
      },
      transactions: {
        where: { type: 'INCOME' },
        select: { amount: true, date: true, currency: true },
      },
    },
  });

  const reminders: PaymentReminder[] = [];
  for (const client of clients) {
    const dealCurrency = client.dealAmountCurrency || 'USD';
    const dealAmount = Number(client.dealAmount || 0);

    const totalDealAmount = client.tasks.reduce((sum, task) => {
      const base = task.snapshotDealAmount != null ? Number(task.snapshotDealAmount) : dealAmount;
      // PSR so'mda saqlanishi mumkin — mijoz valyutasiga o'giriladi
      const psr = psrIn(task, dealCurrency, dealCurrency);
      return sum + base + psr;
    }, 0);
    // DIQQAT: to'lovlar valyutasidan qat'i nazar qo'shiladi (eski xatti-harakat saqlangan)
    const totalPaid = client.transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    let initialDebt = 0;
    if (client.initialDebt) {
      const debtCurrency = client.initialDebtCurrency || 'USD';
      initialDebt = debtCurrency !== dealCurrency && client.initialDebtInUzs && dealCurrency === 'UZS'
        ? Number(client.initialDebtInUzs)
        : Number(client.initialDebt);
    }

    const currentDebt = totalDealAmount - totalPaid + initialDebt;
    if (currentDebt <= 0.01) continue; // suzuvchi nuqta xatosi uchun 0.01

    let dueReason: string | null = null;
    if (client.creditType && client.creditLimit && client.creditStartDate) {
      const creditLimit = Number(client.creditLimit);
      if (client.creditType === 'TASK_COUNT') {
        const creditStart = client.creditStartDate;
        const taskCount = client.tasks.filter((t) => t.createdAt >= creditStart).length;
        if (taskCount >= creditLimit) {
          dueReason = `${creditLimit} ta ishdan keyin to'lov kerak (${taskCount} ta ish bajarildi).`;
        }
      } else if (client.creditType === 'AMOUNT' && currentDebt >= creditLimit) {
        dueReason = `Qardorlik ${creditLimit.toFixed(2)} ga yetdi.`;
      }
    } else if (client.tasks.length > 0) {
      // Nasiya sharti yo'q — qarzi bor faol mijoz to'lashi kerak
      dueReason = `Shartnomaga ko'ra to'lov qilish kerak.`;
    }

    if (dueReason) {
      reminders.push({
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        creditType: client.creditType || 'NONE',
        creditLimit: client.creditLimit ? Number(client.creditLimit) : null,
        dueReason,
        creditStartDate: client.creditStartDate || client.createdAt,
        currentDebt,
        currency: dealCurrency,
      });
    }
  }
  return reminders;
}

/** Yakunlangan (TAYYOR/YAKUNLANDI) vazifalardan sof foyda — mijoz valyutasi bo'yicha alohida */
export async function sumNetProfitForRange(start: Date, end: Date, branchId?: number) {
  const completedStatuses: TaskStatus[] = [TaskStatus.TAYYOR, TaskStatus.YAKUNLANDI];
  const tasks = await prisma.task.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: { in: completedStatuses },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      ...taskFeeSelect,
      snapshotDealAmount: true,
      snapshotContractPaymentType: true,
      client: {
        select: { dealAmount: true, dealAmount_currency: true, dealAmountCurrency: true, contractPaymentType: true },
      },
    },
  });

  let usd = 0;
  let uzs = 0;
  let usdCount = 0;
  let uzsCount = 0;
  for (const task of tasks) {
    const client = task.client;
    const clientCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';
    const baseDealAmount = task.snapshotDealAmount != null ? Number(task.snapshotDealAmount) : Number(client.dealAmount || 0);
    // To'lovlar so'mda saqlanishi mumkin — foyda mijoz valyutasida hisoblanadi
    const fees = taskFeesIn(task, clientCurrency, clientCurrency);
    const psrAmount = fees.psr;
    const workerPrice = fees.worker;

    const contractPaymentType = task.snapshotContractPaymentType || client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
    const deductGovernmentFees = shouldDeductGovernmentFees(contractPaymentType);
    const certificatePayment = deductGovernmentFees ? fees.certificate : 0;
    const customsPayment = deductGovernmentFees ? fees.customs : 0;

    const netProfit = (baseDealAmount + psrAmount) - (certificatePayment + workerPrice + psrAmount + customsPayment);

    // Foyda 0 yoki manfiy bo'lsa ham sanaladi
    if (clientCurrency === 'USD') {
      usd += netProfit;
      usdCount += 1;
    } else {
      uzs += netProfit;
      uzsCount += 1;
    }
  }
  return { usd, uzs, usdCount, uzsCount };
}

async function getNetProfitSummary(branchId?: number) {
  // Server va mijoz vaqt zonasi farqi uchun UTC
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(todayStart.getUTCDate() - ((todayStart.getUTCDay() + 6) % 7));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));

  const [todayNetProfit, weeklyNetProfit, monthlyNetProfit, yearlyNetProfit] = await Promise.all([
    sumNetProfitForRange(todayStart, todayEnd, branchId),
    sumNetProfitForRange(weekStart, todayEnd, branchId),
    sumNetProfitForRange(monthStart, todayEnd, branchId),
    sumNetProfitForRange(yearStart, todayEnd, branchId),
  ]);
  return { todayNetProfit, weeklyNetProfit, monthlyNetProfit, yearlyNetProfit };
}

// ─── Oltiariq sertifikatchi qarzi ──────────────────────────────────

const DEFAULT_CERTIFIER_FEES = { st1Rate: 95000, fitoRate: 80000, aktRate: 25000 };

export function classifyCertifierCategory(rawCategory: string): 'st1' | 'fito' | 'akt' | null {
  const normalized = rawCategory.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (normalized.startsWith('ST1')) return 'st1';
  if (normalized.startsWith('FITO')) return 'fito';
  if (normalized.startsWith('AKT')) return 'akt';
  return null;
}

async function getCertifierDebt() {
  const branch = await prisma.branch.findFirst({ where: { name: 'Oltiariq' }, select: { id: true, name: true } });
  if (!branch) return null;

  const [latestConfig, taskCount, payments] = await Promise.all([
    prisma.certifierFeeConfig.findFirst({ where: { branchId: branch.id }, orderBy: { createdAt: 'desc' } }),
    prisma.task.count({ where: { branchId: branch.id } }),
    // Filialsiz yoki Oltiariq xarajatlari (oldin barcha EXPENSE yuklanib JS'da filtrlanardi)
    prisma.transaction.findMany({
      where: {
        type: 'EXPENSE',
        expenseCategory: { not: null },
        OR: [{ branchId: null }, { branchId: branch.id }],
      },
      select: {
        expenseCategory: true,
        amount_uzs: true,
        convertedUzsAmount: true,
        amount: true,
        currency: true,
        exchangeRate: true,
        amount_original: true,
        currency_universal: true,
        exchange_rate: true,
      },
    }),
  ]);

  const rates = {
    st1Rate: Number(latestConfig?.st1Rate ?? DEFAULT_CERTIFIER_FEES.st1Rate),
    fitoRate: Number(latestConfig?.fitoRate ?? DEFAULT_CERTIFIER_FEES.fitoRate),
    aktRate: Number(latestConfig?.aktRate ?? DEFAULT_CERTIFIER_FEES.aktRate),
  };
  const accrued = {
    st1: taskCount * rates.st1Rate,
    fito: taskCount * rates.fitoRate,
    akt: taskCount * rates.aktRate,
  };

  const paid = { st1: 0, fito: 0, akt: 0 };
  let skipped = 0;
  for (const tx of payments) {
    // USD to'lov kurssiz bo'lsa so'm deb qo'shilmaydi
    const uzs = amountInUzs(tx);
    if (!uzs) { skipped++; continue; }
    const category = classifyCertifierCategory(tx.expenseCategory || '');
    if (category) paid[category] += toMoneyNumber(uzs);
  }
  warnSkippedUzs('dashboard oltiariq state payments', skipped);

  const remaining = {
    st1: Math.max(accrued.st1 - paid.st1, 0),
    fito: Math.max(accrued.fito - paid.fito, 0),
    akt: Math.max(accrued.akt - paid.akt, 0),
  };
  const total = (o: { st1: number; fito: number; akt: number }) => o.st1 + o.fito + o.akt;

  return {
    branchId: branch.id,
    branchName: branch.name,
    taskCount,
    rates,
    accrued: { ...accrued, total: total(accrued) },
    paid: { ...paid, total: total(paid) },
    remaining: { ...remaining, total: total(remaining) },
  };
}

// ─── Xodimlarga to'lanadigan qarz ──────────────────────────────────

async function getWorkerDebts() {
  const workers = await prisma.user.findMany({
    where: { active: true, role: { in: ['DEKLARANT', 'ADMIN'] } },
    select: { id: true, name: true },
  });
  return Promise.all(
    workers.map(async (worker) => {
      const report = await getWorkerPaymentReport(worker.id);
      return {
        userId: worker.id,
        name: worker.name,
        totalEarnedUsd: Number(report.current.totalEarned) + Number(report.legacy.initialDebtUsd),
        totalPaidUsd: Number(report.current.totalPaid) + Number(report.legacy.totalPaidUsd),
        pendingUsd: Number(report.legacy.difference) + Number(report.current.difference),
      };
    })
  );
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

  const [
    taskCounts,
    workerCompletionRanking,
    workerActivity,
    financialStats,
    paymentReminders,
    netProfit,
    tasksByBranch,
    certifierDebt,
    workerDebts,
    yearlyGoalTarget,
  ] = await Promise.all([
    getTaskCounts(f),
    getWorkerCompletionRanking(f),
    getWorkerActivity(f),
    getFinancialStats(f),
    getPaymentReminders(),
    getNetProfitSummary(f.branchId),
    getTasksByBranch(f),
    getCertifierDebt(),
    getWorkerDebts(),
    getYearlyGoalTarget(),
  ]);

  const responseData = {
    ...taskCounts,
    workerActivity,
    workerCompletionRanking,
    // Xatolar reytingi olib tashlangan; frontend maydonni kutadi
    workerErrorRanking: { weekly: [], monthly: [], yearly: [] },
    workerDebts,
    financialStats,
    paymentReminders,
    certifierDebt,
    yearlyGoalTarget,
    ...netProfit,
    tasksByBranch,
  };

  appCache.set(cacheKey, responseData, CACHE_TTL.DASHBOARD_STATS);
  return responseData;
}
