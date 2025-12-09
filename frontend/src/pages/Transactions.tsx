import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

// Handle ESC key to close modal
const useEscKey = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);
};

interface Transaction {
  id: number;
  type: 'INCOME' | 'EXPENSE' | 'SALARY';
  amount: number;
  currency: string;
  comment?: string;
  date: string;
  client?: { id: number; name: string };
  worker?: { id: number; name: string };
  expenseCategory?: string;
}

interface Client {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

interface MonthlyStats {
  income: { current: number; change: number };
  expense: { current: number; change: number };
  net: { current: number; change: number };
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [form, setForm] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE' | 'SALARY',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    workerId: '',
    expenseCategory: '',
  });

  useEffect(() => {
    loadTransactions();
    loadClients();
    loadWorkers();
    loadMonthlyStats();
  }, []);

  const loadMonthlyStats = async () => {
    try {
      const response = await apiClient.get('/transactions/stats/monthly');
      setMonthlyStats(response.data);
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    }
  };

  // Handle ESC key to close modals
  useEscKey(showForm, () => setShowForm(false));
  useEscKey(showEditModal, () => {
    setShowEditModal(false);
    setEditingTransaction(null);
  });

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadWorkers = async () => {
    try {
      const response = await apiClient.get('/users');
      setWorkers(response.data.filter((u: any) => u.role === 'WORKER'));
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: 'USD',
        comment: form.comment,
        date: new Date(form.date),
      };

      if (form.type === 'INCOME') {
        if (!form.clientId) {
          alert('Mijozni tanlang');
          return;
        }
        payload.clientId = parseInt(form.clientId);
      } else if (form.type === 'EXPENSE') {
        if (!form.expenseCategory) {
          alert('Xarajat kategoriyasini kiriting');
          return;
        }
        payload.expenseCategory = form.expenseCategory;
      } else if (form.type === 'SALARY') {
        if (!form.workerId) {
          alert('Ishchini tanlang');
          return;
        }
        payload.workerId = parseInt(form.workerId);
      }

      await apiClient.post('/transactions', payload);
      setShowForm(false);
      setForm({
        type: 'INCOME',
        amount: '',
        comment: '',
        date: new Date().toISOString().split('T')[0],
        clientId: '',
        workerId: '',
        expenseCategory: '',
      });
      await loadTransactions();
      await loadMonthlyStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    // Reset form with transaction data
    const newForm = {
      type: transaction.type,
      amount: transaction.amount.toString(),
      comment: transaction.comment || '',
      date: new Date(transaction.date).toISOString().split('T')[0],
      clientId: transaction.client?.id ? transaction.client.id.toString() : '',
      workerId: transaction.worker?.id ? transaction.worker.id.toString() : '',
      expenseCategory: transaction.expenseCategory || '',
    };
    setForm(newForm);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const payload: any = {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: 'USD',
        comment: form.comment,
        date: new Date(form.date),
      };

      if (form.type === 'INCOME') {
        if (!form.clientId) {
          alert('Mijozni tanlang');
          return;
        }
        payload.clientId = parseInt(form.clientId);
      } else if (form.type === 'EXPENSE') {
        if (!form.expenseCategory) {
          alert('Xarajat kategoriyasini kiriting');
          return;
        }
        payload.expenseCategory = form.expenseCategory;
      } else if (form.type === 'SALARY') {
        if (!form.workerId) {
          alert('Ishchini tanlang');
          return;
        }
        payload.workerId = parseInt(form.workerId);
      }

      await apiClient.put(`/transactions/${editingTransaction.id}`, payload);
      setShowEditModal(false);
      setEditingTransaction(null);
      setForm({
        type: 'INCOME',
        amount: '',
        comment: '',
        date: new Date().toISOString().split('T')[0],
        clientId: '',
        workerId: '',
        expenseCategory: '',
      });
      await loadTransactions();
      await loadMonthlyStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu transactionni o\'chirishni xohlaysizmi?')) return;

    try {
      await apiClient.delete(`/transactions/${id}`);
      await loadTransactions();
      await loadMonthlyStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Transaction
        </button>
      </div>

      {/* Monthly Stats Cards */}
      {monthlyStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Income Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Oylik Kirim</h3>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                monthlyStats.income.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {monthlyStats.income.change >= 0 ? '↑' : '↓'} {formatChange(monthlyStats.income.change)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(monthlyStats.income.current)}
            </div>
            <div className="text-xs text-gray-500">Oxirgi oy bilan solishtirganda</div>
            {/* Simple line chart placeholder */}
            <div className="mt-4 h-12 flex items-end gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="flex-1 bg-green-200 rounded-t"
                  style={{ height: `${Math.random() * 60 + 20}%` }}
                />
              ))}
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Oylik Chiqim</h3>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                monthlyStats.expense.change >= 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {monthlyStats.expense.change >= 0 ? '↑' : '↓'} {formatChange(monthlyStats.expense.change)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(monthlyStats.expense.current)}
            </div>
            <div className="text-xs text-gray-500">Oxirgi oy bilan solishtirganda</div>
            {/* Simple line chart placeholder */}
            <div className="mt-4 h-12 flex items-end gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="flex-1 bg-red-200 rounded-t"
                  style={{ height: `${Math.random() * 60 + 20}%` }}
                />
              ))}
            </div>
          </div>

          {/* Net Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Foyda</h3>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                monthlyStats.net.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {monthlyStats.net.change >= 0 ? '↑' : '↓'} {formatChange(monthlyStats.net.change)}
              </div>
            </div>
            <div className={`text-2xl font-bold mb-2 ${
              monthlyStats.net.current >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(monthlyStats.net.current)}
            </div>
            <div className="text-xs text-gray-500">Oxirgi oy bilan solishtirganda</div>
            {/* Simple line chart placeholder */}
            <div className="mt-4 h-12 flex items-end gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    monthlyStats.net.current >= 0 ? 'bg-green-200' : 'bg-red-200'
                  }`}
                  style={{ height: `${Math.random() * 60 + 20}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Yangi transaction</h2>
              <button
                onClick={() => setShowForm(false)}
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
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    form.type === 'INCOME'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'
                  }`}
                >
                  INCOME
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'EXPENSE' })}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    form.type === 'EXPENSE'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-red-500'
                  }`}
                >
                  EXPENSE
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'SALARY' })}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    form.type === 'SALARY'
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
                <input
                  type="text"
                  value={form.expenseCategory}
                  onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })}
                  required
                  placeholder="Masalan: Transport, Ofis, Boshqa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
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
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summa</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
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
                onClick={() => setShowForm(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Bekor
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTransaction && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setEditingTransaction(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Transactionni tahrirlash</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTransaction(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'INCOME' })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      form.type === 'INCOME'
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'
                    }`}
                  >
                    INCOME
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'EXPENSE' })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      form.type === 'EXPENSE'
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    EXPENSE
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'SALARY' })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                      form.type === 'SALARY'
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
                  <input
                    type="text"
                    value={form.expenseCategory}
                    onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })}
                    required
                    placeholder="Masalan: Transport, Ofis, Boshqa..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
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
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summa</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
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
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTransaction(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client/Worker/Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    Ma'lumotlar yo'q
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          t.type === 'INCOME'
                            ? 'bg-green-100 text-green-800'
                            : t.type === 'EXPENSE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t.type === 'INCOME' && t.client
                        ? t.client.name
                        : t.type === 'SALARY' && t.worker
                        ? t.worker.name
                        : t.expenseCategory || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {t.amount} {t.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={t.comment || undefined}>
                        {t.comment || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                          title="O'zgartirish"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                          title="O'chirish"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Transactions;
