import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import { ClientPicker } from './ClientPicker';
import { formatAmountInput, localIsoDate, shiftDays } from './formHelpers';
import type { Client, TransactionFormData, TransactionType, User } from './types';

interface TransactionFormModalProps {
  open: boolean;
  fullScreen: boolean;
  isEditing: boolean;
  isAdmin: boolean;
  currentUserName: string;
  form: TransactionFormData;
  onFormChange: (patch: Partial<TransactionFormData>) => void;
  clients: Client[];
  workers: User[];
  expenseCategories: string[];
  saving: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: TransactionType; label: string; icon: string; active: string }[] = [
  { value: 'INCOME', label: 'Kirim', icon: 'solar:arrow-left-down-bold-duotone', active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'EXPENSE', label: 'Chiqim', icon: 'solar:arrow-right-up-bold-duotone', active: 'border-rose-500 bg-rose-50 text-rose-700' },
  { value: 'SALARY', label: 'Ish haqi', icon: 'solar:user-hand-up-bold-duotone', active: 'border-blue-500 bg-blue-50 text-blue-700' },
];

const VIRTUAL_CARDS = [
  { value: '1', label: '1-karta: Operatsion xarajatlar' },
  { value: '2', label: '2-karta: Qarzlar kartasi' },
  { value: '3', label: '3-karta: Korxona xarajatlari' },
  { value: '4', label: '4-karta: Maosh kartam' },
];

const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700';
const chip = (on: boolean) => `rounded-lg border px-3 py-1.5 text-sm font-medium ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`;

export function TransactionFormModal({
  open, fullScreen, isEditing, isAdmin, currentUserName, form, onFormChange,
  clients, workers, expenseCategories, saving, error, onSubmit, onClose,
}: TransactionFormModalProps) {
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    amountRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = isEditing ? 'Tranzaksiyani tahrirlash' : isAdmin ? 'Yangi tranzaksiya' : "Olgan pulimni qo'shish";
  const categories = form.expenseCategory && !expenseCategories.includes(form.expenseCategory)
    ? [...expenseCategories, form.expenseCategory]
    : expenseCategories;
  const today = localIsoDate();
  const yesterday = shiftDays(today, -1);

  const addCategory = () => {
    const v = newCategory.trim();
    if (v) onFormChange({ expenseCategory: v });
    setNewCategory('');
    setAddingCategory(false);
  };

  return (
    <div
      className={fullScreen ? 'fixed inset-0 z-50 bg-white' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'}
      onClick={(e) => { if (!fullScreen && e.target === e.currentTarget) onClose(); }}
    >
      <div className={fullScreen ? 'flex h-full flex-col' : 'flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl'}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Yopish">
            <Icon icon="solar:close-circle-bold-duotone" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {!isAdmin && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                <p className="text-sm font-medium text-blue-900">{currentUserName}</p>
                <p className="mt-0.5 text-xs text-blue-700">Bu yozuv ish haqingizdan olingan pul sifatida qayd etiladi</p>
              </div>
            )}

            <div>
              <label className={labelCls} htmlFor="tx-amount">Summa</label>
              <div className="relative">
                <input
                  id="tx-amount"
                  ref={amountRef}
                  inputMode="numeric"
                  autoComplete="off"
                  value={formatAmountInput(form.amount)}
                  onChange={(e) => onFormChange({ amount: formatAmountInput(e.target.value) })}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-4 pr-16 text-2xl font-semibold tabular-nums text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">so'm</span>
              </div>
            </div>

            {isAdmin && (
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => onFormChange({ type: o.value })}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium ${form.type === o.value ? o.active : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Icon icon={o.icon} className="h-4 w-4" />
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {isAdmin && form.type === 'INCOME' && (
              <div>
                <span className={labelCls}>Mijoz</span>
                <ClientPicker clients={clients} value={form.clientId} onChange={(clientId) => onFormChange({ clientId })} />
              </div>
            )}

            {isAdmin && form.type === 'EXPENSE' && (
              <div>
                <span className={labelCls}>Xarajat kategoriyasi</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button key={c} type="button" onClick={() => onFormChange({ expenseCategory: c })} className={chip(form.expenseCategory === c)}>{c}</button>
                  ))}
                  {addingCategory ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } if (e.key === 'Escape') { e.stopPropagation(); setAddingCategory(false); } }}
                        placeholder="Kategoriya nomi"
                        className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button type="button" onClick={addCategory} className="rounded-lg bg-gray-900 px-2.5 text-sm font-medium text-white">OK</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingCategory(true)} className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">+ Yangi</button>
                  )}
                </div>
              </div>
            )}

            {isAdmin && form.type === 'SALARY' && (
              <div>
                <label className={labelCls} htmlFor="tx-worker">Ishchi</label>
                <select id="tx-worker" value={form.workerId} onChange={(e) => onFormChange({ workerId: e.target.value })} className={input}>
                  <option value="">Tanlang</option>
                  {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <span className={labelCls}>Sana</span>
                <div className="mb-2 flex gap-2">
                  <button type="button" onClick={() => onFormChange({ date: today })} className={chip(form.date === today)}>Bugun</button>
                  <button type="button" onClick={() => onFormChange({ date: yesterday })} className={chip(form.date === yesterday)}>Kecha</button>
                </div>
                <DateInput value={form.date} onChange={(v) => onFormChange({ date: v })} required className={input} />
              </div>
              <div>
                <span className={labelCls}>To'lov usuli</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['CASH', 'CARD'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => onFormChange({ paymentMethod: m })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${form.paymentMethod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Icon icon={m === 'CASH' ? 'solar:wallet-money-bold-duotone' : 'solar:card-bold-duotone'} className="h-4 w-4" />
                      {m === 'CASH' ? 'Naqd' : 'Karta'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isAdmin && form.type !== 'INCOME' && (
              <div>
                <label className={labelCls} htmlFor="tx-card">Virtual karta <span className="font-normal text-gray-400">(ixtiyoriy)</span></label>
                <select id="tx-card" value={form.virtualCardId} onChange={(e) => onFormChange({ virtualCardId: e.target.value })} className={input}>
                  <option value="">Tanlanmagan</option>
                  {VIRTUAL_CARDS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls} htmlFor="tx-comment">Izoh <span className="font-normal text-gray-400">(ixtiyoriy)</span></label>
              <textarea id="tx-comment" value={form.comment} onChange={(e) => onFormChange({ comment: e.target.value })} rows={2} className={input} />
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-3.5">
            {error && (
              <p role="alert" className="mb-3 flex items-center gap-1.5 text-sm text-rose-600">
                <Icon icon="solar:danger-circle-bold-duotone" className="h-4 w-4 shrink-0" />{error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Bekor qilish</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
