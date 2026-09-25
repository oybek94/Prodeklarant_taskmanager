import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';

const m = vi.hoisted(() => ({
  computeDurations: vi.fn(),
  logKpiForStage: vi.fn(),
  updateTaskStatus: vi.fn(),
  generateQrTokenIfNeeded: vi.fn(),
  markProcessNotificationsRead: vi.fn(),
  createTaskVersion: vi.fn(),
  ensureCmrForInvoice: vi.fn(),
  ensureTirForInvoice: vi.fn(),
  broadcastExcept: vi.fn(),
  invoiceFindUnique: vi.fn(),
  transaction: vi.fn(),
  tasksProcessFindUnique: vi.fn(),
}));

vi.mock('../services/stage-duration', () => ({ computeDurations: m.computeDurations }));
vi.mock('../services/kpi', async (orig) => ({
  ...(await orig<typeof import('../services/kpi')>()),
  logKpiForStage: m.logKpiForStage,
}));
vi.mock('../services/task-status', () => ({
  updateTaskStatus: m.updateTaskStatus,
  generateQrTokenIfNeeded: m.generateQrTokenIfNeeded,
}));
vi.mock('../services/notificationService', () => ({ markProcessNotificationsRead: m.markProcessNotificationsRead }));
vi.mock('../services/task-version', () => ({ createTaskVersion: m.createTaskVersion }));
vi.mock('../services/cmr-service', () => ({ ensureCmrForInvoice: m.ensureCmrForInvoice }));
vi.mock('../services/tir-service', () => ({ ensureTirForInvoice: m.ensureTirForInvoice }));
vi.mock('../services/socketEmitter', () => ({ socketEmitter: { broadcastExcept: m.broadcastExcept } }));
vi.mock('../prisma', () => ({
  prisma: {
    invoice: { findUnique: m.invoiceFindUnique },
    $transaction: m.transaction,
    tasksProcess: { findUnique: m.tasksProcessFindUnique },
  },
}));
vi.mock('../middleware/auth', () => ({
  requireAuth: () => (req: express.Request & { user?: unknown }, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 7, name: 'Ali', role: 'DEKLARANT', branchId: 1 };
    next();
  },
}));

import { applyStageStatusChange, afterStageStatusCommitted, StageBefore } from '../services/stage.service';
import processRouter from '../routes/process';

const NOW = new Date('2026-09-25T10:00:00Z');
const STARTED = new Date('2026-09-25T09:00:00Z');

/** applyStageStatusChange ishlatadigan tx metodlarini yozib oladigan soxta tranzaksiya */
function fakeTx(relatedProcessIds: number[] = []) {
  return {
    taskStage: {
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => ({
        id: where.id,
        name: 'Deklaratsiya',
        ...data,
        assignedTo: data.assignedToId ? { id: data.assignedToId, name: 'Ali' } : null,
      })),
      findFirst: vi.fn(),
    },
    tasksProcess: {
      findMany: vi.fn(async () => relatedProcessIds.map((id) => ({ id }))),
      update: vi.fn(),
    },
    kpiLog: { deleteMany: vi.fn() },
    taskProcessLog: { create: vi.fn() },
    inAppNotification: { updateMany: vi.fn() },
    task: { update: vi.fn() },
  };
}
type FakeTx = ReturnType<typeof fakeTx>;
const asTx = (tx: FakeTx) => tx as unknown as Parameters<typeof applyStageStatusChange>[0];

const stage = (over: Partial<StageBefore> = {}): StageBefore => ({
  id: 11,
  taskId: 5,
  name: 'Deklaratsiya',
  status: 'BOSHLANMAGAN',
  startedAt: null,
  assignedToId: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.updateTaskStatus.mockResolvedValue(false);
  m.generateQrTokenIfNeeded.mockResolvedValue(undefined);
});

describe('applyStageStatusChange — TAYYOR qilish', () => {
  it('bosqich, versiya, davomiylik, KPI, bog\'liq bildirishnomalar va vazifa holati', async () => {
    const tx = fakeTx([31, 32]);
    m.updateTaskStatus.mockResolvedValue(true);

    const res = await applyStageStatusChange(asTx(tx), { stage: stage(), newStatus: 'TAYYOR', actorId: 7, now: NOW });

    expect(tx.taskStage.update.mock.calls[0][0].data).toEqual({
      status: 'TAYYOR',
      completedAt: NOW,
      startedAt: NOW,
      assignedToId: 7,
    });
    expect(m.createTaskVersion).toHaveBeenCalledWith(tx, 5, 7, 'STAGE', expect.objectContaining({ id: 11, status: 'TAYYOR' }));
    expect(m.computeDurations).toHaveBeenCalledWith(tx, 5);
    expect(m.logKpiForStage).toHaveBeenCalledWith(tx, 5, 'Deklaratsiya', 7, NOW);
    expect(tx.tasksProcess.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: 5, processType: 'DECLARATION' } }));
    expect(m.markProcessNotificationsRead.mock.calls.map((c) => c[0])).toEqual([31, 32]);
    expect(tx.kpiLog.deleteMany).not.toHaveBeenCalled();
    expect(res.needsQrToken).toBe(true);
  });

  it('boshlangan vaqt saqlanadi', async () => {
    const tx = fakeTx();
    await applyStageStatusChange(asTx(tx), { stage: stage({ startedAt: STARTED }), newStatus: 'TAYYOR', actorId: 7, now: NOW });
    expect(tx.taskStage.update.mock.calls[0][0].data.startedAt).toBe(STARTED);
  });

  it('jarayonga bog\'lanmagan bosqich (Invoys) uchun bildirishnoma qidirilmaydi', async () => {
    const tx = fakeTx();
    await applyStageStatusChange(asTx(tx), { stage: stage({ name: 'Invoys' }), newStatus: 'TAYYOR', actorId: 7, now: NOW });
    expect(tx.tasksProcess.findMany).not.toHaveBeenCalled();
  });

  it('holat o\'zgarmasa (TAYYOR → TAYYOR) versiya yozilmaydi', async () => {
    const tx = fakeTx();
    await applyStageStatusChange(asTx(tx), { stage: stage({ status: 'TAYYOR', assignedToId: 7 }), newStatus: 'TAYYOR', actorId: 7, now: NOW });
    expect(m.createTaskVersion).not.toHaveBeenCalled();
  });
});

describe('applyStageStatusChange — TAYYOR → BOSHLANMAGAN', () => {
  it('completedAt tozalanadi, ijrochi saqlanadi, KPI yozuvi normallashgan nom bilan o\'chadi', async () => {
    const tx = fakeTx();
    await applyStageStatusChange(asTx(tx), {
      stage: stage({ name: 'ST', status: 'TAYYOR', startedAt: STARTED, assignedToId: 9 }),
      newStatus: 'BOSHLANMAGAN',
      actorId: 7,
      now: NOW,
    });
    expect(tx.taskStage.update.mock.calls[0][0].data).toEqual({
      status: 'BOSHLANMAGAN',
      completedAt: null,
      startedAt: STARTED,
      assignedToId: 9,
    });
    expect(tx.kpiLog.deleteMany).toHaveBeenCalledWith({
      where: { taskId: 5, stageName: 'Sertifikat olib chiqish', userId: 9 },
    });
    expect(m.logKpiForStage).not.toHaveBeenCalled();
    expect(m.createTaskVersion).toHaveBeenCalled();
  });
});

describe('afterStageStatusCommitted', () => {
  const result = (needsQrToken = false) => ({
    updated: { id: 11, name: 'Invoys', status: 'TAYYOR', assignedTo: { id: 7, name: 'Ali' } } as never,
    needsQrToken,
  });

  it('socket xabari yuboriladi, QR token faqat kerak bo\'lsa', async () => {
    await afterStageStatusCommitted({ stage: stage(), newStatus: 'TAYYOR', result: result(true), actor: { id: 7, name: 'Ali' } });
    expect(m.generateQrTokenIfNeeded).toHaveBeenCalledWith(5);
    expect(m.broadcastExcept).toHaveBeenCalledWith(7, 'task:stageUpdated', expect.objectContaining({ taskId: 5, stageId: 11, updatedBy: 'Ali' }));
    expect(m.ensureCmrForInvoice).not.toHaveBeenCalled();
  });

  it('Invoys birinchi marta TAYYOR bo\'lganda CMR va TIR yaratiladi', async () => {
    m.invoiceFindUnique.mockResolvedValue({ id: 99 });
    await afterStageStatusCommitted({ stage: stage({ name: 'Invoys' }), newStatus: 'TAYYOR', result: result(), actor: { id: 7, name: 'Ali' } });
    expect(m.ensureCmrForInvoice).toHaveBeenCalledWith({ invoiceId: 99, uploadedById: 7 });
    expect(m.ensureTirForInvoice).toHaveBeenCalledWith({ invoiceId: 99, uploadedById: 7 });
    expect(m.generateQrTokenIfNeeded).not.toHaveBeenCalled();
  });

  it('Invoys allaqachon TAYYOR bo\'lsa CMR qayta yaratilmaydi', async () => {
    await afterStageStatusCommitted({ stage: stage({ name: 'Invoys', status: 'TAYYOR' }), newStatus: 'TAYYOR', result: result(), actor: { id: 7, name: 'Ali' } });
    expect(m.ensureCmrForInvoice).not.toHaveBeenCalled();
  });
});

describe('POST /process/confirm — eslatma yo\'li endi to\'liq yo\'ldan o\'tadi', () => {
  it('versiya tarixiga yozadi va socket xabarini yuboradi (oldin ikkalasi ham yo\'q edi)', async () => {
    const tx = fakeTx();
    tx.taskStage.findFirst.mockResolvedValue(stage({ id: 12, taskId: 5, name: 'Deklaratsiya' }));
    m.tasksProcessFindUnique.mockResolvedValue({ id: 40, userId: 7, taskId: 5, processType: 'DECLARATION' });
    m.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

    const app = express();
    app.use(express.json());
    app.use('/process', processRouter);
    const server = http.createServer(app).listen(0);
    const { port } = server.address() as AddressInfo;
    try {
      const r = await fetch(`http://127.0.0.1:${port}/process/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskProcessId: 40 }),
      });
      expect(r.status).toBe(200);
    } finally {
      server.close();
    }

    expect(tx.taskStage.update.mock.calls[0][0].data).toMatchObject({ status: 'TAYYOR', assignedToId: 7 });
    expect(m.createTaskVersion).toHaveBeenCalledWith(tx, 5, 7, 'STAGE', expect.objectContaining({ id: 12 }));
    expect(m.logKpiForStage).toHaveBeenCalledWith(tx, 5, 'Deklaratsiya', 7, expect.any(Date));
    expect(m.broadcastExcept).toHaveBeenCalledWith(7, 'task:stageUpdated', expect.objectContaining({ taskId: 5, stageId: 12, updatedBy: 'Ali' }));
  });
});
