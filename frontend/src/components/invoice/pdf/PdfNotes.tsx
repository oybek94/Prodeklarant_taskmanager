import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { scaleFont } from './pdfScale';

interface PdfNotesProps {
  notes?: string;
  scale?: number;
}

export const PdfNotes: React.FC<PdfNotesProps> = ({ notes, scale = 1 }) => {
  if (!notes) return null;
  const sc = (v: number) => Math.round(v * scale);
  const fz = (v: number) => scaleFont(v, scale);

  return (
    <View style={{ marginTop: sc(10), marginBottom: sc(6) }} wrap={false}>
      {/* O'lchamlar hujjatning qolgan qismiga moslandi: sarlavha 10pt
          (`additionalInfoTitle` kabi), matn 9pt (`additionalInfoRow` kabi).
          Ilgari 8/7pt edi va Примечания sahifadagi eng mayda matn bo'lib qolardi. */}
      <Text style={{ fontWeight: 'bold', fontSize: fz(10), marginBottom: sc(3) }}>Примечания:</Text>
      <View style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 4, padding: sc(6) }}>
        <Text style={{ fontSize: fz(9), paddingLeft: sc(8) }}>{notes}</Text>
      </View>
    </View>
  );
};
