import { describe, it, expect } from 'vitest';
import {
  checkItemsTare,
  computeTarePerPackage,
  findTareRange,
  isTareInRange,
  normalizePackagingName,
  suggestPackagingTypes,
  TareCheckItem,
  TareRange,
} from '../services/packaging-tare';

/* ===================== FIXTURES ===================== */

/** Migratsiyada seed qilinadigan standart diapazonlar */
const TYPES: TareRange[] = [
  { name: 'дер.ящик', tareMin: 0.8, tareMax: 2.0 },
  { name: 'пласт.ящик', tareMin: 0.3, tareMax: 0.7 },
  { name: 'мешки', tareMin: 0.01, tareMax: 0.1 },
  { name: 'картон.короб.', tareMin: 0.3, tareMax: 2.5 },
  { name: 'навалом', tareMin: 0, tareMax: 0 },
];

/** Tara = (gross - net) / packagesCount bo'ladigan qator yasaydi */
function makeItem(overrides: Partial<TareCheckItem> = {}): TareCheckItem {
  return {
    name: 'Olcha',
    packageType: 'дер.ящик',
    packagesCount: 100,
    grossWeight: 1120, // tara = (1120 - 1000) / 100 = 1.2
    netWeight: 1000,
    ...overrides,
  };
}

/* ===================== computeTarePerPackage ===================== */

describe('computeTarePerPackage', () => {
  it('bir qadoq tarasini hisoblaydi', () => {
    expect(computeTarePerPackage(1120, 1000, 100)).toBe(1.2);
  });

  it('qadoq soni 0 yoki manfiy bo\'lsa null', () => {
    expect(computeTarePerPackage(1120, 1000, 0)).toBeNull();
    expect(computeTarePerPackage(1120, 1000, -5)).toBeNull();
  });

  it('og\'irliklar bo\'sh bo\'lsa null (nolga bo\'lish yo\'q)', () => {
    expect(computeTarePerPackage(null, 1000, 100)).toBeNull();
    expect(computeTarePerPackage(1120, undefined, 100)).toBeNull();
    expect(computeTarePerPackage(1120, 1000, null)).toBeNull();
    expect(computeTarePerPackage('', '', '')).toBeNull();
  });

  it('matn ko\'rinishidagi raqamlarni qabul qiladi', () => {
    expect(computeTarePerPackage('1120', '1000', '100')).toBe(1.2);
  });

  it('suzuvchi nuqta chiqindisini yaxlitlaydi', () => {
    // (10.1 - 10) / 3 = 0.03333...
    expect(computeTarePerPackage(10.1, 10, 3)).toBe(0.033);
  });
});

/* ===================== nom normalizatsiyasi ===================== */

describe('normalizePackagingName / findTareRange', () => {
  it('registr va bo\'sh joylarni e\'tiborsiz qoldiradi', () => {
    expect(normalizePackagingName('  Пласт. Ящик ')).toBe('пласт.ящик');
  });

  it('nomni normallashtirib diapazon topadi', () => {
    expect(findTareRange('  ДЕР.ЯЩИК ', TYPES)?.tareMin).toBe(0.8);
  });

  it('noma\'lum tur uchun null', () => {
    expect(findTareRange('бочка', TYPES)).toBeNull();
    expect(findTareRange('', TYPES)).toBeNull();
  });
});

/* ===================== isTareInRange ===================== */

describe('isTareInRange', () => {
  const der = TYPES[0]; // 0.8 – 2.0
  const navalom = TYPES[4]; // 0 – 0

  it('oraliq ichida true, tashqarisida false', () => {
    expect(isTareInRange(1.2, der)).toBe(true);
    expect(isTareInRange(0.5, der)).toBe(false);
    expect(isTareInRange(2.6, der)).toBe(false);
  });

  it('chegaralarni o\'z ichiga oladi', () => {
    expect(isTareInRange(0.8, der)).toBe(true);
    expect(isTareInRange(2.0, der)).toBe(true);
  });

  it('навалом (0/0) uchun tara aniq nol bo\'lishi kerak', () => {
    expect(isTareInRange(0, navalom)).toBe(true);
    expect(isTareInRange(0.5, navalom)).toBe(false);
  });

  it('diapazon belgilanmagan bo\'lsa har doim true', () => {
    expect(isTareInRange(99, { name: 'бочка', tareMin: null, tareMax: null })).toBe(true);
    expect(isTareInRange(99, { name: 'yarim', tareMin: 0.5, tareMax: null })).toBe(true);
    expect(isTareInRange(99, null)).toBe(true);
  });
});

/* ===================== suggestPackagingTypes ===================== */

describe('suggestPackagingTypes', () => {
  it('tara mos keladigan turlarni qaytaradi, tanlanganini chiqarib tashlaydi', () => {
    // 1.2 kg: дер.ящик (0.8–2) va картон.короб. (0.3–2.5) ga to'g'ri keladi
    const s = suggestPackagingTypes(1.2, TYPES, 'пласт.ящик');
    expect(s).toContain('дер.ящик');
    expect(s).toContain('картон.короб.');
    expect(s).not.toContain('пласт.ящик');
    expect(s).not.toContain('мешки');
  });

  it('tanlangan turni normallashtirib chiqarib tashlaydi', () => {
    expect(suggestPackagingTypes(1.2, TYPES, '  ДЕР.ЯЩИК ')).not.toContain('дер.ящик');
  });

  it('hech qaysi turga mos kelmasa bo\'sh ro\'yxat', () => {
    expect(suggestPackagingTypes(50, TYPES, 'дер.ящик')).toEqual([]);
  });

  it('diapazonsiz turlarni taklif qilmaydi', () => {
    const withUnknown = [...TYPES, { name: 'бочка', tareMin: null, tareMax: null }];
    expect(suggestPackagingTypes(1.2, withUnknown, 'пласт.ящик')).not.toContain('бочка');
  });
});

/* ===================== checkItemsTare — asosiy stsenariy ===================== */

describe('checkItemsTare', () => {
  it('taxta yashik пласт.ящик deb belgilangan — ogohlantiradi va дер.ящик ni taklif qiladi', () => {
    // Foydalanuvchi aytgan asosiy xato: tara 1.2 kg, lekin karzinka tanlangan
    const warnings = checkItemsTare([makeItem({ packageType: 'пласт.ящик' })], TYPES);

    expect(warnings).toHaveLength(1);
    const w = warnings[0];
    expect(w.rowIndex).toBe(0);
    expect(w.packageType).toBe('пласт.ящик');
    expect(w.tarePerPkg).toBe(1.2);
    expect(w.expectedMin).toBe(0.3);
    expect(w.expectedMax).toBe(0.7);
    expect(w.suggestions).toContain('дер.ящик');
    expect(w.message).toContain('1-qatordagi tovar (Olcha)');
    expect(w.message).toContain('1.2 kg');
    expect(w.message).toContain('дер.ящик');
  });

  it('tara oraliq ichida bo\'lsa ogohlantirish yo\'q', () => {
    expect(checkItemsTare([makeItem({ packageType: 'дер.ящик' })], TYPES)).toEqual([]);
  });

  it('навалом tara 0 — OK, tara 0.5 — ogohlantirish', () => {
    const ok = checkItemsTare(
      [makeItem({ packageType: 'навалом', grossWeight: 1000, netWeight: 1000 })],
      TYPES
    );
    expect(ok).toEqual([]);

    const bad = checkItemsTare(
      [makeItem({ packageType: 'навалом', grossWeight: 1050, netWeight: 1000 })],
      TYPES
    );
    expect(bad).toHaveLength(1);
    expect(bad[0].message).toContain('qadoqsiz yuk');
    expect(bad[0].message).toContain("tara 0 bo'lishi kerak");
  });

  it('diapazoni yo\'q tur hech qachon ogohlantirmaydi', () => {
    const types = [...TYPES, { name: 'бочка', tareMin: null, tareMax: null }];
    expect(checkItemsTare([makeItem({ packageType: 'бочка' })], types)).toEqual([]);
  });

  it('noma\'lum (bazada yo\'q) tur uchun ogohlantirmaydi', () => {
    expect(checkItemsTare([makeItem({ packageType: 'какая-то тара' })], TYPES)).toEqual([]);
  });

  it('qadoq soni yo\'q yoki og\'irlik bo\'sh bo\'lsa ogohlantirmaydi', () => {
    expect(checkItemsTare([makeItem({ packagesCount: 0, quantity: 0 })], TYPES)).toEqual([]);
    expect(checkItemsTare([makeItem({ grossWeight: null })], TYPES)).toEqual([]);
  });

  it('packagesCount yo\'q bo\'lsa quantity ga tushadi', () => {
    const warnings = checkItemsTare(
      [makeItem({ packageType: 'пласт.ящик', packagesCount: null, quantity: 100 })],
      TYPES
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].tarePerPkg).toBe(1.2);
  });

  it('manfiy tara (netto > brutto) bu tekshiruvdan o\'tkazib yuboriladi — uni bloklovchi tekshiruv ushlaydi', () => {
    expect(
      checkItemsTare([makeItem({ grossWeight: 900, netWeight: 1000 })], TYPES)
    ).toEqual([]);
  });

  it('qadoq turi tanlanmagan qatorni o\'tkazib yuboradi', () => {
    expect(checkItemsTare([makeItem({ packageType: '' })], TYPES)).toEqual([]);
    expect(checkItemsTare([makeItem({ packageType: null })], TYPES)).toEqual([]);
  });

  it('bir nechta qatordan faqat shubhalilarini qaytaradi, indeks to\'g\'ri', () => {
    const warnings = checkItemsTare(
      [
        makeItem({ name: 'Olcha', packageType: 'дер.ящик' }), // OK
        makeItem({ name: 'Uzum', packageType: 'пласт.ящик' }), // xato
        makeItem({ name: 'Anor', packageType: 'мешки' }), // xato (tara 1.2 >> 0.1)
      ],
      TYPES
    );
    expect(warnings).toHaveLength(2);
    expect(warnings[0].rowIndex).toBe(1);
    expect(warnings[0].itemName).toBe('Uzum');
    expect(warnings[1].rowIndex).toBe(2);
    expect(warnings[1].message).toContain('3-qatordagi tovar (Anor)');
  });

  it('nomsiz tovar uchun "Nomsiz" ishlatiladi', () => {
    const warnings = checkItemsTare([makeItem({ name: '', packageType: 'пласт.ящик' })], TYPES);
    expect(warnings[0].message).toContain('(Nomsiz)');
  });

  it('bo\'sh kirish uchun bo\'sh natija', () => {
    expect(checkItemsTare([], TYPES)).toEqual([]);
    expect(checkItemsTare([makeItem()], [])).toEqual([]);
  });

  it('taklif topilmasa xabar baribir tushunarli bo\'ladi', () => {
    // tara 50 kg — hech qaysi turga to'g'ri kelmaydi
    const warnings = checkItemsTare(
      [makeItem({ packageType: 'дер.ящик', grossWeight: 6000, netWeight: 1000 })],
      TYPES
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].suggestions).toEqual([]);
    expect(warnings[0].message).toContain("Qadoq turi to'g'ri tanlanganini tekshiring");
  });
});
