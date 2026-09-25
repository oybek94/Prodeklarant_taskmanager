import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { snapshotIn, taskFeesIn, TaskFeeFields } from '../services/task-money';

const D = (v: number) => new Decimal(v);

describe('snapshotIn', () => {
  it("yangi qoida: so'mdagi to'lov USD mijoz uchun kurs bo'yicha USD ga", () => {
    const m = { amount: D(126500), currency: 'UZS' as const, amountUzs: D(126500) };
    expect(snapshotIn(m, 'USD', 'USD', 12650)).toBeCloseTo(10, 6);
    expect(snapshotIn(m, 'USD', 'UZS', 12650)).toBe(126500);
  });

  it("eski vazifa: valyuta maydoni bo'sh — mijoz valyutasida deb olinadi (xom raqam)", () => {
    const m = { amount: D(10), currency: null, amountUzs: D(126500) };
    expect(snapshotIn(m, 'USD', 'USD', 12650)).toBe(10);
    expect(snapshotIn(m, 'USD', 'UZS', 12650)).toBe(126500);
  });

  it("eski USD yozuv, so'm qiymati yo'q: kurs bo'yicha", () => {
    expect(snapshotIn({ amount: D(10), currency: 'USD', amountUzs: null }, 'USD', 'UZS', 12000)).toBe(120000);
  });

  it("hech narsa yo'q → 0", () => {
    expect(snapshotIn({ amount: null, currency: null, amountUzs: null }, 'USD', 'USD', 12000)).toBe(0);
  });
});

describe('taskFeesIn', () => {
  const uzsFee = (v: number) => ({ amount: D(v), cur: 'UZS' as const, uzs: D(v) });
  const task = (hasPsr: boolean): TaskFeeFields => {
    const f = { cert: uzsFee(126500), psr: uzsFee(253000), worker: uzsFee(50000), customs: uzsFee(412000) };
    return {
      hasPsr,
      snapshotDealAmount_exchange_rate: D(12650),
      snapshotDealAmountExchangeRate: null,
      snapshotCertificatePayment: f.cert.amount, snapshotCertificatePayment_currency: 'UZS', snapshotCertificatePayment_amount_uzs: f.cert.uzs,
      snapshotPsrPrice: f.psr.amount, snapshotPsrPrice_currency: 'UZS', snapshotPsrPrice_amount_uzs: f.psr.uzs,
      snapshotWorkerPrice: f.worker.amount, snapshotWorkerPrice_currency: 'UZS', snapshotWorkerPrice_amount_uzs: f.worker.uzs,
      snapshotCustomsPayment: f.customs.amount, snapshotCustomsPayment_currency: 'UZS', snapshotCustomsPayment_amount_uzs: f.customs.uzs,
    };
  };

  it("USD mijoz: so'mdagi to'lovlar USD da (dashboard sof foydasi uchun)", () => {
    const fees = taskFeesIn(task(true), 'USD', 'USD');
    expect(fees.certificate).toBeCloseTo(10, 6);
    expect(fees.psr).toBeCloseTo(20, 6);
    expect(fees.worker).toBeCloseTo(50000 / 12650, 6); // oldin 50000 "USD" bo'lardi
    expect(fees.customs).toBeCloseTo(412000 / 12650, 6);
  });

  it("PSR yo'q bo'lsa 0", () => {
    expect(taskFeesIn(task(false), 'USD', 'USD').psr).toBe(0);
  });
});
