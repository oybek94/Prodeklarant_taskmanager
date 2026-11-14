import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import {
  createRateLimiters,
  rateLimitKey,
  resolveLimits,
  PRODUCTION_LIMITS,
  DEVELOPMENT_LIMITS,
} from '../middleware/rate-limits';

describe('rateLimitKey', () => {
  it('xodim o‘z ID si bo‘yicha sanaladi, IP bo‘yicha emas', () => {
    expect(rateLimitKey({ ip: '10.0.0.1', user: { id: 7, role: 'DEKLARANT' } })).toBe('user:7');
    expect(rateLimitKey({ ip: '10.0.0.2', user: { id: 7, role: 'ADMIN' } })).toBe('user:7');
  });

  it('portal mijozi xodim bilan bir xil ID da ham alohida chelakda', () => {
    expect(rateLimitKey({ ip: '10.0.0.1', user: { id: 7, role: 'PORTAL' } })).toBe('client:7');
  });

  it('token‘siz so‘rov IP bo‘yicha sanaladi', () => {
    expect(rateLimitKey({ ip: '10.0.0.1' })).toBe('ip:10.0.0.1');
    expect(rateLimitKey({ ip: '10.0.0.1' })).not.toBe(rateLimitKey({ ip: '10.0.0.2' }));
  });
});

describe('resolveLimits', () => {
  it('faqat aynan "production" qat‘iy chegaralarni yoqadi', () => {
    expect(resolveLimits('production')).toBe(PRODUCTION_LIMITS);
    expect(resolveLimits('development')).toBe(DEVELOPMENT_LIMITS);
    expect(resolveLimits(undefined)).toBe(DEVELOPMENT_LIMITS);
  });

  it('prod chegaralari: bitta xodim ofisning umumiy IP zaxirasidan ancha past', () => {
    expect(PRODUCTION_LIMITS.userPerMinute).toBeLessThan(PRODUCTION_LIMITS.ipBackstopPerMinute);
    expect(PRODUCTION_LIMITS.loginFailuresPer15Min).toBeLessThanOrEqual(10);
  });
});

describe('limiterlar (haqiqiy HTTP)', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const { apiIpBackstop, apiLimiter, loginLimiter } = createRateLimiters({
      ipBackstopPerMinute: 12,
      userPerMinute: 3,
      anonymousPerMinute: 2,
      loginFailuresPer15Min: 2,
    });
    const app = express();
    app.post('/api/auth/login', loginLimiter, (req, res) => {
      res.status(req.headers['x-good-password'] ? 200 : 401).json({});
    });
    app.use('/api', apiIpBackstop);
    // Soxta autentifikatsiya: haqiqiy authenticateApi o'rnida
    app.use('/api', (req, _res, next) => {
      const id = req.headers['x-test-user'];
      if (typeof id === 'string') {
        (req as express.Request & { user?: { id: number; role: string } }).user = {
          id: Number(id),
          role: typeof req.headers['x-test-role'] === 'string' ? (req.headers['x-test-role'] as string) : 'DEKLARANT',
        };
      }
      next();
    });
    app.use('/api', apiLimiter);
    app.get('/api/ping', (_req, res) => res.json({ ok: true }));
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const ping = (headers: Record<string, string> = {}) =>
    fetch(`${base}/api/ping`, { headers }).then((r) => r.status);

  it('bir xodim chegarani to‘ldirsa, shu IP dagi boshqa xodim bloklanmaydi', async () => {
    const first = [await ping({ 'x-test-user': '1' }), await ping({ 'x-test-user': '1' }), await ping({ 'x-test-user': '1' })];
    expect(first).toEqual([200, 200, 200]);
    expect(await ping({ 'x-test-user': '1' })).toBe(429);
    expect(await ping({ 'x-test-user': '2' })).toBe(200);
  });

  it('portal mijozi xodim bilan bir xil ID da alohida sanaladi', async () => {
    // user:1 yuqorida tugagan; client:1 hali toza
    expect(await ping({ 'x-test-user': '1', 'x-test-role': 'PORTAL' })).toBe(200);
  });

  it('token‘siz so‘rovlar IP bo‘yicha va qat‘iyroq chegarada', async () => {
    expect([await ping(), await ping()]).toEqual([200, 200]);
    expect(await ping()).toBe(429);
    // Token'siz chelak to'lgan bo'lsa ham xodim ishlayveradi
    expect(await ping({ 'x-test-user': '3' })).toBe(200);
  });

  it('IP zaxira chegarasi xodim kalitidan qat‘i nazar ishlaydi', async () => {
    // Har so'rov yangi xodim nomidan (o'z chelagi bo'sh) — baribir IP chegarasi (12) to'xtatadi
    const statuses: number[] = [];
    for (let i = 100; i < 114; i++) statuses.push(await ping({ 'x-test-user': String(i) }));
    const firstBlocked = statuses.indexOf(429);
    expect(firstBlocked).toBeGreaterThan(0);
    expect(statuses.slice(firstBlocked).every((s) => s === 429)).toBe(true);
  });

  it('login: muvaffaqiyatli kirish hisobga olinmaydi, faqat xato urinishlar', async () => {
    const login = (good: boolean) =>
      fetch(`${base}/api/auth/login`, { method: 'POST', headers: good ? { 'x-good-password': '1' } : {} }).then((r) => r.status);
    for (let i = 0; i < 5; i++) expect(await login(true)).toBe(200);
    expect([await login(false), await login(false)]).toEqual([401, 401]);
    expect(await login(false)).toBe(429);
    expect(await login(true)).toBe(429);
  });
});
