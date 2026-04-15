import React from 'react';
import type { ViewTab } from './types';

interface InvoiceNotesProps {
  viewTab: ViewTab;
  isPdfMode: boolean;
  notes: string;
  setNotes: (notes: string) => void;
}

export const InvoiceNotes: React.FC<InvoiceNotesProps> = ({
  viewTab,
  isPdfMode,
  notes,
  setNotes,
}) => {
  if (viewTab === 'spec') return null;

  return (
    <div className="mb-8">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Особые примечания</label>
      {isPdfMode || viewTab === 'packing' ? (
        <div 
          className="w-full text-sm text-gray-900 whitespace-pre-wrap border border-gray-300 rounded-lg"
          style={{ padding: '10px 16px', minHeight: '60px', display: 'block' }}
        >
          {notes ? notes.trim() : ''}
        </div>
      ) : (
        <textarea
          value={notes ? notes.replace(/^\s+/, '') : ''}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-base"
          rows={3}
          placeholder="Qo'shimcha eslatmalar..."
        />
      )}
    </div>
  );
};
