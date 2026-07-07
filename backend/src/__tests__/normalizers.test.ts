import { describe, it, expect } from 'vitest';
import {
  parseDateISO,
  parseNumber,
  normalizeWeightKg,
  normalizeInvoiceNumber,
  normalizeCurrency,
} from '../ai/normalizers';

describe('parseDateISO', () => {
  it('ISO formatni qabul qiladi', () => {
    expect(parseDateISO('2026-01-15')).toBe('2026-01-15');
    expect(parseDateISO('2026-1-5')).toBe('2026-01-05');
  });

  it('dd.mm.yyyy formatini kanonlaydi', () => {
    expect(parseDateISO('15.01.2026')).toBe('2026-01-15');
    expect(parseDateISO('17.10.2025')).toBe('2025-10-17');
  });

  it('dd/mm/yyyy va dd-mm-yyyy formatlarini kanonlaydi', () => {
    expect(parseDateISO('15/01/2026')).toBe('2026-01-15');
    expect(parseDateISO('15-01-2026')).toBe('2026-01-15');
  });

  it('ikki xonali yilni kengaytiradi', () => {
    expect(parseDateISO('17.10.25')).toBe('2025-10-17');
    expect(parseDateISO('01.02.99')).toBe('1999-02-01');
  });

  it('ruscha oy nomlarini tushunadi', () => {
    expect(parseDateISO('17 октября 2025 г.')).toBe('2025-10-17');
    expect(parseDateISO('15 января 2026')).toBe('2026-01-15');
    expect(parseDateISO('1 мая 2025 г')).toBe('2025-05-01');
  });

  it("o'zbekcha oy nomlarini tushunadi", () => {
    expect(parseDateISO('15 yanvar 2026')).toBe('2026-01-15');
    expect(parseDateISO('3 sentabr 2025')).toBe('2025-09-03');
  });

  it("noto'g'ri sanalarda null qaytaradi (taxmin qilmaydi)", () => {
    expect(parseDateISO('32.01.2026')).toBeNull();
    expect(parseDateISO('15.13.2026')).toBeNull();
    expect(parseDateISO('29.02.2025')).toBeNull(); // 2025 kabisa emas
    expect(parseDateISO('sana yo‘q')).toBeNull();
    expect(parseDateISO(null)).toBeNull();
    expect(parseDateISO('')).toBeNull();
  });
});

describe('parseNumber', () => {
  it('raqamlarni o‘zgarishsiz qaytaradi', () => {
    expect(parseNumber(23130)).toBe(23130);
    expect(parseNumber(0.7)).toBe(0.7);
    expect(parseNumber(NaN)).toBeNull();
  });

  it('probel minglik ajratgichli formatni tushunadi', () => {
    expect(parseNumber('13 232,80')).toBe(13232.8);
    expect(parseNumber('1 500')).toBe(1500);
  });

  it('AQSh formatini tushunadi (vergul minglik, nuqta kasr)', () => {
    expect(parseNumber('13,232.80')).toBe(13232.8);
    expect(parseNumber('1,234,567')).toBe(1234567);
  });

  it('Yevropa formatini tushunadi (nuqta minglik, vergul kasr)', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56);
    expect(parseNumber('1.234.567')).toBe(1234567);
  });

  it('bitta vergulni kasr deb oladi (1-2 xona)', () => {
    expect(parseNumber('0,70')).toBe(0.7);
    expect(parseNumber('1,5')).toBe(1.5);
  });

  it('vergul + 3 xonani minglik deb oladi', () => {
    expect(parseNumber('13,232')).toBe(13232);
  });

  it('valyuta belgilarini tashlab yuboradi', () => {
    expect(parseNumber('$13,232.80')).toBe(13232.8);
    expect(parseNumber('23130 кг')).toBe(23130);
  });

  it('bo‘sh/noto‘g‘ri qiymatlarda null', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });
});

describe('normalizeWeightKg', () => {
  it('tonnani kilogrammga o‘giradi', () => {
    expect(normalizeWeightKg(1.5, 'т')).toBe(1500);
    expect(normalizeWeightKg(2, 'tonna')).toBe(2000);
    expect(normalizeWeightKg(20.19, 'т.')).toBe(20190);
  });

  it('grammni kilogrammga o‘giradi', () => {
    expect(normalizeWeightKg(500, 'г')).toBe(0.5);
  });

  it('kg va noma’lum birliklarni o‘zgartirmaydi', () => {
    expect(normalizeWeightKg(23130, 'kg')).toBe(23130);
    expect(normalizeWeightKg(23130, 'кг')).toBe(23130);
    expect(normalizeWeightKg(23130)).toBe(23130);
    expect(normalizeWeightKg(100, 'dona')).toBe(100);
  });

  it('null qiymatda null', () => {
    expect(normalizeWeightKg(null, 'т')).toBeNull();
  });
});

describe('normalizeInvoiceNumber', () => {
  it('№/probel/registr/boshidagi nollarni olib tashlaydi', () => {
    expect(normalizeInvoiceNumber('№ 015')).toBe('15');
    expect(normalizeInvoiceNumber('#15')).toBe('15');
    expect(normalizeInvoiceNumber('INV-15')).toBe('inv-15');
    expect(normalizeInvoiceNumber('  15  ')).toBe('15');
  });

  it('bo‘sh qiymatda bo‘sh string', () => {
    expect(normalizeInvoiceNumber(null)).toBe('');
    expect(normalizeInvoiceNumber('')).toBe('');
  });
});

describe('normalizeCurrency', () => {
  it('turli yozuvlarni ISO kodga keltiradi', () => {
    expect(normalizeCurrency('USD')).toBe('USD');
    expect(normalizeCurrency('долл. США')).toBe('USD');
    expect(normalizeCurrency('$')).toBe('USD');
    expect(normalizeCurrency('у.е.')).toBe('USD');
    expect(normalizeCurrency('евро')).toBe('EUR');
    expect(normalizeCurrency('руб')).toBe('RUB');
    expect(normalizeCurrency("so'm")).toBe('UZS');
    expect(normalizeCurrency('сум')).toBe('UZS');
  });

  it('3 harfli noma’lum kodni uppercase qiladi', () => {
    expect(normalizeCurrency('gbp')).toBe('GBP');
  });

  it('tushunarsiz qiymatda null', () => {
    expect(normalizeCurrency('')).toBeNull();
    expect(normalizeCurrency(null)).toBeNull();
  });
});
