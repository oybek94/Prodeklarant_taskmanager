/**
 * `fontkit` — `@react-pdf/renderer` ning bog'liqligi, o'z TypeScript turlarini
 * bermaydi. Bu yerda faqat shrift qamrovini tekshirishga kerak bo'lgan qismi
 * e'lon qilinadi (qarang: `features/serviceAgreement/templates/v1.test.ts`).
 */
declare module 'fontkit' {
  export interface GlyphFont {
    hasGlyphForCodePoint(codePoint: number): boolean;
  }

  export function openSync(path: string): GlyphFont;
}
