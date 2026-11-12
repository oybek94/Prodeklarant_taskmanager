import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// config.ts JWT secret'larsiz process.exit qiladi — importlardan oldin o'rnatamiz.
// Qiymatlar har ishga tushishda tasodifiy: manbada qotirilgan kalit yo'q.
const mocks = vi.hoisted(() => {
  const randomKey = () => Array.from({ length: 48 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  process.env.JWT_SECRET = randomKey();
  process.env.JWT_REFRESH_SECRET = randomKey();
  return {
    transactionFindUnique: vi.fn(),
    getWorkerKpiStats: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: { transaction: { findUnique: mocks.transactionFindUnique } },
}));

vi.mock('../services/kpi', () => ({ getWorkerKpiStats: mocks.getWorkerKpiStats }));

import transactionsRouter from '../routes/transactions';
import workersRouter from '../routes/workers';
import kpiRouter from '../routes/kpi';
import { requireAuth } from '../middleware/auth';
import { signAccessToken } from '../utils/jwt';

const WORKER_ID = 7;
const OTHER_WORKER_ID = 9;

const workerToken = signAccessToken({ sub: WORKER_ID, role: 'DEKLARANT', branchId: 1, name: 'Xodim' });
const adminToken = signAccessToken({ sub: 1, role: 'ADMIN', branchId: 1, name: 'Admin' });

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // server.ts dagi mount tartibi bilan bir xil
  const app = express();
  app.use(express.json());
  app.use('/api/transactions', requireAuth(), transactionsRouter);
  app.use('/api/workers', workersRouter);
  app.use('/api/kpi', requireAuth(), kpiRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  mocks.transactionFindUnique.mockReset();
  mocks.getWorkerKpiStats.mockReset();
  mocks.getWorkerKpiStats.mockResolvedValue({ total: 0 });
});

const get = (path: string, token: string) => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });

describe('GET /transactions/:id — xodim faqat o\'z yozuvini ko\'radi', () => {
  it('boshqa xodimning ish haqi yozuvi berilmaydi', async () => {
    mocks.transactionFindUnique.mockResolvedValue({ id: 55, type: 'SALARY', workerId: OTHER_WORKER_ID });
    expect((await get('/api/transactions/55', workerToken)).status).toBe(403);
  });

  it('mijoz to\'lovi (workerId yo\'q) xodimga berilmaydi', async () => {
    mocks.transactionFindUnique.mockResolvedValue({ id: 56, type: 'INCOME', workerId: null });
    expect((await get('/api/transactions/56', workerToken)).status).toBe(403);
  });

  it('o\'z yozuvi beriladi', async () => {
    mocks.transactionFindUnique.mockResolvedValue({ id: 57, type: 'SALARY', workerId: WORKER_ID });
    expect((await get('/api/transactions/57', workerToken)).status).toBe(200);
  });

  it('admin har qanday yozuvni oladi', async () => {
    mocks.transactionFindUnique.mockResolvedValue({ id: 55, type: 'SALARY', workerId: OTHER_WORKER_ID });
    expect((await get('/api/transactions/55', adminToken)).status).toBe(200);
  });

  it('mijoz va xodimning to\'liq qatori emas, faqat id va ismi so\'raladi', async () => {
    mocks.transactionFindUnique.mockResolvedValue({ id: 57, type: 'SALARY', workerId: WORKER_ID });
    await get('/api/transactions/57', adminToken);
    expect(mocks.transactionFindUnique).toHaveBeenCalledWith({
      where: { id: 57 },
      include: {
        client: { select: { id: true, name: true } },
        worker: { select: { id: true, name: true } },
      },
    });
  });
});

describe('xodim statistikasi — boshqa xodimniki berilmaydi', () => {
  it.each(['stats', 'stage-stats', 'error-stats', 'current-earnings', 'participations', 'contributions'])(
    'GET /workers/:id/%s',
    async (endpoint) => {
      expect((await get(`/api/workers/${OTHER_WORKER_ID}/${endpoint}`, workerToken)).status).toBe(403);
    }
  );

  it('GET /kpi/worker-stats/:workerId boshqa xodim uchun 403', async () => {
    expect((await get(`/api/kpi/worker-stats/${OTHER_WORKER_ID}`, workerToken)).status).toBe(403);
    expect(mocks.getWorkerKpiStats).not.toHaveBeenCalled();
  });

  it('GET /kpi/worker-stats/:workerId o\'zi uchun ishlaydi', async () => {
    expect((await get(`/api/kpi/worker-stats/${WORKER_ID}`, workerToken)).status).toBe(200);
  });
});
