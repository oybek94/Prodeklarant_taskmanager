import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Router } from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const mocks = vi.hoisted(() => ({
  taskFindUnique: vi.fn(),
  invoiceFindUnique: vi.fn(),
  stageFindFirst: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    task: { findUnique: mocks.taskFindUnique },
    invoice: { findUnique: mocks.invoiceFindUnique },
    taskStage: { findFirst: mocks.stageFindFirst },
  },
}));

import { taskBranchParam, invoiceBranchParam, branchScopeWhere } from '../middleware/branch-access';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  // Haqiqiy tizimda req.user ni authenticateApi qo'yadi; bu yerda sarlavhadan olinadi
  app.use((req, _res, next) => {
    const raw = req.headers['x-user'];
    if (raw) (req as unknown as { user: unknown }).user = JSON.parse(String(raw));
    next();
  });
  const tasks = Router();
  tasks.param('id', taskBranchParam);
  tasks.get('/:id', (_req, res) => { res.json({ ok: true }); });
  const invoices = Router();
  invoices.param('id', invoiceBranchParam);
  invoices.get('/:id', (_req, res) => { res.json({ ok: true }); });
  app.use('/tasks', tasks);
  app.use('/invoices', invoices);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => { server.close(); });

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.stageFindFirst.mockResolvedValue(null);
});

const asUser = (role: string, branchId: number | null, id = 7) => JSON.stringify({ id, role, branchId, name: 'X' });
const get = (path: string, user?: string) => fetch(`${baseUrl}${path}`, user ? { headers: { 'x-user': user } } : {});

describe('vazifa — filial chegarasi', () => {
  it('o\'z filialidagi vazifa ochiladi', async () => {
    mocks.taskFindUnique.mockResolvedValue({ branchId: 1 });
    expect((await get('/tasks/5', asUser('DEKLARANT', 1))).status).toBe(200);
  });

  it('boshqa filial vazifasi — 403', async () => {
    mocks.taskFindUnique.mockResolvedValue({ branchId: 2 });
    expect((await get('/tasks/5', asUser('DEKLARANT', 1))).status).toBe(403);
    expect((await get('/tasks/5', asUser('SELLER', 1))).status).toBe(403);
    expect((await get('/tasks/5', asUser('CERTIFICATE_WORKER', 1))).status).toBe(403);
  });

  it('boshqa filial vazifasida o\'ziga bosqich tayinlangan bo\'lsa — ochiladi', async () => {
    mocks.taskFindUnique.mockResolvedValue({ branchId: 2 });
    mocks.stageFindFirst.mockResolvedValue({ id: 99 });
    expect((await get('/tasks/5', asUser('DEKLARANT', 1, 7))).status).toBe(200);
    expect(mocks.stageFindFirst.mock.calls[0][0].where).toEqual({ taskId: 5, assignedToId: 7 });
  });

  it('ADMIN va MANAGER hamma filialni ko\'radi (bazaga murojaat qilmasdan)', async () => {
    expect((await get('/tasks/5', asUser('ADMIN', 1))).status).toBe(200);
    expect((await get('/tasks/5', asUser('MANAGER', null))).status).toBe(200);
    expect(mocks.taskFindUnique).not.toHaveBeenCalled();
  });

  it('filiali belgilanmagan xodim ro\'yxatdagidek hammasini ko\'radi', async () => {
    mocks.taskFindUnique.mockResolvedValue({ branchId: 2 });
    expect((await get('/tasks/5', asUser('DEKLARANT', null))).status).toBe(200);
  });

  it('mavjud bo\'lmagan vazifa endpointning o\'ziga o\'tadi (404 ni u qaytaradi)', async () => {
    mocks.taskFindUnique.mockResolvedValue(null);
    expect((await get('/tasks/999', asUser('DEKLARANT', 1))).status).toBe(200);
  });

  it.each(['abc', '7e1', '0x10', '7.0', '%207', '-3', '1' + '0'.repeat(20)])(
    'kanonik bo\'lmagan ID (%s) rad etiladi — handler boshqacha o\'qib tekshiruvni chetlab o\'tolmaydi',
    async (id) => {
      expect((await get(`/tasks/${id}`, asUser('DEKLARANT', 1))).status).toBe(400);
      expect((await get(`/tasks/${id}`, asUser('ADMIN', 1))).status).toBe(400);
      expect(mocks.taskFindUnique).not.toHaveBeenCalled();
    },
  );

  it('foydalanuvchi yo\'q bo\'lsa auth middleware hal qiladi (param bloklamaydi)', async () => {
    expect((await get('/tasks/5')).status).toBe(200);
    expect(mocks.taskFindUnique).not.toHaveBeenCalled();
  });

  it('baza xatosi 500 (ruxsat berib yubormaydi)', async () => {
    mocks.taskFindUnique.mockRejectedValue(new Error('db down'));
    expect((await get('/tasks/5', asUser('DEKLARANT', 1))).status).toBe(500);
  });
});

describe('invoys — filial chegarasi', () => {
  it('o\'z filiali invoysi ochiladi, boshqasi 403', async () => {
    mocks.invoiceFindUnique.mockResolvedValue({ branchId: 1, taskId: 5, task: { branchId: 1 } });
    expect((await get('/invoices/3', asUser('DEKLARANT', 1))).status).toBe(200);
    mocks.invoiceFindUnique.mockResolvedValue({ branchId: 2, taskId: 5, task: { branchId: 2 } });
    expect((await get('/invoices/3', asUser('DEKLARANT', 1))).status).toBe(403);
  });

  it('invoysda filial bo\'sh bo\'lsa vazifa filiali hisobga olinadi', async () => {
    mocks.invoiceFindUnique.mockResolvedValue({ branchId: null, taskId: 5, task: { branchId: 2 } });
    expect((await get('/invoices/3', asUser('SELLER', 1))).status).toBe(403);
    expect((await get('/invoices/3', asUser('SELLER', 2))).status).toBe(200);
  });

  it('boshqa filial invoysida vazifaga bosqich tayinlangan bo\'lsa — ochiladi', async () => {
    mocks.invoiceFindUnique.mockResolvedValue({ branchId: 2, taskId: 5, task: { branchId: 2 } });
    mocks.stageFindFirst.mockResolvedValue({ id: 1 });
    expect((await get('/invoices/3', asUser('DEKLARANT', 1, 7))).status).toBe(200);
    expect(mocks.stageFindFirst.mock.calls[0][0].where).toEqual({ taskId: 5, assignedToId: 7 });
  });

  it('ADMIN/MANAGER cheklanmaydi, mavjud bo\'lmagan invoys endpointga o\'tadi', async () => {
    expect((await get('/invoices/3', asUser('ADMIN', 1))).status).toBe(200);
    expect(mocks.invoiceFindUnique).not.toHaveBeenCalled();
    mocks.invoiceFindUnique.mockResolvedValue(null);
    expect((await get('/invoices/3', asUser('DEKLARANT', 1))).status).toBe(200);
  });
});

describe('branchScopeWhere', () => {
  it('oddiy xodim o\'z filiali bilan cheklanadi', () => {
    expect(branchScopeWhere({ id: 1, role: 'DEKLARANT', branchId: 4, name: 'X' })).toEqual({ branchId: 4 });
  });

  it('admin, manager va filialsiz xodim cheklanmaydi', () => {
    expect(branchScopeWhere({ id: 1, role: 'ADMIN', branchId: 4, name: 'X' })).toEqual({});
    expect(branchScopeWhere({ id: 1, role: 'MANAGER', branchId: null, name: 'X' })).toEqual({});
    expect(branchScopeWhere({ id: 1, role: 'DEKLARANT', branchId: null, name: 'X' })).toEqual({});
    expect(branchScopeWhere(undefined)).toEqual({});
  });
});
