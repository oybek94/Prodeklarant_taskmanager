import { describe, it, expect } from 'vitest';
import {
  weightsMatch,
  countsMatch,
  moneyMatch,
  invoiceNumbersMatch,
  productNamesMatch,
  companiesMatch,
  datesMatch,
  dateNotBefore,
  extractCompanyName,
} from '../ai/matchers';

describe('weightsMatch', () => {
  it('aniq tenglikni qabul qiladi', () => {
    expect(weightsMatch(23130, 23130)).toBe(true);
  });

  it('0.5% ichidagi farqni kechiradi (yaxlitlash)', () => {
    expect(weightsMatch(23130, 23131)).toBe(true);
    expect(weightsMatch(23130, 23245)).toBe(true); // ~0.5%
  });

  it('kichik og‘irliklarda 1 kg mutlaq tolerantlik', () => {
    expect(weightsMatch(10, 11)).toBe(true);
    expect(weightsMatch(10, 12)).toBe(false);
  });

  it('katta farqni rad etadi', () => {
    expect(weightsMatch(23130, 23300)).toBe(false);
    expect(weightsMatch(20190, 20.19)).toBe(false); // tonna-vs-kg xatosi ushlanadi
  });
});

describe('countsMatch', () => {
  it('butun son tengligi', () => {
    expect(countsMatch(3670, 3670)).toBe(true);
    expect(countsMatch(3670, 3671)).toBe(false);
  });
});

describe('moneyMatch', () => {
  it('0.1% ichidagi farqni kechiradi', () => {
    expect(moneyMatch(13232.8, 13232.8)).toBe(true);
    expect(moneyMatch(13232.8, 13232.81)).toBe(true);
    expect(moneyMatch(13232.8, 13240)).toBe(true); // ~0.05%
  });

  it('katta farqni rad etadi', () => {
    expect(moneyMatch(13232.8, 13300)).toBe(false);
    expect(moneyMatch(13232.8, 1323.28)).toBe(false);
  });
});

describe('invoiceNumbersMatch', () => {
  it('№/registr/nol farqlarini kechiradi', () => {
    expect(invoiceNumbersMatch('№ 015', '15')).toBe(true);
    expect(invoiceNumbersMatch('INV-15', 'inv-15')).toBe(true);
    expect(invoiceNumbersMatch('15', '16')).toBe(false);
  });
});

describe('productNamesMatch', () => {
  it('aniq va containment mosliklarni topadi', () => {
    expect(productNamesMatch('Хурма свежая', 'Хурма свежая')).toBe(true);
    expect(productNamesMatch('Хурма свежая сорт Королёк', 'Хурма свежая')).toBe(true);
  });

  it('token-Jaccard chegarasida ishlaydi', () => {
    // 3 tokendan 2 tasi umumiy: J = 2/4 = 0.5 < 0.6 → mos emas
    expect(productNamesMatch('Хурма свежая Королёк', 'Хурма сушёная Королёк')).toBe(false);
    // 4 tokendan 3 tasi umumiy: J = 3/5 = 0.6 → mos
    expect(
      productNamesMatch('Хурма свежая сорт Королёк', 'Хурма спелая сорт Королёк')
    ).toBe(true);
  });

  it('butunlay boshqa nomlarni rad etadi', () => {
    expect(productNamesMatch('Хурма свежая', 'Лимон свежий')).toBe(false);
  });
});

describe('companiesMatch', () => {
  it('qo‘shtirnoq ichidagi nomni ustuvor oladi', () => {
    expect(extractCompanyName('ООО "Фрукт Сервис", г. Москва')).toBe('фрукт сервис');
    expect(companiesMatch('ООО "Фрукт Сервис", г. Москва, ул. Ленина 1', 'Фрукт Сервис')).toBe(
      true
    );
  });

  it('manzil shovqinini kechiradi', () => {
    expect(
      companiesMatch('URGANCH FRUITS Республика Узбекистан Хорезмская область', 'URGANCH FRUITS')
    ).toBe(true);
  });

  it('boshqa kompaniyani rad etadi', () => {
    expect(companiesMatch('URGANCH FRUITS', 'TASHKENT MEVA')).toBe(false);
  });
});

describe('datesMatch', () => {
  it('format farqidan mustaqil taqqoslaydi', () => {
    expect(datesMatch('2026-01-15', '15.01.2026')).toBe(true);
    expect(datesMatch('17 октября 2025 г.', '2025-10-17')).toBe(true);
    expect(datesMatch('2026-01-15', '16.01.2026')).toBe(false);
  });

  it('parse bo‘lmasa string tengligiga qaytadi', () => {
    expect(datesMatch('noma’lum', 'noma’lum')).toBe(true);
    expect(datesMatch('noma’lum', 'boshqa')).toBe(false);
  });
});

describe('dateNotBefore', () => {
  it('sana tartibini format farqidan mustaqil tekshiradi', () => {
    expect(dateNotBefore('20.01.2026', '2026-01-15')).toBe(true);
    expect(dateNotBefore('10.01.2026', '2026-01-15')).toBe(false);
    expect(dateNotBefore('2026-01-15', '2026-01-15')).toBe(true);
  });

  it('parse bo‘lmasa xato ko‘tarmaydi (true)', () => {
    expect(dateNotBefore('noma’lum', '2026-01-15')).toBe(true);
  });
});
