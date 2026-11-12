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
    noteCreate: vi.fn(),
    noteFindUnique: vi.fn(),
    noteUpdate: vi.fn(),
    noteDelete: vi.fn(),
    notificationCreate: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: {
    dashboardNote: {
      create: mocks.noteCreate,
      findUnique: mocks.noteFindUnique,
      update: mocks.noteUpdate,
      delete: mocks.noteDelete,
    },
    notification: { create: mocks.notificationCreate },
  },
}));

// Route `io` ni server.ts dan oladi — testda haqiqiy server ko'tarilmasin
vi.mock('../server', () => ({ io: { emit: vi.fn() } }));
vi.mock('../services/telegram.service', () => ({ sendTelegramMessage: vi.fn() }));

import notesRouter from '../routes/dashboard-notes';
import { signAccessToken } from '../utils/jwt';

const CREATOR_ID = 5;
const OTHER_ID = 8;

const creatorToken = signAccessToken({ sub: CREATOR_ID, role: 'DEKLARANT', branchId: 1, name: 'Yaratuvchi' });
const otherToken = signAccessToken({ sub: OTHER_ID, role: 'SELLER', branchId: 1, name: 'Boshqa' });
const adminToken = signAccessToken({ sub: 1, role: 'ADMIN', branchId: 1, name: 'Admin' });

const storedNote = (overrides: Record<string, unknown> = {}) => ({
  id: 3,
  content: 'Vazifa',
  createdById: CREATOR_ID,
  assignedToId: null,
  isCompleted: false,
  completedById: null,
  xpReward: null,
  bountyReward: null,
  createdBy: { id: CREATOR_ID, name: 'Yaratuvchi' },
  assignedTo: null,
  completedBy: null,
  ...overrides,
});

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard-notes', notesRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.noteCreate.mockResolvedValue(storedNote());
  mocks.noteUpdate.mockResolvedValue(storedNote());
  mocks.noteDelete.mockResolvedValue(storedNote());
  mocks.notificationCreate.mockResolvedValue({});
});

const send = (method: 'POST' | 'PUT' | 'DELETE', path: string, token: string, body?: unknown) =>
  fetch(`${baseUrl}/api/dashboard-notes${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('POST /dashboard-notes', () => {
  it('admin bo\'lmagan xodim pul mukofotli eslatma yarata olmaydi', async () => {
    const res = await send('POST', '', creatorToken, { content: 'O\'zimga mukofot', bountyReward: 5_000_000 });
    expect(res.status).toBe(403);
    expect(mocks.noteCreate).not.toHaveBeenCalled();
  });

  it('admin bo\'lmagan xodim XP mukofotli eslatma yarata olmaydi', async () => {
    const res = await send('POST', '', creatorToken, { content: 'O\'zimga XP', xpReward: 500 });
    expect(res.status).toBe(403);
    expect(mocks.noteCreate).not.toHaveBeenCalled();
  });

  it('xodim mukofotsiz eslatma yarata oladi', async () => {
    const res = await send('POST', '', creatorToken, { content: 'Hujjatni yubor', assignedToId: null, xpReward: null, bountyReward: null });
    expect(res.status).toBe(200);
    expect(mocks.noteCreate.mock.calls[0][0].data).toMatchObject({ content: 'Hujjatni yubor', createdById: CREATOR_ID });
  });

  it('admin mukofotli eslatma yarata oladi', async () => {
    const res = await send('POST', '', adminToken, { content: 'Bonusli vazifa', xpReward: 20, bountyReward: 100_000 });
    expect(res.status).toBe(200);
    expect(mocks.noteCreate.mock.calls[0][0].data).toMatchObject({ xpReward: 20, bountyReward: 100_000 });
  });

  it('bo\'sh matnli so\'rovni rad etadi', async () => {
    const res = await send('POST', '', creatorToken, { content: '' });
    expect(res.status).toBe(400);
    expect(mocks.noteCreate).not.toHaveBeenCalled();
  });
});

describe('PUT /dashboard-notes/:id/toggle', () => {
  it('yaratuvchi o\'zining mukofotli eslatmasini yopa olmaydi', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote({ bountyReward: 500_000 }));
    const res = await send('PUT', '/3/toggle', creatorToken, { isCompleted: true });
    expect(res.status).toBe(403);
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
  });

  it('mukofotsiz eslatmani istalgan xodim yopadi va u bajaruvchi sifatida yoziladi', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote());
    const res = await send('PUT', '/3/toggle', otherToken, { isCompleted: true });
    expect(res.status).toBe(200);
    expect(mocks.noteUpdate.mock.calls[0][0].data).toMatchObject({ isCompleted: true, completedById: OTHER_ID });
  });

  it('mavjud bo\'lmagan eslatma uchun 404', async () => {
    mocks.noteFindUnique.mockResolvedValue(null);
    expect((await send('PUT', '/999/toggle', otherToken, { isCompleted: true })).status).toBe(404);
  });

  it('isCompleted mantiqiy qiymat bo\'lmasa 400', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote());
    expect((await send('PUT', '/3/toggle', otherToken, { isCompleted: 'ha' })).status).toBe(400);
  });
});

describe('tahrirlash va o\'chirish — faqat yaratuvchi yoki admin', () => {
  it('begona xodim eslatma matnini o\'zgartira olmaydi', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote());
    const res = await send('PUT', '/3', otherToken, { content: 'buzilgan' });
    expect(res.status).toBe(403);
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
  });

  it('begona xodim eslatmani o\'chira olmaydi', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote());
    const res = await send('DELETE', '/3', otherToken);
    expect(res.status).toBe(403);
    expect(mocks.noteDelete).not.toHaveBeenCalled();
  });

  it('yaratuvchi o\'z eslatmasini o\'chira oladi', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote());
    const res = await send('DELETE', '/3', creatorToken);
    expect(res.status).toBe(200);
    expect(mocks.noteDelete).toHaveBeenCalledTimes(1);
  });

  it('admin begona eslatmani tahrirlay oladi', async () => {
    mocks.noteFindUnique.mockResolvedValue(storedNote());
    const res = await send('PUT', '/3', adminToken, { content: 'tuzatildi' });
    expect(res.status).toBe(200);
  });
});
