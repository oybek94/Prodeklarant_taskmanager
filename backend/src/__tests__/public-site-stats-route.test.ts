import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

vi.mock('../prisma', () => ({ prisma: {} }));
vi.mock('../services/public-site-stats.service', () => ({
  getPublicSiteStats: vi.fn(async () => ({ declarations: { total: 3 } })),
}));

import router from '../routes/public-site-stats';

const KEY = 'a-very-long-shared-secret-0123456789';

describe('GET /api/public/site-stats — kalit bilan himoya', () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const app = express();
    app.use('/api/public/site-stats', router);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/site-stats`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  afterEach(() => {
    delete process.env.SITE_STATS_KEY;
  });

  it('SITE_STATS_KEY sozlanmagan bo\'lsa — 404 (endpoint yo\'q)', async () => {
    const res = await fetch(url, { headers: { 'x-site-stats-key': KEY } });
    expect(res.status).toBe(404);
  });

  it('kalit qisqa bo\'lsa — 404', async () => {
    process.env.SITE_STATS_KEY = 'short';
    const res = await fetch(url, { headers: { 'x-site-stats-key': 'short' } });
    expect(res.status).toBe(404);
  });

  it('kalitsiz yoki noto\'g\'ri kalit — 401', async () => {
    process.env.SITE_STATS_KEY = KEY;
    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { 'x-site-stats-key': KEY + 'x' } })).status).toBe(401);
  });

  it('to\'g\'ri kalit — 200 va statistika', async () => {
    process.env.SITE_STATS_KEY = KEY;
    const res = await fetch(url, { headers: { 'x-site-stats-key': KEY } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ declarations: { total: 3 } });
  });
});
