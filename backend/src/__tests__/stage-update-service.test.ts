import { describe, it, expect, vi, beforeEach } from 'vitest';

type Stage = { id: number; taskId: number; name: string; status: string; assignedToId: number | null; assignedTo: { id: number; name: string } | null };
const m = vi.hoisted(() => ({
  canAccess: true,
  stage: null as Stage | null,
  docCount: 1,
  log: [] as unknown[],
}));

vi.mock('../prisma', () => {
  const tx = {
    task: {
      findUnique: vi.fn(async () => ({ afterHoursDeclaration: false, afterHoursPayer: 'CLIENT', client: { id: 3 } })),
      update: vi.fn(async (a: unknown) => { m.log.push(['task.update', a]); }),
    },
  };
  return {
    prisma: {
      taskStage: { findUnique: vi.fn(async () => m.stage) },
      taskDocument: { count: vi.fn(async () => m.docCount) },
      $transaction: async (fn: (t: unknown) => unknown) => fn(tx),
    },
  };
});
vi.mock('../services/validation.service', () => ({
  ValidationService: class { canUserAccessTask = async () => m.canAccess; },
}));
vi.mock('../services/stage.service', () => ({
  applyStageStatusChange: vi.fn(async (_tx: unknown, p: { newStatus: string; actorId: number }) => {
    m.log.push(['apply', p.newStatus, p.actorId]);
    return { updated: { id: 1, status: p.newStatus } };
  }),
  afterStageStatusCommitted: vi.fn(async (p: { newStatus: string }) => { m.log.push(['after', p.newStatus]); }),
}));
vi.mock('../services/declaration-pricing', () => ({
  declarationClientSelect: {},
  bxmAt: vi.fn(async () => 'BXM'),
  declarationCompletedFields: vi.fn((a: { multiplier: number; afterHoursPayer: string; bxm: unknown }) => ({ completed: a.multiplier, payer: a.afterHoursPayer, bxm: a.bxm })),
  declarationResetFields: vi.fn(() => ({ reset: true })),
}));

import { updateStageFromApi, StageUpdateError } from '../services/stage-update.service';

const admin = { id: 1, role: 'ADMIN', name: 'Admin' };
const worker = { id: 2, role: 'DEKLARANT', name: 'Ali' };

function stage(p: Partial<Stage> = {}): Stage {
  return { id: 5, taskId: 1, name: 'ST', status: 'BOSHLANMAGAN', assignedToId: null, assignedTo: null, ...p };
}

async function rejectsWith(p: Promise<unknown>, status: number): Promise<StageUpdateError> {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(StageUpdateError);
  expect((err as StageUpdateError).status).toBe(status);
  return err as StageUpdateError;
}

beforeEach(() => {
  m.canAccess = true; m.stage = stage(); m.docCount = 1; m.log.length = 0;
});

describe('updateStageFromApi', () => {
  it('oddiy bosqichni TAYYOR qiladi va yon ta’sirlarni chaqiradi', async () => {
    const res = await updateStageFromApi(1, 5, { status: 'TAYYOR' }, worker);
    expect(res).toEqual({ id: 1, status: 'TAYYOR' });
    expect(m.log).toEqual([['apply', 'TAYYOR', 2], ['after', 'TAYYOR']]);
  });

  it('ruxsat yo‘q → 403, bosqich boshqa vazifaniki → 404', async () => {
    m.canAccess = false;
    await rejectsWith(updateStageFromApi(1, 5, { status: 'TAYYOR' }, worker), 403);
    m.canAccess = true;
    m.stage = stage({ taskId: 9 });
    await rejectsWith(updateStageFromApi(1, 5, { status: 'TAYYOR' }, worker), 404);
  });

  it('Pochta hujjatsiz tayyor bo‘lmaydi', async () => {
    m.stage = stage({ name: 'Pochta' }); m.docCount = 0;
    await rejectsWith(updateStageFromApi(1, 5, { status: 'TAYYOR' }, worker), 400);
    expect(m.log).toEqual([]);
  });

  it('boshqa odam bajargan bosqichni xodim qaytara olmaydi', async () => {
    m.stage = stage({ status: 'TAYYOR', assignedToId: 3 });
    await rejectsWith(updateStageFromApi(1, 5, { status: 'BOSHLANMAGAN' }, worker), 403);
  });

  it('admin boshqaning bosqichini force siz qaytarsa 409 + tasdiqlash maydonlari', async () => {
    m.stage = stage({ status: 'TAYYOR', assignedToId: 3, assignedTo: { id: 3, name: 'Vali' } });
    const err = await rejectsWith(updateStageFromApi(1, 5, { status: 'BOSHLANMAGAN' }, admin), 409);
    expect(err.extra).toEqual({ requireConfirmation: true, completedBy: 'Vali', completedById: 3, stageName: 'ST' });
    await expect(updateStageFromApi(1, 5, { status: 'BOSHLANMAGAN', force: true }, admin)).resolves.toBeTruthy();
  });

  it('egasi o‘z bosqichini qaytara oladi', async () => {
    m.stage = stage({ status: 'TAYYOR', assignedToId: 2 });
    await expect(updateStageFromApi(1, 5, { status: 'BOSHLANMAGAN' }, worker)).resolves.toBeTruthy();
  });

  it('Deklaratsiya koef bilan tayyor → pul snapshot’i yoziladi', async () => {
    m.stage = stage({ name: 'Deklaratsiya' });
    await updateStageFromApi(1, 5, { status: 'TAYYOR', customsPaymentMultiplier: 1.5, afterHoursPayer: 'COMPANY' }, worker);
    expect(m.log[0]).toEqual(['task.update', { where: { id: 1 }, data: { completed: 1.5, payer: 'COMPANY', bxm: 'BXM' } }]);
  });

  it('Deklaratsiya koefsiz tayyor → pul tegilmaydi', async () => {
    m.stage = stage({ name: 'Deklaratsiya' });
    await updateStageFromApi(1, 5, { status: 'TAYYOR' }, worker);
    expect(m.log.some((l) => (l as unknown[])[0] === 'task.update')).toBe(false);
  });

  it('Deklaratsiya qaytarilsa → snapshot tiklanadi', async () => {
    m.stage = stage({ name: 'Deklaratsiya', status: 'TAYYOR', assignedToId: 2 });
    await updateStageFromApi(1, 5, { status: 'BOSHLANMAGAN', customsPaymentMultiplier: 2 }, worker);
    expect(m.log[0]).toEqual(['task.update', { where: { id: 1 }, data: { reset: true } }]);
  });
});
