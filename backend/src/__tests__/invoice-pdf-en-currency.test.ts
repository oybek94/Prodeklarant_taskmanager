import { describe, it, expect } from 'vitest';
import { numberToWordsEn } from '../services/invoice-pdf-en';

describe('numberToWordsEn — currency wording', () => {
  it('EUR: Euros + eurocents', () => {
    expect(numberToWordsEn(22929.76, 'EUR')).toBe(
      'Twenty-two thousand nine hundred twenty-nine Euros 76 eurocents'
    );
  });

  it('EUR: singular Euro', () => {
    expect(numberToWordsEn(1, 'EUR')).toBe('One Euro');
  });

  it('USD: US Dollars + cents', () => {
    expect(numberToWordsEn(1.5, 'USD')).toBe('One US Dollar 50 cents');
    expect(numberToWordsEn(5, 'USD')).toBe('Five US Dollars');
  });

  it('RUB: Rubles + kopecks', () => {
    expect(numberToWordsEn(2, 'RUB')).toBe('Two Rubles');
    expect(numberToWordsEn(2.03, 'RUB')).toBe('Two Rubles 3 kopecks');
  });

  it('UZS va noma\'lum valyuta: Sums + tiyin (default)', () => {
    expect(numberToWordsEn(3, 'UZS')).toBe('Three Sums');
    expect(numberToWordsEn(3, '')).toBe('Three Sums');
  });

  it('kichik harfli valyuta ham ishlaydi (case-insensitive)', () => {
    expect(numberToWordsEn(1, 'eur')).toBe('One Euro');
  });

  it('nol', () => {
    expect(numberToWordsEn(0, 'EUR')).toBe('zero');
  });
});
