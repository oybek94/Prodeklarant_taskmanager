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
  return {
    userFindUnique: vi.fn(),
    userFindFirst: vi.fn(),
    userFindMany: vi.fn(),
    userCreate: vi.fn(),
    userUpdate: vi.fn(),
    branchFindFirst: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      findMany: mocks.userFindMany,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    branch: { findFirst: mocks.branchFindFirst },
  },
}));

import usersRouter from '../routes/users';
import { signAccessToken } from '../utils/jwt';
import { normalizeStaffPhone } from '../utils/phone';

let server: Server;
let baseUrl: string;

const adminToken = signAccessToken({ sub: 1, role: 'ADMIN', branchId: 1, name: 'Admin' });
const somePassword = randomBytes(9).toString('base64url');

const send = (method: 'POST' | 'PUT', path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });

const newWorker = (overrides: Record<string, unknown> = {}) => ({
  name: 'Yangi xodim',
  password: somePassword,
  role: 'DEKLARANT',
  branchId: 1,
  phone: '90 123 45 67',
  ...overrides,
});

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.userFindFirst.mockResolvedValue(null);
  mocks.userFindMany.mockResolvedValue([]);
  mocks.branchFindFirst.mockResolvedValue({ id: 1 });
  mocks.userCreate.mockResolvedValue({ id: 10, name: 'Yangi', role: 'DEKLARANT', branchId: 1 });
  mocks.userUpdate.mockResolvedValue({ id: 10, name: 'Yangi', role: 'DEKLARANT', branchId: 1, active: true });
});

describe('normalizeStaffPhone', () => {
  it('turli yozilishdagi O\'zbekiston raqamini bitta ko\'rinishga keltiradi', () => {
    expect(normalizeStaffPhone('90 123 45 67')).toBe('+998901234567');
    expect(normalizeStaffPhone('+998 (90) 123-45-67')).toBe('+998901234567');
    expect(normalizeStaffPhone('998901234567')).toBe('+998901234567');
  });

  it('noto\'g\'ri raqam uchun null qaytaradi', () => {
    expect(normalizeStaffPhone('12345')).toBeNull();
    expect(normalizeStaffPhone('')).toBeNull();
    expect(normalizeStaffPhone('+7 901 234 56 78 99')).toBeNull();
  });
});

describe('xodim telefoni (kelajakdagi login)', () => {
  it('telefonsiz xodim yaratilmaydi', async () => {
    const res = await send('POST', '/api/users', newWorker({ phone: undefined }));
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('noto\'g\'ri telefon bilan xodim yaratilmaydi', async () => {
    const res = await send('POST', '/api/users', newWorker({ phone: '12345' }));
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('telefon normallashtirilgan holda saqlanadi', async () => {
    const res = await send('POST', '/api/users', newWorker());
    expect(res.status).toBe(201);
    expect(mocks.userCreate.mock.calls[0][0].data.phone).toBe('+998901234567');
  });

  it('boshqa xodimga biriktirilgan telefon bilan yaratilmaydi', async () => {
    mocks.userFindFirst.mockResolvedValue({ id: 3 });
    const res = await send('POST', '/api/users', newWorker());
    expect(res.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userFindFirst).toHaveBeenCalledWith({ where: { phone: '+998901234567' }, select: { id: true } });
  });

  it('tahrirlashda telefon normallashtirib saqlanadi, takrorlanish o\'zidan boshqa xodimlarda tekshiriladi', async () => {
    const res = await send('PUT', '/api/users/10', { phone: '(93) 555-11-22' });
    expect(res.status).toBe(200);
    expect(mocks.userUpdate.mock.calls[0][0].data.phone).toBe('+998935551122');
    expect(mocks.userFindFirst).toHaveBeenCalledWith({
      where: { phone: '+998935551122', id: { not: 10 } },
      select: { id: true },
    });
  });

  it('tahrirlashda band telefon rad etiladi', async () => {
    mocks.userFindFirst.mockResolvedValue({ id: 3 });
    const res = await send('PUT', '/api/users/10', { phone: '93 555 11 22' });
    expect(res.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('telefonsiz tahrirlash (masalan faqat ism) ishlaydi va telefonga tegmaydi', async () => {
    const res = await send('PUT', '/api/users/10', { name: 'Yangi ism' });
    expect(res.status).toBe(200);
    expect(mocks.userUpdate.mock.calls[0][0].data).not.toHaveProperty('phone');
  });
});
