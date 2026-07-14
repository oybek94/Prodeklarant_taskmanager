import { describe, it, expect } from 'vitest';
import { filterEnglishColumnsForMode } from '../services/invoice-pdf-en';

describe('filterEnglishColumnsForMode', () => {
  const keys = ['index', 'tnved', 'name', 'unit', 'quantity', 'gross', 'net', 'unitPrice', 'total'];

  it('invoice mode: ustunlar o\'zgarmaydi', () => {
    expect(filterEnglishColumnsForMode(keys, 'invoice')).toEqual(keys);
  });

  it('packing mode: unitPrice va total olib tashlanadi', () => {
    expect(filterEnglishColumnsForMode(keys, 'packing')).toEqual([
      'index', 'tnved', 'name', 'unit', 'quantity', 'gross', 'net',
    ]);
  });

  it('packing mode: narx ustunlari bo\'lmasa ham xatolik yo\'q', () => {
    const noPrice = ['index', 'name', 'gross', 'net'];
    expect(filterEnglishColumnsForMode(noPrice, 'packing')).toEqual(noPrice);
  });

  it('asl massivni o\'zgartirmaydi (immutable)', () => {
    const copy = [...keys];
    filterEnglishColumnsForMode(keys, 'packing');
    expect(keys).toEqual(copy);
  });
});
