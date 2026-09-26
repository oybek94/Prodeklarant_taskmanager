import { describe, it, expect } from 'vitest';
import { buildListParams, hasActiveFilters, EMPTY_FILTERS, buildTransactionPayload } from './listParams';
import type { TransactionFormData } from './types';

const form = (p: Partial<TransactionFormData> = {}): TransactionFormData => ({
  type: 'INCOME', amount: '1 250 000', currency: 'UZS', exchangeRate: '', paymentMethod: 'CARD',
  comment: ' 2-to\'lov ', date: '2026-09-26', clientId: '3', workerId: '', expenseCategory: '', virtualCardId: '', ...p,
});

describe('buildListParams', () => {
  it('faqat to\'ldirilgan filtrlar, qidiruv qirqilgan', () => {
    const p = buildListParams({ ...EMPTY_FILTERS, type: 'EXPENSE', search: '  benzin ' }, 2, 15);
    expect(p.toString()).toBe('page=2&limit=15&type=EXPENSE&search=benzin');
  });
  it('hasActiveFilters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, clientId: '3' })).toBe(true);
  });
});

describe('buildTransactionPayload', () => {
  it('to\'lov usuli yangi yozuvda ham yuboriladi, summa bo\'shliqsiz son', () => {
    const r = buildTransactionPayload(form(), { isAdmin: true, userId: 1 });
    expect(r).toEqual({ ok: true, payload: {
      type: 'INCOME', amount: 1250000, currency: 'UZS', paymentMethod: 'CARD', comment: '2-to\'lov',
      date: '2026-09-26', clientId: 3,
    } });
  });
  it('majburiy maydonlar', () => {
    expect(buildTransactionPayload(form({ clientId: '' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Mijozni tanlang' });
    expect(buildTransactionPayload(form({ type: 'EXPENSE' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Xarajat kategoriyasini tanlang' });
    expect(buildTransactionPayload(form({ type: 'SALARY' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Ishchini tanlang' });
    expect(buildTransactionPayload(form({ amount: '0' }), { isAdmin: true, userId: 1 })).toEqual({ ok: false, error: 'Summani kiriting' });
  });
  it('xodim uchun har doim o\'z ish haqi', () => {
    const r = buildTransactionPayload(form({ type: 'INCOME', clientId: '3', virtualCardId: '2' }), { isAdmin: false, userId: 7 });
    expect(r).toMatchObject({ ok: true, payload: { type: 'SALARY', workerId: 7 } });
    if (r.ok) {
      expect(r.payload.clientId).toBeUndefined();
      expect(r.payload.virtualCardId).toBeUndefined();
    }
  });
  it('virtual karta faqat chiqim/ish haqida', () => {
    const r = buildTransactionPayload(form({ type: 'EXPENSE', expenseCategory: 'Ofis', virtualCardId: '3' }), { isAdmin: true, userId: 1 });
    expect(r).toMatchObject({ ok: true, payload: { expenseCategory: 'Ofis', virtualCardId: 3 } });
  });
});
