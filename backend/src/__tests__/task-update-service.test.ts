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
    client: { findUnique: vi.fn(async () => (m.state.clientCurrency ? { dealAmount_currency: null, dealAmountCurrency: m.state.clientCurrency } : null)) },
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
const baseTask = {
  id: 1, title: 'Eski', clientId: 3, branchId: 2, comments: 'izoh', hasPsr: false,
  afterHoursDeclaration: false, afterHoursPayer: 'CLIENT', driverPhone: null, createdById: 7,
  createdAt: new Date('2026-09-01'),
};
const sp = {
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
  ['filial: davlat to\'lovi yo\'q, mijoz yo\'q', { statePayment: null, clientCurrency: null, invoice: { id: 9, additionalInfo: null } }, { branchId: 4 }],
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
