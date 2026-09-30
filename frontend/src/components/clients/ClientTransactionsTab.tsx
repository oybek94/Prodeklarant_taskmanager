import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { formatAmount } from '../../utils/currencyFormatting';
import type { ClientDetail } from './ClientOverview';

interface ClientTransactionsTabProps {
  transactions: ClientDetail['transactions'];
  canAdd: boolean;
  onAdd: () => void;
}

const ClientTransactionsTab = ({ transactions, canAdd, onAdd }: ClientTransactionsTabProps) => {
  // Valyutalar aralash bo'lishi mumkin — har biri alohida jamlanadi, bir-biriga qo'shilmaydi
  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const t of transactions) {
      const currency = t.currency || 'UZS';
      byCurrency.set(currency, (byCurrency.get(currency) || 0) + Number(t.amount || 0));
    }
    return [...byCurrency.entries()];
  }, [transactions]);

  const addButton = canAdd && (
    <button
      type="button"
      onClick={onAdd}
      className="h-9 px-3 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 shrink-0"
    >
      <Icon icon="solar:add-circle-bold-duotone" className="w-4 h-4" />
      To'lov qabul qilish
    </button>
  );

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
        <Icon icon="solar:wallet-money-bold-duotone" className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">To'lovlar yo'q</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
          {canAdd ? 'Mijozdan kelgan to\'lovlar shu yerda ko\'rinadi' : 'To\'lovlar faqat administratorga ko\'rinadi'}
        </p>
        {addButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Jami <span className="tabular-nums">{transactions.length}</span> ta to'lov:
          </span>
          {totals.map(([currency, sum]) => (
            <span key={currency} className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatAmount(sum, currency)}
            </span>
          ))}
        </div>
        {addButton}
      </div>

      <ul className="rounded-2xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700/60 overflow-hidden">
        {transactions.map((t) => (
          <li key={t.id} className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-slate-800/60">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Icon icon="solar:arrow-left-down-bold-duotone" className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  +{formatAmount(Number(t.amount), t.currency || 'UZS')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                  {new Date(t.date).toLocaleDateString('uz-UZ')}
                </span>
              </div>
              {t.comment ? (
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 break-words">{t.comment}</p>
              ) : (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Izohsiz</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientTransactionsTab;
