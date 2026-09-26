import { Icon } from '@iconify/react';
import { TableSkeleton } from '../common/Skeleton';
import { formatDateTime } from '../../utils/dateFormatting';
import { counterpartyOf, formatSom, PAYMENT_LABEL, TONE_CLASSES, TYPE_META } from './format';
import type { Transaction } from './types';

interface TransactionsTableProps {
  items: Transaction[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  canEdit: (t: Transaction) => boolean;
  canDelete: (t: Transaction) => boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onPageChange: (page: number) => void;
}

function pageList(page: number, totalPages: number): (number | '…')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => { if (i > 0 && p - sorted[i - 1] > 1) out.push('…'); out.push(p); });
  return out;
}

export function TransactionsTable({ items, loading, total, page, totalPages, pageSize, canEdit, canDelete, onEdit, onDelete, onPageChange }: TransactionsTableProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {loading ? (
        <div className="p-4"><TableSkeleton columns={6} rows={8} /></div>
      ) : items.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <Icon icon="solar:bill-list-bold-duotone" className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">Tranzaksiya topilmadi</p>
          <p className="mt-1 text-sm text-gray-500">Filtrlarni o'zgartirib ko'ring</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-2.5">Sana</th>
                <th className="px-4 py-2.5">Tur</th>
                <th className="px-4 py-2.5">Kim / nima</th>
                <th className="px-4 py-2.5">Izoh</th>
                <th className="px-4 py-2.5">To'lov</th>
                <th className="px-4 py-2.5 text-right">Summa, so'm</th>
                <th className="w-20 px-2 py-2.5"><span className="sr-only">Amallar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => {
                const meta = TYPE_META[t.type];
                const tone = TONE_CLASSES[meta.tone];
                return (
                  <tr key={t.id} className="group hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600">{formatDateTime(t.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-gray-700"><span className={`h-2 w-2 rounded-full ${tone.dot}`} />{meta.label}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-gray-900" title={counterpartyOf(t)}>{counterpartyOf(t)}</td>
                    <td className="max-w-[260px] truncate px-4 py-2.5 text-gray-500" title={t.comment || undefined}>{t.comment || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{t.paymentMethod ? PAYMENT_LABEL[t.paymentMethod] : '—'}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${tone.amount}`}>
                      {meta.sign}{formatSom(t.amount)}{t.currency !== 'UZS' && <span className="ml-1 text-xs text-gray-400">{t.currency}</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        {canEdit(t) && (
                          <button type="button" onClick={() => onEdit(t)} title="Tahrirlash" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                            <Icon icon="solar:pen-bold-duotone" className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete(t) && (
                          <button type="button" onClick={() => onDelete(t)} title="O'chirish" className="rounded-md p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600">
                            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-500">
          <span className="tabular-nums">{from}–{to} / {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40" title="Oldingi">
                <Icon icon="solar:alt-arrow-left-bold-duotone" className="h-4 w-4" />
              </button>
              {pageList(page, totalPages).map((p, i) => p === '…'
                ? <span key={`gap-${i}`} className="px-1">…</span>
                : <button key={p} type="button" onClick={() => onPageChange(p)} className={`min-w-8 rounded-md px-2 py-1 tabular-nums ${p === page ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>{p}</button>)}
              <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40" title="Keyingi">
                <Icon icon="solar:alt-arrow-right-bold-duotone" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
