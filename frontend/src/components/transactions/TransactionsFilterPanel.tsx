import React from 'react';
import DateInput from '../../components/DateInput';
import type { Client, User, TransactionFilters } from './types';

interface TransactionsFilterPanelProps {
  filters: TransactionFilters;
  onFilterChange: (key: keyof TransactionFilters, value: string) => void;
  isAdmin: boolean;
  workers: User[];
  clients: Client[];
}

export const TransactionsFilterPanel: React.FC<TransactionsFilterPanelProps> = React.memo(({
  filters,
  onFilterChange,
  isAdmin,
  workers,
  clients,
}) => {
  return (
    <div className="mb-6 bg-white/60 backdrop-blur-xl p-4 rounded-xl shadow-sm border border-white/80 ring-1 ring-black/5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Izoh bo'yicha qidiruv"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
        />
        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
        >
          <option value="">Barcha turlari</option>
          <option value="INCOME">Kirim</option>
          <option value="EXPENSE">Chiqim</option>
          <option value="SALARY">Ish haqi</option>
        </select>
        <select
          value={filters.paymentMethod}
          onChange={(e) => onFilterChange('paymentMethod', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
        >
          <option value="">Barcha to'lov turi</option>
          <option value="CASH">Naqt</option>
          <option value="CARD">Karta</option>
        </select>
        {isAdmin && (
          <select
            value={filters.workerId}
            onChange={(e) => onFilterChange('workerId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          >
            <option value="">Xodim</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        {isAdmin && (
          <select
            value={filters.clientId}
            onChange={(e) => onFilterChange('clientId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          >
            <option value="">Mijoz</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <div className="flex gap-2 lg:col-span-2">
          <DateInput
            value={filters.startDate}
            onChange={(val) => onFilterChange('startDate', val)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          />
          <DateInput
            value={filters.endDate}
            onChange={(val) => onFilterChange('endDate', val)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          />
        </div>
      </div>
    </div>
  );
});
