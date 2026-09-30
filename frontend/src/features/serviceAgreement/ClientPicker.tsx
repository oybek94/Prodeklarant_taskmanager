import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export interface ClientOption {
  id: number;
  name: string;
}

interface ClientPickerProps {
  clients: ClientOption[];
  value: number;
  /** Tanlangan mijoz ro'yxatda bo'lmasa (masalan ro'yxat hali kelmagan) ko'rsatiladigan nom */
  fallbackName?: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (clientId: number) => void;
}

const MAX_VISIBLE = 50;

/** Qidiruvli mijoz tanlagich — yuzlab mijozli oddiy `<select>` o'rniga */
export default function ClientPicker({ clients, value, fallbackName, disabled, loading, onChange }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedName = clients.find((c) => c.id === value)?.name ?? (value ? fallbackName : undefined);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
    return list.slice(0, MAX_VISIBLE);
  }, [clients, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setHighlight(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const choose = (id: number) => {
    setOpen(false);
    if (id !== value) onChange(id);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        className="w-full h-10 flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-900"
      >
        <span className={`truncate ${selectedName ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
          {selectedName || (loading ? 'Mijozlar yuklanmoqda…' : 'Mijozni tanlang')}
        </span>
        <Icon icon="solar:alt-arrow-down-linear" className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (matches[highlight]) choose(matches[highlight].id); }
                else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
              }}
              placeholder="Mijoz nomi bo'yicha qidirish…"
              className="w-full h-9 rounded-lg bg-gray-50 dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none placeholder-gray-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {matches.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Topilmadi</li>
            ) : (
              matches.map((c, i) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={c.id === value}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => { e.preventDefault(); choose(c.id); }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                    i === highlight ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  } ${c.id === value ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === value && <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4 shrink-0" />}
                </li>
              ))
            )}
          </ul>
          {!query && clients.length > MAX_VISIBLE && (
            <div className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100 dark:border-slate-700">
              Birinchi {MAX_VISIBLE} ta ko'rsatildi — qidiruvdan foydalaning
            </div>
          )}
        </div>
      )}
    </div>
  );
}
