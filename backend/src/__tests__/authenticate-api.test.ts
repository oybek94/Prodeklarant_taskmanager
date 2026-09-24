import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef0123456789';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef012345678';
});

import { authenticateApi, isPublicApiPath, CLIENT_ROLE } from '../middleware/auth';
import { signAccessToken } from '../utils/jwt';

describe('isPublicApiPath', () => {
  it.each(['/auth/login', '/auth/client/login', '/auth/refresh', '/auth/login/', '/health/db', '/q/abc123', '/v1/media/stream/5', '/v1/media/stream/5/segments/a.ts'])(
    'ochiq: %s',
    (path) => expect(isPublicApiPath(path)).toBe(true),
  );

  it.each(['/auth/me', '/auth/register', '/auth/client/me', '/auth/loginx', '/tasks', '/system/restore', '/q', '/v1/lessons/1/stream-token', '/leads', '/'])(
    'yopiq: %s',
    (path) => expect(isPublicApiPath(path)).toBe(false),
  );
});

describe('authenticateApi — /api sukut bo\'yicha yopiq', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use('/api', authenticateApi);
    // Endpoint o'zi requireAuth QO'YMAGAN holat — ilgari bu ochiq qolardi
    app.get('/api/forgotten', (_req, res) => { res.json({ ok: true }); });
    app.post('/api/auth/login', (_req, res) => { res.json({ ok: 'login' }); });
    app.get('/api/q/:token', (_req, res) => { res.json({ ok: 'qr' }); });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => { server.close(); });

  const get = (path: string, token?: string) =>
    fetch(`${baseUrl}${path}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});

  it('auth\'ni unutgan endpoint token\'siz 401', async () => {
    expect((await get('/api/forgotten')).status).toBe(401);
  });

  it('buzuq token 401', async () => {
    expect((await get('/api/forgotten', 'not-a-jwt')).status).toBe(401);
  });

  it('xodim tokeni o\'tadi', async () => {
    expect((await get('/api/forgotten', signAccessToken({ sub: 1, role: 'ADMIN', branchId: 1, name: 'A' }))).status).toBe(200);
  });

  it('mijoz tokeni ham baza darajasida o\'tadi (rol cheklovi endpointda)', async () => {
    expect((await get('/api/forgotten', signAccessToken({ sub: 1, role: CLIENT_ROLE, branchId: null, name: 'M' }))).status).toBe(200);
  });

  it('login va QR token\'siz ochiq', async () => {
    expect((await fetch(`${baseUrl}/api/auth/login`, { method: 'POST' })).status).toBe(200);
    expect((await get('/api/q/abc')).status).toBe(200);
  });
});
