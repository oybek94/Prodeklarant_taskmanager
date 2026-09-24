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
    clientFindUnique: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    client: { findUnique: mocks.clientFindUnique },
  },
}));

import authRouter from '../routes/auth';
import { requireAuth, requireStaffOrClient, CLIENT_ROLE } from '../middleware/auth';
import { signAccessToken, signRefreshToken, verifyAccessToken } from '../utils/jwt';

const clientPayload = { sub: 3, role: CLIENT_ROLE, branchId: null, name: 'Mijoz MChJ' };
const adminPayload = { sub: 3, role: 'ADMIN', branchId: 1, name: 'Admin' };

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/staff', requireAuth(), (_req, res) => { res.json({ ok: true }); });
  app.get('/admin', requireAuth('ADMIN'), (_req, res) => { res.json({ ok: true }); });
  app.get('/shared', requireStaffOrClient(), (_req, res) => { res.json({ ok: true }); });
  app.get('/client-only', requireAuth(CLIENT_ROLE), (_req, res) => { res.json({ ok: true }); });
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  mocks.userFindUnique.mockReset();
  mocks.clientFindUnique.mockReset();
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

  it('requireStaffOrClient() ikkalasini ham o\'tkazadi', async () => {
    expect((await get('/shared', signAccessToken(clientPayload))).status).toBe(200);
    expect((await get('/shared', signAccessToken(adminPayload))).status).toBe(200);
  });

  it('requireAuth(CLIENT) xodimni rad etadi', async () => {
    expect((await get('/client-only', signAccessToken(adminPayload))).status).toBe(403);
    expect((await get('/client-only', signAccessToken(clientPayload))).status).toBe(200);
  });
});

describe('/auth/refresh — rolni saqlaydi va bloklanganni to\'xtatadi', () => {
  it('CLIENT refresh tokeni xodim tokeniga aylanmaydi (id to\'qnashuvi)', async () => {
    // Bir xil id=3 li ADMIN mavjud — eski kod aynan shu xodim tokenini berardi
    mocks.userFindUnique.mockResolvedValue({ id: 3, role: 'ADMIN', branchId: 1, name: 'Admin', active: true });
    mocks.clientFindUnique.mockResolvedValue({ id: 3, name: 'Mijoz MChJ', passwordHash: 'hash' });

    const res = await refresh(signRefreshToken(clientPayload));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string };
    const issued = verifyAccessToken(body.accessToken);
    expect(issued.role).toBe(CLIENT_ROLE);
    expect(issued.sub).toBe(3);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it('paroli olib tashlangan mijoz refresh qila olmaydi', async () => {
    mocks.clientFindUnique.mockResolvedValue({ id: 3, name: 'Mijoz MChJ', passwordHash: null });
    expect((await refresh(signRefreshToken(clientPayload))).status).toBe(401);
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
