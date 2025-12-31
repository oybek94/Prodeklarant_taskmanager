import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  paymentMethod?: 'CASH' | 'CARD';
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
  const { user } = useAuth();
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
    currency: 'USD' as 'USD' | 'UZS',
    paymentMethod: '' as '' | 'CASH' | 'CARD',
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
    if (user?.role === 'ADMIN') {
      loadMonthlyStats();
    }
  }, [user]);

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
      if (user?.role === 'ADMIN') {
        const response = await apiClient.get('/users');
        setWorkers(Array.isArray(response.data) 
          ? response.data.filter((u: any) => u.role === 'DEKLARANT' || u.role === 'ADMIN' || u.role === 'MANAGER')
          : []);
      } else {
        // Admin bo'lmagan foydalanuvchilar uchun bo'sh array
        setWorkers([]);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      setWorkers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency,
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
        currency: 'USD',
        paymentMethod: '',
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
      currency: (transaction.currency || 'USD') as 'USD' | 'UZS',
      paymentMethod: (transaction.paymentMethod || '') as '' | 'CASH' | 'CARD',
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
        currency: form.currency,
        paymentMethod: form.paymentMethod || undefined,
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
        currency: 'USD',
        paymentMethod: '',
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
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Transaction
          </button>
        )}
      </div>

      {/* Monthly Stats Cards */}
      {user?.role === 'ADMIN' && monthlyStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Income Card */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                monthlyStats.income.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{monthlyStats.income.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(monthlyStats.income.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">
              {formatCurrency(monthlyStats.income.current)}
            </div>
            <div className="text-sm text-blue-100 relative z-10 font-medium mb-2">Oylik Kirim</div>
            <div className="text-xs text-blue-200 relative z-10">Oxirgi oy bilan solishtirganda</div>
          </div>

          {/* Expense Card */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                monthlyStats.expense.change >= 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{monthlyStats.expense.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(monthlyStats.expense.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">
              {formatCurrency(monthlyStats.expense.current)}
            </div>
            <div className="text-sm text-blue-100 relative z-10 font-medium mb-2">Oylik Chiqim</div>
            <div className="text-xs text-blue-200 relative z-10">Oxirgi oy bilan solishtirganda</div>
          </div>

          {/* Net Card */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                monthlyStats.net.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{monthlyStats.net.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(monthlyStats.net.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className={`text-3xl font-bold mb-1 relative z-10 drop-shadow-lg ${
              monthlyStats.net.current >= 0 ? 'text-white' : 'text-white'
            }`}>
              {formatCurrency(monthlyStats.net.current)}
            </div>
            <div className="text-sm text-blue-100 relative z-10 font-medium mb-2">Foyda</div>
            <div className="text-xs text-blue-200 relative z-10">Oxirgi oy bilan solishtirganda</div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valyuta <span className="text-red-500">*</span></label>
                  <select
                    value={form.currency}
                    onChange={(e) => {
                      const newCurrency = e.target.value as 'USD' | 'UZS';
                      // Agar CARD tanlangan va USD tanlansa, ruxsat bermaslik
                      if (form.paymentMethod === 'CARD' && newCurrency === 'USD') {
                        alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
                        return;
                      }
                      setForm({ ...form, currency: newCurrency });
                    }}
                    required
                    disabled={form.paymentMethod === 'CARD'} // Karta tanlanganida faqat UZS
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="USD" disabled={form.paymentMethod === 'CARD'}>USD</option>
                    <option value="UZS">UZS</option>
                  </select>
                  {form.paymentMethod === 'CARD' && (
                    <p className="text-xs text-gray-500 mt-1">Karta faqat UZS valyutasida</p>
                  )}
                </div>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To'lov usuli
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: 'CASH' })}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                    form.paymentMethod === 'CASH'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  Naqt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Karta tanlansa, currency avtomatik UZS bo'ladi
                    setForm({ ...form, paymentMethod: 'CARD', currency: 'UZS' });
                  }}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                    form.paymentMethod === 'CARD'
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valyuta <span className="text-red-500">*</span></label>
                  <select
                    value={form.currency}
                    onChange={(e) => {
                      const newCurrency = e.target.value as 'USD' | 'UZS';
                      // Agar CARD tanlangan va USD tanlansa, ruxsat bermaslik
                      if (form.paymentMethod === 'CARD' && newCurrency === 'USD') {
                        alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
                        return;
                      }
                      setForm({ ...form, currency: newCurrency });
                    }}
                    required
                    disabled={form.paymentMethod === 'CARD'} // Karta tanlanganida faqat UZS
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="USD" disabled={form.paymentMethod === 'CARD'}>USD</option>
                    <option value="UZS">UZS</option>
                  </select>
                  {form.paymentMethod === 'CARD' && (
                    <p className="text-xs text-gray-500 mt-1">Karta faqat UZS valyutasida</p>
                  )}
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To'lov usuli
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: 'CASH' })}
                    className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                      form.paymentMethod === 'CASH'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    Naqt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Karta tanlansa, currency avtomatik UZS bo'ladi
                      setForm({ ...form, paymentMethod: 'CARD', currency: 'UZS' });
                    }}
                    className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                      form.paymentMethod === 'CARD'
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-xl overflow-hidden border-2 border-blue-200">
          <table className="min-w-full divide-y divide-blue-100">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Client/Worker/Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  To'lov usuli
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-blue-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 bg-blue-50">
                    Ma'lumotlar yo'q
                  </td>
                </tr>
              ) : (
                transactions.map((t, index) => (
                  <tr key={t.id} className={`hover:bg-blue-100 transition-colors ${
                    index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                  }`}>
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
                      {t.paymentMethod ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          t.paymentMethod === 'CASH'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {t.paymentMethod === 'CASH' ? 'Naqt' : 'Karta'}
                        </span>
                      ) : (
                        '-'
                      )}
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
                      {user?.role === 'ADMIN' ? (
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
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
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
