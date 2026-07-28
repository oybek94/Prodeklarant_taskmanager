import React from 'react';
import type { ViewTab } from './types';

interface InvoiceTabsProps {
  viewTab: ViewTab;
  setViewTab: (tab: ViewTab) => void;
}

const TABS: { id: ViewTab; label: string }[] = [
  { id: 'invoice', label: 'Invoys' },
  { id: 'spec', label: 'Spetsifikatsiya' },
  { id: 'packing', label: 'Upakovochniy list' },
  { id: 'pricelist', label: 'Прайс-лист' },
];

/**
 * Hujjat turlari. Ilgari bular to'ldirilgan tugmalar edi va faol tab indigo
 * tugma bo'lib tepadagi amal tugmalariga qo'shilib ketardi; endi tanlov faqat
 * ostki chiziq bilan ko'rsatiladi — bu tab ekanini aniq bildiradi va amal
 * tugmalari bilan chalkashmaydi.
 */
export const InvoiceTabs: React.FC<InvoiceTabsProps> = ({ viewTab, setViewTab }) => {
  return (
    <div
      className="mt-3 flex items-center gap-1 overflow-x-auto border-b border-gray-200"
      role="tablist"
    >
      {TABS.map((tab) => {
        const isActive = viewTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setViewTab(tab.id)}
            className={`relative shrink-0 px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              // `text-blue-700` ataylab: dark mode uni index.css'da
              // text-blue-400 ga o'giradi, `text-blue-600` esa qoplanmagan va
              // qorong'i fonda kontrasti yetarli emas
              isActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-blue-600"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
