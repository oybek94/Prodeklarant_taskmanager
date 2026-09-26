import { useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Client } from './types';

interface ClientPickerProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  invalid?: boolean;
}

const MAX_RESULTS = 50;

/** Yozib qidiriladigan mijoz tanlash (klaviatura: ↑ ↓ Enter, Esc yopadi) */
export function ClientPicker({ clients, value, onChange, invalid }: ClientPickerProps) {
  const selected = clients.find((c) => String(c.id) === value) ?? null;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
    return list.slice(0, MAX_RESULTS);
  }, [clients, query]);

  const pick = (c: Client) => {
    onChange(String(c.id));
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (results[active]) pick(results[active]); }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
  };

  return (
    <div className="relative">
      <Icon icon="solar:magnifer-bold-duotone" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        value={open ? query : selected?.name ?? ''}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => { setQuery(''); setOpen(true); setActive(0); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Mijoz nomini yozing"
        role="combobox"
        aria-expanded={open}
        className={`w-full rounded-lg border bg-white py-2 pl-9 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 ${invalid ? 'border-rose-400 focus:ring-rose-500/20' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'}`}
      />
      {selected && !open && (
        <button type="button" onClick={() => { onChange(''); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700" aria-label="Tozalash">
          <Icon icon="solar:close-circle-bold-duotone" className="h-4 w-4" />
        </button>
      )}
      {open && (
        <ul role="listbox" className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">Mijoz topilmadi</li>
          ) : results.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={String(c.id) === value}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-gray-100' : ''} ${String(c.id) === value ? 'font-medium text-blue-700' : 'text-gray-800'}`}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
