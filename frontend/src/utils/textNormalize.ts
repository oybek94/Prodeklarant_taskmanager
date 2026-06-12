// Matn normalizatsiyasi — eksport hujjatlari (PDF/Excel) uchun.
//
// Muammo: foydalanuvchi maydonlariga (masalan, "Номер автотранспорта") ba'zan
// ko'rinishidan oddiy lotin/kirill harfiga o'xshash, lekin boshqa Unicode
// belgilar tushadi (fullwidth «Ｈ», matematik stilizatsiya qilingan harflar,
// ko'rinmas/nazorat belgilari va h.k.). Bunday belgilar ekranda tizim shrifti
// bilan ko'rinadi, lekin PDF'ga faqat Roboto joylanadi va @react-pdf glifi
// yo'q belgini JIMGINA TASHLAB YUBORADI — natijada harf hujjatda yo'qoladi.
//
// `normalizeText` Unicode muvofiqlik normalizatsiyasini (NFKC) qo'llaydi —
// fullwidth/stilizatsiya qilingan variantlar standart ASCII/asosiy harfga
// aylanadi — va ko'rinmas/nazorat belgilarni olib tashlaydi.
//
// Belgi sinflari kod-nuqtalardan quriladi, shunda fayl manbasida hech qanday
// literal ko'rinmas/nazorat bayt bo'lmaydi (toza ASCII).

const cp = String.fromCodePoint;

// Ko'rinmas belgilar: soft hyphen (U+00AD), zero-width (U+200B–200F),
// yo'nalish belgilari (U+202A–202E), word joiner (U+2060), BOM (U+FEFF).
const INVISIBLE_CHARS = new RegExp(
  '[' + cp(0x00ad) + cp(0x200b) + '-' + cp(0x200f) + cp(0x202a) + '-' + cp(0x202e) + cp(0x2060) + cp(0xfeff) + ']',
  'g',
);

// Nazorat belgilari, lekin \t (U+0009), \n (U+000A), \r (U+000D) saqlanadi.
const CONTROL_CHARS = new RegExp(
  '[' + cp(0x0000) + '-' + cp(0x0008) + cp(0x000b) + cp(0x000c) + cp(0x000e) + '-' + cp(0x001f) + cp(0x007f) + ']',
  'g',
);

/**
 * Matnni eksport uchun xavfsiz holatga keltiradi: NFKC normalizatsiya +
 * ko'rinmas/nazorat belgilarni olib tashlash. Bo'sh/undefined/null qiymatlar
 * o'zgarmasdan qaytadi.
 */
export function normalizeText(value: string): string;
export function normalizeText(value: string | undefined | null): string | undefined | null;
export function normalizeText(value: string | undefined | null): string | undefined | null {
  if (!value) return value;
  return value
    .normalize('NFKC')
    .replace(INVISIBLE_CHARS, '')
    .replace(CONTROL_CHARS, '');
}
