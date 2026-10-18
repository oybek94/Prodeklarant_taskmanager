import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// config.ts JWT secret'larsiz process.exit qiladi — importlardan oldin o'rnatamiz
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef0123456789';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef012345678';
  return {
    userFindUnique: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
  },
}));

import authRouter from '../routes/auth';
import { requireAuth } from '../middleware/auth';
import { signAccessToken, signRefreshToken, verifyAccessToken } from '../utils/jwt';

const clientPayload = { sub: 3, role: 'CLIENT', branchId: null, name: 'Mijoz MChJ' };
const adminPayload = { sub: 3, role: 'ADMIN', branchId: 1, name: 'Admin' };

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/staff', requireAuth(), (_req, res) => { res.json({ ok: true }); });
  app.get('/client-listed', requireAuth('CLIENT'), (_req, res) => { res.json({ ok: true }); });
  app.get('/admin', requireAuth('ADMIN'), (_req, res) => { res.json({ ok: true }); });
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

const get = (path: string, token: string) =>
  fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });

const refresh = (refreshToken: string) =>
  fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

describe('requireAuth — mijoz tokeni xodim endpointlaridan ajratilgan', () => {
  it('rolsiz requireAuth() CLIENT tokenini rad etadi', async () => {
    expect((await get('/staff', signAccessToken(clientPayload))).status).toBe(403);
  });

  it('rolsiz requireAuth() xodim tokenini o\'tkazadi', async () => {
    expect((await get('/staff', signAccessToken(adminPayload))).status).toBe(200);
  });

  it('requireAuth(\'ADMIN\') CLIENT tokenini rad etadi', async () => {
    expect((await get('/admin', signAccessToken(clientPayload))).status).toBe(403);
  });

  it('requireAuth(\'CLIENT\') ro\'yxatida ham CLIENT tokenini o\'tkazmaydi (portal olib tashlangan)', async () => {
    expect((await get('/client-listed', signAccessToken(clientPayload))).status).toBe(403);
  });
});

describe('/auth/refresh — rolni saqlaydi va bloklanganni to\'xtatadi', () => {
  it('CLIENT refresh tokeni xodim tokeniga aylanmaydi (id to\'qnashuvi)', async () => {
    // Bir xil id=3 li ADMIN mavjud — eski kod aynan shu xodim tokenini berardi
    mocks.userFindUnique.mockResolvedValue({ id: 3, role: 'ADMIN', branchId: 1, name: 'Admin', active: true });

    expect((await refresh(signRefreshToken(clientPayload))).status).toBe(401);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it('bloklangan (active=false) xodim refresh qila olmaydi', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 3, role: 'ADMIN', branchId: 1, name: 'Admin', active: false });
    expect((await refresh(signRefreshToken(adminPayload))).status).toBe(401);
  });

  it('faol xodim odatdagidek yangi token oladi', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 3, role: 'ADMIN', branchId: 1, name: 'Admin', active: true });
    const res = await refresh(signRefreshToken(adminPayload));
    expect(res.status).toBe(200);
    expect(verifyAccessToken(((await res.json()) as { accessToken: string }).accessToken).role).toBe('ADMIN');
  });
});
