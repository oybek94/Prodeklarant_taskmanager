import { describe, expect, it } from 'vitest';
import { formatOrderMessage } from '../src/format/message.js';
import { extractOrderPositions, type OrderPosition } from '../src/parse/table.js';
import { buildOrderEmailHtml, ROW_GRAPES, ROW_MELON } from './fixtures/order-email.js';

const positionsFrom = (rows: string[][]): OrderPosition[] => {
  const result = extractOrderPositions(buildOrderEmailHtml(rows));
  if (result.status !== 'ok') throw new Error(`kutilmagan holat: ${result.status}`);
  return result.positions;
};

describe('formatOrderMessage', () => {
  it('bitta pozitsiyani so\'ralgan ko\'rinishda formatlaydi', () => {
    const [message] = formatOrderMessage(positionsFrom([ROW_GRAPES]));

    expect(message).toBe(
      [
        'Поставщик: OOO "VOSTOCHNIY PRODUKT"',
        '№ заказа: RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3',
        'Товар: ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг',
        'PLU: 3644102',
        'Калибр: 14mm+',
        'Цена: 1.41000 EUR',
        'Склад: HUB Pulkovo',
        'Адрес склада: Ленинградская обл., Ломоносовский р-он, промзона «Горелово», Волхонское шоссе, квартал 1, дом 11 Б.',
        'Дата выхода: 08.08.2026',
        'Дата прихода: 16.08.2026',
      ].join('\n'),
    );
  });

  it('ikki pozitsiyani raqamlab, umumiy sarlavhani bir marta yozadi', () => {
    const messages = formatOrderMessage(positionsFrom([ROW_GRAPES, ROW_MELON]));
    expect(messages).toHaveLength(1);
    const message = messages[0]!;

    // Поставщик va № заказа bir xil — yuqorida bir marta.
    expect(message.match(/Поставщик:/g)).toHaveLength(1);
    expect(message.match(/№ заказа:/g)).toHaveLength(1);

    expect(message).toContain('\n1.\nТовар: ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг');
    expect(message).toContain('\n2.\nТовар: ДСК Дыня ТОРПЕДА 1кг');
    expect(message).toContain('Цена: 0.98000 EUR');

    expect(message.indexOf('1.')).toBeLessThan(message.indexOf('2.'));
  });

  it('zakaz raqami har xil bo\'lsa sarlavhani har blok ichiga ko\'chiradi', () => {
    const otherOrder = ROW_MELON.map((cellValue, index) =>
      index === 2 ? 'RVI-2026-32-34-VPR-3644103-HUBPLK-DSC_9' : cellValue,
    );
    const message = formatOrderMessage(positionsFrom([ROW_GRAPES, otherOrder]))[0]!;

    expect(message.match(/№ заказа:/g)).toHaveLength(2);
    expect(message).toContain('RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3');
    expect(message).toContain('RVI-2026-32-34-VPR-3644103-HUBPLK-DSC_9');
  });

  it("bo'sh maydonni '—' bilan ko'rsatadi", () => {
    const noSize = ROW_GRAPES.map((cellValue, index) => (index === 14 ? '' : cellValue));
    const message = formatOrderMessage(positionsFrom([noSize]))[0]!;

    expect(message).toContain('Калибр: —');
    expect(message).toContain('Цена: 1.41000 EUR');
  });

  it("valyuta bo'sh bo'lsa narxni yolg'iz yozadi", () => {
    const noCurrency = ROW_GRAPES.map((cellValue, index) => (index === 26 ? '' : cellValue));
    const message = formatOrderMessage(positionsFrom([noCurrency]))[0]!;

    expect(message).toContain('Цена: 1.41000\n');
  });

  it('juda ko\'p pozitsiyani bir nechta xabarga bo\'ladi', () => {
    const many = Array.from({ length: 40 }, () => ROW_GRAPES);
    const messages = formatOrderMessage(positionsFrom(many));

    expect(messages.length).toBeGreaterThan(1);
    for (const message of messages) {
      expect(message.length).toBeLessThanOrEqual(3900);
    }
    // Sarlavha har bir xabarda takrorlanadi — kontekst yo'qolmasligi uchun.
    for (const message of messages) {
      expect(message).toContain('№ заказа:');
    }
  });

  it("pozitsiya yo'q bo'lsa xabar yaratmaydi", () => {
    expect(formatOrderMessage([])).toEqual([]);
  });
});
