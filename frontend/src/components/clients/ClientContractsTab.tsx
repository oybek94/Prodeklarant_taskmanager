import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

export interface ClientContractRow {
  id: number;
  contractNumber: string;
  contractDate: string;
  sellerName: string;
  buyerName: string;
  consigneeName?: string | null;
  destinationCountry?: string | null;
  contractCurrency?: string | null;
}

interface ClientContractsTabProps {
  contracts: ClientContractRow[];
  loading: boolean;
  duplicatingId: number | null;
  onAdd: () => void;
  onEdit: (contract: ClientContractRow) => void;
  onDuplicate: (contract: ClientContractRow) => void;
  onDelete: (contractId: number) => void;
}

const ClientContractsTab = ({ contracts, loading, duplicatingId, onAdd, onEdit, onDuplicate, onDelete }: ClientContractsTabProps) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) =>
      [c.contractNumber, c.sellerName, c.buyerName, c.consigneeName, c.destinationCountry]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [contracts, query]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
        <Icon icon="solar:document-add-bold-duotone" className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Shartnomalar yo'q</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bu mijoz uchun birinchi shartnomani qo'shing</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 h-9 px-3 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="w-4 h-4" />
          Shartnoma qo'shish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.length > 4 && (
        <div className="relative">
          <Icon icon="solar:magnifer-bold-duotone" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Raqam, sotuvchi, xaridor yoki davlat bo'yicha qidirish"
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">"{query}" bo'yicha shartnoma topilmadi</p>
      ) : (
        <ul className="rounded-2xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700/60 overflow-hidden">
          {filtered.map((contract) => {
            const duplicating = duplicatingId === contract.id;
            return (
              <li
                key={contract.id}
                className="group flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => onEdit(contract)}
              >
                <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Icon icon="solar:document-text-bold-duotone" className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">№ {contract.contractNumber}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {new Date(contract.contractDate).toLocaleDateString('uz-UZ')}
                    </span>
                    {contract.contractCurrency && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                        {contract.contractCurrency}
                      </span>
                    )}
                    {contract.destinationCountry && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                        <Icon icon="solar:map-point-bold-duotone" className="w-3 h-3" />
                        {contract.destinationCountry}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 min-w-0">
                    <span className="truncate" title={contract.sellerName}>{contract.sellerName}</span>
                    <Icon icon="solar:arrow-right-linear" className="w-3 h-3 shrink-0 text-gray-400" />
                    <span className="truncate" title={contract.buyerName}>{contract.buyerName}</span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton icon="solar:pen-bold-duotone" title="Tahrirlash" tone="blue" onClick={() => onEdit(contract)} />
                  <IconButton
                    icon={duplicating ? 'solar:refresh-bold-duotone' : 'solar:copy-bold-duotone'}
                    title="Nusxa olish"
                    tone="emerald"
                    spin={duplicating}
                    disabled={duplicatingId != null}
                    onClick={() => onDuplicate(contract)}
                  />
                  <IconButton icon="solar:trash-bin-trash-bold-duotone" title="O'chirish" tone="rose" onClick={() => onDelete(contract.id)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const TONES = {
  blue: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30',
  emerald: 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30',
  rose: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30',
} as const;

function IconButton({
  icon,
  title,
  tone,
  onClick,
  disabled,
  spin,
}: {
  icon: string;
  title: string;
  tone: keyof typeof TONES;
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${TONES[tone]}`}
    >
      <Icon icon={icon} className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} />
    </button>
  );
}

export default ClientContractsTab;
