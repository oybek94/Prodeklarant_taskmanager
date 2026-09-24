import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { amountInUzs, sumUzs, toMoneyNumber } from '../utils/money';

const D = (v: number | string) => new Prisma.Decimal(v);

describe('amountInUzs', () => {
  it('saqlangan amount_uzs ustun', () => {
    expect(amountInUzs({ amount_uzs: D(1_250_000), amount: D(100), currency: 'USD' })?.toNumber()).toBe(1_250_000);
  });

  it('amount_uzs = 0 haqiqiy qiymat (|| kabi o\'tkazib yuborilmaydi)', () => {
    expect(amountInUzs({ amount_uzs: D(0), convertedUzsAmount: D(500), amount: D(9) })?.toNumber()).toBe(0);
  });

  it('convertedUzsAmount — ikkinchi manba', () => {
    expect(amountInUzs({ convertedUzsAmount: D(640_000), amount: D(50), currency: 'USD' })?.toNumber()).toBe(640_000);
  });

  it('UZS summasi to\'g\'ridan-to\'g\'ri', () => {
    expect(amountInUzs({ amount: D(300_000), currency: 'UZS' })?.toNumber()).toBe(300_000);
  });

  it('USD kurs bilan so\'mga o\'giriladi', () => {
    expect(amountInUzs({ amount_original: D(100), currency_universal: 'USD', exchange_rate: D(12_650) })?.toNumber()).toBe(1_265_000);
  });

  it('ESKI XATO: USD kurssiz so\'m deb qo\'shilmaydi', () => {
    // Ilgari: Number(amount_uzs || convertedUzsAmount || amount_original) → 100 "so'm"
    expect(amountInUzs({ amount_original: D(100), currency_universal: 'USD' })).toBeNull();
    expect(amountInUzs({ amount: D(100), currency: 'USD' })).toBeNull();
  });

  it('valyuta noma\'lum bo\'lsa taxmin qilinmaydi', () => {
    expect(amountInUzs({ amount: D(100) })).toBeNull();
  });

  it('amount_original ↔ currency_universal juftligi: currency=UZS bo\'lsa ham USD original so\'m emas', () => {
    expect(amountInUzs({ amount_original: D(100), currency_universal: 'USD', amount: D(100), currency: 'UZS' })).toBeNull();
  });

  it('Decimal aniqligi saqlanadi (float xatosi yo\'q)', () => {
    const { total } = sumUzs([{ amount_uzs: '0.1' }, { amount_uzs: '0.2' }]);
    expect(total.toString()).toBe('0.3');
  });
});

describe('sumUzs', () => {
  it('o\'girib bo\'lmaydiganlarni tashlab, sonini qaytaradi', () => {
    const { total, skipped } = sumUzs([
      { amount_uzs: D(1000) },
      { amount: D(500), currency: 'UZS' },
      { amount: D(10), currency: 'USD' },
    ]);
    expect(toMoneyNumber(total)).toBe(1500);
    expect(skipped).toBe(1);
  });
});
