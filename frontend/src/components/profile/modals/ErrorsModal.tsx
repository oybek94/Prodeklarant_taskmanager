import React, { useMemo } from 'react';
import TableModal from './TableModal';
import CurrencyDisplay from '../../CurrencyDisplay';

interface ErrorsModalProps {
  errorStats: any;
  loading: boolean;
  onClose: () => void;
}

export default function ErrorsModal({ errorStats, loading, onClose }: ErrorsModalProps) {
  const errors = errorStats?.errors || [];

  const totalSum = useMemo(() => {
    return errors.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  }, [errors]);

  const formatDateOnly = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  return (
    <TableModal
      title="Jami xatolar ro'yxati"
      subtitle="Sizga yozilgan barcha jarimalar"
      onClose={onClose}
      loading={loading}
      empty={errors.length === 0}
      emptyText="Hozircha xatolar yo'q"
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Task</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Izoh / Jarayon</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-right">Jarima</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {errors.map((error: any) => (
            <tr key={error.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateOnly(error.date)}</td>
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{error.taskTitle || '-'}</td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">{error.stageName}</span>
                {error.comment && <p className="text-xs text-gray-400 mt-0.5 italic">"{error.comment}"</p>}
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                <CurrencyDisplay amount={Number(error.amount)} originalCurrency="UZS" forceOriginal={true} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold sticky bottom-0">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600">Jami:</td>
            <td className="px-4 py-3 text-right text-red-700 dark:text-red-400 border-t border-gray-200 dark:border-gray-600">
              <CurrencyDisplay amount={totalSum} originalCurrency="UZS" forceOriginal={true} />
            </td>
          </tr>
        </tfoot>
      </table>
    </TableModal>
  );
}
