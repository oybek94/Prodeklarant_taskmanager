import { describe, it, expect } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from '../config/cors';

describe('parseAllowedOrigins', () => {
  it('prod domeni env bo\'lmasa ham doim ro\'yxatda', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['https://app.prodeklarant.uz']);
  });

  it('env qiymatlarini qo\'shadi, bo\'sh joy va oxirgi / ni tozalaydi, takrorlarni olib tashlaydi', () => {
    expect(parseAllowedOrigins(' http://localhost:5173/ ,https://app.prodeklarant.uz,, ')).toEqual([
      'https://app.prodeklarant.uz',
      'http://localhost:5173',
    ]);
  });
});

describe('isOriginAllowed — production', () => {
  const allowed = parseAllowedOrigins('http://localhost:5173');

  it('o\'z domenimiz ruxsat etiladi', () => {
    expect(isOriginAllowed('https://app.prodeklarant.uz', allowed, true)).toBe(true);
  });

  it('origin\'siz so\'rov (curl, server→server) o\'tadi', () => {
    expect(isOriginAllowed(undefined, allowed, true)).toBe(true);
  });

  it.each([
    'https://evil.example',
    'https://app.prodeklarant.uz.evil.example',
    'http://app.prodeklarant.uz',
    'null',
    'http://localhost:3000',
  ])('begona origin rad etiladi: %s', (origin) => {
    expect(isOriginAllowed(origin, allowed, true)).toBe(false);
  });

  it('env\'da aniq berilgan localhost production\'da ham ishlaydi', () => {
    expect(isOriginAllowed('http://localhost:5173', allowed, true)).toBe(true);
  });
});

describe('isOriginAllowed — development', () => {
  const allowed = parseAllowedOrigins(undefined);

  it('istalgan localhost/127.0.0.1 porti ruxsat etiladi', () => {
    expect(isOriginAllowed('http://localhost:5174', allowed, false)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173', allowed, false)).toBe(true);
  });

  it('localhost\'ga o\'xshagan begona domen rad etiladi', () => {
    expect(isOriginAllowed('http://localhost.evil.example', allowed, false)).toBe(false);
    expect(isOriginAllowed('https://evil.example', allowed, false)).toBe(false);
  });
});
