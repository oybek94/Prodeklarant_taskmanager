// Matn normalizatsiyasi — bazaga yoziladigan matnlar uchun.
//
// Muammo: foydalanuvchilar korxona nomi/manzil kabi maydonlarni Excel, 1C,
// veb-sayt yoki e-maildan NUSXA KO'CHIRADI. Nusxada ko'rinishidan oddiy
// harfga o'xshash, lekin boshqa Unicode belgilar bo'ladi:
//   Ｖ (U+FF36, fullwidth), Ⅴ (U+2164, rim raqami), 𝐕 (U+1D415, matematik)
// Ekranda ular normal ko'rinadi (brauzer tizim shriftidan zaxira oladi), lekin
// PDF hujjatga faqat Roboto/NotoSans joylanadi va bu shriftlarda bunday
// belgilarning glifi yo'q — natijada @react-pdf ularni JIMGINA tashlab
// yuboradi: «Valley» PDF'da «alley» bo'lib chiqadi.
//
// NFKC normalizatsiya bunday muvofiqlik variantlarini standart harfga
// aylantiradi. Bu — frontend'dagi `frontend/src/utils/textNormalize.ts` ning
// aynan nusxasi; ikkala tomonda ham bir xil qoida amal qilishi kerak.
//
// MUHIM: NFKC "juda ishtiyoqli" — u shriftda MAVJUD bo'lgan belgilarni ham
// buzadi: «№» -> «No», «м²» -> «м2», uzilmas bo'shliq -> oddiy bo'shliq.
// Bunday o'zgarish bojxona hujjatida YANGI xato bo'lardi. Shuning uchun qoida:
//
//     PDF shrifti CHIZA OLADIGAN belgiga TEGILMAYDI — faqat chizilmaydigan
//     (glifi yo'q) belgi NFKC bilan haqiqiy harfga aylantiriladi.
//
// `PRESERVED_RANGES` — aynan shu "NFKC buzadi, lekin shrift chiza oladi"
// belgilar ro'yxati; u `frontend/public/fonts/{Roboto,NotoSans}-Regular.ttf`
// dan O'LCHAB olingan va `__tests__/text-normalize.test.ts` uni shriftlar bilan
// solishtirib turadi (shrift almashsa test yiqiladi).
//
// Belgi sinflari kod-nuqtalardan quriladi, shunda fayl manbasida hech qanday
// literal ko'rinmas/nazorat bayt bo'lmaydi (toza ASCII).

const cp = String.fromCodePoint;

/** NFKC o'zgartiradi, LEKIN PDF shriftida glifi bor belgilar (o'lchangan) */
const PRESERVED_RANGES = [
  '00A0 00A8 00AA 00AF 00B2-00B5 00B8-00BA 00BC-00BE 0132-0133 013F-0140 0149 017F 01C4-01CC',
  '01F1-01F3 02B0-02B8 02D8-02DD 02E0-02E4 0340-0341 0343-0344 0374 037A 037E 0384-0385 0387',
  '03D0-03D6 03F0-03F2 03F4-03F5 03F9 1D2C-1D2E 1D30-1D3A 1D3C-1D4D 1D4F-1D6A 1D78 1D9B-1DBF',
  '1E9A-1E9B 1F71 1F73 1F75 1F77 1F79 1F7B 1F7D 1FBB 1FBD-1FC1 1FC9 1FCB 1FCD-1FCF 1FD3 1FDB',
  '1FDD-1FDF 1FE3 1FEB 1FED-1FEF 1FF9 1FFB 1FFD-1FFE 2000-200A 2011 2017 2024-2026 202F',
  '2033-2034 2036-2037 203C 203E 2047-2049 2057 205F 2070-2071 2074-208E 2090-209C 20A8',
  '2100-2103 2105-2107 2109-2113 2115-2116 2119-211D 2120-2122 2124 2126 2128 212A-212D',
  '212F-2131 2133-2139 213B-2140 2145-2149 2150-215F 2189 2C7C-2C7D A69C-A69D A770 A7F8-A7F9',
  'AB5C-AB5F AB69 FB00-FB06',
].join(' ');

export const PRESERVED_CODE_POINTS: ReadonlySet<number> = new Set(
  PRESERVED_RANGES.split(/\s+/).flatMap((token) => {
    const [from, to] = token.split('-').map((h) => parseInt(h, 16));
    const end = to ?? from;
    const out: number[] = [];
    for (let c = from; c <= end; c++) out.push(c);
    return out;
  }),
);

// Ko'rinmas belgilar: soft hyphen (U+00AD), zero-width (U+200B-200F),
// yo'nalish belgilari (U+202A-202E), word joiner (U+2060), BOM (U+FEFF).
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
 * Matnni eksport uchun xavfsiz holatga keltiradi: ko'rinmas/nazorat belgilarni
 * olib tashlaydi va PDF shrifti chiza olmaydigan belgilarni NFKC bilan haqiqiy
 * harfga aylantiradi. Shrift chiza oladigan belgilarga TEGILMAYDI.
 * Bo'sh/undefined/null qiymatlar o'zgarmasdan qaytadi.
 */
export function normalizeText(value: string): string;
export function normalizeText(value: string | undefined | null): string | undefined | null;
export function normalizeText(value: string | undefined | null): string | undefined | null {
  if (!value) return value;

  const stripped = value.replace(INVISIBLE_CHARS, '').replace(CONTROL_CHARS, '');

  // Saqlanadigan belgilar bo'yicha bo'laklarga ajratamiz. Har bir bo'lak
  // BUTUNLIGICHA NFKC qilinadi (belgi-ma-belgi emas) — shunda ajratilgan
  // diakritika ham to'g'ri birlashadi ("e" + U+0301 -> "e" bilan urg'u).
  let result = '';
  let segment = '';
  for (const char of stripped) {
    if (PRESERVED_CODE_POINTS.has(char.codePointAt(0) as number)) {
      result += segment.normalize('NFKC') + char;
      segment = '';
    } else {
      segment += char;
    }
  }
  return result + segment.normalize('NFKC');
}

/** Rekursiyada ichiga kirilmaydigan qiymatlar (Date, Buffer, sinf nusxalari) */
const isPlainContainer = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return true;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Obyekt/massivni rekursiv aylanib, barcha `string` qiymatlarni `normalizeText`
 * dan o'tkazadi. Yangi qiymat qaytaradi — kirish obyekti o'zgarmaydi.
 *
 * DIQQAT: parollar va boshqa aynan bayt-ma-bayt saqlanishi kerak bo'lgan
 * maydonlarga QO'LLAMANG — NFKC qiymatni o'zgartiradi.
 */
export function deepNormalizeStrings<T>(value: T): T {
  if (typeof value === 'string') return normalizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map(deepNormalizeStrings) as unknown as T;
  if (!isPlainContainer(value)) return value;

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) out[key] = deepNormalizeStrings(value[key]);
  return out as unknown as T;
}
