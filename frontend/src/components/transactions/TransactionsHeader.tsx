import { Icon } from '@iconify/react';

interface TransactionsHeaderProps {
  isAdmin: boolean;
  onNew: () => void;
}

export function TransactionsHeader({ isAdmin, onNew }: TransactionsHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tranzaksiyalar</h1>
        <p className="text-sm text-gray-500">{isAdmin ? "Kirim, chiqim va ish haqi to'lovlari" : "Olgan pullaringiz tarixi"}</p>
      </div>
      <button type="button" onClick={onNew} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        <Icon icon="solar:add-circle-bold-duotone" className="h-4 w-4" />
        {isAdmin ? 'Yangi tranzaksiya' : "Olgan pulimni qo'shish"}
      </button>
    </div>
  );
}
