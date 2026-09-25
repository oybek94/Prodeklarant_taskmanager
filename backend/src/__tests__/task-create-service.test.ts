import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

const m = vi.hoisted(() => ({
  state: {} as { client: unknown; statePayment: unknown; certConfig: unknown; rateFails: boolean },
  created: [] as unknown[],
}));

function makeTx() {
  return {
    client: { findUnique: vi.fn(async () => m.state.client) },
    branch: { findUnique: vi.fn(async () => ({ id: 2 })) },
    statePayment: { findFirst: vi.fn(async () => m.state.statePayment) },
    certifierFeeConfig: { findFirst: vi.fn(async () => m.state.certConfig) },
    task: { create: vi.fn(async ({ data }: { data: unknown }) => { m.created.push(data); return { id: 1, title: 't' }; }) },
    taskStage: { createMany: vi.fn() },
  };
}

vi.mock('../prisma', () => ({
  prisma: { $transaction: async (fn: (tx: unknown) => unknown) => fn(makeTx()) },
}));
vi.mock('../services/exchange-rate', () => ({
  getExchangeRate: vi.fn(async () => {
    if (m.state.rateFails) throw new Error('no rate');
    return new Decimal(12650.5);
  }),
}));
vi.mock('../services/socketEmitter', () => ({ socketEmitter: { broadcastExcept: vi.fn() } }));
vi.mock('../services/notificationService', () => ({
  notify: vi.fn(),
  getAllActiveUserIds: vi.fn(async () => []),
  markProcessNotificationsRead: vi.fn(),
}));

import { createTask, buildFeeSnapshot } from '../services/task-create.service';
import type { StatePayment } from '@prisma/client';

const D = (v: number | null) => (v == null ? null : new Decimal(v));

const baseClient = {
  dealAmount: D(150), dealAmountCurrency: 'USD', dealAmountExchangeRate: null,
  dealAmount_currency: null, dealAmount_exchange_rate: null, dealAmount_exchange_source: null,
  contractPaymentType: 'CASH_ALL_INCLUSIVE', serviceFeeTransferUzs: D(300000),
};
/** USD da kiritilgan davlat to'lovi: ba'zi maydonlarda tayyor so'm qiymati bor, ba'zilarida yo'q */
const basePayment = {
  currency: 'USD', exchange_rate: null,
  certificatePayment: D(10), psrPrice: D(20), workerPrice: D(5), customsPayment: D(3),
  certificatePayment_amount_original: D(10), certificatePayment_amount_uzs: D(126000),
  psrPrice_amount_original: null, psrPrice_amount_uzs: null,
  workerPrice_amount_original: D(5), workerPrice_amount_uzs: null,
  customsPayment_amount_original: null, customsPayment_amount_uzs: D(40000),
};

const body = { clientId: 3, branchId: 2, title: 'T', hasPsr: true, comments: 'izoh', driverPhone: '', customsPaymentMultiplier: 1.5 };
const input = { ...body, afterHoursDeclaration: false, afterHoursPayer: 'CLIENT' as const };

async function create(state: typeof m.state): Promise<Record<string, unknown>> {
  m.state = state;
  await createTask(input, 7);
  return JSON.parse(JSON.stringify(m.created.pop()));
}

/** To'lov so'mda yozilganini tekshiradi */
function expectUzsFee(d: Record<string, unknown>, prefix: string, amount: number) {
  expect(d[prefix]).toBeCloseTo(amount, 2);
  expect(d[`${prefix}_amount_original`]).toBeCloseTo(amount, 2);
  expect(d[`${prefix}_amount_uzs`]).toBeCloseTo(amount, 2);
  expect(d[`${prefix}_currency`]).toBe('UZS');
  expect(d[`${prefix}_exchange_rate`]).toBe(1);
}

beforeEach(() => { m.created.length = 0; });

describe("createTask — to'lovlar faqat so'mda, shartnoma mijoz valyutasida", () => {
  it('USD mijoz: shartnoma USD (jonli kurs), to\'lovlar so\'mda', async () => {
    const d = await create({ client: baseClient, statePayment: basePayment, certConfig: null, rateFails: false });
    expect(d.snapshotDealAmount).toBe(150);
    expect(d.snapshotDealAmount_currency).toBe('USD');
    expect(d.snapshotDealAmount_amount_uzs).toBeCloseTo(150 * 12650.5, 2);
    expectUzsFee(d, 'snapshotCertificatePayment', 126000); // tayyor so'm qiymati
    expectUzsFee(d, 'snapshotPsrPrice', 20 * 12650.5); // USD × shartnoma kursi
    expectUzsFee(d, 'snapshotWorkerPrice', 5 * 12650.5);
    expectUzsFee(d, 'snapshotCustomsPayment', 40000);
    expect(d.comments).toBe('izoh');
    expect(d).not.toHaveProperty('driverPhone');
  });

  it('USD mijoz, mijozda saqlangan kurs: USD to\'lov shu kurs bilan', async () => {
    const d = await create({ client: { ...baseClient, dealAmount_exchange_rate: D(12000) }, statePayment: basePayment, certConfig: null, rateFails: false });
    expect(d.snapshotDealAmount_exchange_rate).toBe(12000);
    expectUzsFee(d, 'snapshotPsrPrice', 20 * 12000);
  });

  it('UZS mijoz: USD davlat to\'lovi jonli kurs bilan so\'mga (kurs 1 emas)', async () => {
    const d = await create({ client: { ...baseClient, dealAmount: D(1500000), dealAmount_currency: 'UZS' }, statePayment: basePayment, certConfig: null, rateFails: false });
    expect(d.snapshotDealAmount_currency).toBe('UZS');
    expect(d.snapshotDealAmount_exchange_rate).toBe(1);
    expectUzsFee(d, 'snapshotPsrPrice', 20 * 12650.5);
  });

  it('davlat to\'lovi so\'mda kiritilgan bo\'lsa asosiy qiymat so\'m', async () => {
    const d = await create({ client: baseClient, statePayment: { ...basePayment, currency: 'UZS' }, certConfig: null, rateFails: false });
    expectUzsFee(d, 'snapshotPsrPrice', 20);
    expectUzsFee(d, 'snapshotWorkerPrice', 5);
  });

  it('davlat to\'lovida o\'z kursi bo\'lsa shu ishlatiladi', async () => {
    const d = await create({ client: baseClient, statePayment: { ...basePayment, exchange_rate: D(12500) }, certConfig: null, rateFails: false });
    expectUzsFee(d, 'snapshotPsrPrice', 20 * 12500);
  });

  it('BUG TUZATILDI: hiredWorkerRate (so\'m) USD mijozda ham so\'m — oldin 50000 "USD" edi', async () => {
    const d = await create({ client: baseClient, statePayment: basePayment, certConfig: { hiredWorkerRate: D(50000) }, rateFails: false });
    expectUzsFee(d, 'snapshotWorkerPrice', 50000);
  });

  it('davlat to\'lovi yo\'q: to\'lovlar 0, ishchi narxi filial tarifidan', async () => {
    const d = await create({ client: baseClient, statePayment: null, certConfig: { hiredWorkerRate: D(50000) }, rateFails: false });
    expectUzsFee(d, 'snapshotCertificatePayment', 0);
    expectUzsFee(d, 'snapshotPsrPrice', 0);
    expectUzsFee(d, 'snapshotWorkerPrice', 50000);
    expectUzsFee(d, 'snapshotCustomsPayment', 0);
  });

  it('dealAmount 0: summa 0, valyuta maydonlari yozilmaydi', async () => {
    const d = await create({ client: { ...baseClient, dealAmount: D(0) }, statePayment: basePayment, certConfig: null, rateFails: false });
    expect(d.snapshotDealAmount).toBe(0);
    expect(d).not.toHaveProperty('snapshotDealAmount_currency');
  });

  it('kurs olinmasa (eski xatti-harakat) kurs 1', async () => {
    const d = await create({ client: baseClient, statePayment: basePayment, certConfig: null, rateFails: true });
    expect(d.snapshotDealAmount_exchange_rate).toBe(1);
    expectUzsFee(d, 'snapshotPsrPrice', 20);
  });

  it('mijoz topilmasa 404 (oldin 500)', async () => {
    m.state = { client: null, statePayment: basePayment, certConfig: null, rateFails: false };
    await expect(createTask(input, 7)).rejects.toMatchObject({ status: 404, message: 'Mijoz topilmadi' });
  });
});

describe('buildFeeSnapshot', () => {
  it('eski ExchangeRate maydoni ham 1', () => {
    const out = buildFeeSnapshot(basePayment as unknown as StatePayment, null, 12000);
    expect(Number(out.snapshotPsrPriceExchangeRate)).toBe(1);
    expect(out.snapshotPsrPrice_exchange_source).toBe('MANUAL');
  });
});
