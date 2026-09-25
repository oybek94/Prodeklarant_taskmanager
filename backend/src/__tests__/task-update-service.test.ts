import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

type State = {
  task: Record<string, unknown> | null;
  statePayment: unknown;
  clientCurrency: string | null;
  certConfig: unknown;
  branches: Record<number, unknown>;
  invoice: { id: number; additionalInfo: unknown } | null;
};
const m = vi.hoisted(() => ({
  state: {} as State,
  user: { id: 7, name: 'Ali', role: 'ADMIN', branchId: 1 },
  log: [] as unknown[],
}));

function makeTx() {
  return {
    task: { update: vi.fn(async (a: unknown) => { m.log.push(['task.update', a]); return { id: 1, updated: true }; }) },
    statePayment: { findFirst: vi.fn(async () => m.state.statePayment) },
    client: { findUnique: vi.fn(async ({ where }: { where: { id: number } }) => clientRow(where.id)) },
    taskStage: { findFirst: vi.fn(async () => ({ completedAt: new Date('2026-09-02') })) },
    bXMConfig: { findFirst: vi.fn(async () => ({ amountUsd: new Decimal(34.4), amountUzs: new Decimal(412000) })) },
    certifierFeeConfig: { findFirst: vi.fn(async () => m.state.certConfig) },
    invoice: {
      updateMany: vi.fn(async (a: unknown) => { m.log.push(['invoice.updateMany', a]); }),
      findUnique: vi.fn(async () => m.state.invoice),
      update: vi.fn(async (a: unknown) => { m.log.push(['invoice.update', a]); }),
    },
    branch: { findUnique: vi.fn(async ({ where }: { where: { id: number } }) => m.state.branches[where.id] ?? null) },
  };
}

vi.mock('../prisma', () => ({
  prisma: {
    task: { findUnique: vi.fn(async () => m.state.task) },
    client: { findUnique: vi.fn(async ({ where }: { where: { id: number } }) => (where.id === 404 ? null : { id: where.id })) },
    branch: { findUnique: vi.fn(async ({ where }: { where: { id: number } }) => (m.state.branches[where.id] ? { id: where.id } : null)) },
    invoice: { findUnique: vi.fn(async () => (m.state.invoice ? { id: m.state.invoice.id } : null)) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(makeTx()),
  },
}));
vi.mock('../services/exchange-rate', () => ({ getExchangeRate: vi.fn(async () => new Decimal(12650)) }));
vi.mock('../services/task-version', () => ({
  createTaskVersion: vi.fn(async (_tx: unknown, id: number, uid: number) => { m.log.push(['version', id, uid]); }),
}));
vi.mock('../services/cmr-service', () => ({ ensureCmrForInvoice: vi.fn(async (a: unknown) => { m.log.push(['cmr', a]); }) }));
vi.mock('../services/tir-service', () => ({ ensureTirForInvoice: vi.fn(async (a: unknown) => { m.log.push(['tir', a]); }) }));
vi.mock('../services/socketEmitter', () => ({
  socketEmitter: {
    broadcastExcept: vi.fn((...a: unknown[]) => { m.log.push(['socket', ...a]); }),
    broadcast: vi.fn(),
  },
}));

import { updateTask, updateTaskSchema, TaskUpdateError, regenerateTransportDocs, broadcastTaskUpdated } from '../services/task-update.service';

const D = (v: number) => new Decimal(v);

/** Mijozlar: 3 — joriy (USD 150, kurs 12000), 5 — yangi (UZS 2 000 000), 6 — yangi (USD 200, kursisiz) */
function clientRow(id: number) {
  const common = { dealAmountExchangeRate: null, dealAmount_exchange_source: null, contractPaymentType: 'CASH_ALL_INCLUSIVE', serviceFeeTransferUzs: null, dealAmount_amount_uzs: null };
  if (id === 3) return { ...common, dealAmount: D(150), dealAmount_currency: m.state.clientCurrency, dealAmountCurrency: 'USD', dealAmount_exchange_rate: D(12000) };
  if (id === 5) return { ...common, dealAmount: D(2000000), dealAmount_currency: 'UZS', dealAmountCurrency: 'UZS', dealAmount_exchange_rate: null };
  if (id === 6) return { ...common, dealAmount: D(200), dealAmount_currency: 'USD', dealAmountCurrency: 'USD', dealAmount_exchange_rate: null };
  return null;
}
const baseTask = {
  id: 1, title: 'Eski', clientId: 3, branchId: 2, comments: 'izoh', hasPsr: false,
  afterHoursDeclaration: false, afterHoursPayer: 'CLIENT', driverPhone: null, createdById: 7,
  createdAt: new Date('2026-09-01'),
  customsPaymentMultiplier: null, snapshotDealAmount_exchange_rate: D(12000), snapshotDealAmountExchangeRate: null,
};
const sp = {
  currency: 'USD', exchange_rate: null,
  customsPayment: D(3), customsPayment_amount_original: null, customsPayment_amount_uzs: D(40000),
  certificatePayment: D(10), certificatePayment_amount_original: D(10), certificatePayment_amount_uzs: D(126000),
  psrPrice: D(20), psrPrice_amount_original: null, psrPrice_amount_uzs: null,
  workerPrice: D(5), workerPrice_amount_original: D(5), workerPrice_amount_uzs: null,
};
const branches = {
  2: { regionText: 'Oltiariq tumani', defaultRegionCode: { name: 'Oltiariq', internalCode: '1703', externalCode: 'A' } },
  4: { regionText: 'Qo\'qon shahri', defaultRegionCode: { name: 'Qo\'qon', internalCode: '1710', externalCode: 'B' } },
};
const base: State = { task: baseTask, statePayment: sp, clientCurrency: 'USD', certConfig: null, branches, invoice: null };

type Case = [string, Partial<State>, Record<string, unknown>, typeof m.user?];
const cases: Case[] = [
  ['sarlavha + izoh', {}, { title: 'Yangi', comments: '' }],
  ['o\'zgarishsiz qiymatlar', {}, { title: 'Eski', comments: 'izoh', hasPsr: false }],
  ['filial: USD, davlat to\'lovi, invoys avto maydonlari', { invoice: { id: 9, additionalInfo: { shipmentPlace: 'Oltiariq tumani', fssRegionInternalCode: '1703', other: 1 } } }, { branchId: 4 }],
  ['filial: qo\'lda o\'zgartirilgan invoys maydoni saqlanadi', { invoice: { id: 9, additionalInfo: { shipmentPlace: 'Boshqa joy' } } }, { branchId: 4 }],
  ['filial: UZS, hiredWorkerRate', { clientCurrency: 'UZS', certConfig: { hiredWorkerRate: D(50000) } }, { branchId: 4 }],
  ["filial: davlat to'lovi yo'q", { statePayment: null, invoice: { id: 9, additionalInfo: null } }, { branchId: 4 }],
  ['boshqa xodim: faqat ish vaqtidan tashqari', {}, { afterHoursDeclaration: true, afterHoursPayer: 'COMPANY' }, { id: 99, name: 'Bek', role: 'DEKLARANT', branchId: 1 }],
  ['boshqa xodim: sarlavha → 403', {}, { title: 'X' }, { id: 99, name: 'Bek', role: 'DEKLARANT', branchId: 1 }],
  ['menejer: mijoz + telefon', {}, { clientId: 5, driverPhone: '+998' }, { id: 50, name: 'Men', role: 'MANAGER', branchId: 1 }],
  ['topilmadi', { task: null }, { title: 'X' }],
  ['validatsiya xatosi', {}, { title: '' }],
];

/** Yangi servis orqali route bilan bir xil oqim */
async function viaService(body: unknown) {
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten() } };
  try {
    const { updated, branchChanged } = await updateTask(1, parsed.data, m.user);
    if (branchChanged) await regenerateTransportDocs(1, m.user.id);
    const out = { status: 200, body: JSON.parse(JSON.stringify(updated)) };
    broadcastTaskUpdated(1, parsed.data, m.user);
    return out;
  } catch (e) {
    if (e instanceof TaskUpdateError) return { status: e.status, body: { error: e.message } };
    throw e;
  }
}

const norm = (v: unknown) => JSON.parse(JSON.stringify(v));

beforeEach(() => { m.log.length = 0; m.user = { id: 7, name: 'Ali', role: 'ADMIN', branchId: 1 }; });

describe("updateTask — yon ta'sirlar", () => {
  // Snapshotlar 2026-09-25 da ESKI PATCH /tasks/:id route bilan 11 ssenariyda javob va
  // barcha yon ta'sirlar (task.update, invoys, versiya, CMR/TIR, socket) aynan tengligi
  // tekshirilgandan keyin qotirildi.
  it.each(cases)('%s', async (_n, patch, body, user) => {
    m.state = { ...base, ...patch };
    if (user) m.user = user;
    const result = await viaService(body);
    expect({ result, effects: norm(m.log.splice(0)) }).toMatchSnapshot();
  });
});

describe('updateTask — validatsiya (oldin FK xatosi bilan 500)', () => {
  it.each([
    ['mijoz', { clientId: 404 }, 'Mijoz topilmadi'],
    ['filial', { branchId: 99 }, 'Filial topilmadi'],
  ])("mavjud bo'lmagan %s → 404, hech narsa yozilmaydi", async (_n, body, msg) => {
    m.state = { ...base };
    const result = await viaService(body);
    expect(result).toEqual({ status: 404, body: { error: msg } });
    expect(m.log).toEqual([]);
  });
});

/** task.update ga ketgan ma'lumot */
async function updateData(body: Record<string, unknown>, taskPatch: Record<string, unknown> = {}, statePatch: Partial<State> = {}) {
  m.state = { ...base, ...statePatch, task: { ...baseTask, ...taskPatch } };
  const result = await viaService(body);
  expect(result.status).toBe(200);
  const call = m.log.find((e) => Array.isArray(e) && e[0] === 'task.update') as [string, { data: Record<string, unknown> }];
  m.log.length = 0;
  return JSON.parse(JSON.stringify(call[1].data)) as Record<string, unknown>;
}

function expectUzs(d: Record<string, unknown>, prefix: string, amount: number) {
  expect(d[prefix]).toBeCloseTo(amount, 2);
  expect(d[`${prefix}_amount_uzs`]).toBeCloseTo(amount, 2);
  expect(d[`${prefix}_currency`]).toBe('UZS');
  expect(d[`${prefix}_exchange_rate`]).toBe(1);
}

describe("updateTask — narx qayta hisobi (vazifa yaratish bilan bir qoida, to'lovlar so'mda)", () => {
  it("filial: to'lovlar so'mda, USD to'lov vazifa kursi bilan; shartnomaga tegilmaydi", async () => {
    const d = await updateData({ branchId: 4 });
    expectUzs(d, 'snapshotCertificatePayment', 126000);
    expectUzs(d, 'snapshotPsrPrice', 20 * 12000); // vazifa kursi 12000
    expectUzs(d, 'snapshotWorkerPrice', 5 * 12000);
    expectUzs(d, 'snapshotCustomsPayment', 40000);
    expect(d).not.toHaveProperty('snapshotDealAmount');
  });

  it("filial: hiredWorkerRate so'mda (oldin UZS/USD ikki xil edi)", async () => {
    const d = await updateData({ branchId: 4 }, {}, { certConfig: { hiredWorkerRate: D(50000) } });
    expectUzs(d, 'snapshotWorkerPrice', 50000);
  });

  it("filial: Deklaratsiya yakunlangan bo'lsa BXM bojxona to'loviga tegilmaydi", async () => {
    const d = await updateData({ branchId: 4 }, { customsPaymentMultiplier: D(2) });
    expect(Object.keys(d).some((k) => k.startsWith('snapshotCustomsPayment'))).toBe(false);
    expectUzs(d, 'snapshotWorkerPrice', 5 * 12000);
  });

  it('mijoz → UZS mijoz: shartnoma yangi mijoz narxida', async () => {
    const d = await updateData({ clientId: 5 });
    expect(d.clientId).toBe(5);
    expect(d.snapshotDealAmount).toBe(2000000);
    expect(d.snapshotDealAmount_currency).toBe('UZS');
    expect(d.snapshotDealAmount_amount_uzs).toBe(2000000);
    // UZS mijozda USD davlat to'lovi jonli (tarixiy) kurs bilan
    expectUzs(d, 'snapshotPsrPrice', 20 * 12650);
  });

  it('mijoz → USD mijoz (kursisiz): vazifa yaratilgan kundagi kurs', async () => {
    const d = await updateData({ clientId: 6 });
    expect(d.snapshotDealAmount).toBe(200);
    expect(d.snapshotDealAmount_currency).toBe('USD');
    expect(d.snapshotDealAmount_exchange_rate).toBe(12650);
    expect(d.snapshotDealAmount_amount_uzs).toBe(200 * 12650);
  });

  it("mijoz, Deklaratsiyadan keyin (koef 2): yangi summaga BXM qo'shimchasi, bojxona so'mda", async () => {
    const d = await updateData({ clientId: 5 }, { customsPaymentMultiplier: D(2) });
    // UZS mijoz: 2 000 000 + (2 − 1) × 412 000
    expect(d.snapshotDealAmount).toBe(2000000 + 412000);
    expect(d.snapshotDealAmount_amount_uzs).toBe(2000000 + 412000);
    expectUzs(d, 'snapshotCustomsPayment', 412000 * 2);
    expect(d.customsPaymentMultiplier).toBe(2);
  });
});
