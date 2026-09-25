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

import { createTask } from '../services/task-create.service';

const D = (v: number | null) => (v == null ? null : new Decimal(v));

const baseClient = {
  dealAmount: D(150), dealAmountCurrency: 'USD', dealAmountExchangeRate: null,
  dealAmount_currency: null, dealAmount_exchange_rate: null, dealAmount_exchange_source: null,
  contractPaymentType: 'CASH_ALL_INCLUSIVE', serviceFeeTransferUzs: D(300000),
  dealAmount_amount_original: null, dealAmount_amount_uzs: null,
};
const basePayment = {
  certificatePayment: D(10), psrPrice: D(20), workerPrice: D(5), customsPayment: D(3),
  certificatePayment_amount_original: D(10), certificatePayment_amount_uzs: D(126000),
  psrPrice_amount_original: null, psrPrice_amount_uzs: null,
  workerPrice_amount_original: D(5), workerPrice_amount_uzs: null,
  customsPayment_amount_original: null, customsPayment_amount_uzs: D(40000),
};

const scenarios: Array<[string, typeof m.state]> = [
  ['USD, jonli kurs', { client: baseClient, statePayment: basePayment, certConfig: null, rateFails: false }],
  ['USD, kurs xatosi → 1', { client: baseClient, statePayment: basePayment, certConfig: null, rateFails: true }],
  ['USD, mijoz kursi', { client: { ...baseClient, dealAmount_exchange_rate: D(12000) }, statePayment: basePayment, certConfig: null, rateFails: false }],
  ['USD, eski kurs maydoni', { client: { ...baseClient, dealAmountExchangeRate: D(11900) }, statePayment: basePayment, certConfig: null, rateFails: false }],
  ['UZS', { client: { ...baseClient, dealAmount: D(1500000), dealAmount_currency: 'UZS', dealAmount_exchange_source: 'MANUAL' }, statePayment: basePayment, certConfig: null, rateFails: false }],
  ['dealAmount 0', { client: { ...baseClient, dealAmount: D(0) }, statePayment: basePayment, certConfig: null, rateFails: false }],
  ['dealAmount null', { client: { ...baseClient, dealAmount: null, serviceFeeTransferUzs: null, contractPaymentType: null }, statePayment: basePayment, certConfig: null, rateFails: false }],
  ['davlat to\'lovi yo\'q', { client: baseClient, statePayment: null, certConfig: { hiredWorkerRate: D(50000) }, rateFails: false }],
  ['hiredWorkerRate USD', { client: baseClient, statePayment: basePayment, certConfig: { hiredWorkerRate: D(50000) }, rateFails: false }],
  ['hiredWorkerRate 0 UZS', { client: { ...baseClient, dealAmount_currency: 'UZS' }, statePayment: basePayment, certConfig: { hiredWorkerRate: D(0) }, rateFails: false }],
];

const body = { clientId: 3, branchId: 2, title: 'T', hasPsr: true, comments: 'izoh', driverPhone: '', customsPaymentMultiplier: 1.5 };

beforeEach(() => { m.created.length = 0; });

describe('createTask — narx snapshoti', () => {
  // Snapshotlar 2026-09-25 da ESKI route kodi bilan 10 ssenariyda aynan tengligi
  // tekshirilgandan keyin qotirildi (refactor(tasks) commit). O'zgarsa — pul hisobi o'zgargan.
  it.each(scenarios)('%s', async (_name, state) => {
    m.state = state;
    await createTask({ ...body, afterHoursDeclaration: false, afterHoursPayer: 'CLIENT' }, 7);
    expect(JSON.parse(JSON.stringify(m.created.pop()))).toMatchSnapshot();
  });

  it("USD: jonli kurs bilan so'm qiymati va davlat to'lovi kursi", async () => {
    m.state = scenarios[0][1];
    await createTask({ ...body, afterHoursDeclaration: false, afterHoursPayer: 'CLIENT' }, 7);
    const d = m.created.pop() as Record<string, unknown>;
    expect(Number(d.snapshotDealAmount_amount_uzs)).toBeCloseTo(150 * 12650.5, 2);
    expect(d.snapshotDealAmount_currency).toBe('USD');
    // sertifikat: tayyor so'm qiymati 126000 / 10 USD
    expect(Number(d.snapshotCertificatePayment_exchange_rate)).toBe(12600);
    expect(d.snapshotWorkerPrice).toBe(5);
    expect(d).not.toHaveProperty('driverPhone');
    expect(d.comments).toBe('izoh');
  });

  it('mijoz yoki filial topilmasa 404 (oldin 500)', async () => {
    m.state = { ...scenarios[0][1], client: null };
    await expect(createTask({ ...body, afterHoursDeclaration: false, afterHoursPayer: 'CLIENT' }, 7))
      .rejects.toMatchObject({ status: 404, message: 'Mijoz topilmadi' });
  });
});
