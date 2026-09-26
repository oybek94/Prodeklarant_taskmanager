import { Icon } from '@iconify/react';
import { Skeleton } from '../common/Skeleton';
import { formatDateTime } from '../../utils/dateFormatting';
import { counterpartyOf, formatSom, PAYMENT_LABEL, TONE_CLASSES, TYPE_META } from './format';
import type { Transaction } from './types';

interface TransactionsMobileListProps {
  items: Transaction[];
  loading: boolean;
  canEdit: (t: Transaction) => boolean;
  canDelete: (t: Transaction) => boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export function TransactionsMobileList({ items, loading, canEdit, canDelete, onEdit, onDelete }: TransactionsMobileListProps) {
  if (loading) {
    return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  }
  if (items.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">Tranzaksiya topilmadi</div>;
  }
  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {items.map((t) => {
        const meta = TYPE_META[t.type];
        const tone = TONE_CLASSES[meta.tone];
        return (
          <div key={t.id} className="flex items-start gap-3 px-3.5 py-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-medium text-gray-900">{counterpartyOf(t)}</p>
                <p className={`shrink-0 font-semibold tabular-nums ${tone.amount}`}>{meta.sign}{formatSom(t.amount)}</p>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {meta.label} · {formatDateTime(t.date)}{t.paymentMethod ? ` · ${PAYMENT_LABEL[t.paymentMethod]}` : ''}
              </p>
              {t.comment && <p className="mt-1 truncate text-xs text-gray-500">{t.comment}</p>}
            </div>
            {(canEdit(t) || canDelete(t)) && (
              <div className="flex shrink-0 gap-1">
                {canEdit(t) && (
                  <button type="button" onClick={() => onEdit(t)} className="rounded-md p-2 text-gray-500 active:bg-gray-100" aria-label="Tahrirlash">
                    <Icon icon="solar:pen-bold-duotone" className="h-4 w-4" />
                  </button>
                )}
                {canDelete(t) && (
                  <button type="button" onClick={() => onDelete(t)} className="rounded-md p-2 text-rose-500 active:bg-rose-50" aria-label="O'chirish">
                    <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
