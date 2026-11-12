import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef0123456789';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef012345678';
  return { userFindUnique: vi.fn() };
});

vi.mock('../prisma', () => ({ prisma: { user: { findUnique: mocks.userFindUnique } } }));
// Global setup bu modulni soxtalashtiradi — bu yerda haqiqiysi sinaladi
vi.mock('../utils/staff-session', async () => vi.importActual('../utils/staff-session'));

import { authenticateApi, requireAuth } from '../middleware/auth';
import { signAccessToken } from '../utils/jwt';
import { isStaffSessionValid, invalidateStaffSession, clearStaffSessionCache } from '../utils/staff-session';

beforeEach(() => {
  mocks.userFindUnique.mockReset();
  clearStaffSessionCache();
});

describe('isStaffSessionValid', () => {
  it('versiya mos va xodim faol — yaroqli', async () => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 2, active: true });
    expect(await isStaffSessionValid(1, 2)).toBe(true);
  });

  it('versiya oshgan — eski token yaroqsiz', async () => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 3, active: true });
    expect(await isStaffSessionValid(1, 2)).toBe(false);
  });

  it('tv yo\'q (eski token) — 0 versiya deb olinadi', async () => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 0, active: true });
    expect(await isStaffSessionValid(1, undefined)).toBe(true);
    clearStaffSessionCache();
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 1, active: true });
    expect(await isStaffSessionValid(1, undefined)).toBe(false);
  });

  it('bloklangan yoki o\'chirilgan xodim — yaroqsiz', async () => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 0, active: false });
    expect(await isStaffSessionValid(1, 0)).toBe(false);
    clearStaffSessionCache();
    mocks.userFindUnique.mockResolvedValue(null);
    expect(await isStaffSessionValid(1, 0)).toBe(false);
  });

  it('natija keshlanadi, invalidate esa darhol yangi holatni oladi', async () => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 0, active: true });
    await isStaffSessionValid(1, 0);
    await isStaffSessionValid(1, 0);
    expect(mocks.userFindUnique).toHaveBeenCalledTimes(1);

    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 1, active: true });
    expect(await isStaffSessionValid(1, 0)).toBe(true); // kesh eskirmagan
    invalidateStaffSession(1);
    expect(await isStaffSessionValid(1, 0)).toBe(false);
  });
});

describe('middleware — bekor qilingan token', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use('/api', authenticateApi);
    app.get('/api/any', (_req, res) => { res.json({ ok: true }); });
    // authenticateApi'dan oldin ulangan yo'llar (/uploads kabi) faqat requireAuth bilan himoyalangan
    app.get('/direct', requireAuth(), (_req, res) => { res.json({ ok: true }); });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => { server.close(); });

  const get = (path: string, token: string) => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const staff = (tv?: number) => signAccessToken({ sub: 5, role: 'DEKLARANT', branchId: 1, name: 'X', ...(tv === undefined ? {} : { tv }) });

  it.each(['/api/any', '/direct'])('%s: versiya mos — 200', async (path) => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 1, active: true });
    expect((await get(path, staff(1))).status).toBe(200);
  });

  it.each(['/api/any', '/direct'])('%s: parol/rol o\'zgargan (versiya oshgan) — 401', async (path) => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 2, active: true });
    expect((await get(path, staff(1))).status).toBe(401);
  });

  it.each(['/api/any', '/direct'])('%s: bloklangan xodim eski token bilan — 401', async (path) => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 0, active: false });
    expect((await get(path, staff(0))).status).toBe(401);
  });

  it.each(['/api/any', '/direct'])('%s: baza xatosi — 503 (foydalanuvchi tizimdan chiqarilmaydi)', async (path) => {
    mocks.userFindUnique.mockRejectedValue(new Error('db down'));
    expect((await get(path, staff(0))).status).toBe(503);
  });

  it('portal tokeni xodim sessiyasi tekshiruvidan o\'tmaydi (o\'z pv tekshiruvi bor)', async () => {
    const portal = signAccessToken({ sub: 9, role: 'PORTAL', branchId: null, name: 'M', pv: 'x' });
    expect((await get('/api/portal/anything', portal)).status).not.toBe(401);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });
});

describe('JWT algoritmi', () => {
  it('HS256 dan boshqa algoritmda imzolangan token rad etiladi', async () => {
    mocks.userFindUnique.mockResolvedValue({ tokenVersion: 0, active: true });
    const app = express();
    app.use('/api', authenticateApi);
    app.get('/api/any', (_req, res) => { res.json({ ok: true }); });
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const claims = { sub: 5, role: 'ADMIN', branchId: 1, name: 'X' };
      const hs384 = jwt.sign(claims, process.env.JWT_SECRET as string, { algorithm: 'HS384' });
      const none = jwt.sign(claims, '', { algorithm: 'none' });
      expect((await fetch(`${base}/api/any`, { headers: { Authorization: `Bearer ${hs384}` } })).status).toBe(401);
      expect((await fetch(`${base}/api/any`, { headers: { Authorization: `Bearer ${none}` } })).status).toBe(401);
      expect((await fetch(`${base}/api/any`, { headers: { Authorization: `Bearer ${signAccessToken(claims)}` } })).status).toBe(200);
    } finally {
      server.close();
    }
  });
});
