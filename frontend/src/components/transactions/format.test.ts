import { describe, it, expect } from 'vitest';
import { formatSom, TYPE_META, counterpartyOf } from './format';

describe('formatSom', () => {
  it('bo\'shliq bilan, kasrsiz', () => {
    expect(formatSom(1250000)).toBe('1 250 000');
    expect(formatSom('1250000.00')).toBe('1 250 000');
    expect(formatSom(999.6)).toBe('1 000');
    expect(formatSom(0)).toBe('0');
    expect(formatSom('abc')).toBe('0');
  });
});

describe('TYPE_META / counterpartyOf', () => {
  it('tur yozuvlari o\'zbekcha', () => {
    expect(TYPE_META.INCOME).toEqual({ label: 'Kirim', sign: '+', tone: 'income' });
    expect(TYPE_META.EXPENSE.label).toBe('Chiqim');
    expect(TYPE_META.SALARY.label).toBe('Ish haqi');
  });
  it('kim/nima ustuni', () => {
    const base = { id: 1, amount: 1, currency: 'UZS', date: '2026-09-26' };
    expect(counterpartyOf({ ...base, type: 'INCOME', client: { id: 1, name: 'Agro' } })).toBe('Agro');
    expect(counterpartyOf({ ...base, type: 'SALARY', worker: { id: 2, name: 'Ali' } })).toBe('Ali');
    expect(counterpartyOf({ ...base, type: 'EXPENSE', expenseCategory: 'Transport' })).toBe('Transport');
    expect(counterpartyOf({ ...base, type: 'EXPENSE' })).toBe('—');
  });
});
