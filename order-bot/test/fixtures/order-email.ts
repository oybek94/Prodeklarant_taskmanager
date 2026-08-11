/**
 * Haqiqiy X5/RVI zakaz xatining tuzilishi.
 *
 * Sarlavhalar va qiymatlar 2026-08-11 dagi haqiqiy xatdan olingan
 * (RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3). Bo'sh kataklar aynan o'z
 * o'rnida qoldirilgan — parser ularni surib yubormasligini tekshirish uchun.
 */

export const HEADERS = [
  'Customer / Заказчик',
  'Category / Категория',
  'Order # / № заказа',
  'Contract number / Номер контракта',
  'Supplier / Поставщик',
  'PLU',
  'Product (in Russian) / Товар(на русском)',
  'Product (in English) / Товар (на английском)',
  'Alcohol specification number / Номер алкогольной спецификации',
  'Variety / Сорт',
  'Class/<br>Класс',
  'Bar code/<br>Бар код',
  'Country of origin / Страна происхождения',
  'Exporting country/ Страна отправления',
  'Size / Калибр',
  'Packing material /Материал упаковки',
  'Packaging type / Тип укладки',
  'Quantum / Квант',
  'Boxes per pallet / Коробок на паллете',
  'Quantity of pallets /Кол-во паллет',
  'Quantity of boxes / Кол-во коробок',
  'Net weight / Вес нетто',
  'Gross weight/ Вес брутто',
  'Ordered volume / Заказанный объем',
  'Unit / Единица',
  'Price / цена за ед.',
  'Currency / Валюта',
  'Terms of delivery /Условия поставки',
  'Warehouse /Склад',
  'Warehouse address /Адрес склада',
  'Mode of transport / Способ доставки',
  'Unit/ Единица',
  'Containers/<br>trucks',
  'Week of loading /Неделя погрузки',
  'Week of arrival /Неделя прихода',
  'ETD (планируемая дата выхода)',
  'ETA (планируемая дата прихода)',
  'ETA DC / РЦ',
  'Note / Комментарии КМ',
  'Promo / Промо',
  'Minimum shelf-life of the goods (from the delivery date) / Минимальный срок годности (хранения) товара (с даты поставки)',
  'Place of shipment / Место отгрузки',
  'ГСЖ, с',
  'ГСЖ, по',
];

export const ROW_GRAPES = [
  'DSC',
  'F4',
  'RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3',
  'RVI-N20-VPR-270625 of 2025-07-04',
  'OOO "VOSTOCHNIY PRODUKT"',
  '3644102',
  'ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг',
  '', // Product (in English) — bo'sh
  '', // Номер алкогольной спецификации — bo'sh
  "Ladies' finger",
  '1',
  '', // Бар код — bo'sh
  'Uzbekistan',
  'Uzbekistan',
  '14mm+',
  'plastic',
  'loose',
  '5.0',
  '121.00',
  '33.0',
  '4000.0',
  '20000.0',
  '21000.0',
  '20000.0',
  'kg',
  '1.41000',
  'EUR',
  'DAP',
  'HUB Pulkovo',
  'Ленинградская обл., Ломоносовский р-он, промзона «Горелово», Волхонское шоссе, квартал 1, дом 11 Б.',
  'truck',
  'kg',
  '1',
  '32',
  '33',
  '08.08.2026',
  '16.08.2026',
  '19.08.2026',
  '', // Комментарии КМ — bo'sh
  '', // Промо — bo'sh
  '', // Минимальный срок годности — bo'sh
  'FERGANA',
  '08.08.2026',
  '07.09.2026',
];

/** Ikkinchi pozitsiya: boshqa tovar, o'sha zakaz raqami. */
export const ROW_MELON = ROW_GRAPES.map((cell, index) => {
  const overrides: Record<number, string> = {
    5: '3644103',
    6: 'ДСК Дыня ТОРПЕДА 1кг',
    9: 'Torpeda',
    14: '20mm+',
    25: '0.98000',
    35: '09.08.2026',
    36: '17.08.2026',
  };
  return overrides[index] ?? cell;
});

const cell = (content: string) =>
  `<td style="border:1px solid #ccc;padding:4px"><b>${content || '&nbsp;'}</b></td>`;

/**
 * Zakaz jadvalini haqiqiy xatga o'xshash HTML ichiga o'raydi:
 * tashqi layout jadvali, boilerplate matn va oxirida tugmalar qatori.
 */
export const buildOrderEmailHtml = (rows: string[][]): string => `
<html><body>
  <table width="100%"><tr><td>
    <p>Добрый день!</p>
    <p>1. ORDER CONFIRMATION<br>Please confirm the order only after a complete verification.</p>

    <table border="1" cellspacing="0">
      <tbody>
        <tr>${HEADERS.map(cell).join('')}</tr>
        ${rows.map((row) => `<tr>${row.map(cell).join('')}</tr>`).join('\n        ')}
      </tbody>
    </table>

    <p><a href="https://impulse.x5.ru/email-api/accept-supply-order?id=414703">confirm order</a>
       <a href="https://impulse.x5.ru/email-api/reject-supply-order?id=414703">reject order</a></p>
  </td></tr></table>
</body></html>`;

/** Jadvali yo'q oddiy xat. */
export const PLAIN_EMAIL_HTML = `
<html><body>
  <p>Добрый день!</p>
  <p>Документы во вложении.</p>
  <table><tr><td>С уважением,</td></tr><tr><td>СП ООО «Vostochniy Produkt»</td></tr></table>
</body></html>`;
