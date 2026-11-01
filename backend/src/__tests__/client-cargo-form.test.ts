import { describe, it, expect } from 'vitest';
import { formatCargoMessage, parseCount, parseDecimal, parseFieldInput, parseVehicleNumber, splitContractLines } from '../services/client-cargo-form';

describe('parseVehicleNumber', () => {
  it("bo'shliqlarni olib tashlaydi va katta harfga o'tkazadi", () => {
    expect(parseVehicleNumber('40232baa / 402332ba')).toEqual({ ok: true, value: '40232BAA/402332BA' });
  });
  it("bo'sh kiritishni rad etadi", () => {
    expect(parseVehicleNumber('   ').ok).toBe(false);
  });
});

describe('parseCount', () => {
  it('butun sonni qabul qiladi', () => {
    expect(parseCount(' 120 ')).toEqual({ ok: true, value: '120' });
  });
  it("harf, o'nli son va manfiyni rad etadi", () => {
    expect(parseCount('12a').ok).toBe(false);
    expect(parseCount('12,5').ok).toBe(false);
    expect(parseCount('-3').ok).toBe(false);
  });
});

describe('parseDecimal', () => {
  it("vergulni nuqtaga o'tkazadi", () => {
    expect(parseDecimal('12,5')).toEqual({ ok: true, value: '12.5' });
    expect(parseDecimal('1500')).toEqual({ ok: true, value: '1500' });
  });
  it("harf va noto'g'ri formatni rad etadi", () => {
    expect(parseDecimal('abc').ok).toBe(false);
    expect(parseDecimal('1.2.3').ok).toBe(false);
    expect(parseDecimal('12 kg').ok).toBe(false);
    expect(parseDecimal('').ok).toBe(false);
  });
});

describe('parseFieldInput', () => {
  it("avto nomer maydonida kind'dan qat'i nazar nomer qoidasi ishlaydi", () => {
    expect(parseFieldInput('text', 'vehicleNumber', '01 a 123 bc')).toEqual({ ok: true, value: '01A123BC' });
  });
  it('matn maydonida erkin matn qabul qilinadi (temperatura belgisi bilan)', () => {
    expect(parseFieldInput('text', 'temperature', ' +2   C ')).toEqual({ ok: true, value: '+2 C' });
  });
});

describe('splitContractLines', () => {
  it("bo'sh qatorlarni tashlaydi, asl indeksni saqlaydi", () => {
    expect(splitContractLines('FCA Oltiariq\n\nDAP Moskva')).toEqual([
      { text: 'FCA Oltiariq', rawIndex: 0 },
      { text: 'DAP Moskva', rawIndex: 2 },
    ]);
    expect(splitContractLines(null)).toEqual([]);
  });
});

describe('formatCargoMessage', () => {
  it("sarlavha maydonlarini belgilangan tartibda, faqat to'ldirilganlarini chiqaradi", () => {
    const text = formatCargoMessage(
      { header: { sensorSerial: 'S-77', vehicleNumber: '40232BAA/402332BA', contract: 'B-17, ООО Фреш', invoiceNumber: '15' }, items: [] },
      null
    );
    expect(text).toBe(
      [
        '🚛 <b>Данные о грузе</b>',
        '',
        ['Контракт: <b>B-17, ООО Фреш</b>', 'Инвойс №: <b>15</b>', 'Номер автотранспорта: <b>40232BAA/402332BA</b>', 'Серийный номер датчика: <b>S-77</b>'].join('\n'),
      ].join('\n')
    );
  });

  it("bir nechta tovarni 1 dan raqamlab chiqaradi, bo'sh tovar tushib qoladi", () => {
    const text = formatCargoMessage(
      {
        header: { temperature: '+2 C' },
        items: [{ product: 'Xurmo', netto: '4500', brutto: '9700.5' }, {}, { product: 'Anor', boxCount: '300' }],
      },
      null
    );
    expect(text).toContain('Температура: <b>+2 C</b>');
    expect(text).toContain('<b>Товар 1</b>\nНаименование: <b>Xurmo</b>\nНетто: <b>4500</b>\nБрутто: <b>9700.5</b>');
    expect(text).toContain('<b>Товар 2</b>\nНаименование: <b>Anor</b>\nКоличество ящиков: <b>300</b>');
    expect(text).not.toContain('Товар 3');
  });

  it("tovar maydonlari belgilangan tartibda chiqadi, narxga shartnoma valyutasi qo'shiladi", () => {
    const text = formatCargoMessage(
      { header: {}, items: [{ price: '1.25', brutto: '19634.5', netto: '18000', product: 'Xurmo' }] },
      'USD'
    );
    expect(text?.split('\n').slice(2)).toEqual(['<b>Товар 1</b>', 'Наименование: <b>Xurmo</b>', 'Нетто: <b>18000</b>', 'Брутто: <b>19634.5</b>', 'Цена: <b>1.25 USD</b>']);
  });

  it("narx valyutasiz bo'lsa faqat son chiqadi", () => {
    expect(formatCargoMessage({ header: {}, items: [{ price: '1.25' }] }, null)).toContain('Цена: <b>1.25</b>');
  });

  it('HTML belgilarni ekranlaydi', () => {
    expect(formatCargoMessage({ header: { contract: 'A & <B>' }, items: [] }, null)).toContain('A &amp; &lt;B&gt;');
  });

  it("hech narsa kiritilmagan bo'lsa null qaytaradi", () => {
    expect(formatCargoMessage({ header: {}, items: [] }, 'USD')).toBeNull();
    expect(formatCargoMessage({ header: {}, items: [{}, {}] }, 'USD')).toBeNull();
  });
});
