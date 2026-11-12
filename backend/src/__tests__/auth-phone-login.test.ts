import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { randomBytes } from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// config.ts JWT secret'larsiz process.exit qiladi — importlardan oldin o'rnatamiz.
const mocks = vi.hoisted(() => {
  const randomKey = () => Array.from({ length: 48 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  process.env.JWT_SECRET = randomKey();
  process.env.JWT_REFRESH_SECRET = randomKey();
  return { userFindFirst: vi.fn(), userFindMany: vi.fn(), userFindUnique: vi.fn() };
});

vi.mock('../prisma', () => ({
  prisma: { user: { findFirst: mocks.userFindFirst, findMany: mocks.userFindMany, findUnique: mocks.userFindUnique } },
}));

import authRouter from '../routes/auth';
import { verifyAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/hash';
import { createLoginAttemptLimiter } from '../utils/login-attempts';

const correctPassword = randomBytes(9).toString('base64url');
const wrongPassword = randomBytes(9).toString('base64url');
let passwordHash: string;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  passwordHash = await hashPassword(correctPassword);
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const staff = (overrides: Record<string, unknown> = {}) => ({
  id: 4, name: 'Ahadbek', passwordHash, role: 'MANAGER', branchId: null, active: true, ...overrides,
});

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.userFindFirst.mockResolvedValue(staff());
});

const login = (body: unknown) =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /auth/login — telefon + parol', () => {
  it('to\'g\'ri telefon va parol bilan kiradi', async () => {
    const res = await login({ phone: '90 111 00 01', password: correctPassword });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string; user: { id: number } };
    expect(verifyAccessToken(body.accessToken).sub).toBe(4);
    expect(mocks.userFindFirst.mock.calls[0][0].where).toEqual({ phone: '+998901110001' });
  });

  it('telefonsiz (faqat parol bilan) kirib bo\'lmaydi va parol barcha xodimlarga solishtirilmaydi', async () => {
    const res = await login({ password: correctPassword });
    expect(res.status).toBe(400);
    expect(mocks.userFindMany).not.toHaveBeenCalled();
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
  });

  it('noto\'g\'ri parol — 401', async () => {
    expect((await login({ phone: '90 111 00 02', password: wrongPassword })).status).toBe(401);
  });

  it('bunday telefonli xodim yo\'q — 401 (xabar noto\'g\'ri parol bilan bir xil)', async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    const unknown = await login({ phone: '90 111 00 03', password: correctPassword });
    mocks.userFindFirst.mockResolvedValue(staff());
    const wrong = await login({ phone: '90 111 00 04', password: wrongPassword });
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());
  });

  it('bloklangan xodim kira olmaydi', async () => {
    mocks.userFindFirst.mockResolvedValue(staff({ active: false }));
    expect((await login({ phone: '90 111 00 05', password: correctPassword })).status).toBe(401);
  });

  it('noto\'g\'ri formatdagi telefon — 401, bazaga so\'rov yuborilmaydi', async () => {
    expect((await login({ phone: '12345', password: correctPassword })).status).toBe(401);
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
  });

  it('bir telefonga ketma-ket noto\'g\'ri urinishlardan keyin to\'g\'ri parol ham vaqtincha qabul qilinmaydi', async () => {
    const phone = '90 111 00 06';
    for (let i = 0; i < 5; i++) {
      expect((await login({ phone, password: wrongPassword })).status).toBe(401);
    }
    expect((await login({ phone, password: correctPassword })).status).toBe(429);
    // boshqa telefon bloklanmaydi
    expect((await login({ phone: '90 111 00 07', password: correctPassword })).status).toBe(200);
  });
});

describe('createLoginAttemptLimiter', () => {
  it('chegaraga yetguncha bloklamaydi, yetgach bloklaydi', () => {
    const limiter = createLoginAttemptLimiter({ maxFailures: 3, windowMs: 1000, now: () => 0 });
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    expect(limiter.isBlocked('a')).toBe(false);
    limiter.recordFailure('a');
    expect(limiter.isBlocked('a')).toBe(true);
    expect(limiter.isBlocked('b')).toBe(false);
  });

  it('muddat o\'tgach blok yechiladi', () => {
    let now = 0;
    const limiter = createLoginAttemptLimiter({ maxFailures: 1, windowMs: 1000, now: () => now });
    limiter.recordFailure('a');
    expect(limiter.isBlocked('a')).toBe(true);
    now = 1001;
    expect(limiter.isBlocked('a')).toBe(false);
  });

  it('muvaffaqiyatli kirish hisobni nolga qaytaradi', () => {
    const limiter = createLoginAttemptLimiter({ maxFailures: 2, windowMs: 1000, now: () => 0 });
    limiter.recordFailure('a');
    limiter.reset('a');
    limiter.recordFailure('a');
    expect(limiter.isBlocked('a')).toBe(false);
  });
});
