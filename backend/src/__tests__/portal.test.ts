import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

// config.ts JWT secret'larsiz process.exit qiladi — importlardan oldin o'rnatamiz
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef0123456789';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef012345678';
  return {
    clientFindMany: vi.fn(),
    clientFindUnique: vi.fn(),
    userFindUnique: vi.fn(),
    taskFindMany: vi.fn(),
    taskFindFirst: vi.fn(),
    taskDocumentFindMany: vi.fn(),
    taskDocumentFindFirst: vi.fn(),
    archiveDocumentFindMany: vi.fn(),
  };
});

vi.mock('../prisma', () => ({
  prisma: {
    client: { findMany: mocks.clientFindMany, findUnique: mocks.clientFindUnique },
    user: { findUnique: mocks.userFindUnique },
    task: { findMany: mocks.taskFindMany, findFirst: mocks.taskFindFirst },
    taskDocument: { findMany: mocks.taskDocumentFindMany, findFirst: mocks.taskDocumentFindFirst },
    archiveDocument: { findMany: mocks.archiveDocumentFindMany, findFirst: vi.fn() },
  },
}));

import portalRouter from '../routes/portal';
import authRouter from '../routes/auth';
import { authenticateApi, requireAuth } from '../middleware/auth';
import { signAccessToken, signRefreshToken, verifyAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/hash';
import { summarizeStages, phoneKey, resolveUploadPath, toShipmentStatus } from '../services/portal.service';

const portalPayload = { sub: 3, role: 'PORTAL', branchId: null, name: 'Sunrise Fruits' };
const adminPayload = { sub: 3, role: 'ADMIN', branchId: 1, name: 'Admin' };

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', authenticateApi);
  app.use('/api/auth', authRouter);
  app.use('/api/portal', portalRouter);
  app.get('/api/staff-open', (_req, res) => { res.json({ ok: true }); }); // requireAuth unutilgan endpoint
  app.get('/api/staff-guarded', requireAuth(), (_req, res) => { res.json({ ok: true }); });
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => { server.close(); });

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.taskFindMany.mockResolvedValue([]);
});

const get = (path: string, token?: string) =>
  fetch(`${baseUrl}${path}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('POST /portal/auth/login', () => {
  it('telefon formatidan qat\'i nazar kiradi va PORTAL tokeni beradi', async () => {
    const passwordHash = await hashPassword('parol123');
    mocks.clientFindMany.mockResolvedValue([
      { id: 3, name: 'Sunrise Fruits', phone: '+998 90 123 45 67', passwordHash },
      { id: 4, name: 'Boshqa', phone: '+998 91 000 00 00', passwordHash },
    ]);
    const res = await post('/api/portal/auth/login', { login: '901234567', password: 'parol123' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string; client: { id: number } };
    const payload = verifyAccessToken(body.accessToken);
    expect(payload.role).toBe('PORTAL');
    expect(payload.sub).toBe(3);
    expect(body.client.id).toBe(3);
  });

  it('noto\'g\'ri parol 401, mavjud bo\'lmagan login ham 401 (bir xil xabar)', async () => {
    const passwordHash = await hashPassword('parol123');
    mocks.clientFindMany.mockResolvedValue([{ id: 3, name: 'S', phone: '+998901234567', passwordHash }]);
    const wrong = await post('/api/portal/auth/login', { login: '+998901234567', password: 'xato-parol' });
    const none = await post('/api/portal/auth/login', { login: '+998999999999', password: 'parol123' });
    expect(wrong.status).toBe(401);
    expect(none.status).toBe(401);
    expect(await wrong.json()).toEqual(await none.json());
  });

  it('noto\'g\'ri format 400', async () => {
    expect((await post('/api/portal/auth/login', { login: '1', password: 'x' })).status).toBe(400);
  });
});

describe('token izolyatsiyasi', () => {
  it('xodim tokeni /portal/* ga o\'tmaydi', async () => {
    expect((await get('/api/portal/shipments', signAccessToken(adminPayload))).status).toBe(403);
    expect((await get('/api/portal/auth/me', signAccessToken(adminPayload))).status).toBe(403);
  });

  it('portal tokeni xodim endpointiga o\'tmaydi (requireAuth ham, unutilgan ham)', async () => {
    const t = signAccessToken(portalPayload);
    expect((await get('/api/staff-guarded', t)).status).toBe(403);
    expect((await get('/api/staff-open', t)).status).toBe(403); // authenticateApi to'sadi
    expect((await get('/api/auth/me', t)).status).toBe(403);
  });

  it('portal refresh tokeni xodim /auth/refresh da xodim tokeniga aylanmaydi', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 3, role: 'ADMIN', branchId: 1, name: 'Admin', active: true });
    const res = await post('/api/auth/refresh', { refreshToken: signRefreshToken(portalPayload) });
    expect(res.status).toBe(401);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it('xodim refresh tokeni /portal/auth/refresh da rad etiladi', async () => {
    const res = await post('/api/portal/auth/refresh', { refreshToken: signRefreshToken(adminPayload) });
    expect(res.status).toBe(401);
    expect(mocks.clientFindUnique).not.toHaveBeenCalled();
  });

  it('portal refresh tokeni yangi PORTAL tokenlarini beradi', async () => {
    mocks.clientFindUnique.mockResolvedValue({ id: 3, name: 'S', passwordHash: 'hash' });
    const res = await post('/api/portal/auth/refresh', { refreshToken: signRefreshToken(portalPayload) });
    expect(res.status).toBe(200);
    expect(verifyAccessToken(((await res.json()) as { accessToken: string }).accessToken).role).toBe('PORTAL');
  });

  it('token\'siz 401', async () => {
    expect((await get('/api/portal/shipments')).status).toBe(401);
  });
});

describe('ma\'lumot izolyatsiyasi', () => {
  it('ro\'yxat faqat token egasining clientId si bilan so\'raladi', async () => {
    const res = await get('/api/portal/shipments?status=READY', signAccessToken(portalPayload));
    expect(res.status).toBe(200);
    const args = mocks.taskFindMany.mock.calls[0][0] as { where: { clientId: number } };
    expect(args.where.clientId).toBe(3);
  });

  it('boshqa mijozning yuki 404 (clientId shartda)', async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    const res = await get('/api/portal/shipments/77', signAccessToken(portalPayload));
    expect(res.status).toBe(404);
    expect(mocks.taskFindFirst.mock.calls[0][0]).toMatchObject({ where: { id: 77, clientId: 3 } });
  });

  it('javobda ichki maydonlar yo\'q', async () => {
    mocks.taskFindFirst.mockResolvedValue({
      id: 5, title: 'Olma, 22 t', status: 'JARAYONDA', createdAt: new Date(), updatedAt: new Date(),
      driverPhone: '+998935551234', hasPsr: true, branch: { name: 'Toshkent' },
      stages: [
        { id: 1, name: 'Qabul', stageOrder: 1, status: 'TAYYOR', startedAt: new Date(), completedAt: new Date(), assignedTo: { name: 'Dilnoza' } },
        { id: 2, name: 'Fito', stageOrder: 2, status: 'BOSHLANMAGAN', startedAt: null, completedAt: null, assignedTo: null },
      ],
    });
    const res = await get('/api/portal/shipments/5', signAccessToken(portalPayload));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown> & { stages: Array<{ state: string }> };
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/snapshot|price|comments|createdBy|kpi/i);
    expect(body.status).toBe('IN_PROGRESS');
    expect(body.stages.map((s) => s.state)).toEqual(['DONE', 'CURRENT']);
    // so'rovning select'i ham ichki maydonlarni so'ramaydi
    const select = (mocks.taskFindFirst.mock.calls[0][0] as { select: Record<string, unknown> }).select;
    expect(Object.keys(select).some((k) => /snapshot|comments|createdBy/i.test(k))).toBe(false);
  });

  it('hujjatlar ro\'yxati faqat ko\'rinadigan turlar bilan so\'raladi', async () => {
    mocks.taskFindMany.mockResolvedValue([{ id: 5, title: 'Olma' }]);
    mocks.taskDocumentFindMany.mockResolvedValue([]);
    mocks.archiveDocumentFindMany.mockResolvedValue([]);
    const res = await get('/api/portal/documents', signAccessToken(portalPayload));
    expect(res.status).toBe(200);
    const where = (mocks.taskDocumentFindMany.mock.calls[0][0] as { where: { documentType: { in: string[] } } }).where;
    expect(where.documentType.in).not.toContain('OTHER');
    expect((mocks.taskFindMany.mock.calls[0][0] as { where: { clientId: number } }).where.clientId).toBe(3);
  });

  it('noto\'g\'ri docId 404', async () => {
    expect((await get('/api/portal/documents/abc/download', signAccessToken(portalPayload))).status).toBe(404);
    expect((await get('/api/portal/documents/t-1/download', signAccessToken(portalPayload))).status).toBe(404);
  });
});

describe('yordamchi funksiyalar', () => {
  it('phoneKey oxirgi 9 raqam', () => {
    expect(phoneKey('+998 (90) 123-45-67')).toBe('901234567');
    expect(phoneKey('901234567')).toBe('901234567');
  });

  it('toShipmentStatus', () => {
    expect(toShipmentStatus('TAYYOR' as never)).toBe('READY');
    expect(toShipmentStatus('YAKUNLANDI' as never)).toBe('COMPLETED');
    expect(toShipmentStatus('TOPSHIRILDI' as never)).toBe('IN_PROGRESS');
  });

  it('summarizeStages: joriy bosqich birinchi tugallanmagan', () => {
    const mk = (n: number, done: boolean) => ({ id: n, name: `S${n}`, stageOrder: n, status: (done ? 'TAYYOR' : 'BOSHLANMAGAN') as 'TAYYOR' | 'BOSHLANMAGAN', startedAt: null, completedAt: null });
    const s = summarizeStages([mk(3, false), mk(1, true), mk(2, true)]);
    expect(s.currentStage).toEqual({ name: 'S3', index: 3 });
    expect(s.doneStages).toBe(2);
    expect(s.allDone).toBe(false);
    const all = summarizeStages([mk(1, true), mk(2, true)]);
    expect(all.currentStage).toEqual({ name: 'S2', index: 2 });
    expect(all.allDone).toBe(true);
    expect(summarizeStages([]).currentStage).toBeNull();
  });

  it('resolveUploadPath path traversal\'ni rad etadi', () => {
    expect(resolveUploadPath('/uploads/documents/a.pdf')).toMatch(/uploads[\\/]documents[\\/]a\.pdf$/);
    expect(resolveUploadPath('/uploads/../../etc/passwd')).toBeNull();
    expect(resolveUploadPath('/uploads/%2e%2e/%2e%2e/secret')).toBeNull();
    expect(resolveUploadPath('https://x.uz/uploads/documents/a.pdf')).toMatch(/documents[\\/]a\.pdf$/);
  });
});
