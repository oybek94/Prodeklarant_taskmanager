import { describe, it, expect } from 'vitest';
import { withMainTariff, MAIN_TARIFF_ROW } from './tariffs';

describe('withMainTariff', () => {
  it('birinchi qator narxini yangilaydi, nom va birlikni saqlaydi', () => {
    const rows = withMainTariff([{ name: 'Электрон БЮД', unit: '1 БЮД', bhm: 3 }], '2');
    expect(rows).toEqual([{ name: 'Электрон БЮД', unit: '1 БЮД', bhm: 2 }]);
  });

  it('qolgan qatorlarga tegmaydi', () => {
    const rows = withMainTariff(
      [
        { name: 'Электрон БЮД', unit: '1 БЮД', bhm: 3 },
        { name: 'СТ-1', unit: '1 ариза', bhm: 1.5 },
      ],
      '2',
    );
    expect(rows[1]).toEqual({ name: 'СТ-1', unit: '1 ариза', bhm: 1.5 });
  });

  it('jadval bo\'sh bo\'lsa asosiy qatorni yaratadi', () => {
    expect(withMainTariff([], '2')).toEqual([{ ...MAIN_TARIFF_ROW, bhm: 2 }]);
  });

  it('raqam bo\'lmagan qiymatda 0 qo\'yadi', () => {
    expect(withMainTariff([], '')[0].bhm).toBe(0);
    expect(withMainTariff([], 'abc')[0].bhm).toBe(0);
  });

  it('kasrli qiymatni saqlaydi', () => {
    expect(withMainTariff([], '2.5')[0].bhm).toBe(2.5);
  });
});
