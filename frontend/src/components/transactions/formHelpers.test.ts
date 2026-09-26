import { describe, it, expect } from 'vitest';
import { formatAmountInput, canEditTransaction, localIsoDate, shiftDays } from './formHelpers';

describe('formatAmountInput', () => {
  it('yozish paytida raqamlarni guruhlaydi, raqam bo‘lmaganini tashlaydi', () => {
    expect(formatAmountInput('1250000')).toBe('1 250 000');
    expect(formatAmountInput('1 250 0001')).toBe('12 500 001');
    expect(formatAmountInput('12a3')).toBe('123');
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('000')).toBe('0');
    expect(formatAmountInput('1250000.00')).toBe('1 250 000');
  });
});

describe('canEditTransaction', () => {
  it('admin faqat so‘mdagi yozuvni tahrirlaydi', () => {
    expect(canEditTransaction({ currency: 'UZS' }, true)).toBe(true);
    expect(canEditTransaction({ currency: 'USD' }, true)).toBe(false);
    expect(canEditTransaction({ currency: 'UZS' }, false)).toBe(false);
  });
});

describe('localIsoDate / shiftDays', () => {
  it('mahalliy sana (UTC emas)', () => {
    expect(localIsoDate(new Date(2026, 8, 26, 2, 30))).toBe('2026-09-26');
    expect(shiftDays('2026-09-01', -1)).toBe('2026-08-31');
  });
});
