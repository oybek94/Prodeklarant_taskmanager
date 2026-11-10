import { describe, it, expect } from 'vitest';
import { Contract, PowerOfAttorney } from '@prisma/client';
import {
  cityFromAddress,
  driverDetailsSchema,
  pinflSchema,
  ruDateParts,
  validUntilParts,
} from '../services/power-of-attorney';
import { generatePowerOfAttorneyPdf } from '../services/power-of-attorney-pdf';

// Diqqat: bu yerda faqat o'ydirma qiymatlar — haqiqiy JSHSHIR/pasport repoga yozilmaydi

describe('cityFromAddress', () => {
  it('manzildan shaharni oladi', () => {
    expect(cityFromAddress('Ферганская область, г. Фергана, ул. Мустакиллик, 1')).toBe('Фергана');
    expect(cityFromAddress('г.Фергана, ул. Ленина')).toBe('Фергана');
    expect(cityFromAddress('город Маргилан, махалля Х')).toBe('Маргилан');
  });

  it('topilmasa null qaytaradi', () => {
    expect(cityFromAddress('Fergana region, Margilan')).toBeNull();
    expect(cityFromAddress('')).toBeNull();
  });
});

describe('sana yordamchilari', () => {
  it('Toshkent kuni bo\'yicha rus oy nomi', () => {
    // 2026-11-09 20:30 UTC = 2026-11-10 01:30 Toshkent
    expect(ruDateParts(new Date('2026-11-09T20:30:00Z'))).toEqual({ day: '10', monthName: 'ноября', year: 2026 });
  });

  it('amal qilish muddati — invoys yilining 31 dekabri', () => {
    expect(validUntilParts(new Date('2026-11-10T00:00:00Z'))).toEqual({ day: '31', monthName: 'декабря', year: 2026 });
  });
});

describe('validatsiya', () => {
  it('JSHSHIR aynan 14 ta raqam', () => {
    expect(pinflSchema.safeParse('12345678901234').success).toBe(true);
    expect(pinflSchema.safeParse('1234567890123').success).toBe(false);
    expect(pinflSchema.safeParse('1234567890123A').success).toBe(false);
  });

  it('otasining ismi ixtiyoriy', () => {
    const parsed = driverDetailsSchema.safeParse({
      pinfl: '12345678901234',
      lastName: 'ИВАНОВ',
      firstName: 'ИВАН',
      passport: 'AA0000000',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.patronymic).toBe('');
  });
});

describe('generatePowerOfAttorneyPdf', () => {
  const record = {
    sequence: 3,
    pinfl: '12345678901234',
    lastName: 'ИВАНОВ',
    firstName: 'ИВАН',
    patronymic: 'ҚОДИР ЎҒЛИ',
    passport: 'AA0000000',
  } as PowerOfAttorney;

  const exporter = {
    name: 'ООО "TEST COMPANY"',
    address: 'Ферганская область, г. Фергана, ул. Мустакиллик, 1',
    inn: '300000000',
    bankName: 'АКБ «Тест»',
    bankAccount: '20208000000000000001',
    swift: '',
    mfo: '00000',
    details: '',
    phone: '+998 00 000 00 00',
    email: 'info@example.test',
    director: 'Иванов И. И.',
  };

  it('PDF qaytaradi (imzo, muhr va logosiz ham)', async () => {
    const buffer = await generatePowerOfAttorneyPdf({
      record,
      exporter,
      exporterInn: '300000000',
      contract: null as Contract | null,
      issueDate: new Date('2026-11-10T00:00:00Z'),
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it('direktor va shahar topilmasa ham yiqilmaydi', async () => {
    const buffer = await generatePowerOfAttorneyPdf({
      record,
      exporter: { ...exporter, director: '', address: '' },
      exporterInn: '300000000',
      contract: null,
      issueDate: new Date('2026-11-10T00:00:00Z'),
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
