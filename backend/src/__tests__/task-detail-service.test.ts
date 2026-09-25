import { describe, it, expect, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

type State = {
  task: Record<string, unknown> | null;
  statePayment: unknown;
  certConfig: unknown;
  rateFails: boolean;
};
const m = vi.hoisted(() => ({ state: {} as State }));

vi.mock('../prisma', () => ({
  prisma: {
    task: { findUnique: vi.fn(async () => m.state.task) },
    statePayment: { findFirst: vi.fn(async () => m.state.statePayment) },
    certifierFeeConfig: { findFirst: vi.fn(async () => m.state.certConfig) },
  },
}));
vi.mock('../services/exchange-rate', () => ({
  getExchangeRate: vi.fn(async (date: Date) => {
    if (m.state.rateFails) throw new Error('no rate');
    // tarixiy va joriy kurs farqli bo'lsin
    return new Decimal(date.getFullYear() === 2025 ? 12100 : 12650);
  }),
}));

import { getTaskDetail, getTaskLight } from '../services/task-detail.service';
import { getExchangeRate } from '../services/exchange-rate';

const D = (v: number | null) => (v == null ? null : new Decimal(v));

const client = (o: Record<string, unknown> = {}) => ({
  id: 3, name: 'Mijoz', dealAmount: D(150), dealAmountCurrency: 'USD', dealAmount_currency: null,
  dealAmountExchangeRate: null, dealAmount_exchange_rate: null, dealAmount_amount_uzs: null,
  contractPaymentType: 'CASH_ALL_INCLUSIVE', serviceFeeTransferUzs: null, ...o,
});
const kpi = (id: number, role: string, o: Record<string, unknown> = {}) => ({
  id, stageName: 'Deklaratsiya', amount: D(2), currency: 'USD', amount_uzs: null, convertedUzsAmount: null,
  exchange_rate: null, exchangeRate: null, userId: id, createdAt: new Date('2026-09-01'),
  user: { id, name: `U${id}`, email: `u${id}@x`, role }, ...o,
});
const task = (o: Record<string, unknown> = {}) => ({
  id: 1, title: 'T', branchId: 2, hasPsr: false, createdAt: new Date('2026-09-01T10:00:00Z'),
  customsPaymentMultiplier: null, snapshotContractPaymentType: null, snapshotServiceFeeTransferUzs: null,
  snapshotDealAmount: null, snapshotDealAmount_amount_uzs: null, snapshotDealAmount_exchange_rate: null,
  snapshotDealAmountExchangeRate: null, snapshotDealAmount_exchange_source: null,
  snapshotCertificatePayment: null, snapshotCertificatePayment_amount_uzs: null,
  snapshotCertificatePayment_currency: null, snapshotCertificatePayment_exchange_rate: null,
  snapshotCustomsPayment: null, snapshotCustomsPayment_amount_uzs: null,
  snapshotCustomsPayment_currency: null, snapshotCustomsPayment_exchange_rate: null,
  snapshotPsrPrice: null, snapshotWorkerPrice: null,
  client: client(), stages: [], errors: [], transactions: [], kpiLogs: [], ...o,
});
const statePayment = (o: Record<string, unknown> = {}) => ({
  currency: 'USD',
  certificatePayment: D(10), certificatePayment_amount_original: D(10), certificatePayment_amount_uzs: null,
  customsPayment: D(3), customsPayment_amount_original: null, customsPayment_amount_uzs: D(40000),
  st1Payment: D(1), st1Payment_amount_uzs: null, fitoPayment: D(2), fitoPayment_amount_uzs: D(25000),
  fumigationPayment: D(0), fumigationPayment_amount_uzs: null, internalCertPayment: D(0.5), internalCertPayment_amount_uzs: null,
  ...o,
});
const cert = { st1Rate: D(95000), fitoRate: D(80000), aktRate: D(25000), fumigationRate: D(10000) };

const scenarios: Array<[string, State]> = [
  ['zamonaviy USD, PSR, BXM×2, KPI admin+ishchi', {
    task: task({
      hasPsr: true, customsPaymentMultiplier: D(2),
      snapshotDealAmount: D(160), snapshotDealAmount_amount_uzs: D(2024000), snapshotDealAmount_exchange_rate: D(12650),
      snapshotDealAmount_exchange_source: 'CBU',
      snapshotCertificatePayment: D(10), snapshotCertificatePayment_amount_uzs: D(126500), snapshotCertificatePayment_currency: 'USD',
      snapshotCustomsPayment: D(6), snapshotCustomsPayment_amount_uzs: null, snapshotCustomsPayment_currency: 'USD',
      kpiLogs: [kpi(1, 'ADMIN'), kpi(2, 'DEKLARANT', { amount_uzs: D(30000) }), kpi(3, 'DEKLARANT', { exchange_rate: D(12000) })],
    }),
    statePayment: statePayment(), certConfig: cert, rateFails: false,
  }],
  ['UZS mijoz, TRANSFER_ONLY', {
    task: task({
      client: client({ dealAmount_currency: 'UZS', dealAmount: D(2000000), serviceFeeTransferUzs: D(500000) }),
      snapshotContractPaymentType: 'TRANSFER_ONLY', snapshotDealAmount: D(2000000),
      snapshotCertificatePayment: D(120000), snapshotCertificatePayment_currency: 'UZS',
      snapshotCustomsPayment: D(40000), snapshotCustomsPayment_currency: 'UZS', hasPsr: true,
      kpiLogs: [kpi(2, 'DEKLARANT', { currency: 'UZS', amount: D(25000) })],
    }),
    statePayment: statePayment({ currency: 'UZS' }), certConfig: null, rateFails: false,
  }],
  ['MIXED, snapshot transfer', {
    task: task({
      snapshotContractPaymentType: 'MIXED', snapshotServiceFeeTransferUzs: D(700000),
      snapshotDealAmount: D(100), snapshotDealAmountExchangeRate: D(12300),
    }),
    statePayment: null, certConfig: cert, rateFails: false,
  }],
  ['eski vazifa: snapshot yo\'q, tarixiy kurs', {
    task: task({ createdAt: new Date('2025-05-01T10:00:00Z'), hasPsr: true }),
    statePayment: statePayment(), certConfig: null, rateFails: false,
  }],
  ['eski vazifa: kurs xatosi', {
    task: task({ hasPsr: true }), statePayment: statePayment(), certConfig: null, rateFails: true,
  }],
  ['eski vazifa: davlat to\'lovi yo\'q', {
    task: task({ client: client({ dealAmount_exchange_rate: D(11800) }) }), statePayment: null, certConfig: null, rateFails: false,
  }],
  ['mijoz summasi so\'mda saqlangan', {
    task: task({ client: client({ dealAmount_amount_uzs: D(1900000) }) }), statePayment: statePayment(), certConfig: cert, rateFails: false,
  }],
  ['topilmadi', { task: null, statePayment: null, certConfig: null, rateFails: false }],
];

const norm = (v: unknown) => JSON.parse(JSON.stringify(v));
const rate = (d: Date) => getExchangeRate(d, 'USD', 'UZS');

describe('getTaskDetail — moliyaviy hisobot', () => {
  // Snapshotlar 2026-09-25 da ESKI GET /tasks/:id route bilan 8 ssenariyda aynan
  // tengligi tekshirilgandan keyin qotirildi. O'zgarsa — pul hisobi o'zgargan.
  it.each(scenarios)('%s', async (_n, state) => {
    m.state = state;
    expect(norm(await getTaskDetail(1, rate))).toMatchSnapshot();
  });

  it("KPI javobida role chiqmaydi, passwordHash so'ralmaydi", async () => {
    m.state = scenarios[0][1];
    const res = await getTaskDetail(1, rate);
    expect(res?.kpiLogs[0].user).toEqual({ id: 1, name: 'U1', email: 'u1@x' });
    expect(res?.adminEarnedAmount).toBe(2 * 12650);
  });

  it('yengil rejim', async () => {
    m.state = scenarios[0][1];
    expect(await getTaskLight(1)).toMatchObject({ id: 1 });
  });
});
