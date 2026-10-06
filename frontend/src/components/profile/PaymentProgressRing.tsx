import React from 'react';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Stats } from '../../hooks/useProfileData';

interface PaymentProgressRingProps {
  stats: Stats | null;
  loading: boolean;
  onOpenPayments?: () => void;
}

export default function PaymentProgressRing({ stats, loading, onOpenPayments }: PaymentProgressRingProps) {
  const paymentProgress = stats && stats.totalEarned > 0
    ? Math.min(100, Math.round((stats.totalPaid / stats.totalEarned) * 100))
    : 0;

  const skeleton = <span className="block animate-pulse w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />;

  return (
    <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">To'lov holati</h2>
        <span className="text-[13px] text-gray-500 dark:text-gray-400">Joriy mavsum</span>
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="text-[44px] leading-none font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-gray-100">{paymentProgress}%</span>
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">to'langan</span>
      </div>

      <div
        className="flex h-3 rounded-full bg-orange-100 dark:bg-orange-900/30 overflow-hidden"
        role="progressbar"
        aria-valuenow={paymentProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="To'langan ulush"
      >
        <span className="bg-emerald-600" style={{ width: `${paymentProgress}%` }} />
      </div>

      <dl className="flex flex-col">
        <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-slate-700/60 text-sm">
          <dt className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-600" />
            To'langan
          </dt>
          <dd className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {loading ? skeleton : <CurrencyDisplay amount={stats?.totalPaid || 0} originalCurrency="UZS" forceOriginal={true} />}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-3 text-sm">
          <dt className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-orange-600" />
            Qolgan
          </dt>
          <dd className="font-bold tabular-nums text-orange-800 dark:text-orange-300">
            {loading ? skeleton : <CurrencyDisplay amount={stats?.pending || 0} originalCurrency="UZS" forceOriginal={true} />}
          </dd>
        </div>
      </dl>

      {onOpenPayments && (
        <button
          type="button"
          onClick={onOpenPayments}
          className="h-11 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          To'lovlar tarixi
        </button>
      )}
    </section>
  );
}
