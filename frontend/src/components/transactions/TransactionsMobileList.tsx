import React from 'react';
import { Icon } from '@iconify/react';
import EmptyValue from '../../components/common/EmptyValue';
import type { Transaction } from './types';
import { formatDateTime } from '../../utils/dateFormatting';

interface TransactionsMobileListProps {
  paginatedTransactions: Transaction[];
  isAdmin: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
}

export const TransactionsMobileList: React.FC<TransactionsMobileListProps> = React.memo(({
  paginatedTransactions,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-3">
      {paginatedTransactions.map((t) => (
        <div key={t.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700/60 p-3.5 space-y-2.5">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 dark:text-gray-100 text-base truncate leading-tight mb-1">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {t.type === 'INCOME' && t.client
                    ? t.client.name
                    : t.type === 'SALARY' && t.worker
                      ? t.worker.name
                      : <EmptyValue value={t.expenseCategory} />}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border ${t.type === 'INCOME'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
                    : t.type === 'EXPENSE'
                      ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50'
                    }`}
                >
                  {t.type === 'INCOME' ? 'Kirim' : t.type === 'EXPENSE' ? 'Chiqim' : 'Oylik'}
                </span>
                <span className="text-[10px] font-medium text-gray-400">{formatDateTime(t.date)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-base font-bold tracking-tight ${t.type === 'INCOME' ? 'text-emerald-600' : t.type === 'EXPENSE' ? 'text-rose-600' : 'text-indigo-600'}`}>
                {t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : ''}{new Intl.NumberFormat('en-US').format(t.amount).replace(/,/g, ' ').replace(/\./g, ',')} <small className="text-[10px] font-bold uppercase">{t.currency}</small>
              </p>
            </div>
          </div>

          <div className="flex justify-between items-end gap-3 pt-0.5">
            <div className="flex-1 min-w-0">
              {t.comment && (
                <p className="text-gray-500 dark:text-gray-400 text-[11px] italic truncate leading-tight border-l-2 border-gray-100 dark:border-slate-800 pl-2">
                  {t.comment}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {t.paymentMethod && (
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${t.paymentMethod === 'CASH'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'
                  : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800/50'
                  }`}
                  title={t.paymentMethod === 'CASH' ? 'Naqt' : 'Karta'}
                >
                  <Icon icon={t.paymentMethod === 'CASH' ? "lucide:banknote" : "lucide:credit-card"} className="w-4 h-4" />
                </span>
              )}
              
              {isAdmin && (
                <>
                  <button
                    onClick={() => onEdit(t)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 border border-gray-100 dark:border-slate-700 active:scale-95 transition-all"
                  >
                    <Icon icon="lucide:pencil" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-100 dark:border-rose-800/50 active:scale-95 transition-all"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
