import { describe, it, expect } from 'vitest';
import { getPsrAmount, getBranchPaymentsDisplay, getDealAmountDisplay, snapshotIn } from './taskBusinessHelpers';
import type { TaskDetail } from './types';

const usdTask = (o: Partial<TaskDetail> = {}): TaskDetail => ({
  id: 1,
  hasPsr: true,
  afterHoursDeclaration: false,
  client: { id: 3, name: 'M', dealAmount: 150, dealAmountCurrency: 'USD' },
  snapshotDealAmount: 150,
  snapshotDealAmount_exchange_rate: 12650,
  // Yangi qoida: to'lovlar so'mda
  snapshotCertificatePayment: 126500, snapshotCertificatePayment_currency: 'UZS', snapshotCertificatePayment_amount_uzs: 126500,
  snapshotPsrPrice: 253000, snapshotPsrPrice_currency: 'UZS', snapshotPsrPrice_amount_uzs: 253000,
  snapshotWorkerPrice: 50000, snapshotWorkerPrice_currency: 'UZS', snapshotWorkerPrice_amount_uzs: 50000,
  snapshotCustomsPayment: 412000, snapshotCustomsPayment_currency: 'UZS', snapshotCustomsPayment_amount_uzs: 412000,
  ...o,
} as unknown as TaskDetail);

describe('taskBusinessHelpers — valyutaga mos', () => {
  it("USD mijoz, so'mdagi PSR: mijoz valyutasida 20 USD, so'mda 253 000", () => {
    expect(getPsrAmount(usdTask())).toBeCloseTo(20, 6);
    expect(getPsrAmount(usdTask(), 'UZS')).toBe(253000);
  });

  it("kelishuv summasi mijoz valyutasida: 150 + 20 USD (oldin 150 + 253 000)", () => {
    expect(getDealAmountDisplay(usdTask())).toBeCloseTo(170, 6);
  });

  it("filial to'lovlari so'mda va USD da", () => {
    expect(getBranchPaymentsDisplay(usdTask(), false, 'UZS')).toBe(126500 + 50000 + 253000 + 412000);
    expect(getBranchPaymentsDisplay(usdTask())).toBeCloseTo((126500 + 50000 + 253000 + 412000) / 12650, 6);
  });

  it("eski vazifa (valyuta maydoni yo'q): xom raqam mijoz valyutasida", () => {
    const old = usdTask({
      snapshotPsrPrice: 10, snapshotPsrPrice_currency: null, snapshotPsrPrice_amount_uzs: 126500,
    } as Partial<TaskDetail>);
    expect(getPsrAmount(old)).toBe(10);
  });

  it("PSR snapshot'i yo'q eski vazifa: 10 (mijoz valyutasida)", () => {
    expect(getPsrAmount(usdTask({ snapshotPsrPrice: null } as Partial<TaskDetail>))).toBe(10);
  });

  it('snapshotIn backend bilan bir xil', () => {
    expect(snapshotIn(126500, 'UZS', 126500, 'USD', 'USD', 12650)).toBeCloseTo(10, 6);
    expect(snapshotIn(10, 'USD', null, 'USD', 'UZS', 12000)).toBe(120000);
    expect(snapshotIn(null, null, null, 'USD', 'USD', 12000)).toBe(0);
  });
});
