import React from 'react';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import type { User, PreviousYearDebtFormData } from './types';

interface PreviousYearDebtModalProps {
  form: PreviousYearDebtFormData;
  setForm: (form: PreviousYearDebtFormData) => void;
  workers: User[];
  previousYearDebts: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const PreviousYearDebtModal: React.FC<PreviousYearDebtModalProps> = React.memo(({
  form,
  setForm,
  workers,
  previousYearDebts,
  onSubmit,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">O'tgan yil qarzlarini yozish</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yil</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jami ish haqi ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.totalEarned}
                onChange={(e) => setForm({ ...form, totalEarned: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jami to'langan ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.totalPaid}
                onChange={(e) => setForm({ ...form, totalPaid: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
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

        {previousYearDebts.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Yozilgan qarzlar</h3>
            <div className="space-y-2">
              {previousYearDebts.map((debt) => (
                <div key={debt.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{debt.worker.name}</div>
                      <div className="text-sm text-gray-600">
                        Ish haqi: <CurrencyDisplay amount={Number(debt.totalEarned)} originalCurrency="USD" /> |
                        To'langan: <CurrencyDisplay amount={Number(debt.totalPaid)} originalCurrency="USD" /> |
                        Qarz: <CurrencyDisplay amount={Number(debt.balance)} originalCurrency="USD" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{debt.year} yil</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
