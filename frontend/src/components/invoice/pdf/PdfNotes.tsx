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
    <View style={{ marginTop: sc(10), marginBottom: sc(6) }}>
      <Text style={{ fontWeight: 'bold', fontSize: sc(8), marginBottom: sc(3) }}>Примечания:</Text>
      <View style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 4, padding: sc(6) }}>
        <Text style={{ fontSize: sc(7), paddingLeft: sc(8) }}>{notes}</Text>
      </View>
    </View>
  );
};
