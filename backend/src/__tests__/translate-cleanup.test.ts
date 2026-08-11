/**
 * Rekvizitlar shartnomadan ERKIN MATN sifatida ko'chiriladi — qator ko'chirishi
 * ma'noli (bank nomi, hisob raqami, SWIFT alohida qatorlarda turadi). Ruscha
 * PDF matnga umuman tegmaydi, shuning uchun tarjima ham AYNAN o'sha
 * joylashuvni saqlab qolishi kerak.
 */
import { describe, it, expect } from 'vitest';
import { cleanTranslatedText, isCachedTranslationUsable } from '../services/translate.service';

describe('cleanTranslatedText', () => {
  it("qator ko'chirishini saqlaydi", () => {
    const text = ['Bank: Ipoteka Bank', 'Account: 20208000000000000001', 'SWIFT: IPJSUZ22'].join('\n');

    expect(cleanTranslatedText(text)).toBe(text);
  });

  it("bo'sh qatorni ham saqlaydi (bloklar orasidagi ajratgich)", () => {
    expect(cleanTranslatedText('Seller\n\nBank details')).toBe('Seller\n\nBank details');
  });

  it("qator ichidagi ortiqcha bo'shliqni yig'adi", () => {
    expect(cleanTranslatedText('Ipoteka   Bank\nAccount:   2020')).toBe('Ipoteka Bank\nAccount: 2020');
  });

  it('AI qo\'shib yuborgan savdo belgisini olib tashlaydi', () => {
    expect(cleanTranslatedText('Khorazm™ LLC\nTashkent')).toBe('Khorazm LLC\nTashkent');
  });

  it("™ o'rnida qolgan bo'shliqni nuqtadan oldin yig'adi", () => {
    expect(cleanTranslatedText('Fruit Vodiy ™ .')).toBe('Fruit Vodiy.');
  });

  it("qator boshi/oxiridagi bo'shliqni kesadi", () => {
    expect(cleanTranslatedText('  Bank  \n  Account  ')).toBe('Bank\nAccount');
  });

  it("CRLF ni LF ga keltiradi", () => {
    expect(cleanTranslatedText('Bank\r\nAccount')).toBe('Bank\nAccount');
  });
});

describe('isCachedTranslationUsable', () => {
  const multiline = 'Банк: Ипотека\nСчёт: 2020';

  it('manba o\'zgarmagan bo\'lsa kesh ishlatiladi', () => {
    expect(isCachedTranslationUsable(multiline, { source: multiline, translated: 'Bank: Ipoteka\nAccount: 2020' }))
      .toBe(true);
  });

  it("manba o'zgargan bo'lsa kesh ishlatilmaydi", () => {
    expect(isCachedTranslationUsable(multiline, { source: 'Боshqa matn', translated: 'Other' })).toBe(false);
  });

  it("qatorlari yopishtirilgan eski kesh yaroqsiz", () => {
    // 2026-08-11 dan oldin keshlangan tarjimalarda `\n` yo'qolgan edi
    expect(isCachedTranslationUsable(multiline, { source: multiline, translated: 'Bank: Ipoteka Account: 2020' }))
      .toBe(false);
  });

  it("bir qatorli manba uchun kesh baribir yaroqli", () => {
    expect(isCachedTranslationUsable('Москва', { source: 'Москва', translated: 'Moscow' })).toBe(true);
  });
});
