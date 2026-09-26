import { describe, it, expect, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../services/exchange-rate', () => ({ getExchangeRate: vi.fn(async () => new Decimal(12500)) }));

import { createWorkerPayment, getWorkerPaymentReport } from '../services/worker-payment';

function fakeClient() {
  const created: Record<string, unknown>[] = [];
  const paymentWheres: unknown[] = [];
  const client = {
    user: { findUnique: vi.fn(async () => ({ id: 7, salaryCurrency: 'UZS', legacyDebtUsd: new Decimal(500) })) },
    kpiLog: { findMany: vi.fn(async () => []) },
    dashboardNote: { findMany: vi.fn(async () => []) },
    taskError: { findMany: vi.fn(async () => []) },
    workerPayment: {
      findMany: vi.fn(async (args: { where: unknown }) => { paymentWheres.push(args.where); return []; }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return { id: 1, ...data }; }),
    },
    transaction: { findMany: vi.fn(async () => []) },
  };
  return { client, created, paymentWheres };
}

describe('eski (o\'tgan mavsum) qarz olib tashlangan', () => {
  it('hisobotda legacy bo\'limi yo\'q, to\'lovlar ro\'yxati eski mavsum to\'lovlarisiz', async () => {
    const { client, paymentWheres } = fakeClient();
    const report = await getWorkerPaymentReport(7, undefined, client as never);
    expect(report).not.toHaveProperty('legacy');
    expect(report.current).toEqual({ totalEarned: 0, totalPaid: 0, totalErrors: 0, difference: 0 });
    expect(paymentWheres[paymentWheres.length - 1]).toMatchObject({ workerId: 7, isLegacyPayment: false });
  });

  it('to\'lov har doim joriy mavsum to\'lovi sifatida yoziladi', async () => {
    const { client, created } = fakeClient();
    await createWorkerPayment(7, 'UZS', 250000, { tx: client as never, paymentDate: new Date('2026-09-20') });
    expect(created[0]).toMatchObject({ isLegacyPayment: false, paidCurrency: 'UZS' });
    expect(Number(created[0].paidAmountUzs)).toBe(250000);
  });

  it("tahrirda eski mavsum to'lovining belgisi saqlanadi (pul joriy mavsumga o'tmaydi)", async () => {
    const { client, created } = fakeClient();
    await createWorkerPayment(7, 'UZS', 100000, { tx: client as never, preserveLegacyFlag: true });
    expect(created[0]).toMatchObject({ isLegacyPayment: true });
  });
});
