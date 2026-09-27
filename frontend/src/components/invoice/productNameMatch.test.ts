import { describe, expect, it } from 'vitest';
import { findClosestProductName, sharesCoreWord } from './productNameMatch';
import { resolveImportedProductDefaults } from './useCargoImport';
import type { SpecRow } from './types';

const SPEC_NAMES = [
  'Персики свежие',
  'Виноград свежий столовых сортов',
  'Томаты свежие',
  'Груши свежие',
];

describe('findClosestProductName', () => {
  it('umumiy tur so\'zi bo\'yicha topadi, nav nomi xalaqit bermaydi', () => {
    expect(findClosestProductName('Виноград Тайфи свежий', SPEC_NAMES)).toBe(
      'Виноград свежий столовых сортов'
    );
  });

  it('birlik/ko\'plik va rod farqini mos deb biladi', () => {
    expect(findClosestProductName('Персик свежий', SPEC_NAMES)).toBe('Персики свежие');
    expect(findClosestProductName('Томат', SPEC_NAMES)).toBe('Томаты свежие');
    expect(findClosestProductName('Груша Конференция', SPEC_NAMES)).toBe('Груши свежие');
  });

  it('faqat "свежий" mos kelishi yetarli emas', () => {
    expect(findClosestProductName('Нектарины свежие', SPEC_NAMES)).toBeNull();
  });

  it('bir turdagi variantlardan descriptor bo\'yicha to\'g\'risini tanlaydi', () => {
    const names = ['Виноград сушеный', 'Виноград свежий столовых сортов'];
    expect(findClosestProductName('Виноград Тайфи свежий', names)).toBe(
      'Виноград свежий столовых сортов'
    );
    expect(findClosestProductName('Виноград сушёный', names)).toBe('Виноград сушеный');
  });

  it('teng holatda ro\'yxatda oldin turganini oladi', () => {
    expect(findClosestProductName('Виноград Тайфи', ['Виноград А', 'Виноград Б'])).toBe('Виноград А');
  });
});

describe('sharesCoreWord', () => {
  it('umumiy tur so\'zini aniqlaydi', () => {
    expect(sharesCoreWord('Виноград Тайфи свежий', 'Виноград свежий столовых сортов')).toBe(true);
    expect(sharesCoreWord('Нектарины свежие', 'Персики свежие')).toBe(false);
  });
});

describe('resolveImportedProductDefaults', () => {
  const spec: SpecRow[] = [
    { productName: 'Виноград свежий столовых сортов', tnvedCode: '0806101090', unitPrice: 1.2 },
    { productName: 'Персики свежие', tnvedCode: '0809300000', unitPrice: 0.9 },
  ];

  it('nom o\'zgarmay, kod spetsifikatsiyadagi mos nomdan olinadi', () => {
    expect(resolveImportedProductDefaults('Виноград Тайфи свежий', null, [], spec, [])).toEqual({
      tnvedCode: '0806101090',
      unitPrice: 1.2,
    });
  });

  it('matndagi nom aynan bazada bo\'lsa o\'sha ustun', () => {
    const options = [{ name: 'Виноград Тайфи свежий', code: '0806101010' }];
    expect(resolveImportedProductDefaults('Виноград Тайфи свежий', null, options, spec, []).tnvedCode).toBe(
      '0806101010'
    );
  });

  it('umumiy so\'zi bo\'lmagan tovarga faqat AI tavsiyasi bilan kod beradi', () => {
    expect(resolveImportedProductDefaults('Помидоры', null, [], spec, [])).toEqual({});
    const withTomato: SpecRow[] = [...spec, { productName: 'Томаты свежие', tnvedCode: '0702000000' }];
    expect(resolveImportedProductDefaults('Помидоры', 'Томаты свежие', [], withTomato, []).tnvedCode).toBe(
      '0702000000'
    );
  });

  it('global TNVED kodi spetsifikatsiya kodidan ustun', () => {
    const global = [{ name: 'Виноград свежий столовых сортов', code: '0806101099' }];
    expect(resolveImportedProductDefaults('Виноград Тайфи свежий', null, [], spec, global).tnvedCode).toBe(
      '0806101099'
    );
  });
});
