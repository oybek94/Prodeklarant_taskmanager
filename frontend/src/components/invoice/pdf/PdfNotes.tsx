import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { sectionFont, sectionTitleFont } from './pdfFontSizes';
import { createPdfI18n, type PdfI18n } from './pdfI18n';

interface PdfNotesProps {
  notes?: string;
  scale?: number;
  /** Qo'lda belgilangan shrift (pt); berilmasa masshtabdan hisoblanadi */
  fontSize?: number;
  /** Hujjat tili (qarang: `pdfI18n.ts`); berilmasa ruscha */
  i18n?: PdfI18n;
}

export const PdfNotes: React.FC<PdfNotesProps> = ({ notes, scale = 1, fontSize, i18n }) => {
  if (!notes) return null;
  const sc = (v: number) => Math.round(v * scale);
  const { L, t } = i18n ?? createPdfI18n();

  return (
    <View style={{ marginTop: sc(10), marginBottom: sc(6) }} wrap={false}>
      {/* O'lchamlar hujjatning qolgan qismiga moslandi: sarlavha 10pt
          (`additionalInfoTitle` kabi), matn 9pt (`additionalInfoRow` kabi).
          Ilgari 8/7pt edi va Примечания sahifadagi eng mayda matn bo'lib qolardi. */}
      <Text style={{ fontWeight: 'bold', fontSize: sectionTitleFont(fontSize, 10, scale), marginBottom: sc(3) }}>{L.notesTitle}</Text>
      <View style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 4, padding: sc(6) }}>
        <Text style={{ fontSize: sectionFont(fontSize, 9, scale), paddingLeft: sc(8) }}>{t('notes', notes)}</Text>
      </View>
    </View>
  );
};
