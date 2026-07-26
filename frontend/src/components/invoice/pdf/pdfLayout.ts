/**
 * @react-pdf layout daraxti bilan ishlash uchun yordamchilar.
 *
 * `Document.onRender` callback'iga blob bilan birga `_INTERNAL__LAYOUT__DATA_`
 * ham beriladi — bu yoga hisoblab bo'lgan layout daraxti. Undan kontentning
 * HAQIQIY balandligini o'lchash mumkin, ya'ni shrift o'lchamini taxminlar
 * (`estimateScale`) o'rniga o'lchov asosida tanlash mumkin (qarang: `pdfFit.tsx`).
 */

export interface PdfLayoutBox {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
}

export interface PdfLayoutNode {
  type?: string;
  box?: PdfLayoutBox;
  style?: Record<string, unknown>;
  children?: PdfLayoutNode[];
}

export interface PdfRenderInfo {
  blob?: Blob;
  _INTERNAL__LAYOUT__DATA_?: PdfLayoutNode;
}

export type PdfOnRender = (info: PdfRenderInfo) => void;

/**
 * Sahifadagi eng pastki chiziladigan nuqta (pt, sahifa yuqori chetidan).
 * `box.top` — yoga'dagi ABSOLUT koordinata (sahifa boshidan), shuning uchun
 * ota-bola bo'yicha yig'ish shart emas.
 */
const nodeBottom = (node: PdfLayoutNode): number => {
  let bottom = 0;
  const visit = (n: PdfLayoutNode) => {
    const top = n.box?.top;
    if (typeof top === 'number') bottom = Math.max(bottom, top + (n.box?.height || 0));
    n.children?.forEach(visit);
  };
  visit(node);
  return bottom;
};

export interface PdfLayoutMeasure {
  /** Umumiy sahifalar soni */
  pageCount: number;
  /**
   * Barcha sahifalardagi kontent balandligining yig'indisi (paddingTop hisobga
   * olinmagan holda). Bir sahifali hujjat uchun — shu sahifadagi kontent
   * balandligi. Ko'p sahifali bo'lsa — hammasining yig'indisi (taxminiy: bloklar
   * `wrap={false}` bo'lib sakragan bo'sh joy hisobga olinmaydi).
   */
  contentHeight: number;
  /** Birinchi sahifadagi kontentning eng pastki nuqtasi (pt, yuqori chetdan) */
  firstPageBottom: number;
  /** Birinchi sahifaning haqiqiy (yaxlitlangan) pastki paddingi */
  firstPagePadBottom: number;
}

export const measureLayout = (layout: PdfLayoutNode | undefined): PdfLayoutMeasure | null => {
  const pages = layout?.children;
  if (!pages || pages.length === 0) return null;

  let contentHeight = 0;
  let firstPageBottom = 0;
  let firstPagePadBottom = 0;

  pages.forEach((page, idx) => {
    const padTop = Number(page.style?.paddingTop) || 0;
    const bottom = Math.max(...(page.children || []).map(nodeBottom), padTop);
    if (idx === 0) {
      firstPageBottom = bottom;
      firstPagePadBottom = Number(page.style?.paddingBottom) || 0;
    }
    contentHeight += Math.max(0, bottom - padTop);
  });

  return { pageCount: pages.length, contentHeight, firstPageBottom, firstPagePadBottom };
};
