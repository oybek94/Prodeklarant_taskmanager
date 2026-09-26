import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import MonetaryInput from '../MonetaryInput';
import type { MonetaryValidationErrors } from '../../utils/validation';
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
  onSubmit: () => void;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: TransactionType; label: string; active: string }[] = [
  { value: 'INCOME', label: 'Kirim', active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'EXPENSE', label: 'Chiqim', active: 'border-rose-500 bg-rose-50 text-rose-700' },
  { value: 'SALARY', label: 'Ish haqi', active: 'border-blue-500 bg-blue-50 text-blue-700' },
];

const VIRTUAL_CARDS = [
  { value: '1', label: '1-karta: Operatsion xarajatlar' },
  { value: '2', label: '2-karta: Qarzlar kartasi' },
  { value: '3', label: '3-karta: Korxona xarajatlari' },
  { value: '4', label: '4-karta: Maosh kartam' },
];

const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

export function TransactionFormModal({
  open, fullScreen, isEditing, isAdmin, currentUserName, form, onFormChange,
  clients, workers, expenseCategories, saving, onSubmit, onClose,
}: TransactionFormModalProps) {
  const [monetaryErrors, setMonetaryErrors] = useState<MonetaryValidationErrors>({});
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = isEditing ? 'Tranzaksiyani tahrirlash' : isAdmin ? 'Yangi tranzaksiya' : "Olgan pulimni qo'shish";
  const categories = form.expenseCategory && !expenseCategories.includes(form.expenseCategory)
    ? [...expenseCategories, form.expenseCategory]
    : expenseCategories;

  return (
    <div
      className={fullScreen ? 'fixed inset-0 z-50 bg-white' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'}
      onClick={(e) => { if (!fullScreen && e.target === e.currentTarget) onClose(); }}
    >
      <div className={fullScreen ? 'h-full overflow-y-auto p-4' : 'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl'}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Yopish">
            <Icon icon="solar:close-circle-bold-duotone" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          {!isAdmin && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
              <p className="text-sm font-medium text-blue-900">{currentUserName}</p>
              <p className="mt-0.5 text-xs text-blue-700">Bu yozuv ish haqingizdan olingan pul sifatida qayd etiladi</p>
            </div>
          )}

          {isAdmin && (
            <div>
              <span className={labelCls}>Tur</span>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => onFormChange({ type: o.value })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${form.type === o.value ? o.active : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isAdmin && form.type === 'INCOME' && (
            <div>
              <label className={labelCls} htmlFor="tx-client">Mijoz</label>
              <select id="tx-client" value={form.clientId} onChange={(e) => onFormChange({ clientId: e.target.value })} className={input} required>
                <option value="">Tanlang</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {isAdmin && form.type === 'EXPENSE' && (
            <div>
              <label className={labelCls} htmlFor="tx-category">Xarajat kategoriyasi</label>
              <select id="tx-category" value={form.expenseCategory} onChange={(e) => onFormChange({ expenseCategory: e.target.value })} className={input} required>
                <option value="">Tanlang</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="mt-2 flex gap-2">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Yangi kategoriya" className={input} />
                <button type="button" onClick={() => { const v = newCategory.trim(); if (v) { onFormChange({ expenseCategory: v }); setNewCategory(''); } }}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Qo'shish</button>
              </div>
            </div>
          )}

          {isAdmin && form.type === 'SALARY' && (
            <div>
              <label className={labelCls} htmlFor="tx-worker">Ishchi</label>
              <select id="tx-worker" value={form.workerId} onChange={(e) => onFormChange({ workerId: e.target.value })} className={input} required>
                <option value="">Tanlang</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Sana</label>
              <DateInput value={form.date} onChange={(v) => onFormChange({ date: v })} required className={input} />
            </div>
            <div>
              <span className={labelCls}>To'lov usuli</span>
              <div className="grid grid-cols-2 gap-2">
                {(['CASH', 'CARD'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => onFormChange({ paymentMethod: m })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${form.paymentMethod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {m === 'CASH' ? 'Naqd' : 'Karta'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <MonetaryInput
            amount={form.amount}
            currency={form.currency || 'UZS'}
            date={form.date}
            onAmountChange={(value) => { onFormChange({ amount: value }); setMonetaryErrors((e) => ({ ...e, amount: undefined })); }}
            onCurrencyChange={(curr) => onFormChange({ currency: curr as 'USD' | 'UZS' })}
            label="Summa"
            required
            showLabels
            currencyRules={undefined}
            errors={monetaryErrors}
          />

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
            <label className={labelCls} htmlFor="tx-comment">Izoh</label>
            <textarea id="tx-comment" value={form.comment} onChange={(e) => onFormChange({ comment: e.target.value })} rows={2} className={input} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Bekor qilish</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
