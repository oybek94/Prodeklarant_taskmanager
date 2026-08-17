/**
 * Ketma-ket PDF renderlarida harf yo'qolmasligi.
 *
 * XATO TARIXI. `fontkit.getGlyph(gid, codePoints)` glif obyektini gid bo'yicha
 * keshlaydi va `codePoints` ni faqat BIRINCHI yaratilishda saqlaydi. PDF
 * yozilayotganda `pdfkit` shriftni subset qiladi va `TTFSubset._addGlyph` har
 * bir glif uchun `getGlyph(gid)` ni `codePoints` BERMASDAN chaqiradi. Shrift
 * obyekti barcha hujjatlar uchun bitta bo'lgani sababli, birinchi PDF'dan keyin
 * keshda `codePoints` i bo'sh gliflar qoladi. Keyingi renderda
 * `@react-pdf/textkit` shu `codePoints` dan `glyphIndices` ni hisoblaydi va
 * qatorni kesishda running BIRINCHI glifini tashlab yuboradi:
 *
 *     "Номер автотранспорта: 40361HCA"  ->  PDF'da "...: 40361CA"
 *
 * Yechim — `resetPdfFontGlyphCache()` (qarang: `components/pdf/fontGlyphCache.ts`).
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Font, pdf, Document, Page, Text } from '@react-pdf/renderer';
import { findDroppedText } from './pdfGlyphCheck';
import { resetPdfFontGlyphCache } from '../../pdf/fontGlyphCache';
import type { PdfLayoutNode, PdfRenderInfo } from './pdfLayout';

// Shriftlar bu yerda FAYL yo'li bilan ro'yxatdan o'tkaziladi: `fonts.ts`
// brauzer URL'ini (`/fonts/*.ttf`) ishlatadi va u Node'da topilmaydi.
// `resetPdfFontGlyphCache` esa `Font.getRegisteredFonts()` orqali ishlagani
// uchun registratsiya qanday bo'lishidan qat'i nazar to'g'ri ishlaydi.

const fontPath = (name: string): string => {
  const decoded = decodeURIComponent(new URL(`../../../../public/fonts/${name}`, import.meta.url).pathname);
  return /^\/[A-Za-z]:/.test(decoded) ? decoded.slice(1) : decoded;
};

Font.register({
  family: 'Roboto',
  fonts: [
    { src: fontPath('Roboto-Regular.ttf'), fontWeight: 400 },
    { src: fontPath('Roboto-Medium.ttf'), fontWeight: 500 },
    { src: fontPath('Roboto-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.register({ family: 'NotoSans', fonts: [{ src: fontPath('NotoSans-Regular.ttf'), fontWeight: 400 }] });

/**
 * `PdfAdditionalInfo.Row` bilan bir xil tuzilma: qalin yorliq + oddiy qiymat
 * bitta `Text` ichida. Aynan shu tuzilmada glif keshi buzilganda qiymatning
 * birinchi harfi yo'qolardi.
 */
const Row = (label: string, value: string) =>
  React.createElement(
    Text,
    { style: { fontSize: 9 } },
    React.createElement(Text, { style: { fontWeight: 'bold' } }, `${label}: `),
    value,
  );

/** Har bir hujjat oldingisidan farqli harflar ishlatadi — kesh shunda buziladi */
const DOCUMENTS: React.ReactElement[][] = [
  [Row('Номер автотранспорта', '40361HCA/400899CA')],
  [Row('Vehicle number', '40361HCA/400899CA')],
  [Row('Seller info', 'ООО «Фрукт Водий»')],
  [Row('Условия поставки', 'DAP - г. Заславль, Беларусь')],
];

const render = async (children: React.ReactElement[]): Promise<PdfLayoutNode | undefined> => {
  let layout: PdfLayoutNode | undefined;
  await pdf(
    React.createElement(
      Document,
      // `Document` ning `onRender` turida layout daraxti e'lon qilinmagan —
      // u `@react-pdf` ning ichki maydoni (qarang: `pdfLayout.ts`)
      { onRender: (info: PdfRenderInfo) => { layout = info._INTERNAL__LAYOUT__DATA_; } },
      React.createElement(
        Page,
        { size: 'A4', style: { fontFamily: ['Roboto', 'NotoSans'], fontSize: 9, padding: 30 } },
        ...children,
      ),
    ),
  ).toBlob();
  return layout;
};

describe('PDF glif keshi', () => {
  it("ketma-ket renderlarda harf yo'qolmaydi", async () => {
    const broken: string[] = [];

    for (let i = 0; i < DOCUMENTS.length * 2; i++) {
      resetPdfFontGlyphCache();
      const layout = await render(DOCUMENTS[i % DOCUMENTS.length]);
      const dropped = findDroppedText(layout);
      if (dropped.length > 0) broken.push(`render ${i}: ${dropped.join(' | ')}`);
    }

    expect(broken).toEqual([]);
  }, 180_000);

  it('kesh tozalanmasa xato QAYTA paydo bo\'ladi (tekshiruv haqiqatan ishlaydi)', async () => {
    // Tuzatish ishlayotganini isbotlash uchun teskari holat: keshni ataylab
    // tozalamaymiz. Bu test buzilishni KUTADI — agar `@react-pdf`/`fontkit`
    // yangilanib xato yo'qolsa, test yiqiladi va `resetPdfFontGlyphCache`
    // hamda unga bog'liq izohlarni olib tashlash mumkinligini bildiradi.
    resetPdfFontGlyphCache();
    const broken: string[] = [];

    for (let i = 0; i < DOCUMENTS.length * 2; i++) {
      const layout = await render(DOCUMENTS[i % DOCUMENTS.length]);
      if (findDroppedText(layout).length > 0) broken.push(`render ${i}`);
    }

    expect(broken.length).toBeGreaterThan(0);
  }, 180_000);
});
