import React from 'react';
import { Icon } from '@iconify/react';

interface TransactionsHeaderProps {
  isAdmin: boolean;
  onOpenPreviousYearDebt: () => void;
  onOpenNewTransaction: () => void;
}

export const TransactionsHeader: React.FC<TransactionsHeaderProps> = React.memo(({
  isAdmin,
  onOpenPreviousYearDebt,
  onOpenNewTransaction,
}) => {
  return (
    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-white/80 shrink-0">
      <div className="flex items-center gap-4">
        <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
          <Icon icon="solar:transfer-horizontal-bold-duotone" className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
            Tranzaksiyalar
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Kirim, chiqim va ish haqi bo'yicha to'lovlar</p>
        </div>
      </div>
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenPreviousYearDebt}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 text-gray-700 border border-gray-200/50 rounded-xl hover:bg-orange-50 hover:text-orange-700 transition-all shadow-sm ring-1 ring-black/5"
          >
            <Icon icon="solar:history-bold-duotone" className="w-4 h-4" />
            <span className="font-semibold text-sm">O'tgan yil qarzlarini yozish</span>
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30"
          >
            <Icon icon="solar:add-circle-bold-duotone" className="w-4 h-4" />
            <span className="font-semibold text-sm">Yangi Tranzaksiya</span>
          </button>
        </div>
      )}
    </div>
  );
});
