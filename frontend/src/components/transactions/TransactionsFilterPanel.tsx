import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import { hasActiveFilters } from './listParams';
import type { Client, TransactionFilters, User } from './types';

interface TransactionsFilterPanelProps {
  filters: TransactionFilters;
  onChange: (key: keyof TransactionFilters, value: string) => void;
  onReset: () => void;
  isAdmin: boolean;
  workers: User[];
  clients: Client[];
}

const TYPES: { value: TransactionFilters['type']; label: string }[] = [
  { value: '', label: 'Hammasi' },
  { value: 'INCOME', label: 'Kirim' },
  { value: 'EXPENSE', label: 'Chiqim' },
  { value: 'SALARY', label: 'Ish haqi' },
];

const field = 'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export function TransactionsFilterPanel({ filters, onChange, onReset, isAdmin, workers, clients }: TransactionsFilterPanelProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {isAdmin && (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onChange('type', t.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${filters.type === t.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="relative min-w-[180px] flex-1">
        <Icon icon="solar:magnifer-bold-duotone" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          placeholder="Izoh bo'yicha qidirish"
          className={`${field} w-full pl-8`}
        />
      </div>
      {isAdmin && (
        <select value={filters.clientId} onChange={(e) => onChange('clientId', e.target.value)} className={`${field} max-w-[180px]`}>
          <option value="">Barcha mijozlar</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {isAdmin && (
        <select value={filters.workerId} onChange={(e) => onChange('workerId', e.target.value)} className={`${field} max-w-[160px]`}>
          <option value="">Barcha xodimlar</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      )}
      <select value={filters.paymentMethod} onChange={(e) => onChange('paymentMethod', e.target.value)} className={field}>
        <option value="">Naqd va karta</option>
        <option value="CASH">Naqd</option>
        <option value="CARD">Karta</option>
      </select>
      <div className="flex items-center gap-1">
        <DateInput value={filters.startDate} onChange={(v) => onChange('startDate', v)} placeholder="Dan" className={`${field} w-[124px]`} />
        <span className="text-gray-400">–</span>
        <DateInput value={filters.endDate} onChange={(v) => onChange('endDate', v)} placeholder="Gacha" className={`${field} w-[124px]`} />
      </div>
      {hasActiveFilters(filters) && (
        <button type="button" onClick={onReset} className="h-9 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100">Tozalash</button>
      )}
    </div>
  );
}
