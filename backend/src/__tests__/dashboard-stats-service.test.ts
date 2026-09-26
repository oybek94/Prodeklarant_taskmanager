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
  sumNetProfitForRange,
  classifyCertifierCategory,
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

describe('sumNetProfitForRange', () => {
  it('davlat to\'lovlari faqat CASH_ALL_INCLUSIVE da ayiriladi; valyuta bo\'yicha alohida', async () => {
    m.taskFindMany.mockResolvedValue([
      {
        hasPsr: true, snapshotDealAmount: 100, snapshotPsrPrice: 20, snapshotCertificatePayment: 10,
        snapshotWorkerPrice: 15, snapshotCustomsPayment: 5, snapshotContractPaymentType: 'CASH_ALL_INCLUSIVE',
        client: { dealAmount: 0, dealAmount_currency: null, dealAmountCurrency: 'USD', contractPaymentType: null },
      },
      {
        hasPsr: false, snapshotDealAmount: null, snapshotPsrPrice: null, snapshotCertificatePayment: 1000,
        snapshotWorkerPrice: 200, snapshotCustomsPayment: 1000, snapshotContractPaymentType: 'TRANSFER_ONLY',
        client: { dealAmount: 5000, dealAmount_currency: 'UZS', dealAmountCurrency: 'UZS', contractPaymentType: null },
      },
    ]);
    const r = await sumNetProfitForRange(START, END, 2);
    // USD: (100+20) − (10+15+20+5) = 70
    expect(r.usd).toBe(70);
    expect(r.usdCount).toBe(1);
    expect(r.uzsCount).toBe(1);
    expect(m.taskFindMany.mock.calls[0][0].where.branchId).toBe(2);
  });
});

describe('classifyCertifierCategory', () => {
  it.each([
    ['ST-1 to\'lovi', 'st1'],
    ['fito', 'fito'],
    ['AKT', 'akt'],
    ['Ijara', null],
  ])('%s → %s', (raw, expected) => {
    expect(classifyCertifierCategory(raw)).toBe(expected);
  });
});

describe('getDashboardStats', () => {
  it('REGRESSIYA: workerId filtri assignedToId bilan (oldin relation\'ga raqam → 500)', async () => {
    await getDashboardStats({ workerId: 7 });
    const where = m.taskGroupBy.mock.calls[0][0].where;
    expect(where.stages).toEqual({ some: { assignedToId: 7 } });
  });

  it('javob shakli frontend kutgan maydonlarga ega', async () => {
    const res = (await getDashboardStats({ branchId: 3 })) as Record<string, unknown>;
    for (const key of [
      'newTasks', 'completedTasks', 'tasksByStatus', 'processStats', 'workerActivity',
      'workerCompletionRanking', 'workerErrorRanking', 'workerDebts', 'financialStats',
      'paymentReminders', 'certifierDebt', 'yearlyGoalTarget', 'todayNetProfit',
      'weeklyNetProfit', 'monthlyNetProfit', 'yearlyNetProfit', 'tasksByBranch',
    ]) {
      expect(res).toHaveProperty(key);
    }
    expect(res.yearlyGoalTarget).toBe(2000);
  });

  it('Oltiariq to\'lovlari bazada filial bo\'yicha filtrlanadi', async () => {
    m.branchFindFirst.mockResolvedValue({ id: 5, name: 'Oltiariq' });
    m.taskCount.mockResolvedValue(2);
    await getDashboardStats({});
    const expenseCall = m.txFindMany.mock.calls.find((c) => c[0].where.type === 'EXPENSE');
    expect(expenseCall?.[0].where.OR).toEqual([{ branchId: null }, { branchId: 5 }]);
  });
});
