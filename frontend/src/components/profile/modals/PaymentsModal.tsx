import React, { useMemo } from 'react';
import TableModal from './TableModal';
import type { PaymentStat } from '../../../hooks/useProfileData';

interface PaymentsModalProps {
  payments: PaymentStat[];
  onClose: () => void;
}

export default function PaymentsModal({ payments, onClose }: PaymentsModalProps) {
  const filteredPayments = useMemo(() => payments.filter(p => !p.isLegacyPayment), [payments]);

  const totalSum = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.paidCurrency === 'UZS' ? Number(p.paidAmountUzs) : Number(p.paidAmountUsd) * 12000), 0);
  }, [filteredPayments]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <TableModal
      title="Joriy mavsumda olingan to'lovlar"
      subtitle="Sizga berilgan barcha maosh va avanslar"
      onClose={onClose}
      loading={false}
      empty={filteredPayments.length === 0}
      emptyText="Hozircha to'lovlar olinmagan"
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Izoh</th>
            <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-right">Summa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {filteredPayments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(payment.paymentDate)}</td>
              <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{payment.comment || '-'}</td>
              <td className="px-4 py-3 text-right font-bold text-violet-600 dark:text-violet-400">
                {payment.paidCurrency === 'UZS'
                  ? `${Number(payment.paidAmountUzs).toLocaleString('ru-RU')} UZS`
                  : `${(Number(payment.paidAmountUsd) * 12000).toLocaleString('ru-RU')} UZS`}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold sticky bottom-0">
          <tr>
            <td colSpan={2} className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600">Jami:</td>
            <td className="px-4 py-3 text-right text-violet-700 dark:text-violet-400 border-t border-gray-200 dark:border-gray-600">
              {totalSum.toLocaleString('ru-RU')} UZS
            </td>
          </tr>
        </tfoot>
      </table>
    </TableModal>
  );
}
