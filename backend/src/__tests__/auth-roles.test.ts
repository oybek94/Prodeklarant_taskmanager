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
  return { userFindUnique: vi.fn() };
});

vi.mock('../prisma', () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));

import authRouter from '../routes/auth';
import { requireAuth, requireSelfOrAdmin, resolveStaffRole } from '../middleware/auth';
import { signAccessToken, verifyAccessToken } from '../utils/jwt';
import { comparePassword, hashPassword, DUMMY_PASSWORD_HASH } from '../utils/hash';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/workers/:id/stats', requireAuth(), requireSelfOrAdmin('id'), (_req, res) => {
    res.json({ ok: true });
  });
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  mocks.userFindUnique.mockReset();
});

const tokenFor = (id: number, role: string) => signAccessToken({ sub: id, role, branchId: 1, name: 'Xodim' });

const getStats = (workerId: string, token: string) =>
  fetch(`${baseUrl}/workers/${workerId}/stats`, { headers: { Authorization: `Bearer ${token}` } });

describe('resolveStaffRole', () => {
  it('amaldagi xodim rollarini o\'zgartirmaydi', () => {
    expect(resolveStaffRole('CERTIFICATE_WORKER')).toBe('CERTIFICATE_WORKER');
    expect(resolveStaffRole('SELLER')).toBe('SELLER');
    expect(resolveStaffRole('ADMIN')).toBe('ADMIN');
  });

  it('eski/noma\'lum rollarni DEKLARANT ga tushiradi', () => {
    expect(resolveStaffRole('WORKER')).toBe('DEKLARANT');
    expect(resolveStaffRole('ACCOUNTANT')).toBe('DEKLARANT');
  });
});

describe('POST /auth/login — token roli bazadagi rol bilan bir xil', () => {
  it('CERTIFICATE_WORKER login qilganda DEKLARANT tokeni olmaydi', async () => {
    const loginPassword = randomBytes(9).toString('base64url');
    mocks.userFindUnique.mockResolvedValue({
      id: 5,
      name: 'Sertifikatchi',
      passwordHash: await hashPassword(loginPassword),
      role: 'CERTIFICATE_WORKER',
      branchId: 2,
      active: true,
    });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cert@example.test', password: loginPassword }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { accessToken: string; user: { role: string } };
    expect(verifyAccessToken(body.accessToken).role).toBe('CERTIFICATE_WORKER');
    expect(body.user.role).toBe('CERTIFICATE_WORKER');
  });
});

describe('requireSelfOrAdmin', () => {
  it('xodim o\'z ma\'lumotini oladi', async () => {
    expect((await getStats('7', tokenFor(7, 'DEKLARANT'))).status).toBe(200);
  });

  it('xodim boshqa xodim ma\'lumotini ololmaydi', async () => {
    expect((await getStats('9', tokenFor(7, 'DEKLARANT'))).status).toBe(403);
    expect((await getStats('9', tokenFor(7, 'MANAGER'))).status).toBe(403);
  });

  it('admin har qanday xodim ma\'lumotini oladi', async () => {
    expect((await getStats('9', tokenFor(1, 'ADMIN'))).status).toBe(200);
  });

  it('raqam bo\'lmagan ID ni admin bo\'lmaganga bermaydi', async () => {
    expect((await getStats('abc', tokenFor(7, 'DEKLARANT'))).status).toBe(403);
  });
});

describe('DUMMY_PASSWORD_HASH', () => {
  it('haqiqiy bcrypt hash — solishtirish darhol qaytmaydi, haqiqiy ish bajaradi', async () => {
    // bcryptjs 60 belgidan boshqa uzunlikdagi "hash"ni hisoblamasdan false qaytaradi
    expect(DUMMY_PASSWORD_HASH).toHaveLength(60);
    expect(DUMMY_PASSWORD_HASH.startsWith('$2')).toBe(true);
    expect(await comparePassword('ixtiyoriy-parol', DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
