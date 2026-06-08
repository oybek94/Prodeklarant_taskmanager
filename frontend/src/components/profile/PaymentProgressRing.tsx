import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Stats } from '../../hooks/useProfileData';

interface PaymentProgressRingProps {
  stats: Stats | null;
  loading: boolean;
}

export default function PaymentProgressRing({ stats, loading }: PaymentProgressRingProps) {
  const paymentProgress = stats && stats.totalEarned > 0
    ? Math.min(100, Math.round((stats.totalPaid / stats.totalEarned) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center relative">
      <div className="w-full flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">To'lov Holati</h3>
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">Joriy mavsum</span>
      </div>
      
      <div className="w-48 h-48 my-4 relative flex items-center justify-center">
        <Doughnut
          data={{
            labels: ['To\'langan', 'Qolgan haq'],
            datasets: [{
              data: [paymentProgress, 100 - paymentProgress],
              backgroundColor: ['#10b981', '#f3f4f6'],
              hoverBackgroundColor: ['#059669', '#e5e7eb'],
              borderWidth: 0,
              borderRadius: 8,
            }],
          }}
          options={{
            cutout: '80%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{paymentProgress}%</span>
          <span className="text-sm font-medium text-gray-500 mt-1">To'landi</span>
        </div>
      </div>
      
      <div className="w-full grid grid-cols-2 gap-4 mt-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">To'langan</span>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {loading ? <div className="animate-pulse w-16 h-4 bg-gray-200 dark:bg-gray-600 rounded mx-auto"></div> : <CurrencyDisplay amount={stats?.totalPaid || 0} originalCurrency="UZS" forceOriginal={true} />}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Qolgan</span>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {loading ? <div className="animate-pulse w-16 h-4 bg-gray-200 dark:bg-gray-600 rounded mx-auto"></div> : <CurrencyDisplay amount={stats?.pending || 0} originalCurrency="UZS" forceOriginal={true} />}
          </div>
        </div>
      </div>
    </div>
  );
}
