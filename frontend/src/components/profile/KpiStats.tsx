import React from 'react';
import { Icon } from '@iconify/react';
import CurrencyDisplay from '../CurrencyDisplay';
import type { Stats } from '../../hooks/useProfileData';

interface KpiStatsProps {
  stats: Stats | null;
  loading: boolean;
  stageStatsLoading: boolean;
  totalTasksCount: number;
  errorStats: any;
  errorStatsLoading: boolean;
  onOpenParticipations: () => void;
  onOpenEarnings: () => void;
  onOpenPayments: () => void;
  onOpenErrors: () => void;
}

export default function KpiStats({
  stats, loading, stageStatsLoading, totalTasksCount,
  errorStats, errorStatsLoading,
  onOpenParticipations, onOpenEarnings, onOpenPayments, onOpenErrors
}: KpiStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Tasks */}
      <button onClick={onOpenParticipations} className="bg-gradient-to-br from-white to-blue-50/80 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-5 border border-blue-100/50 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/10 transition-all text-left group">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Icon icon="lucide:check-circle-2" className="w-5 h-5 text-blue-500" />
          </div>
          <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors" />
        </div>
        <p className="text-sm font-semibold text-blue-600/80 dark:text-blue-400 mb-1">Jami ishtirok</p>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
          {stageStatsLoading ? <span className="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded block"></span> : totalTasksCount}
        </p>
      </button>

      {/* Earned */}
      <button onClick={onOpenEarnings} className="bg-gradient-to-br from-white to-emerald-50/80 dark:from-gray-800 dark:to-emerald-900/20 rounded-2xl p-5 border border-emerald-100/50 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-500/10 transition-all text-left group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-3xl -z-0" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Icon icon="lucide:trending-up" className="w-5 h-5 text-emerald-500" />
            </div>
            <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-400 transition-colors" />
          </div>
          <p className="text-sm font-semibold text-emerald-600/80 dark:text-emerald-400 mb-1">Ishlab topilgan</p>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {loading ? <div className="animate-pulse w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div> : <CurrencyDisplay amount={stats?.totalEarned || 0} originalCurrency="UZS" forceOriginal={true} />}
          </div>
        </div>
      </button>

      {/* Paid */}
      <button onClick={onOpenPayments} className="bg-gradient-to-br from-white to-indigo-50/80 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl p-5 border border-indigo-100/50 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-500/10 transition-all text-left group">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Icon icon="lucide:wallet" className="w-5 h-5 text-indigo-500" />
          </div>
          <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
        </div>
        <p className="text-sm font-semibold text-indigo-600/80 dark:text-indigo-400 mb-1">Olingan maosh</p>
        <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
          {loading ? <div className="animate-pulse w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div> : <CurrencyDisplay amount={stats?.totalPaid || 0} originalCurrency="UZS" forceOriginal={true} />}
        </div>
      </button>

      {/* Pending */}
      <div className="bg-gradient-to-br from-white to-amber-50/80 dark:from-gray-800 dark:to-amber-900/20 rounded-2xl p-5 border border-amber-100/50 dark:border-amber-800/40 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Icon icon="lucide:clock" className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <p className="text-sm font-semibold text-amber-600/80 dark:text-amber-400 mb-1">Qolgan haq</p>
        <div className="text-xl font-extrabold text-gray-900 dark:text-white">
          {loading ? <div className="animate-pulse w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div> : <CurrencyDisplay amount={stats?.pending || 0} originalCurrency="UZS" forceOriginal={true} />}
        </div>
      </div>

      {/* Legacy Debt */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/30 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
            <Icon icon="lucide:history" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">O'tgan mavsum</p>
        <div className="text-xl font-extrabold text-gray-900 dark:text-white">
          {loading ? <div className="animate-pulse w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div> : <CurrencyDisplay amount={stats?.legacyDebt || 0} originalCurrency="USD" forceOriginal={true} />}
        </div>
      </div>

      {/* Errors */}
      <button onClick={onOpenErrors} className="bg-gradient-to-br from-white to-red-50/80 dark:from-gray-800 dark:to-red-900/20 rounded-2xl p-5 border border-red-100/50 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-600 hover:shadow-md hover:shadow-red-500/10 transition-all text-left group">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <Icon icon="lucide:shield-alert" className="w-5 h-5 text-red-500" />
          </div>
          <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-red-400 transition-colors" />
        </div>
        <p className="text-sm font-semibold text-red-600/80 dark:text-red-400 mb-1">Jami xatolar</p>
        <div className="text-xl font-extrabold text-red-600 dark:text-red-400">
          {errorStatsLoading ? <div className="animate-pulse w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div> : <CurrencyDisplay amount={Number(errorStats?.totalErrorAmount || 0)} originalCurrency="UZS" forceOriginal={true} />}
        </div>
      </button>
    </div>
  );
}
