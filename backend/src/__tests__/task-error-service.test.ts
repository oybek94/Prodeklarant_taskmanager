import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = {
  id: number; taskId: number; workerId: number | null; createdById: number; stageName: string;
  comment: string | null; adminRating: number | null; bountyXp: number | null; deleteRequested: boolean; createdAt: Date;
};
const m = vi.hoisted(() => ({
  errors: new Map<number, Row>(),
  xp: new Map<number, number>(),
  notifications: [] as { userId: number; title: string; metadata: Record<string, unknown> }[],
  task: { id: 1 } as { id: number } | null,
  socket: [] as unknown[][],
}));

function db() {
  return {
    task: { findUnique: vi.fn(async () => m.task) },
    taskError: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) => m.errors.get(where.id) ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: number } }) => ({ ...m.errors.get(where.id)!, task: { title: 'T' } })),
      create: vi.fn(async ({ data }: { data: Row }) => ({ ...data, id: 99 })),
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: Partial<Row> }) => {
        const row = { ...m.errors.get(where.id)!, ...data };
        m.errors.set(where.id, row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: number; adminRating: null }; data: Partial<Row> }) => {
        const row = m.errors.get(where.id);
        if (!row || row.adminRating !== null) return { count: 0 };
        m.errors.set(where.id, { ...row, ...data });
        return { count: 1 };
      }),
      delete: vi.fn(async ({ where }: { where: { id: number } }) => { m.errors.delete(where.id); }),
    },
    user: {
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: { xp: { increment?: number; decrement?: number } } }) => {
        const d = (data.xp.increment ?? 0) - (data.xp.decrement ?? 0);
        m.xp.set(where.id, (m.xp.get(where.id) ?? 0) + d);
      }),
    },
    notification: {
      create: vi.fn(async ({ data }: { data: { userId: number; title: string; metadata: Record<string, unknown> } }) => {
        m.notifications.push(data);
        return { ...data, id: m.notifications.length };
      }),
    },
  };
}

vi.mock('../prisma', () => {
  const client = db();
  return { prisma: { ...client, $transaction: async (fn: (tx: unknown) => unknown) => fn(client) } };
});
vi.mock('../services/socketEmitter', () => ({
  socketEmitter: {
    broadcast: vi.fn((...a: unknown[]) => { m.socket.push(['broadcast', ...a]); }),
    toUser: vi.fn((...a: unknown[]) => { m.socket.push(['toUser', ...a]); }),
  },
}));

import {
  createTaskError, updateTaskError, deleteTaskError, approveDeleteRequest, rejectDeleteRequest,
  rateTaskError, TaskErrorError, parseId,
} from '../services/task-error.service';

const admin = { id: 1, role: 'ADMIN' };
const worker = { id: 2, role: 'DEKLARANT' };

function seed(partial: Partial<Row> = {}) {
  const row: Row = {
    id: 10, taskId: 1, workerId: 3, createdById: 2, stageName: 'ST', comment: null,
    adminRating: null, bountyXp: null, deleteRequested: false, createdAt: new Date(), ...partial,
  };
  m.errors.set(row.id, row);
  return row;
}

async function expectStatus(p: Promise<unknown>, status: number) {
  await expect(p).rejects.toBeInstanceOf(TaskErrorError);
  await p.catch((e: TaskErrorError) => expect(e.status).toBe(status));
}

beforeEach(() => {
  m.errors.clear(); m.xp.clear(); m.notifications.length = 0; m.socket.length = 0;
  m.task = { id: 1 };
});

describe('task-error.service', () => {
  it('parseId noto‘g‘ri qiymatni 400 bilan rad etadi', () => {
    expect(() => parseId('abc', 'ID')).toThrow(TaskErrorError);
    expect(() => parseId('0', 'ID')).toThrow(TaskErrorError);
    expect(parseId('7', 'ID')).toBe(7);
  });

  it('boshqa odamni baholash: ishchidan XP ayriladi, topganga qo‘shiladi, 2 bildirishnoma', async () => {
    seed();
    await rateTaskError(1, 10, 8);
    expect(m.xp.get(3)).toBe(-8);
    expect(m.xp.get(2)).toBe(8);
    expect(m.notifications.map((n) => [n.userId, n.metadata.type])).toEqual([[3, 'XP_LOSS'], [2, 'XP_GAIN']]);
    expect(m.errors.get(10)).toMatchObject({ adminRating: 8, bountyXp: 8 });
    expect(m.socket.filter((s) => s[0] === 'toUser')).toHaveLength(2);
  });

  it('o‘z xatosini topsa faqat jarima', async () => {
    seed({ workerId: 2, createdById: 2 });
    await rateTaskError(1, 10, 5);
    expect(m.xp.get(2)).toBe(-5);
    expect(m.notifications).toHaveLength(1);
  });

  it('ikki marta baholash rad etiladi va XP ikki marta o‘tmaydi', async () => {
    seed();
    await rateTaskError(1, 10, 4);
    await expectStatus(rateTaskError(1, 10, 4), 400);
    expect(m.xp.get(3)).toBe(-4);
  });

  it('parallel baho: shartli yangilash ikkinchisini to‘xtatadi', async () => {
    seed();
    const results = await Promise.allSettled([rateTaskError(1, 10, 6), rateTaskError(1, 10, 6)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(m.xp.get(3)).toBe(-6);
  });

  it('mijoz xatosi (workerId null) baholanmaydi', async () => {
    seed({ workerId: null });
    await expectStatus(rateTaskError(1, 10, 3), 400);
  });

  it('boshqa vazifaning xatosi 404', async () => {
    seed({ taskId: 2 });
    await expectStatus(rateTaskError(1, 10, 3), 404);
    await expectStatus(approveDeleteRequest(1, 10), 404);
    await expectStatus(rejectDeleteRequest(1, 11), 404);
  });

  it('baholangan xatoni admin o‘chirsa XP to‘liq qaytadi', async () => {
    seed();
    await rateTaskError(1, 10, 7);
    expect(await deleteTaskError(1, 10, admin)).toBe('deleted');
    expect(m.xp.get(3)).toBe(0);
    expect(m.xp.get(2)).toBe(0);
    expect(m.errors.has(10)).toBe(false);
  });

  it('o‘z xatosi baholanib, so‘rov orqali o‘chirilsa jarima qaytadi', async () => {
    seed({ workerId: 2, createdById: 2 });
    await rateTaskError(1, 10, 5);
    expect(await deleteTaskError(1, 10, worker)).toBe('requested');
    expect(m.errors.get(10)?.deleteRequested).toBe(true);
    await approveDeleteRequest(1, 10);
    expect(m.xp.get(2)).toBe(0);
  });

  it('xodim faqat o‘zi qo‘shgan va 2 kundan yangi xatoni o‘zgartira oladi', async () => {
    seed({ createdById: 9 });
    await expectStatus(updateTaskError(1, 10, { comment: 'x' }, worker), 403);
    seed({ createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000) });
    await expectStatus(deleteTaskError(1, 10, worker), 403);
    seed();
    const updated = await updateTaskError(1, 10, { amount: 1000 }, worker);
    expect(updated).toMatchObject({ amount: 1000, amount_uzs: 1000, currency: 'UZS' });
  });

  it('baholangan xatoning ishchisini almashtirib bo‘lmaydi', async () => {
    seed({ adminRating: 5, bountyXp: 5 });
    await expectStatus(updateTaskError(1, 10, { workerId: 4 }, admin), 400);
    await expect(updateTaskError(1, 10, { workerId: 3, comment: 'ok' }, admin)).resolves.toBeTruthy();
  });

  it('xato yaratiladi (mijoz xatosi — workerId null); vazifa yo‘q bo‘lsa 404', async () => {
    const created = await createTaskError(1, { stageName: 'ST', workerId: null, amount: 50000, date: new Date('2026-09-01') }, worker);
    expect(created).toMatchObject({ workerId: null, amount: 50000, currency: 'UZS', createdById: 2 });
    m.task = null;
    await expectStatus(createTaskError(404, { stageName: 'ST', workerId: 3, amount: 1, date: new Date() }, worker), 404);
  });
});
