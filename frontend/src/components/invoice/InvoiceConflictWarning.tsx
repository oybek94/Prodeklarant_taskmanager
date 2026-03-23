import React from 'react';
import { Icon } from '@iconify/react';

interface InvoiceConflictWarningProps {
  editors: Array<{ name: string }>;
}

export const InvoiceConflictWarning: React.FC<InvoiceConflictWarningProps> = ({ editors }) => {
  if (editors.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg flex items-center gap-2">
      <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <span className="text-sm text-amber-800 dark:text-amber-200">
        <strong>Diqqat!</strong> {editors.map(e => e.name).join(', ')} ham shu invoysni tahrirlayapti.
        O'zgarishlar bir-birini yo'qotishi mumkin.
      </span>
    </div>
  );
};
