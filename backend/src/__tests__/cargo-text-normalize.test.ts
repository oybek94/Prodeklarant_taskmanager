import { describe, expect, it } from 'vitest';
import { normalizeCargoExtraction, normalizeVehicleNumber } from '../ai/cargo-text.normalize';
import type { CargoTextExtraction } from '../ai/cargo-text.schema';

const RAW_TEXT = `Номер инвойса: DAT-61

Номер ТС: Е200ЕЕ164/АУ699164

Год урожая: 2026

Экспортер: OOO ALL RETAIL PLUS
Изготовитель: ООО TK GARDENS AND FRUITS
Клиент: ТД ДОКТОР АППЕТИТ

1139/26-Msc

DAP Москва

Виноград Тайфи свежий, вес
PLU: 7290
3 539 пласт ящик
18 300 нетто
19 860 брутто
33 паллет х 15 кг
Цена $1.15
Квант 5.17
Калибр 16+

В упаковочный лист:
Серийный номер датчика -
`;

const aiResult = (overrides: Partial<CargoTextExtraction>): CargoTextExtraction => ({
  invoice_number: 'DAT-61',
  invoice_date: null,
  vehicle_number: null,
  harvest_year: '2026',
  order_number: '1139/26-Msc',
  delivery_terms: null,
  customs_address: null,
  destination: null,
  extra_fields: [],
  packing_fields: [],
  products: [],
  ...overrides,
});

describe('normalizeVehicleNumber', () => {
  it('kirillcha harflarni saqlaydi', () => {
    expect(normalizeVehicleNumber('Е200ЕЕ164/АУ699164')).toBe('Е200ЕЕ164/АУ699164');
  });

  it('ortiqcha "|" va probellarni olib tashlaydi', () => {
    expect(normalizeVehicleNumber('40|202GCA / 40|6509BA')).toBe('40202GCA/406509BA');
  });
});

describe('normalizeCargoExtraction', () => {
  it('Номер ТС matndagidek olinadi — AI lotinchaga o\'girgan bo\'lsa ham', () => {
    const result = normalizeCargoExtraction(aiResult({ vehicle_number: 'E200EE164/AY699164' }), RAW_TEXT);
    expect(result.vehicle_number).toBe('Е200ЕЕ164/АУ699164');
  });

  it('Номер ТС qatori bo\'lmasa AI qiymati tozalanib qoladi', () => {
    const result = normalizeCargoExtraction(aiResult({ vehicle_number: '40|202GCA' }), 'Номер инвойса: 1');
    expect(result.vehicle_number).toBe('40202GCA');
  });

  it('Экспортер / Изготовитель / Клиент hech qayerga tushmaydi', () => {
    const result = normalizeCargoExtraction(
      aiResult({
        extra_fields: [
          { label: 'Экспортер', value: 'OOO ALL RETAIL PLUS' },
          { label: 'Изготовитель', value: 'ООО TK GARDENS AND FRUITS' },
          // AI boshqa yorliq qo'ygan holat — qiymati bo'yicha tanib olinadi
          { label: 'Покупатель', value: 'ТД ДОКТОР АППЕТИТ' },
          { label: 'Код заказа', value: 'X-1' },
        ],
        packing_fields: [
          { label: 'Серийный номер датчика', value: '' },
          { label: 'Клиент', value: 'ТД ДОКТОР АППЕТИТ' },
        ],
      }),
      RAW_TEXT
    );
    expect(result.extra_fields).toEqual([{ label: 'Код заказа', value: 'X-1' }]);
    expect(result.packing_fields).toEqual([{ label: 'Серийный номер датчика', value: '' }]);
  });
});
