import React from 'react';
import type { ViewTab } from './types';

interface InvoiceTabsProps {
  viewTab: ViewTab;
  setViewTab: (tab: ViewTab) => void;
}

export const InvoiceTabs: React.FC<InvoiceTabsProps> = ({ viewTab, setViewTab }) => {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {[
        { id: 'invoice' as const, label: 'Invoys' },
        { id: 'spec' as const, label: 'Spetsifikatsiya' },
        { id: 'packing' as const, label: 'Upakovochniy list' },
        { id: 'pricelist' as const, label: 'Прайс-лист' },
      ].map((tab) => {
        const isActive = viewTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
