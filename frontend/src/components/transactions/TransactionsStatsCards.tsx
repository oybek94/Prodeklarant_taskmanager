import React from 'react';
import { Icon } from '@iconify/react';
import type { MonthlyStats } from './types';

interface TransactionsStatsCardsProps {
  monthlyStats: MonthlyStats;
}

const formatCurrency = (amount: number, currency: string = 'UZS') => {
  if (currency === 'UZS') {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace(/,/g, ' ').replace(/\./g, ',');
    return (
      <>
        {formatted} <small className="text-sm opacity-75">sum</small>
      </>
    );
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace(/,/g, ' ').replace(/\./g, ',');
  }
};

const formatChange = (change: number) => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const TransactionsStatsCards: React.FC<TransactionsStatsCardsProps> = React.memo(({ monthlyStats }) => {
  if (!monthlyStats || !monthlyStats.income) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      {/* Income Card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
        <div className="absolute top-4 right-4">
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${monthlyStats.income?.change >= 0
            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
            }`}>
            <span className="inline-flex items-center gap-1">
              <Icon icon={monthlyStats.income?.change >= 0 ? "solar:graph-up-bold-duotone" : "solar:graph-down-bold-duotone"} className="w-3.5 h-3.5" />
              {formatChange(monthlyStats.income?.change || 0)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
            <Icon icon="solar:arrow-left-down-bold-duotone" className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-sm text-gray-500 font-semibold tracking-wide">OYLIK KIRIM</div>
        </div>
        <div className="text-2xl font-black text-gray-800 tracking-tight">
          {formatCurrency(monthlyStats.income?.current || 0, monthlyStats.currency || 'UZS')}
        </div>
      </div>

      {/* Expense Card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
        <div className="absolute top-4 right-4">
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${monthlyStats.expense?.change >= 0
            ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
            : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
            }`}>
            <span className="inline-flex items-center gap-1">
              <Icon icon={monthlyStats.expense?.change >= 0 ? "solar:graph-up-bold-duotone" : "solar:graph-down-bold-duotone"} className="w-3.5 h-3.5" />
              {formatChange(monthlyStats.expense?.change || 0)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform duration-300">
            <Icon icon="solar:arrow-right-up-bold-duotone" className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-sm text-gray-500 font-semibold tracking-wide">OYLIK CHIQIM</div>
        </div>
        <div className="text-2xl font-black text-gray-800 tracking-tight">
          {formatCurrency(monthlyStats.expense?.current || 0, monthlyStats.currency || 'UZS')}
        </div>
      </div>

      {/* Net Card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
        <div className="absolute top-4 right-4">
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${monthlyStats.net?.change >= 0
            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
            : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
            }`}>
            <span className="inline-flex items-center gap-1">
              <Icon icon={monthlyStats.net?.change >= 0 ? "solar:graph-up-bold-duotone" : "solar:graph-down-bold-duotone"} className="w-3.5 h-3.5" />
              {formatChange(monthlyStats.net?.change || 0)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
            <Icon icon="solar:case-bold-duotone" className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-sm text-gray-500 font-semibold tracking-wide">SOF FOYDA</div>
        </div>
        <div className="text-2xl font-black text-gray-800 tracking-tight">
          {formatCurrency(monthlyStats.net?.current || 0, monthlyStats.currency || 'UZS')}
        </div>
      </div>
    </div>
  );
});
