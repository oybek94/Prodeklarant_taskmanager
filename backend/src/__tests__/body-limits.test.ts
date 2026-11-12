import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { parseRequestBody, PUBLIC_BODY_LIMIT_BYTES, AUTHENTICATED_BODY_LIMIT_BYTES } from '../middleware/body-limits';
import type { AuthRequest } from '../middleware/auth';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  // server.ts dagi tartib: avval autentifikatsiya, keyin tana o'qiladi
  app.use((req, _res, next) => {
    if (req.headers['x-test-user']) (req as AuthRequest).user = { id: 1, role: 'DEKLARANT', branchId: 1, name: 'Xodim' };
    next();
  });
  app.use(parseRequestBody());
  app.post('/echo', (req, res) => {
    res.json({ length: JSON.stringify(req.body).length });
  });
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const post = (bytes: number, authenticated: boolean, contentType = 'application/json') =>
  fetch(`${baseUrl}/echo`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, ...(authenticated ? { 'x-test-user': '1' } : {}) },
    body: contentType === 'application/json' ? JSON.stringify({ text: 'x'.repeat(bytes) }) : `text=${'x'.repeat(bytes)}`,
  });

describe('so\'rov tanasi hajmi', () => {
  it('token\'siz so\'rov (masalan login) kichik tanani qabul qiladi', async () => {
    expect((await post(1_000, false)).status).toBe(200);
  });

  it('token\'siz katta tana xotiraga o\'qilmaydi — 413', async () => {
    expect((await post(PUBLIC_BODY_LIMIT_BYTES + 1_000, false)).status).toBe(413);
  });

  it('token\'siz katta urlencoded tana ham 413', async () => {
    expect((await post(PUBLIC_BODY_LIMIT_BYTES + 1_000, false, 'application/x-www-form-urlencoded')).status).toBe(413);
  });

  it('xodim odatdagi katta formani (invoys, o\'quv matni) yubora oladi', async () => {
    expect((await post(PUBLIC_BODY_LIMIT_BYTES * 5, true)).status).toBe(200);
  });

  it('xodim uchun ham yuqori chegara bor — 413', async () => {
    expect((await post(AUTHENTICATED_BODY_LIMIT_BYTES + 1_000, true)).status).toBe(413);
  });
});
