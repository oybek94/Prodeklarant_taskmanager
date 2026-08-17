import { Font } from '@react-pdf/renderer';

/**
 * `fontkit` shrift obyektining glif keshi. Bu maydon rasman e'lon qilinmagan,
 * shuning uchun tur shu yerda tor doirada tasvirlanadi.
 */
interface FontkitGlyphCache {
  _glyphs?: Record<number, unknown>;
}

/**
 * PDF chizishdan OLDIN chaqiriladi — `fontkit` glif keshini bo'shatadi.
 *
 * NEGA KERAK. `fontkit.getGlyph(gid, codePoints)` glif obyektini gid bo'yicha
 * keshlaydi va `codePoints` ni FAQAT birinchi yaratilishda saqlaydi. PDF
 * yozilayotganda `pdfkit` shriftni subset qiladi va har bir glif uchun
 * `getGlyph(gid)` ni — `codePoints` BERMASDAN — chaqiradi
 * (`fontkit/dist/module.mjs`, `TTFSubset._addGlyph`). Shrift obyekti barcha
 * hujjatlar uchun bitta bo'lgani sababli, birinchi PDF'dan keyin keshda
 * `codePoints` i BO'SH gliflar qoladi.
 *
 * Keyingi renderda `@react-pdf/textkit` aynan shu `codePoints` dan
 * `stringIndices`/`glyphIndices` ni hisoblaydi. Ular xato bo'lsa qatorni
 * kesishda (`slice`, `textkit.js`) running BIRINCHI glifi tashlab yuboriladi —
 * PDF'da harf jimgina yo'qoladi ("40361HCA" -> "40361CA") va `ToUnicode`
 * jadvali ham buziladi.
 *
 * `renderFittedInvoicePdf` bitta yuklab olishda 5 martagacha render qilgani
 * uchun buzilish BIRINCHI yuklab olishdayoq yuz beradi.
 *
 * Keshni bo'shatish arzon: glif obyektlari kerak bo'lganda qayta yaratiladi,
 * shrift fayli qayta o'qilmaydi.
 *
 * Bu modul ATAYLAB nojo'ya ta'sirsiz (`fonts.ts` dan ajratilgan): shrift
 * registratsiyasini ishga tushirmasdan test qilinishi kerak.
 */
export const resetPdfFontGlyphCache = (): void => {
  for (const family of Object.values(Font.getRegisteredFonts())) {
    for (const source of family.sources) {
      const data = source.data as FontkitGlyphCache | null;
      if (data?._glyphs) data._glyphs = {};
    }
  }
};
