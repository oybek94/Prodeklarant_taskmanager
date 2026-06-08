import React from 'react';
import { Icon } from '@iconify/react';
import EmptyValue from '../../components/common/EmptyValue';
import type { Transaction } from './types';
import { formatDateTime } from '../../utils/dateFormatting';

interface TransactionsTableProps {
  transactions: Transaction[];
  paginatedTransactions: Transaction[];
  transactionsTotalPages: number;
  transactionsTotalCount: number;
  transactionsPage: number;
  TRANSACTIONS_PAGE_SIZE: number;
  isAdmin: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  onPageChange: (page: number) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = React.memo(({
  transactions,
  paginatedTransactions,
  transactionsTotalPages,
  transactionsTotalCount,
  transactionsPage,
  TRANSACTIONS_PAGE_SIZE,
  isAdmin,
  onEdit,
  onDelete,
  onPageChange,
}) => {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-slate-700/60 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
      <div className="overflow-auto max-h-[calc(100vh-18rem)] custom-scrollbar">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border-b border-gray-100/80 dark:border-slate-700/80">
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="inline-flex items-center justify-center gap-1.5 w-full">
                  <Icon icon="lucide:hash" className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Type
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="lucide:user" className="w-4 h-4 text-emerald-500" />
                  Client/Worker/Category
                </span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                <span className="inline-flex items-center justify-end gap-1.5 w-full">
                  <Icon icon="lucide:coins" className="w-4 h-4 text-amber-500" />
                  Amount
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                <span className="inline-flex items-center justify-center gap-1.5 w-full">
                  <Icon icon="lucide:credit-card" className="w-4 h-4 text-indigo-500" />
                  To'lov usuli
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                <span className="inline-flex items-center justify-center gap-1.5 w-full">
                  <Icon icon="lucide:calendar" className="w-4 h-4 text-cyan-500" />
                  Date
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="lucide:message-square" className="w-4 h-4 text-purple-500" />
                  Comment
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="inline-flex items-center gap-1.5 justify-center w-full">
                  <Icon icon="lucide:sliders-horizontal" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60 dark:divide-slate-700/60 bg-white/40 dark:bg-slate-900/40">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <div className="bg-gradient-to-br from-gray-50 to-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-200/50">
                      <Icon icon="lucide:search" className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Ma'lumotlar yo'q</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Siz qidirayotgan qidiruv so'rovi yoki filtrlarga mos keluvchi tranzaksiya topilmadi.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((t) => (
                <tr key={t.id} className="group transition-all duration-200 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-sm">
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === 'INCOME'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50'
                        : t.type === 'EXPENSE'
                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800/50'
                          : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/50'
                        }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {t.type === 'INCOME' && t.client
                      ? t.client.name
                      : t.type === 'SALARY' && t.worker
                        ? t.worker.name
                        : <EmptyValue value={t.expenseCategory} />}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-gray-100 text-right">
                    {t.amount} {t.currency}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300 text-center">
                    {t.paymentMethod ? (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.paymentMethod === 'CASH'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/50'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 ring-1 ring-purple-200 dark:ring-purple-800/50'
                        }`}>
                        {t.paymentMethod === 'CASH' ? 'Naqt' : 'Karta'}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-400">
                    {formatDateTime(t.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="max-w-xs truncate" title={t.comment || undefined}>
                      <EmptyValue value={t.comment} />
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                    {isAdmin ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(t)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm ring-1 ring-blue-200/60 dark:ring-blue-800/60 transition-all hover:shadow hover:shadow-blue-500/20"
                          title="O'zgartirish"
                        >
                          <Icon icon="lucide:pencil" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm ring-1 ring-rose-200/60 dark:ring-rose-800/60 transition-all hover:shadow hover:shadow-rose-500/20"
                          title="O'chirish"
                        >
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {transactionsTotalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-b-2xl">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {((transactionsPage - 1) * TRANSACTIONS_PAGE_SIZE) + 1}–
            {Math.min(transactionsPage * TRANSACTIONS_PAGE_SIZE, transactionsTotalCount)} / {transactionsTotalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, transactionsPage - 1))}
              disabled={transactionsPage <= 1}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow"
            >
              <Icon icon="lucide:chevron-left" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-0.5 mx-2">
              <span className="px-3 py-1 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold border border-gray-200 dark:border-slate-700 shadow-sm">
                {transactionsPage} / {transactionsTotalPages}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(transactionsTotalPages, transactionsPage + 1))}
              disabled={transactionsPage >= transactionsTotalPages}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow"
            >
              <Icon icon="lucide:chevron-right" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
