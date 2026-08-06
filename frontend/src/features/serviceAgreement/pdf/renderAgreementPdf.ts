import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { AgreementPdfDocument } from './AgreementPdfDocument';
import { getTemplate } from '../templates';
import { buildTokens } from '../tokens';
import type { ServiceAgreement } from '../types';
import { deepNormalizeStrings } from '../../../utils/textNormalize';
import { findMissingGlyphs, PdfMissingGlyphError } from '../../../components/invoice/pdf/pdfGlyphCheck';
import type { PdfLayoutNode } from '../../../components/invoice/pdf/pdfLayout';

/**
 * Shartnoma PDF'ini yaratadi.
 *
 * Matn avval NFKC bilan normallashtiriladi, chizilgandan keyin esa shriftda
 * glifi yo'q belgi qolmaganiga ishonch hosil qilinadi — topilsa PDF UMUMAN
 * yaratilmaydi. Noto'g'ri hujjat chiqib ketgandan ko'ra yaratmaslik xavfsizroq
 * (qarang: components/invoice/pdf/pdfGlyphCheck.ts).
 */
export async function renderAgreementPdf(agreement: ServiceAgreement, bhmUzs: number): Promise<Blob> {
  const clean = deepNormalizeStrings(agreement);
  const tokens = deepNormalizeStrings(buildTokens(clean, bhmUzs));
  const template = getTemplate(clean.templateVersion);

  let layout: PdfLayoutNode | undefined;
  const doc = React.createElement(AgreementPdfDocument, {
    template,
    tokens,
    onRender: (info) => { layout = info._INTERNAL__LAYOUT__DATA_; },
  });

  const blob = await pdf(doc).toBlob();

  const missing = findMissingGlyphs(layout);
  if (missing.length > 0) throw new PdfMissingGlyphError(missing);

  return blob;
}
