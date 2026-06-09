import React, { useState, useEffect } from 'react';
import DateInput from '../../components/DateInput';
import MonetaryInput from '../../components/MonetaryInput';
import type { MonetaryValidationErrors } from '../../utils/validation';
import type { TransactionFormData, Client, User } from './types';

interface TransactionFormModalProps {
  isMobile: boolean;
  isNewTransactionRoute: boolean;
  editTransactionId: number | null;
  form: TransactionFormData;
  setForm: (form: TransactionFormData) => void;
  clients: Client[];
  workers: User[];
  expenseCategories: string[];
  newExpenseCategory: string;
  setNewExpenseCategory: (val: string) => void;
  onAddExpenseCategory: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing: boolean;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = React.memo(({
  isMobile,
  isNewTransactionRoute,
  editTransactionId,
  form,
  setForm,
  clients,
  workers,
  expenseCategories,
  newExpenseCategory,
  setNewExpenseCategory,
  onAddExpenseCategory,
  onSubmit,
  onClose,
  isEditing,
}) => {
  const [monetaryErrors, setMonetaryErrors] = useState<MonetaryValidationErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e);
  };

  const isFullScreen = isMobile && (isEditing ? editTransactionId !== null : isNewTransactionRoute);

  return (
    <div
      className={isFullScreen
        ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
        : 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm'}
      style={isFullScreen ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={isFullScreen
          ? 'bg-white w-full h-full p-6 overflow-y-auto'
          : 'bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'}
        style={isFullScreen ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Transactionni tahrirlash' : 'Yangi transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'INCOME' })}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${form.type === 'INCOME'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'
                  }`}
              >
                INCOME
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'EXPENSE' })}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${form.type === 'EXPENSE'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-red-500'
                  }`}
              >
                EXPENSE
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'SALARY' })}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${form.type === 'SALARY'
                  ? 'bg-yellow-500 border-yellow-500 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-500'
                  }`}
              >
                SALARY
              </button>
            </div>
          </div>

          {form.type === 'INCOME' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tanlang...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'EXPENSE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xarajat kategoriyasi
              </label>
              <div className="space-y-2">
                <select
                  value={form.expenseCategory}
                  onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tanlang...</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    placeholder="Yangi kategoriya"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={onAddExpenseCategory}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Qo'shish
                  </button>
                </div>
              </div>
            </div>
          )}

          {form.type === 'SALARY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ishchi</label>
              <select
                value={form.workerId}
                onChange={(e) => setForm({ ...form, workerId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tanlang...</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id.toString()}>
                    {w.name}
                  </option>
                ))}
              </select>

              {!isEditing && (
                <div className="mt-3 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="isLegacyPayment"
                    checked={form.isLegacyPayment}
                    onChange={(e) => setForm({ ...form, isLegacyPayment: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="isLegacyPayment" className="text-sm font-medium text-gray-700 cursor-pointer">
                    O'tgan mavsum qarzidan chegirish (USD balans)
                  </label>
                </div>
              )}
            </div>
          )}

          {(form.type === 'EXPENSE' || form.type === 'SALARY') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Virtual Karta (ixtiyoriy)
              </label>
              <select
                value={form.virtualCardId}
                onChange={(e) => setForm({ ...form, virtualCardId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Karta tanlang (ixtiyoriy)</option>
                <option value="1">1-karta: Operatsion xarajatlar</option>
                <option value="2">2-karta: Qarzlar kartasi</option>
                <option value="3">3-karta: Korxona xarajatlari</option>
                <option value="4">4-karta: Maosh kartam</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Tanlangan kartadan ushbu summa ayirib tashlanadi</p>
            </div>
          )}


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
            <DateInput
              value={form.date}
              onChange={(value) => setForm({ ...form, date: value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <MonetaryInput
            amount={form.amount}
            currency={form.currency}
            exchangeRate={form.exchangeRate}
            date={form.date}
            onAmountChange={(value) => {
              setForm({ ...form, amount: value });
              setMonetaryErrors({ ...monetaryErrors, amount: undefined });
            }}
            onCurrencyChange={(value) => {
              setForm({ ...form, currency: value });
              setMonetaryErrors({ ...monetaryErrors, currency: undefined });
            }}
            onExchangeRateChange={(value) => {
              setForm({ ...form, exchangeRate: value });
              setMonetaryErrors({ ...monetaryErrors, exchangeRate: undefined });
            }}
            label="Summa"
            required
            showLabels={true}
            currencyRules={{
              allowed: form.paymentMethod === 'CARD' ? ['UZS'] : undefined,
              exchangeRateRequired: true,
            }}
            errors={monetaryErrors}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To'lov usuli
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, paymentMethod: 'CASH' })}
                className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${form.paymentMethod === 'CASH'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
              >
                Naqt
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, paymentMethod: 'CARD', currency: 'UZS' });
                }}
                className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${form.paymentMethod === 'CARD'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
              >
                Karta
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Bekor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
