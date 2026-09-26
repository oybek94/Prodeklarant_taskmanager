import { describe, it, expect, vi } from 'vitest';

vi.mock('../prisma', () => ({ prisma: {} }));

import { computeClientDebt, paymentIn, initialDebtIn, usdRateLookup, DebtClient } from '../services/client-debt';

const { rateAt } = usdRateLookup([
  { date: new Date('2026-01-01'), rate: 12000 },
  { date: new Date('2026-06-01'), rate: 12500 },
]);

function client(p: Partial<DebtClient> = {}): DebtClient {
  return { dealAmount: 100, dealAmount_currency: 'USD', tasks: [], transactions: [], ...p };
}

describe('usdRateLookup', () => {
  it('sanadagi yoki undan oldingi eng yaqin kurs; oldin yo‘q bo‘lsa birinchisi', () => {
    expect(rateAt(new Date('2026-03-01'))).toBe(12000);
    expect(rateAt(new Date('2026-06-01'))).toBe(12500);
    expect(rateAt(new Date('2025-01-01'))).toBe(12000);
    expect(usdRateLookup([]).rateAt(new Date())).toBeNull();
    expect(usdRateLookup([]).latest).toBeNull();
  });
});

describe('paymentIn', () => {
  it('bir xil valyuta — o‘zgarishsiz', () => {
    expect(paymentIn({ amount: 50, currency: 'USD', date: new Date() }, 'USD', rateAt)).toBe(50);
  });

  it('so‘m to‘lov USD shartnomada to‘lov sanasidagi kurs bilan (oldin so‘m USD deb olinardi)', () => {
    expect(paymentIn({ amount: 1_200_000, currency: 'UZS', date: new Date('2026-03-01'), amount_uzs: 1_200_000, exchange_rate: 1 }, 'USD', rateAt)).toBe(100);
  });

  it('USD to‘lov so‘m shartnomada — amount_uzs, bo‘lmasa qatordagi kurs', () => {
    expect(paymentIn({ amount: 10, currency: 'USD', date: new Date('2026-07-01'), amount_uzs: 126000 }, 'UZS', rateAt)).toBe(126000);
    expect(paymentIn({ amount: 10, currency: 'USD', date: new Date('2026-07-01'), exchange_rate: 12700 }, 'UZS', rateAt)).toBe(127000);
    expect(paymentIn({ amount: 10, currency: 'USD', date: new Date('2026-07-01') }, 'UZS', rateAt)).toBe(125000);
  });

  it('kurs yo‘q — null (so‘mni USD deb olmaymiz)', () => {
    expect(paymentIn({ amount: 1000, currency: 'UZS', date: new Date() }, 'USD', () => null)).toBeNull();
  });
});

describe('initialDebtIn', () => {
  it('valyutalar mos kelmasa o‘giriladi', () => {
    expect(initialDebtIn(client({ initialDebt: 50, initialDebtCurrency: 'USD' }), 'USD', 12500)).toBe(50);
    expect(initialDebtIn(client({ initialDebt: 50, initialDebtCurrency: 'USD', initialDebtInUzs: 600000 }), 'UZS', 12500)).toBe(600000);
    expect(initialDebtIn(client({ initialDebt: 50, initialDebtCurrency: 'USD' }), 'UZS', 12500)).toBe(625000);
    // oldin 1 250 000 so'm boshlang'ich qarz USD shartnomada 1 250 000 USD bo'lardi
    expect(initialDebtIn(client({ initialDebt: 1_250_000, initialDebtCurrency: 'UZS', initialDebtInUzs: 1_250_000 }), 'USD', 12500)).toBe(100);
  });
});

describe('computeClientDebt', () => {
  it('USD mijoz: vazifalar + PSR − to‘lovlar + boshlang‘ich qarz', () => {
    const res = computeClientDebt(client({
      initialDebt: 20, initialDebtCurrency: 'USD',
      tasks: [
        { hasPsr: false, snapshotDealAmount: 150, snapshotDealAmount_currency: 'USD' },
        { hasPsr: true, snapshotDealAmount: null, snapshotPsrPrice: 126000, snapshotPsrPrice_currency: 'UZS', snapshotPsrPrice_amount_uzs: 126000, snapshotDealAmount_exchange_rate: 12600 },
        { hasPsr: true }, // snapshot'siz eski vazifa: dealAmount + PSR 10
      ],
      transactions: [
        { amount: 100, currency: 'USD', date: new Date('2026-03-01') },
        { amount: 1_200_000, currency: 'UZS', date: new Date('2026-03-01') },
      ],
    }), rateAt, 12500);
    expect(res.currency).toBe('USD');
    expect(res.totalDeal).toBe(150 + (100 + 10) + (100 + 10));
    expect(res.totalPaid).toBe(200);
    expect(res.debt).toBe(370 - 200 + 20);
    expect(res.skipped).toBe(0);
  });

  it('kurs topilmagan to‘lov qo‘shilmaydi va skipped da sanaladi', () => {
    const res = computeClientDebt(client({
      tasks: [{ hasPsr: false }],
      transactions: [{ amount: 500000, currency: 'UZS', date: new Date() }],
    }), () => null, null);
    expect(res.totalPaid).toBe(0);
    expect(res.skipped).toBe(1);
    expect(res.debt).toBe(100);
  });

  it('so‘m mijoz: USD snapshot’li vazifa o‘z kursi bilan so‘mga', () => {
    const res = computeClientDebt(client({
      dealAmount: 1_000_000, dealAmount_currency: 'UZS',
      tasks: [{ hasPsr: false, snapshotDealAmount: 100, snapshotDealAmount_currency: 'USD', snapshotDealAmount_exchange_rate: 12000 }],
    }), rateAt, 12500);
    expect(res.totalDeal).toBe(1_200_000);
  });
});
