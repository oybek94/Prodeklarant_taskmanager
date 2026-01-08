import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import MonetaryInput from '../components/MonetaryInput';
import { validateMonetaryFields, isValidMonetaryFields, type MonetaryValidationErrors } from '../utils/validation';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { formatCurrencyForRole, shouldShowExchangeRate, type Role } from '../utils/currencyFormatting';

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
  currency?: string;
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
  const [showPreviousYearDebtForm, setShowPreviousYearDebtForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [previousYearDebts, setPreviousYearDebts] = useState<any[]>([]);
  const [previousYearDebtForm, setPreviousYearDebtForm] = useState({
    workerId: '',
    totalEarned: '',
    totalPaid: '',
    year: (new Date().getFullYear() - 1).toString(),
    comment: '',
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [workerStats, setWorkerStats] = useState<{
    totalEarned: number;
    totalPaid: number;
    totalPending: number;
  } | null>(null);
  const [previousYearDebt, setPreviousYearDebt] = useState<{
    totalEarned: number;
    totalPaid: number;
    balance: number;
  } | null>(null);
  const [form, setForm] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE' | 'SALARY',
    amount: '',
    currency: 'USD' as 'USD' | 'UZS',
    exchangeRate: '',
    paymentMethod: '' as '' | 'CASH' | 'CARD',
    comment: '',
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    workerId: '',
    expenseCategory: '',
  });
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [monetaryErrors, setMonetaryErrors] = useState<MonetaryValidationErrors>({});

  useEffect(() => {
    loadTransactions();
    loadClients();
    loadWorkers();
    if (user?.role === 'ADMIN') {
      loadMonthlyStats();
      loadWorkerStats();
      loadPreviousYearDebts();
    } else if (user?.id) {
      // Ishchi uchun o'zining ish xaqi statistikasini yuklash
      loadWorkerStatsForUser(user.id);
    }
  }, [user]);

  const loadPreviousYearDebts = async () => {
    try {
      const previousYear = new Date().getFullYear() - 1;
      const response = await apiClient.get(`/workers/previous-year-debts?year=${previousYear}`);
      setPreviousYearDebts(response.data || []);
    } catch (error) {
      console.error('Error loading previous year debts:', error);
    }
  };

  const handleSavePreviousYearDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/workers/previous-year-debts', previousYearDebtForm);
      setShowPreviousYearDebtForm(false);
      setPreviousYearDebtForm({
        workerId: '',
        totalEarned: '',
        totalPaid: '',
        year: (new Date().getFullYear() - 1).toString(),
        comment: '',
      });
      await loadPreviousYearDebts();
      await loadWorkerStats(); // Yangilash
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const loadMonthlyStats = async () => {
    try {
      const response = await apiClient.get('/transactions/stats/monthly');
      // Backend returns { accounting: { income, expense, net }, ... }
      // Frontend expects { income, expense, net }
      if (response.data?.accounting) {
        setMonthlyStats(response.data.accounting);
      } else {
        setMonthlyStats(response.data);
      }
    } catch (error) {
      console.error('Error loading monthly stats:', error);
      setMonthlyStats(null);
    }
  };

  const loadWorkerStats = async () => {
    try {
      const response = await apiClient.get('/transactions/worker-stats');
      setWorkerStats(response.data);
      
      // O'tgan yil qarzlarini yuklash (admin uchun)
      const previousYear = new Date().getFullYear() - 1;
      try {
        const debtsResponse = await apiClient.get(`/workers/previous-year-debts?year=${previousYear}`);
        // O'tgan yil qarzlarini saqlash (keyinchalik ko'rsatish uchun)
        // Bu yerda faqat yuklaymiz, hisob-kitoblar backend'da bo'lishi kerak
      } catch (debtError) {
        // Xato bo'lsa, e'tiborsiz qoldiramiz
      }
    } catch (error) {
      console.error('Error loading worker stats:', error);
    }
  };

  const loadWorkerStatsForUser = async (workerId: number) => {
    try {
      // KPI loglar yig'indisini olish (ishlab topgan jami ish xaqi)
      const statsResponse = await apiClient.get(`/workers/${workerId}/stats?period=all`);
      const totalKPI = statsResponse.data.totalKPI || 0;
      
      // To'langan ish xaqi va to'lanmagan ish xaqi uchun stage-stats dan foydalanamiz
      const stageStatsResponse = await apiClient.get(`/workers/${workerId}/stage-stats?period=all`);
      const totals = stageStatsResponse.data.totals;
      
      // O'tgan yil qarzini yuklash
      const previousYear = new Date().getFullYear() - 1;
      let previousYearDebtData = null;
      try {
        const debtResponse = await apiClient.get(`/workers/${workerId}/previous-year-debt?year=${previousYear}`);
        if (debtResponse.data) {
          previousYearDebtData = {
            totalEarned: Number(debtResponse.data.totalEarned || 0),
            totalPaid: Number(debtResponse.data.totalPaid || 0),
            balance: Number(debtResponse.data.balance || 0),
          };
          setPreviousYearDebt(previousYearDebtData);
        } else {
          setPreviousYearDebt(null);
        }
      } catch (debtError) {
        // O'tgan yil qarzi yo'q bo'lishi mumkin
        setPreviousYearDebt(null);
      }
      
      // O'tgan yil qarzini hisob-kitoblarga qo'shish
      const previousYearBalance = previousYearDebtData?.balance || 0;
      
      setWorkerStats({
        totalEarned: totalKPI + (previousYearDebtData?.totalEarned || 0), // Joriy + o'tgan yil ish haqi
        totalPaid: totals.totalReceived + (previousYearDebtData?.totalPaid || 0), // Joriy + o'tgan yil to'langan
        totalPending: (totalKPI - totals.totalReceived) + (previousYearBalance), // Joriy + o'tgan yil qarz
      });
    } catch (error) {
      console.error('Error loading worker stats for user:', error);
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
      // Use /api/workers endpoint instead of /api/users
      const response = await apiClient.get('/workers');
      if (Array.isArray(response.data)) {
        // Filter to show only DEKLARANT, ADMIN, and MANAGER roles
        setWorkers(response.data.filter((u: any) => u.role === 'DEKLARANT' || u.role === 'ADMIN' || u.role === 'MANAGER'));
      } else {
        console.error('Invalid response format:', response.data);
        setWorkers([]);
      }
    } catch (error: any) {
      console.error('Error loading workers:', error);
      // If error, set empty array to prevent crashes
      setWorkers([]);
      // Only show error if it's not a 403 (forbidden) - user might not have permission
      if (error.response?.status !== 403) {
        console.warn('Failed to load workers, continuing with empty list');
      }
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

      // Include exchangeRate if provided and currency is USD
      if (form.exchangeRate && form.currency === 'USD') {
        payload.exchangeRate = parseFloat(form.exchangeRate);
      }

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
        exchangeRate: '',
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
      exchangeRate: '', // Don't show exchange rate in edit form (immutable)
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
        exchangeRate: '',
        paymentMethod: '',
        comment: '',
        date: new Date().toISOString().split('T')[0],
        clientId: '',
        workerId: '',
        expenseCategory: '',
      });
      setMonetaryErrors({});
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

  const formatCurrency = (amount: number, currency: string = 'UZS') => {
    if (currency === 'UZS') {
      // UZS (sum) uchun: 6 016 640 sum formatida (sum kichik shriftda)
      const formatted = new Intl.NumberFormat('uz-UZ', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount).replace(/,/g, ' ');
      return (
        <>
          {formatted} <small className="text-sm opacity-75">sum</small>
        </>
      );
    } else {
      // USD uchun
      return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount).replace(/,/g, ' ');
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Calculate totals from transactions
  const calculateTotals = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalSalary = transactions
      .filter(t => t.type === 'SALARY')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const netBalance = totalIncome - totalExpense - totalSalary;
    
    return { totalIncome, totalExpense, totalSalary, netBalance };
  };

  const totals = calculateTotals();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        {user?.role === 'ADMIN' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreviousYearDebtForm(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              O'tgan yil qarzlarini yozish
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Transaction
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {/* Barcha foydalanuvchilar uchun ish xaqi statistikasi */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
          <div className="text-xs text-green-600 mb-1">Jami ish xaqi</div>
          <div className="text-xl font-bold text-green-800">
            {workerStats ? (
              <CurrencyDisplay amount={Number(workerStats.totalEarned)} originalCurrency="USD" />
            ) : 'Yuklanmoqda...'}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
          <div className="text-xs text-purple-600 mb-1">Jami to'langan ish xaqi</div>
          <div className="text-xl font-bold text-purple-800">
            {workerStats ? (
              <CurrencyDisplay amount={Number(workerStats.totalPaid)} originalCurrency="USD" />
            ) : 'Yuklanmoqda...'}
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 border-2 border-orange-200">
          <div className="text-xs text-orange-600 mb-1">Jami to'lanmagan ish xaqi</div>
          <div className={`text-xl font-bold ${workerStats && workerStats.totalPending >= 0 ? 'text-orange-800' : 'text-red-800'}`}>
            {workerStats ? (
              <CurrencyDisplay amount={Number(workerStats.totalPending)} originalCurrency="USD" />
            ) : 'Yuklanmoqda...'}
          </div>
        </div>
      </div>

      {/* Monthly Stats Cards */}
      {user?.role === 'ADMIN' && monthlyStats && monthlyStats.income && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Income Card */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-lg p-4 relative border border-blue-400 overflow-hidden">
            <div className="absolute top-2 right-2">
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                monthlyStats.income?.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{monthlyStats.income?.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(monthlyStats.income?.change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white bg-opacity-25 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-blue-100 font-medium">Oylik Kirim</div>
            </div>
            <div className="text-2xl font-bold text-white drop-shadow-lg">
              {formatCurrency(monthlyStats.income?.current || 0, monthlyStats.currency || 'UZS')}
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-lg p-4 relative border border-blue-400 overflow-hidden">
            <div className="absolute top-2 right-2">
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                monthlyStats.expense?.change >= 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{monthlyStats.expense?.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(monthlyStats.expense?.change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white bg-opacity-25 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-sm text-blue-100 font-medium">Oylik Chiqim</div>
            </div>
            <div className="text-2xl font-bold text-white drop-shadow-lg">
              {formatCurrency(monthlyStats.expense?.current || 0, monthlyStats.currency || 'UZS')}
            </div>
          </div>

          {/* Net Card */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-lg p-4 relative border border-blue-400 overflow-hidden">
            <div className="absolute top-2 right-2">
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                monthlyStats.net?.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{monthlyStats.net?.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(monthlyStats.net?.change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white bg-opacity-25 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-sm text-blue-100 font-medium">Foyda</div>
            </div>
            <div className="text-2xl font-bold text-white drop-shadow-lg">
              {formatCurrency(monthlyStats.net?.current || 0, monthlyStats.currency || 'UZS')}
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

      {/* Previous Year Debt Form Modal */}
      {showPreviousYearDebtForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPreviousYearDebtForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">O'tgan yil qarzlarini yozish</h2>
              <button
                onClick={() => setShowPreviousYearDebtForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSavePreviousYearDebt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ishchi</label>
                <select
                  value={previousYearDebtForm.workerId}
                  onChange={(e) => setPreviousYearDebtForm({ ...previousYearDebtForm, workerId: e.target.value })}
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
                  value={previousYearDebtForm.year}
                  onChange={(e) => setPreviousYearDebtForm({ ...previousYearDebtForm, year: e.target.value })}
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
                    value={previousYearDebtForm.totalEarned}
                    onChange={(e) => setPreviousYearDebtForm({ ...previousYearDebtForm, totalEarned: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jami to'langan ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={previousYearDebtForm.totalPaid}
                    onChange={(e) => setPreviousYearDebtForm({ ...previousYearDebtForm, totalPaid: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <textarea
                  value={previousYearDebtForm.comment}
                  onChange={(e) => setPreviousYearDebtForm({ ...previousYearDebtForm, comment: e.target.value })}
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
                  onClick={() => setShowPreviousYearDebtForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </form>

            {/* Existing Previous Year Debts List */}
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
      )}
    </div>
  );
};

export default Transactions;
