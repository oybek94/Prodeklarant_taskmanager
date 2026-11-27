import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  contractFindFirst: vi.fn(),
  branchFindUnique: vi.fn(),
  invoiceFindFirst: vi.fn(),
  invoiceItemFindMany: vi.fn(),
  tnvedFindMany: vi.fn(),
  packagingFindMany: vi.fn(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    contract: { findFirst: m.contractFindFirst },
    branch: { findUnique: m.branchFindUnique },
    invoice: { findFirst: m.invoiceFindFirst },
    invoiceItem: { findMany: m.invoiceItemFindMany },
    tnvedProduct: { findMany: m.tnvedFindMany },
    packagingType: { findMany: m.packagingFindMany },
    user: { findMany: m.userFindMany, findFirst: m.userFindFirst },
  },
}));
vi.mock('../services/socketEmitter', () => ({ socketEmitter: { broadcastExcept: vi.fn() } }));
vi.mock('../services/notificationService', () => ({ notify: vi.fn(), getAllActiveUserIds: vi.fn() }));

import type { AuthorMap, DraftData } from '../services/client-cargo-draft';
import { prepareCargoInvoice } from '../services/client-cargo-invoice.service';

const NOW = new Date('2026-02-10T08:00:00.000Z');

const data = (header: DraftData['header'] = {}, fields: Record<string, string> = {}): DraftData => ({
  contractId: 5,
  branchId: 3,
  header: { invoiceNumber: '1/26 от 01.02.2026', vehicleNumber: '01A111AA', ...header },
  items: [{ uid: 'u1', fields: { product: 'Хурма', boxCount: '10', netto: '100', brutto: '110', price: '1', ...fields }, bruttoManual: false }],
});

const authors: AuthorMap = {
  'header.invoiceNumber': { tgUserId: 222, name: 'Vali', at: '2026-02-10T07:30:00.000Z' },
  branchId: { tgUserId: 111, name: 'Mijoz', at: '2026-02-10T07:00:00.000Z' },
};

const prepare = (d: DraftData = data()) => prepareCargoInvoice({ clientId: 1, data: d, authors, now: NOW });

beforeEach(() => {
  Object.values(m).forEach((fn) => fn.mockReset());
  m.contractFindFirst.mockResolvedValue({ id: 5, contractNumber: 'K-1', contractCurrency: 'USD', gln: null, specification: null });
  m.branchFindUnique.mockResolvedValue({ name: 'Filial', regionText: null, defaultRegionCode: null });
  m.invoiceFindFirst.mockResolvedValue(null);
  m.invoiceItemFindMany.mockResolvedValue([]);
  m.tnvedFindMany.mockResolvedValue([]);
  m.packagingFindMany.mockResolvedValue([]);
  m.userFindMany.mockResolvedValue([{ id: 42, telegramChatId: '222' }]);
  m.userFindFirst.mockResolvedValue({ id: 1 });
});

describe('prepareCargoInvoice', () => {
  it("reja: PSR yo'q vazifa, muallif — Telegram hisobi mos xodim", async () => {
    const result = await prepare();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.task).toMatchObject({
      clientId: 1,
      branchId: 3,
      title: '1/26 АВТО 01A111AA',
      hasPsr: false,
      afterHoursDeclaration: false,
    });
    expect(result.plan.creatorId).toBe(42);
    expect(result.plan.invoiceNumber).toBe('1/26');
    expect(m.contractFindFirst.mock.calls[0][0].where).toEqual({ id: 5, clientId: 1 });
    expect(m.userFindMany.mock.calls[0][0].where).toMatchObject({ active: true, telegramChatId: { in: ['111', '222'] } });
  });

  it('xodim topilmasa birinchi faol ADMIN', async () => {
    m.userFindMany.mockResolvedValue([]);
    const result = await prepare();
    expect(result.ok && result.plan.creatorId).toBe(1);
    expect(m.userFindFirst.mock.calls[0][0]).toMatchObject({ where: { role: 'ADMIN', active: true }, orderBy: { id: 'asc' } });
  });

  it('raqam band bo\'lsa rad etiladi', async () => {
    m.invoiceFindFirst.mockImplementation(async (args: { where?: { invoiceNumber?: string } }) =>
      args.where?.invoiceNumber ? { id: 99 } : null
    );
    const result = await prepare();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/^Invoys yaratilmadi: /);
      expect(result.error).toContain('allaqachon mavjud');
    }
  });

  it("raqam yozilmagan bo'lsa shartnomaning navbatdagi raqami", async () => {
    m.invoiceFindFirst.mockImplementation(async (args: { where?: { invoiceNumber?: string } }) =>
      args.where?.invoiceNumber ? null : { invoiceNumber: '7', additionalInfo: null }
    );
    const result = await prepare(data({ invoiceNumber: undefined }));
    expect(result.ok && result.plan.invoiceNumber).toBe('8');
  });

  it.each([
    ['kelajak sana', data({ invoiceNumber: '1 от 01.03.2026' }), 'bugungi sanadan'],
    ["o'qib bo'lmaydigan sana", data({ invoiceNumber: '1 от 31.02.2026' }), 'sana'],
    ['brutto = netto', data({}, { brutto: '100' }), 'netto'],
    ['juda uzun zakaz raqami', data({ orderNumber: 'x'.repeat(101) }), 'orderNumber'],
  ])('rad etiladi: %s', async (_name, draftData, expected) => {
    const result = await prepare(draftData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/^Invoys yaratilmadi: /);
      expect(result.error.toLowerCase()).toContain(expected.toLowerCase());
    }
  });
});
