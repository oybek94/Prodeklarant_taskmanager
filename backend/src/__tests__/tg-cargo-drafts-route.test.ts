import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const m = vi.hoisted(() => ({
  clientFindUnique: vi.fn(),
  isGroupMember: vi.fn(),
  getCargoContext: vi.fn(),
  verifyInitData: vi.fn(),
  listOpenDrafts: vi.fn(),
  getDraft: vi.fn(),
  createDraft: vi.fn(),
  patchDraft: vi.fn(),
  completeDraft: vi.fn(),
}));

vi.mock('../prisma', () => ({ prisma: { client: { findUnique: m.clientFindUnique } } }));
vi.mock('../services/client-cargo-miniapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/client-cargo-miniapp')>()),
  verifyInitData: m.verifyInitData,
}));
vi.mock('../services/client-cargo-miniapp.service', () => ({
  isGroupMember: m.isGroupMember,
  getCargoContext: m.getCargoContext,
  submitCargo: vi.fn(),
}));
vi.mock('../services/client-cargo-draft.service', () => ({
  listOpenDrafts: m.listOpenDrafts,
  getDraft: m.getDraft,
  createDraft: m.createDraft,
  patchDraft: m.patchDraft,
  completeDraft: m.completeDraft,
}));

import router from '../routes/tg-cargo';

const view = { id: 7, status: 'OPEN', version: 2, data: {}, authors: {}, missing: [], complete: false, messageId: 55, completedByName: null };

describe('/api/tg-cargo/drafts', () => {
  let server: Server;
  let base: string;

  const call = (path: string, method = 'GET', body?: unknown) =>
    fetch(`${base}${path}`, {
      method,
      headers: { Authorization: 'tma signed', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeAll(async () => {
    process.env.CLIENT_BOT_TOKEN = '123:TEST';
    const app = express();
    app.use(express.json());
    app.use('/api/tg-cargo', router);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tg-cargo`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    Object.values(m).forEach((fn) => fn.mockReset());
    m.verifyInitData.mockReturnValue({ userId: 10, userName: 'Aziz', startParam: '-100123_7' });
    m.clientFindUnique.mockResolvedValue({ id: 1 });
    m.isGroupMember.mockResolvedValue(true);
  });

  it("/context javobiga ishga tushirilgan ariza (launch.draft) qo'shiladi", async () => {
    m.getCargoContext.mockResolvedValue({ clientName: 'Test', contracts: [], branches: [], products: [] });
    const res = await call('/context');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ clientName: 'Test', launch: { draft: 7 } });
  });

  it("GET /drafts ochiq arizalar ro'yxatini qaytaradi", async () => {
    m.listOpenDrafts.mockResolvedValue([{ id: 7, label: 'INV | —', missingCount: 3, updatedAt: '2026-11-01T10:00:00.000Z' }]);
    const res = await call('/drafts');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ drafts: [{ id: 7, label: 'INV | —', missingCount: 3, updatedAt: '2026-11-01T10:00:00.000Z' }] });
    expect(m.listOpenDrafts).toHaveBeenCalledWith({ clientId: 1, chatId: '-100123' });
  });

  it("GET /drafts/:id topilmasa 404, noto'g'ri id bo'lsa 400", async () => {
    m.getDraft.mockResolvedValue(null);
    expect((await call('/drafts/7')).status).toBe(404);
    expect((await call('/drafts/abc')).status).toBe(400);
    expect((await call('/drafts/0')).status).toBe(400);
  });

  it("POST /drafts noto'g'ri tanada 400 va servis chaqirilmaydi", async () => {
    const res = await call('/drafts', 'POST', { header: { shipmentPlace: 'x' } });
    expect(res.status).toBe(400);
    expect(m.createDraft).not.toHaveBeenCalled();
  });

  it("POST /drafts to'g'ri scope va muallif (tekshirilgan ism) bilan servisni chaqiradi", async () => {
    m.createDraft.mockResolvedValue({ ok: true, draft: view });
    const res = await call('/drafts', 'POST', { header: { invoiceNumber: 'INV-1' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 7, version: 2 });
    expect(m.createDraft).toHaveBeenCalledWith(
      { botToken: '123:TEST', clientId: 1, chatId: '-100123' },
      { tgUserId: 10, name: 'Aziz' },
      { header: { invoiceNumber: 'INV-1' } }
    );
  });

  it("PATCH /drafts/:id servis 409 qaytarsa HTTP 409 va xato matni", async () => {
    m.patchDraft.mockResolvedValue({ ok: false, status: 409, error: 'Ariza yopilgan' });
    const res = await call('/drafts/7', 'PATCH', { header: { invoiceNumber: 'X' } });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'Ariza yopilgan' });
    expect(m.patchDraft).toHaveBeenCalledWith({ botToken: '123:TEST', clientId: 1, chatId: '-100123' }, 7, { tgUserId: 10, name: 'Aziz' }, { header: { invoiceNumber: 'X' } });
  });

  it("PATCH maydon xatolarini (errors) o'tkazadi", async () => {
    m.patchDraft.mockResolvedValue({ ok: false, status: 400, error: "Ba'zi maydonlar noto'g'ri", errors: { 'items.u1.boxCount': 'Faqat butun son' } });
    const res = await call('/drafts/7', 'PATCH', { items: { u1: { fields: { boxCount: 'abc' } } } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ errors: { 'items.u1.boxCount': 'Faqat butun son' } });
  });

  it("POST /drafts/:id/complete servisga uzatiladi", async () => {
    m.completeDraft.mockResolvedValue({ ok: true, draft: { ...view, status: 'COMPLETED' } });
    const res = await call('/drafts/7/complete', 'POST', {});
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'COMPLETED' });
    expect(m.completeDraft).toHaveBeenCalledWith({ botToken: '123:TEST', clientId: 1, chatId: '-100123' }, 7, { tgUserId: 10, name: 'Aziz' });
  });

  it("guruh a'zosi bo'lmasa draft yo'llari 403", async () => {
    m.isGroupMember.mockResolvedValue(false);
    expect((await call('/drafts')).status).toBe(403);
    expect(m.listOpenDrafts).not.toHaveBeenCalled();
  });
});
