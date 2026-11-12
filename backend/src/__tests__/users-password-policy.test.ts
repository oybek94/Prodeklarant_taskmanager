import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { randomBytes } from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// config.ts JWT secret'larsiz process.exit qiladi — importlardan oldin o'rnatamiz.
// Qiymatlar har ishga tushishda tasodifiy: manbada qotirilgan kalit yo'q.
const mocks = vi.hoisted(() => {
  const randomKey = () => Array.from({ length: 48 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  process.env.JWT_SECRET = randomKey();
  process.env.JWT_REFRESH_SECRET = randomKey();
  return {
    userFindUnique: vi.fn(),
    userFindFirst: vi.fn(),
    userFindMany: vi.fn(),
    userCreate: vi.fn(),
    userUpdate: vi.fn(),
    branchFindFirst: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      findMany: mocks.userFindMany,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    branch: { findFirst: mocks.branchFindFirst },
  },
}));

import usersRouter from '../routes/users';
import { signAccessToken } from '../utils/jwt';

let server: Server;
let baseUrl: string;

const adminToken = signAccessToken({ sub: 1, role: 'ADMIN', branchId: 1, name: 'Admin' });
const longPassword = randomBytes(9).toString('base64url'); // 12 belgi
const shortPassword = longPassword.slice(0, 7);

const send = (method: 'POST' | 'PUT', path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.userFindFirst.mockResolvedValue(null);
  mocks.userFindMany.mockResolvedValue([]);
  mocks.branchFindFirst.mockResolvedValue({ id: 1 });
  mocks.userCreate.mockResolvedValue({ id: 10, name: 'Yangi', email: 'a@b.test', role: 'DEKLARANT', branchId: 1 });
  mocks.userUpdate.mockResolvedValue({ id: 10, name: 'Yangi', email: 'a@b.test', role: 'DEKLARANT', branchId: 1, active: true });
});

describe('xodim paroli — minimal uzunlik (8 belgi)', () => {
  it('qisqa parol bilan xodim yaratilmaydi', async () => {
    const res = await send('POST', '/api/users', { name: 'Yangi xodim', password: shortPassword, role: 'DEKLARANT', branchId: 1, phone: '901234567' });
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('yetarli uzunlikdagi parol bilan xodim yaratiladi', async () => {
    const res = await send('POST', '/api/users', { name: 'Yangi xodim', password: longPassword, role: 'DEKLARANT', branchId: 1, phone: '901234567' });
    expect(res.status).toBe(201);
    expect(mocks.userCreate).toHaveBeenCalledTimes(1);
  });

  it('parolni qisqasiga almashtirib bo\'lmaydi', async () => {
    const res = await send('PUT', '/api/users/10', { password: shortPassword });
    expect(res.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('parolsiz tahrirlash (masalan faqat ism) odatdagidek ishlaydi', async () => {
    const res = await send('PUT', '/api/users/10', { name: 'Yangi ism' });
    expect(res.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledTimes(1);
  });
});
