import { describe, it, expect } from 'vitest';
import {
  formatCargoMessage,
  parseCount,
  parseDecimal,
  parseStepInput,
  parseVehicleNumber,
  splitContractLines,
} from '../services/client-cargo-form';

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
  it('harf va noto\'g\'ri formatni rad etadi', () => {
    expect(parseDecimal('abc').ok).toBe(false);
    expect(parseDecimal('1.2.3').ok).toBe(false);
    expect(parseDecimal('12 kg').ok).toBe(false);
    expect(parseDecimal('').ok).toBe(false);
  });
});

describe('parseStepInput', () => {
  it("avto nomer qadamida kind'dan qat'i nazar nomer qoidasi ishlaydi", () => {
    expect(parseStepInput('text', 'vehicleNumber', '01 a 123 bc')).toEqual({ ok: true, value: '01A123BC' });
  });
  it('choice qadamida erkin matn qabul qilinadi', () => {
    expect(parseStepInput('choice', 'product', '  Xurmo ')).toEqual({ ok: true, value: 'Xurmo' });
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
  it("faqat to'ldirilgan maydonlarni 1→12 tartibida chiqaradi", () => {
    const text = formatCargoMessage({ netto: '18000', vehicleNumber: '40232BAA/402332BA', product: 'Xurmo' }, null);
    expect(text).toBe(
      ["🚛 <b>Yuk ma'lumoti</b>", '', 'Avto nomer: <b>40232BAA/402332BA</b>', 'Mahsulot: <b>Xurmo</b>', 'Netto: <b>18000</b>'].join('\n')
    );
  });
  it('narxga shartnoma valyutasini qo\'shadi', () => {
    expect(formatCargoMessage({ price: '1.25' }, 'USD')).toContain('Narxi: <b>1.25 USD</b>');
    expect(formatCargoMessage({ price: '1.25' }, null)).toContain('Narxi: <b>1.25</b>');
  });
  it('HTML belgilarni ekranlaydi', () => {
    expect(formatCargoMessage({ buyer: 'A & <B>' }, null)).toContain('A &amp; &lt;B&gt;');
  });
  it("hech narsa kiritilmagan bo'lsa null qaytaradi", () => {
    expect(formatCargoMessage({}, 'USD')).toBeNull();
  });
});

describe('formatCargoMessage — brutto', () => {
  it("Brutto Netto'dan keyin, Narxi'dan oldin chiqadi", () => {
    const text = formatCargoMessage({ price: '1.25', brutto: '19634.5', netto: '18000' }, 'USD');
    expect(text?.split('\n').slice(2)).toEqual(['Netto: <b>18000</b>', 'Brutto: <b>19634.5</b>', 'Narxi: <b>1.25 USD</b>']);
  });
});
