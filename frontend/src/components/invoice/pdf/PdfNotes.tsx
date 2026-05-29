import React from 'react';
import { Text, View } from '@react-pdf/renderer';

interface PdfNotesProps {
  notes?: string;
  scale?: number;
}

export const PdfNotes: React.FC<PdfNotesProps> = ({ notes, scale = 1 }) => {
  if (!notes) return null;
  const sc = (v: number) => Math.round(v * scale);

  return (
    <View style={{ marginTop: sc(16), marginBottom: sc(8) }}>
      <Text style={{ fontWeight: 'bold', fontSize: sc(10), marginBottom: sc(4) }}>Примечания:</Text>
      <View style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 4, padding: sc(8) }}>
        <Text style={{ fontSize: sc(9), paddingLeft: sc(12) }}>{notes}</Text>
      </View>
    </View>
  );
};
