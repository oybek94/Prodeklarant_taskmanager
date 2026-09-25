import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  taskFindUnique: vi.fn(),
  clientFindUnique: vi.fn(),
  contractFindFirst: vi.fn(),
  contractFindUnique: vi.fn(),
  invoiceFindUnique: vi.fn(),
  invoiceFindFirst: vi.fn(),
  packagingFindMany: vi.fn(),
  transaction: vi.fn(),
  txDeleteMany: vi.fn(),
  txUpdate: vi.fn(),
  txCreate: vi.fn(),
  txCreateMany: vi.fn(),
  ensureCmrForInvoice: vi.fn(),
  ensureTirForInvoice: vi.fn(),
  broadcastExcept: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: {
    task: { findUnique: m.taskFindUnique },
    client: { findUnique: m.clientFindUnique },
    contract: { findFirst: m.contractFindFirst, findUnique: m.contractFindUnique },
    invoice: { findUnique: m.invoiceFindUnique, findFirst: m.invoiceFindFirst },
    packagingType: { findMany: m.packagingFindMany },
    $transaction: m.transaction,
  },
}));
vi.mock('../services/cmr-service', () => ({ ensureCmrForInvoice: m.ensureCmrForInvoice }));
vi.mock('../services/tir-service', () => ({ ensureTirForInvoice: m.ensureTirForInvoice }));
vi.mock('../services/socketEmitter', () => ({ socketEmitter: { broadcastExcept: m.broadcastExcept } }));

import {
  saveInvoice,
  InvoiceSaveError,
  validateItemWeights,
  invoiceSchema,
  InvoiceInput,
} from '../services/invoice-save.service';

const TASK = {
  id: 10,
  clientId: 3,
  branchId: 2,
  snapshotDealAmount: 500,
  client: { id: 3, contractNumber: 'K-1', dealAmountCurrency: 'USD' },
};

const ITEM = { name: 'Olma', unit: 'kg', quantity: 100, grossWeight: 110, netWeight: 100, unitPrice: 1, totalPrice: 100 };

function input(overrides: Record<string, unknown> = {}): InvoiceInput {
  return invoiceSchema.parse({ taskId: 10, items: [ITEM], ...overrides });
}

async function expectSaveError(p: Promise<unknown>, status: number, text: string | RegExp) {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(InvoiceSaveError);
  expect((err as InvoiceSaveError).status).toBe(status);
  expect((err as InvoiceSaveError).message).toMatch(text);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.packagingFindMany.mockResolvedValue([]);
  m.taskFindUnique.mockResolvedValue(TASK);
  m.invoiceFindFirst.mockResolvedValue(null);
  m.contractFindFirst.mockResolvedValue(null);
  m.contractFindUnique.mockResolvedValue({ id: 5, clientId: 3 });
  m.txUpdate.mockResolvedValue({ id: 77 });
  m.txCreate.mockResolvedValue({ id: 88 });
  m.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      invoiceItem: { deleteMany: m.txDeleteMany, createMany: m.txCreateMany },
      invoice: { update: m.txUpdate, create: m.txCreate },
    })
  );
  // 1-chaqiruv: mavjud invoys (taskId bo'yicha); 2-chaqiruv: saqlangandan keyingi o'qish
  m.invoiceFindUnique.mockImplementation(async ({ where }: { where: { taskId?: number; id?: number } }) =>
    where.id != null ? { id: where.id, taskId: 10, totalAmount: 100, items: [] } : null
  );
});

describe('validateItemWeights', () => {
  it('навалом bo\'lmagan turda netto = brutto rad etiladi', () => {
    expect(validateItemWeights([{ ...ITEM, grossWeight: 100, netWeight: 100 }] as never)).toMatch(/teng bo‘lishi mumkin emas/);
  });
  it('навалом turida netto = brutto ruxsat', () => {
    expect(validateItemWeights([{ ...ITEM, packageType: 'Навалом', grossWeight: 100, netWeight: 100 }] as never)).toBeNull();
  });
  it('netto > brutto rad etiladi', () => {
    expect(validateItemWeights([{ ...ITEM, grossWeight: 90 }] as never)).toMatch(/kichik bo‘lishi kerak/);
  });
});

describe('saveInvoice', () => {
  it('og\'irlik xatosida hech narsa yozilmaydi', async () => {
    await expectSaveError(saveInvoice(input({ items: [{ ...ITEM, netWeight: 200 }] })), 400, /1-qatordagi tovar/);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it('REGRESSIYA: yangilashda shartnoma boshqa mijozniki bo\'lsa eski tovarlar O\'CHIRILMAYDI', async () => {
    m.invoiceFindUnique.mockImplementation(async ({ where }: { where: { taskId?: number } }) =>
      where.taskId ? { id: 77, invoiceNumber: '5', additionalInfo: {} } : null
    );
    m.contractFindUnique.mockResolvedValue({ id: 5, clientId: 999 });

    await expectSaveError(saveInvoice(input({ contractId: 5 })), 400, /Shartnoma topilmadi/);
    expect(m.txDeleteMany).not.toHaveBeenCalled();
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it('yangilash: bitta tranzaksiyada itemlar almashadi, additionalInfo birlashadi', async () => {
    m.invoiceFindUnique.mockImplementation(async ({ where }: { where: { taskId?: number; id?: number } }) =>
      where.taskId
        ? { id: 77, invoiceNumber: '5', additionalInfo: { changeLog: [{ field: 'x' }], carrier: 'Eski' } }
        : { id: 77, taskId: 10, totalAmount: 100, items: [] }
    );

    const res = await saveInvoice(input({ additionalInfo: { carrier: 'Yangi' } }));

    expect(res.isNew).toBe(false);
    expect(m.transaction).toHaveBeenCalledTimes(1);
    expect(m.txDeleteMany).toHaveBeenCalledWith({ where: { invoiceId: 77 } });
    const data = m.txUpdate.mock.calls[0][0].data;
    expect(data.invoiceNumber).toBe('5');
    expect(data.additionalInfo).toEqual({ changeLog: [{ field: 'x' }], carrier: 'Yangi' });
    expect(m.txCreateMany.mock.calls[0][0].data[0]).toMatchObject({ invoiceId: 77, name: 'Olma', orderIndex: 0 });
  });

  it('yaratish: shartnoma bo\'yicha keyingi raqam, task/branch/mijoz vazifadan', async () => {
    m.invoiceFindFirst.mockResolvedValue({ invoiceNumber: '12' });

    const res = await saveInvoice(input({ contractId: 5 }));

    expect(res.isNew).toBe(true);
    expect(m.txCreate.mock.calls[0][0].data).toMatchObject({
      invoiceNumber: '13',
      taskId: 10,
      clientId: 3,
      branchId: 2,
      contractId: 5,
      currency: 'USD',
      totalAmount: 500,
    });
    expect(m.txDeleteMany).not.toHaveBeenCalled();
  });

  it('band raqam rad etiladi', async () => {
    m.invoiceFindFirst.mockResolvedValue({ id: 1 });
    await expectSaveError(saveInvoice(input({ invoiceNumber: '7' })), 400, /allaqachon mavjud/);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it('vazifasiz (faqat clientId) invoys 500 emas, tushunarli 400', async () => {
    m.clientFindUnique.mockResolvedValue({ id: 3 });
    await expectSaveError(saveInvoice(input({ taskId: undefined, clientId: 3 })), 400, /vazifaga bog'lab/);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it('topilmagan vazifa → 404', async () => {
    m.taskFindUnique.mockResolvedValue(null);
    await expectSaveError(saveInvoice(input()), 404, /Task topilmadi/);
  });
});
