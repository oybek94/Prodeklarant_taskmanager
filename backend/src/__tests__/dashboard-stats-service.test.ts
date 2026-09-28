import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  taskGroupBy: vi.fn(),
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  stageGroupBy: vi.fn(),
  stageFindMany: vi.fn(),
  userFindMany: vi.fn(),
  errorFindMany: vi.fn(),
  errorGroupBy: vi.fn(),
  noteGroupBy: vi.fn(),
  noteFindMany: vi.fn(),
  medalGroupBy: vi.fn(),
  kpiFindMany: vi.fn(),
  txFindMany: vi.fn(),
  clientFindMany: vi.fn(),
  branchFindMany: vi.fn(),
  branchFindFirst: vi.fn(),
  certFindFirst: vi.fn(),
  goalFindUnique: vi.fn(),
  getWorkerPaymentReport: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    task: { groupBy: m.taskGroupBy, count: m.taskCount, findMany: m.taskFindMany },
    taskStage: { groupBy: m.stageGroupBy, findMany: m.stageFindMany },
    user: { findMany: m.userFindMany },
    taskError: { findMany: m.errorFindMany, groupBy: m.errorGroupBy },
    dashboardNote: { groupBy: m.noteGroupBy, findMany: m.noteFindMany },
    userMedal: { groupBy: m.medalGroupBy },
    kpiLog: { findMany: m.kpiFindMany },
    transaction: { findMany: m.txFindMany },
    client: { findMany: m.clientFindMany },
    branch: { findMany: m.branchFindMany, findFirst: m.branchFindFirst },
    certifierFeeConfig: { findFirst: m.certFindFirst },
    yearlyGoalConfig: { findUnique: m.goalFindUnique },
    exchangeRate: { findMany: async () => [{ date: new Date('2026-01-01'), rate: 12500 }] },
  },
}));
vi.mock('../services/worker-payment', () => ({ getWorkerPaymentReport: m.getWorkerPaymentReport }));

import {
  statsQuerySchema,
  toStatsFilters,
  calculateWorkerRanking,
  getDashboardStats,
} from '../services/dashboard-stats.service';
import { appCache } from '../services/cache';

const START = new Date('2026-09-01T00:00:00Z');
const END = new Date('2026-09-30T00:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  appCache.clear();
  for (const fn of Object.values(m)) fn.mockResolvedValue([]);
  m.taskCount.mockResolvedValue(0);
  m.branchFindFirst.mockResolvedValue(null);
  m.certFindFirst.mockResolvedValue(null);
  m.goalFindUnique.mockResolvedValue(null);
});

describe('statsQuerySchema', () => {
  it('noto\'g\'ri sana va filial rad etiladi (oldin Prisma 500 berardi)', () => {
    expect(statsQuerySchema.safeParse({ startDate: 'kecha' }).success).toBe(false);
    expect(statsQuerySchema.safeParse({ branchId: 'abc' }).success).toBe(false);
  });
  it('to\'g\'ri query filtrlarga aylanadi', () => {
    const f = toStatsFilters(statsQuerySchema.parse({ startDate: '2026-09-01', branchId: '2', workerId: '7' }));
    expect(f).toEqual({ startDate: new Date('2026-09-01'), endDate: undefined, branchId: 2, workerId: 7 });
  });
});

describe('calculateWorkerRanking', () => {
  beforeEach(() => {
    m.userFindMany.mockResolvedValue([
      { id: 1, name: 'Ali' },
      { id: 2, name: 'Bek' },
      { id: 3, name: 'Vali' },
    ]);
    m.stageFindMany.mockResolvedValue([
      { assignedToId: 1, taskId: 10 },
      { assignedToId: 1, taskId: 10 },
      { assignedToId: 1, taskId: 11 },
      { assignedToId: 2, taskId: 12 },
    ]);
    m.errorFindMany.mockResolvedValue([
      { createdById: 2, workerId: 1, bountyXp: 2 }, // Bek Ali xatosini topdi: Bek +2, Ali −2
      { createdById: 3, workerId: 3, bountyXp: 1 }, // o'z xatosi: faqat jarima −1
    ]);
    m.noteGroupBy.mockResolvedValue([{ completedById: 3, _sum: { xpReward: 5 } }]);
    m.medalGroupBy.mockResolvedValue([{ userId: 2, _sum: { xpBonus: 10 } }]);
    m.errorGroupBy.mockResolvedValue([{ workerId: 1, _count: 4 }]);
  });

  it('bosqich + bounty + eslatma XP; medal faqat yillikda', async () => {
    const ranking = await calculateWorkerRanking(START, END, {});
    expect(ranking).toEqual([
      { userId: 3, name: 'Vali', completedStages: 4, invoiceCount: 0, errorCount: 0 },
      { userId: 2, name: 'Bek', completedStages: 3, invoiceCount: 1, errorCount: 0 },
      { userId: 1, name: 'Ali', completedStages: 1, invoiceCount: 2, errorCount: 4 },
    ]);
    expect(m.medalGroupBy).not.toHaveBeenCalled();

    const yearly = await calculateWorkerRanking(START, END, {}, true);
    expect(yearly.find((r) => r.userId === 2)?.completedStages).toBe(13);
  });

  it('workerId/branchId filtri bosqich so\'roviga tushadi', async () => {
    await calculateWorkerRanking(START, END, { workerId: 7, branchId: 2 });
    const where = m.stageFindMany.mock.calls[0][0].where;
    expect(where.assignedToId).toBe(7);
    expect(where.task).toEqual({ branchId: 2 });
  });
});

describe('getDashboardStats', () => {
  it('REGRESSIYA: workerId filtri assignedToId bilan (oldin relation\'ga raqam → 500)', async () => {
    await getDashboardStats({ workerId: 7 });
    const where = m.taskGroupBy.mock.calls[0][0].where;
    expect(where.stages).toEqual({ some: { assignedToId: 7 } });
  });

  it('faqat dashboard ishlatadigan maydonlar qaytadi (moliya/qarz ma\'lumotlari chiqmaydi)', async () => {
    const res = (await getDashboardStats({ branchId: 3 })) as Record<string, unknown>;
    expect(Object.keys(res).sort()).toEqual(['tasksByBranch', 'workerCompletionRanking', 'yearlyGoalTarget']);
    expect(res.yearlyGoalTarget).toBe(2000);
    expect(m.getWorkerPaymentReport).not.toHaveBeenCalled();
    expect(m.clientFindMany).not.toHaveBeenCalled();
    expect(m.txFindMany).not.toHaveBeenCalled();
  });
});
