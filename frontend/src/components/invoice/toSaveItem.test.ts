import { describe, it, expect } from 'vitest';
import { toSaveItem, normalizeItem } from './invoiceUtils';
import type { InvoiceItem } from './types';

const base: InvoiceItem = {
  name: 'Olma',
  unit: 'кг',
  quantity: 0,
  unitPrice: 1,
  totalPrice: 10,
} as InvoiceItem;

describe('toSaveItem — Мест (quantity)', () => {
  it('bazada "-" saqlangan qatorda foydalanuvchi kiritgan yangi Мест saqlanadi', () => {
    // Bazadan kelgan qator: Мест avval "-" bo'lgan
    const loaded = normalizeItem({ ...base, quantity: 0, customFields: { _quantityStr: '-' } } as InvoiceItem);
    expect(loaded.quantity).toBe('-');

    // Foydalanuvchi Мест ni 33 ga o'zgartirdi
    const edited = { ...loaded, quantity: 33 } as InvoiceItem;
    const saved = toSaveItem(edited, 0);

    expect(saved.quantity).toBe(33);
    expect((saved.customFields as Record<string, unknown>)._quantityStr).toBeUndefined();
  });

  it('"-" kiritilsa 0 va _quantityStr="-" yuboriladi', () => {
    const saved = toSaveItem({ ...base, quantity: '-' } as InvoiceItem, 0);
    expect(saved.quantity).toBe(0);
    expect((saved.customFields as Record<string, unknown>)._quantityStr).toBe('-');
  });

  it('oddiy raqam o\'zgarishi saqlanadi', () => {
    const saved = toSaveItem({ ...base, quantity: 12 } as InvoiceItem, 2);
    expect(saved.quantity).toBe(12);
    expect(saved.orderIndex).toBe(2);
  });
});
