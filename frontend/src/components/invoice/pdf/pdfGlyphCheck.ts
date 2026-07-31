/**
 * PDF'dan harf JIMGINA yo'qolishiga qarshi kafolat.
 *
 * Muammo: `@react-pdf` shrift stekining hech birida glifi bo'lmagan belgini
 * hech qanday belgi qoldirmasdan tashlab yuboradi — bo'sh joy ham qolmaydi.
 * Ya'ni «Ｖalley» (fullwidth Ｖ, U+FF36) PDF'da «alley» bo'lib chiqadi va buni
 * ko'z bilan payqash deyarli mumkin emas. Bunday hujjat chet el bojxonasida
 * xato hisoblanadi.
 *
 * Tekshiruv aynan `@react-pdf` chizgan layout daraxti ustida bajariladi
 * (`Document.onRender` → `_INTERNAL__LAYOUT__DATA_`, qarang: `pdfLayout.ts`).
 * Bu — props'ni skanerlashdan ko'ra ancha ishonchli:
 *   - faqat HAQIQATDA chizilgan matn tekshiriladi (props'da chizilmaydigan
 *     ma'lumot ham bor — masalan barcha shartnomalar ro'yxati), shuning uchun
 *     soxta ogohlantirish bo'lmaydi;
 *   - har bir run uchun `attributes.font[0]` — chizishda ISHLATILGAN aynan
 *     o'sha shrift obyekti, ya'ni zaxira shriftga (`NotoSans`) o'tish ham
 *     hisobga olinadi.
 *
 * Aniqlangan belgilar `normalizeText` (NFKC) bilan tuzatilmaydiganlar — ular
 * uchun PDF umuman yaratilmaydi (qarang: `pdfFit.tsx`, `Invoice.tsx`).
 */

import type { PdfLayoutNode } from './pdfLayout';

/**
 * Shrift cmap'ida yo'q, lekin chizilmaydigan layout boshqaruv belgilari —
 * ular yo'qolgan glif emas. (`\n` layout bosqichida qatorlarga bo'linib
 * yo'qoladi, `\t`/`\r` esa run ichida qolishi mumkin.)
 */
const LAYOUT_CODE_POINTS = new Set([0x09, 0x0a, 0x0d]);

/** Foydalanuvchiga ko'rsatiladigan xabar juda uzun bo'lmasligi uchun */
const MAX_REPORTED = 10;
const SNIPPET_LENGTH = 60;

export interface MissingGlyph {
  /** Yo'qoladigan belgi (surrogat juftliklari birlashtirilgan) */
  char: string;
  /** `U+FF36` ko'rinishida */
  code: string;
  /** Belgi uchragan matn (qisqartirilgan) — foydalanuvchi joyni topishi uchun */
  snippet: string;
}

/** Layout daraxtidagi matn tugunlari (`pdfLayout.ts` dagi turdan kengroq) */
interface GlyphRunFont {
  postscriptName?: string;
  hasGlyphForCodePoint?: (codePoint: number) => boolean;
}

interface GlyphRun {
  attributes?: { font?: GlyphRunFont[] };
  glyphs?: { codePoints?: number[] }[];
}

interface TextLine {
  string?: string;
  runs?: GlyphRun[];
}

interface TextNode extends PdfLayoutNode {
  lines?: TextLine[];
}

const isHighSurrogate = (cp: number) => cp >= 0xd800 && cp <= 0xdbff;
const isLowSurrogate = (cp: number) => cp >= 0xdc00 && cp <= 0xdfff;

/**
 * Yakka surrogat yarimlarini bitta belgiga birlashtiradi. `@react-pdf` zaxira
 * shrift topilmaganda astral belgini (emoji va h.k.) ikkita yarim sifatida
 * beradi — foydalanuvchiga «\uD83D» emas, «🚚» ko'rinishi kerak.
 */
const mergeSurrogates = (codePoints: number[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < codePoints.length; i++) {
    const cp = codePoints[i];
    const next = codePoints[i + 1];
    if (isHighSurrogate(cp) && next !== undefined && isLowSurrogate(next)) {
      out.push((cp - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000);
      i++;
    } else {
      out.push(cp);
    }
  }
  return out;
};

const toSnippet = (text: string): string =>
  text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;

const collectTextNodes = (node: PdfLayoutNode | undefined, out: TextNode[] = []): TextNode[] => {
  if (!node) return out;
  if (node.type === 'TEXT') out.push(node as TextNode);
  node.children?.forEach((child) => collectTextNodes(child, out));
  return out;
};

/**
 * Layout daraxtidan PDF'da chiqmaydigan (glifi yo'q) belgilarni topadi.
 * Bo'sh massiv — hujjatdagi barcha belgi chiziladi.
 */
export const findMissingGlyphs = (layout: PdfLayoutNode | undefined): MissingGlyph[] => {
  const found: MissingGlyph[] = [];
  const seen = new Set<string>();

  for (const textNode of collectTextNodes(layout)) {
    const snippet = toSnippet((textNode.lines || []).map((line) => line.string || '').join(''));

    for (const line of textNode.lines || []) {
      for (const run of line.runs || []) {
        const font = run.attributes?.font?.[0];
        // Shrift obyekti bo'lmasa tekshirib bo'lmaydi — noaniqlikda ogohlantirmaymiz
        if (typeof font?.hasGlyphForCodePoint !== 'function') continue;

        const codePoints = mergeSurrogates(
          (run.glyphs || []).flatMap((glyph) => glyph.codePoints || []),
        );

        for (const codePoint of codePoints) {
          if (LAYOUT_CODE_POINTS.has(codePoint)) continue;
          // Surrogat yarimi birlashtirilgan bo'lsa, asl astral belgi ham
          // shriftda yo'q — birlashtirilgan holicha tekshiramiz
          if (font.hasGlyphForCodePoint(codePoint)) continue;

          const char = String.fromCodePoint(codePoint);
          const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
          const key = `${code}|${snippet}`;
          if (seen.has(key)) continue;
          seen.add(key);
          found.push({ char, code, snippet });
        }
      }
    }
  }

  return found.slice(0, MAX_REPORTED);
};

/**
 * PDF yaratish to'xtatilganini bildiradi: hujjatda chizib bo'lmaydigan belgi bor.
 * Noto'g'ri hujjat chiqib ketgandan ko'ra yaratmaslik xavfsizroq.
 */
export class PdfMissingGlyphError extends Error {
  readonly missing: MissingGlyph[];

  constructor(missing: MissingGlyph[]) {
    super(`PDF'da chiqmaydigan ${missing.length} ta belgi topildi`);
    this.name = 'PdfMissingGlyphError';
    this.missing = missing;
  }
}

/** Foydalanuvchiga ko'rsatiladigan tushunarli xabar */
export const describeMissingGlyphs = (missing: MissingGlyph[]): string => {
  const lines = missing.map((m) => `• «${m.char}» (${m.code}) — «${m.snippet}» ichida`);
  return [
    "PDF yaratilmadi — hujjatda chiqmaydigan belgi bor.",
    '',
    ...lines,
    '',
    "Bu belgilar oddiy harfga o'xshaydi, lekin aslida boshqa Unicode belgi —",
    "PDF'da ular ko'rinmasdan tushib qoladi. Ko'rsatilgan matnni o'chirib,",
    'klaviaturadan qayta yozing.',
  ].join('\n');
};
