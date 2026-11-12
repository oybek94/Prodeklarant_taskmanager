import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { randomBytes } from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const mocks = vi.hoisted(() => ({ auditCreate: vi.fn() }));

vi.mock('../prisma', () => ({
  prisma: { auditLog: { create: mocks.auditCreate } },
}));

import { auditLog, redactSensitive } from '../middleware/audit';
import type { AuthRequest } from '../middleware/auth';

describe('redactSensitive', () => {
  it('parol va token maydonlarini yashiradi', () => {
    expect(
      redactSensitive({ name: 'Ali', password: 'p1', passwordHash: 'h1', refreshToken: 'r', accessToken: 'a' })
    ).toEqual({
      name: 'Ali',
      password: '[REDACTED]',
      passwordHash: '[REDACTED]',
      refreshToken: '[REDACTED]',
      accessToken: '[REDACTED]',
    });
  });

  it('ichma-ich obyekt va massivlar ichida ham yashiradi', () => {
    expect(redactSensitive({ users: [{ id: 1, password: 'a' }], meta: { nested: { token: 't', keep: 2 } } })).toEqual({
      users: [{ id: 1, password: '[REDACTED]' }],
      meta: { nested: { token: '[REDACTED]', keep: 2 } },
    });
  });

  it('maxfiy bo\'lmagan qiymatlarga tegmaydi va kiruvchi obyektni o\'zgartirmaydi', () => {
    const input = { amount: 5000, comment: 'oylik', password: 'x' };
    expect(redactSensitive(input)).toEqual({ amount: 5000, comment: 'oylik', password: '[REDACTED]' });
    expect(input.password).toBe('x');
    expect(redactSensitive('matn')).toBe('matn');
    expect(redactSensitive(null)).toBeNull();
  });
});

describe('auditLog middleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as AuthRequest).user = { id: 1, role: 'ADMIN', branchId: null, name: 'Admin' };
      next();
    });
    app.post('/users', auditLog('ACCESS', 'USER'), (_req, res) => {
      res.status(201).json({ id: 9 });
    });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    mocks.auditCreate.mockReset();
    mocks.auditCreate.mockResolvedValue({});
  });

  it('so\'rov tanasidagi parolni bazaga ochiq yozmaydi', async () => {
    const plainPassword = randomBytes(9).toString('base64url');
    const res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yangi xodim', password: plainPassword }),
    });
    expect(res.status).toBe(201);

    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    const payload = String(mocks.auditCreate.mock.calls[0][0].data.payload);
    expect(payload).not.toContain(plainPassword);
    expect(payload).toContain('[REDACTED]');
    expect(payload).toContain('Yangi xodim');
  });
});
