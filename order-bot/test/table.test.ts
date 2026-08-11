import { describe, expect, it } from 'vitest';
import { extractOrderPositions } from '../src/parse/table.js';
import {
  buildOrderEmailHtml,
  PLAIN_EMAIL_HTML,
  ROW_GRAPES,
  ROW_MELON,
} from './fixtures/order-email.js';
import { MAGNIT_EMAIL_HTML } from './fixtures/magnit-email.js';

const parse = (html: string) => extractOrderPositions(html);

describe('extractOrderPositions', () => {
  it('bitta pozitsiyani haqiqiy xatdagi qiymatlar bilan ajratadi', () => {
    const result = parse(buildOrderEmailHtml([ROW_GRAPES]));

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.positions).toHaveLength(1);

    expect(result.positions[0]).toEqual({
      supplier: 'OOO "VOSTOCHNIY PRODUKT"',
      orderNumber: 'RVI-2026-32-34-VPR-3644102-HUBPLK-DSC_3',
      productRu: 'ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг',
      plu: '3644102',
      size: '14mm+',
      price: '1.41000',
      currency: 'EUR',
      warehouse: 'HUB Pulkovo',
      warehouseAddress:
        'Ленинградская обл., Ломоносовский р-он, промзона «Горелово», Волхонское шоссе, квартал 1, дом 11 Б.',
      etd: '08.08.2026',
      eta: '16.08.2026',
    });
  });

  it('Склад va Адрес склада ustunlarini chalkashtirmaydi', () => {
    const result = parse(buildOrderEmailHtml([ROW_GRAPES]));
    if (result.status !== 'ok') throw new Error('parse muvaffaqiyatsiz');

    const position = result.positions[0]!;
    expect(position.warehouse).toBe('HUB Pulkovo');
    expect(position.warehouseAddress).toContain('Ленинградская обл.');
    expect(position.warehouseAddress).not.toBe('HUB Pulkovo');
  });

  it('ETA ni ETA DC / РЦ bilan chalkashtirmaydi', () => {
    const result = parse(buildOrderEmailHtml([ROW_GRAPES]));
    if (result.status !== 'ok') throw new Error('parse muvaffaqiyatsiz');

    // ETD=08.08, ETA=16.08, ETA DC=19.08 — 19.08 tushib qolmasligi kerak.
    expect(result.positions[0]!.etd).toBe('08.08.2026');
    expect(result.positions[0]!.eta).toBe('16.08.2026');
    expect(result.positions[0]!.eta).not.toBe('19.08.2026');
  });

  it("bo'sh kataklar qo'shni maydonlarni surib yubormaydi", () => {
    const result = parse(buildOrderEmailHtml([ROW_GRAPES]));
    if (result.status !== 'ok') throw new Error('parse muvaffaqiyatsiz');

    // "Ladies' finger" — bu Сорт, Товар emas. Matnli versiyada aynan shu yerda
    // bo'sh kataklar yo'qolib, qiymat noto'g'ri maydonga tushib ketardi.
    expect(result.positions[0]!.productRu).toBe('ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг');
    expect(result.positions[0]!.productRu).not.toContain('Ladies');
  });

  it('bir nechta pozitsiyani tartib bilan ajratadi', () => {
    const result = parse(buildOrderEmailHtml([ROW_GRAPES, ROW_MELON]));

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.positions).toHaveLength(2);

    expect(result.positions[0]!.plu).toBe('3644102');
    expect(result.positions[0]!.productRu).toBe('ДСК Виноград ДАМСКИЙ ПАЛЬЧИК 1кг');

    expect(result.positions[1]!.plu).toBe('3644103');
    expect(result.positions[1]!.productRu).toBe('ДСК Дыня ТОРПЕДА 1кг');
    expect(result.positions[1]!.price).toBe('0.98000');
    expect(result.positions[1]!.eta).toBe('17.08.2026');

    // Zakaz raqami ikkalasida ham bir xil.
    expect(result.positions[1]!.orderNumber).toBe(result.positions[0]!.orderNumber);
  });

  it("jadvali yo'q xat uchun 'no-table' qaytaradi", () => {
    expect(parse(PLAIN_EMAIL_HTML).status).toBe('no-table');
  });

  it("ko'rsatma jadvallari bor xatda ham jim turadi (Магнит/GrandTrade)", () => {
    // Haqiqiy xat: zakaz PDF/Excel ilovada keladi, tanasida faqat colspan'li
    // layout jadvallari bor. Bot bu xat haqida xabar bermasligi kerak.
    expect(parse(MAGNIT_EMAIL_HTML).status).toBe('no-table');
  });

  it("umuman jadvalsiz HTML uchun ham 'no-table' qaytaradi", () => {
    expect(parse('<html><body><p>Салом</p></body></html>').status).toBe('no-table');
  });

  it("sarlavhalar bor, lekin qator yo'q bo'lsa 'unparsable' qaytaradi", () => {
    const result = parse(buildOrderEmailHtml([]));
    expect(result.status).toBe('unparsable');
  });

  it('colspan bilan surilgan ustunlarni to\'g\'ri o\'qiydi', () => {
    // Sarlavhadan oldin colspan bilan cho'zilgan sarlavha qatori — haqiqiy
    // xatlarda uchraydigan holat; ustun indekslari surilib ketmasligi kerak.
    const html = buildOrderEmailHtml([ROW_GRAPES]).replace(
      '<tbody>',
      '<tbody><tr><td colspan="44">ЗАКАЗ</td></tr>',
    );
    const result = parse(html);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.positions[0]!.warehouse).toBe('HUB Pulkovo');
    expect(result.positions[0]!.eta).toBe('16.08.2026');
  });
});
