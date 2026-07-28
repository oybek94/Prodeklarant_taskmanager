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
    <div className="mt-3 flex flex-wrap items-center gap-x-1 border-b border-gray-200" role="tablist">
      {TABS.map((tab) => {
        const isActive = viewTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setViewTab(tab.id)}
            /* Faol chiziq absolyut element emas, tugmaning o'z `border-b-2` si:
               ilgari `overflow-x-auto` konteyner vertikal bo'yicha ham kesib
               qo'yardi va chiziq bilan matn qirqilib qolardi. */
            className={`-mb-px shrink-0 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              // `text-blue-700` ataylab: dark mode uni index.css'da
              // text-blue-400 ga o'giradi, `text-blue-600` esa qoplanmagan va
              // qorong'i fonda kontrasti yetarli emas
              isActive
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
