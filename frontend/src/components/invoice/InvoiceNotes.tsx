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
        <div className="w-full min-h-[48px] px-4 py-3 flex items-center text-left text-sm text-gray-900 whitespace-pre-wrap border border-gray-300 rounded-lg">
          {notes || ''}
        </div>
      ) : (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-base"
          rows={3}
          placeholder="Qo'shimcha eslatmalar..."
        />
      )}
    </div>
  );
};
