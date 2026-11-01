import { describe, it, expect } from 'vitest';
import { chunkForAlbums, clampPage, formatArchiveLabel, truncateButtonText } from '../services/client-cargo-archive.service';

describe('formatArchiveLabel', () => {
  it('invoys va avto raqamini "INV | AVTO" ko\'rinishida beradi', () => {
    expect(formatArchiveLabel({ invoiceNumber: 'INV-123', vehicleNumber: '01A123BC' })).toBe('INV-123 | 01A123BC');
  });
  it("qiymat yo'q yoki bo'sh bo'lsa — qo'yadi", () => {
    expect(formatArchiveLabel({ invoiceNumber: null, vehicleNumber: '  ' })).toBe('— | —');
  });
});

describe('truncateButtonText', () => {
  it('uzun matnni qisqartiradi', () => {
    expect(truncateButtonText('x'.repeat(100))).toHaveLength(60);
    expect(truncateButtonText('qisqa')).toBe('qisqa');
  });
});

describe('chunkForAlbums', () => {
  it("fayllarni 10 tadan albomlarga bo'ladi", () => {
    const files = Array.from({ length: 23 }, (_, i) => i);
    expect(chunkForAlbums(files).map((c) => c.length)).toEqual([10, 10, 3]);
  });
  it("bo'sh ro'yxatda albom yo'q", () => {
    expect(chunkForAlbums([])).toEqual([]);
  });
});

describe('clampPage', () => {
  it("noto'g'ri sahifani chegaraga keltiradi", () => {
    expect(clampPage(-1, 3)).toBe(0);
    expect(clampPage(NaN, 3)).toBe(0);
    expect(clampPage(9, 3)).toBe(2);
    expect(clampPage(1, 3)).toBe(1);
  });
});
