import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { InvoicePDFDocument, type InvoicePDFDocumentProps } from './InvoicePDFDocument';
import {
  PAGE_HEIGHT,
  PAGE_PAD_TOP,
  PAGE_PAD_BOTTOM,
  MIN_SCALE,
  MAX_SCALE,
  clampScale,
  calcSealHeight,
} from './pdfScale';
import { measureLayout, type PdfLayoutNode, type PdfLayoutMeasure } from './pdfLayout';

/**
 * Shrift o'lchamini HAQIQIY layout bo'yicha tanlash.
 *
 * Ilgari masshtab faqat heuristik taxminlarga tayanardi (`estimateScale`) va u
 * kontent balandligini 1.5–2 barobar oshirib yuborardi: natijada sahifaning
 * pastki uchdan biri bo'sh qolib, matn keraksiz mayda (4–6pt) chiqardi. Bundan
 * tashqari masshtab 1.0 dan yuqoriga chiqmagani uchun ma'lumot kam bo'lgan
 * invoyslarda ham shrift 9pt dan oshmasdi.
 *
 * Endi hujjat avval s=1 da chizib o'lchanadi (@react-pdf `onRender` → layout
 * daraxti), so'ng kerakli masshtab TENGLAMADAN yechiladi:
 *
 *   padTop·s + A·s + seal + padBottom·s = PAGE_HEIGHT
 *   ⇒ s = (PAGE_HEIGHT − seal) / (A + padTop + padBottom)
 *
 * bu yerda `A` — s=1 dagi kontent balandligi, `seal` — pechat rasmi (u masshtab
 * bilan o'zgarmaydi, qarang: `PdfStyles.SEAL_HEIGHT`).
 *
 * Shrift o'lchamlari butun songa yaxlitlanadi va matn boshqacha bo'linishi
 * mumkin, shuning uchun natija qayta o'lchanib tekshiriladi; sig'masa masshtab
 * bosqichma-bosqich kichraytiriladi.
 */

/** Sahifa oxirida qoldiriladigan zaxira (yaxlitlash xatolariga qarshi), pt */
const SAFETY_MARGIN = 2;
/**
 * Render urinishlari soni. Har bir urinish ~50–200ms; 5 urinish
 * [`MIN_SCALE` … `MAX_SCALE`] oralig'ini ~0.03 aniqlikda toraytiradi — shrift
 * o'lchamlari butun songa yaxlitlanganidan (9pt uchun 1 qadam ≈ 0.11) bu yetarli.
 */
const MAX_PASSES = 5;
/** Oraliq shu qiymatdan torayganda izlash to'xtaydi (shrift o'zgarmaydi) */
const TOLERANCE = 0.02;
/**
 * Kontent hech qanday masshtabda 1-betga sig'masa ishlatiladigan masshtab
 * (bazaviy 9pt → 8pt). Hujjat baribir bir necha betga bo'linayotgani uchun
 * shriftni yana kichraytirishning ma'nosi yo'q — o'qishga qulay o'lcham
 * qoldiriladi.
 */
const READABLE_FALLBACK_SCALE = 0.85;

type FitProps = Omit<InvoicePDFDocumentProps, 'scaleOverride' | 'onRender'>;

/** `scale` berilmasa `estimateScale` heuristikasi ishlatiladi */
const renderOnce = async (props: FitProps, scale?: number) => {
  let layout: PdfLayoutNode | undefined;
  const doc = (
    <InvoicePDFDocument
      {...props}
      scaleOverride={scale}
      onRender={(info) => { layout = info._INTERNAL__LAYOUT__DATA_; }}
    />
  );
  const blob = await pdf(doc).toBlob();
  return { blob, measure: measureLayout(layout) };
};

/** Kontent 1-betga sig'ganini tekshirish */
const fitsOnePage = (m: PdfLayoutMeasure): boolean =>
  m.pageCount === 1 &&
  m.firstPageBottom <= PAGE_HEIGHT - m.firstPagePadBottom - SAFETY_MARGIN;

/** O'lchangan kontent balandligidan kerakli masshtabni yechish */
const solveScale = (m: PdfLayoutMeasure, atScale: number, sealH: number): number => {
  // s=1 ga keltirilgan, pechatsiz kontent balandligi
  const scalable = Math.max(1, (m.contentHeight - sealH) / atScale);
  return clampScale((PAGE_HEIGHT - SAFETY_MARGIN - sealH) / (scalable + PAGE_PAD_TOP + PAGE_PAD_BOTTOM));
};

/**
 * Invoys/spesifikatsiya/upakovka PDF'ini shriftlari sahifaga moslab tanlangan
 * holda render qiladi. Kontent kam bo'lsa shriftlar kattalashadi, ko'p bo'lsa
 * — 1-betga sig'adigan darajada kichrayadi (lekin `MIN_SCALE` dan past emas).
 *
 * Izlash "qamrab olish" (bracketing) usulida: `lo` — sig'gan eng katta masshtab,
 * `hi` — sig'magan eng kichik masshtab. Matn bo'linishi (wrap) masshtabga chiziqli
 * bog'liq bo'lmagani uchun bitta tenglama yechimi yetarli emas — u faqat birinchi
 * qadamni tezlashtiradi, keyin oraliq ikkiga bo'linib toraytiriladi.
 */
export const renderFittedInvoicePdf = async (props: FitProps): Promise<Blob> => {
  const sealH = calcSealHeight(props.pdfIncludeSeal, props.selectedContract);

  let lo = Number.NaN;          // sig'adigan eng katta masshtab
  let hi = Number.NaN;          // sig'maydigan eng kichik masshtab
  let bestBlob: Blob | null = null;   // `lo` ga mos natija

  let candidate = 1;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const { blob, measure } = await renderOnce(props, candidate);
    // Layout ma'lumoti bo'lmasa (@react-pdf ichki API o'zgargan bo'lsa) —
    // heuristik taxminga qaytamiz, ya'ni ilgarigi xatti-harakat.
    if (!measure) return (await renderOnce(props)).blob;

    if (fitsOnePage(measure)) {
      if (Number.isNaN(lo) || candidate > lo) { lo = candidate; bestBlob = blob; }
    } else if (Number.isNaN(hi) || candidate < hi) {
      hi = candidate;
    }

    const next = nextCandidate(lo, hi, solveScale(measure, candidate, sealH));
    if (next === null) break;
    candidate = next;
  }

  if (bestBlob) return bestBlob;
  // 1-betga sig'dirish imkonsiz — o'qishga qulay o'lchamda, bir necha betda
  return (await renderOnce(props, READABLE_FALLBACK_SCALE)).blob;
};

/**
 * Keyingi sinab ko'rilishi kerak bo'lgan masshtab. `null` — izlash tugadi.
 *
 * @param lo     sig'gan eng katta masshtab (NaN — hali sig'gani yo'q)
 * @param hi     sig'magan eng kichik masshtab (NaN — hali sig'magani yo'q)
 * @param solved o'lchov tenglamasidan chiqqan taxmin
 */
const nextCandidate = (lo: number, hi: number, solved: number): number | null => {
  const hasLo = !Number.isNaN(lo);
  const hasHi = !Number.isNaN(hi);

  // Oraliq qamrab olindi — o'rtasini sinaymiz (tenglama yechimi oraliq ichida
  // bo'lsa, u tezroq yaqinlashtiradi)
  if (hasLo && hasHi) {
    if (hi - lo <= TOLERANCE) return null;
    const inside = solved > lo + TOLERANCE && solved < hi - TOLERANCE;
    return inside ? solved : (lo + hi) / 2;
  }

  // Hali sig'magan holat yo'q — kattalashtirishga harakat qilamiz
  if (hasLo) {
    if (lo >= MAX_SCALE - 1e-6) return null;
    const target = Math.max(solved, (lo + MAX_SCALE) / 2);
    const next = clampScale(target);
    return next > lo + TOLERANCE ? next : null;
  }

  // Hali sig'gan holat yo'q — kichraytiramiz
  if (hasHi) {
    if (hi <= MIN_SCALE + 1e-6) return null;
    const target = Math.min(solved, (hi + MIN_SCALE) / 2);
    const next = clampScale(target);
    return next < hi - TOLERANCE ? next : null;
  }

  return null;
};
