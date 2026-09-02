import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { calculatePreviousYearDebtTotals } from './previous-year-debt';

describe('calculatePreviousYearDebtTotals', () => {
  it('to\'lovsiz holatda snapshot qiymatlarini qaytaradi', () => {
    const totals = calculatePreviousYearDebtTotals({ totalEarned: 1000, totalPaid: 400 }, 0);

    expect(totals.initialTotalPaid).toBe(400);
    expect(totals.paidFromPayments).toBe(0);
    expect(totals.totalPaid).toBe(400);
    expect(totals.balance).toBe(600);
  });

  it('o\'tgan mavsum to\'lovini qarzdan ayiradi', () => {
    const totals = calculatePreviousYearDebtTotals({ totalEarned: 1000, totalPaid: 400 }, 250);

    expect(totals.paidFromPayments).toBe(250);
    expect(totals.totalPaid).toBe(650);
    expect(totals.balance).toBe(350);
  });

  it('Prisma Decimal va matn ko\'rinishidagi qiymatlarni qabul qiladi', () => {
    const totals = calculatePreviousYearDebtTotals(
      { totalEarned: new Decimal('1000.50'), totalPaid: '400.25' },
      new Decimal('100.25')
    );

    expect(totals.totalPaid).toBe(500.5);
    expect(totals.balance).toBe(500);
  });

  it('qarzdan ortiq to\'langanda manfiy qoldiq chiqaradi', () => {
    const totals = calculatePreviousYearDebtTotals({ totalEarned: 1000, totalPaid: 900 }, 250);

    expect(totals.balance).toBe(-150);
  });

  it('kasr summalarni suzuvchi nuqta xatosisiz qo\'shadi', () => {
    const totals = calculatePreviousYearDebtTotals({ totalEarned: 100, totalPaid: 0.1 }, 0.2);

    expect(totals.totalPaid).toBe(0.3);
    expect(totals.balance).toBe(99.7);
  });
});
