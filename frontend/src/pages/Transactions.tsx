import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import MonetaryInput from '../components/MonetaryInput';
import DateInput from '../components/DateInput';
import { validateMonetaryFields, isValidMonetaryFields, type MonetaryValidationErrors } from '../utils/validation';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { formatCurrencyForRole, shouldShowExchangeRate, type Role } from '../utils/currencyFormatting';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../utils/useIsMobile';

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
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const TRANSACTIONS_PAGE_SIZE = 15;
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [transactionsTotalCount, setTransactionsTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    clientId: '',
    workerId: '',
    paymentMethod: '',
    search: '',
  });
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
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Transport',
    'Ofis',
    'Boshqa',
    'ST-1',
    'FITO',
    'AKT',
  ]);
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
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
  const isNewTransactionRoute = location.pathname === '/transactions/new';
  const editMatch = location.pathname.match(/^\/transactions\/(\d+)\/edit$/);
  const editTransactionId = editMatch ? Number(editMatch[1]) : null;
  const showTransactionForm = showForm || (isMobile && isNewTransactionRoute);
  const showEditTransactionForm = showEditModal || (isMobile && !!editTransactionId);

  useEffect(() => {
    loadTransactions();
  }, [transactionsPage, filters]);

  useEffect(() => {
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
  useEscKey(showTransactionForm, () => {
    if (isMobile && isNewTransactionRoute) {
      navigate('/transactions');
    } else {
      if (isMobile && isNewTransactionRoute) {
        navigate('/transactions');
      } else {
        setShowForm(false);
      }
    }
  });
  useEscKey(showEditTransactionForm, () => {
    if (isMobile && editTransactionId) {
      navigate('/transactions');
    } else {
      setShowEditModal(false);
      setEditingTransaction(null);
    }
  });

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const limit = TRANSACTIONS_PAGE_SIZE;
      const params = new URLSearchParams([
        ['page', transactionsPage.toString()],
        ['limit', limit.toString()],
        ...Object.entries(filters).filter(([_, v]) => v !== '')
      ]);
      const response = await apiClient.get(`/transactions?${params.toString()}`);
      
      const data = response.data?.data || response.data; // Support both old and new format temporarily
      setTransactions(Array.isArray(data) ? data : []);
      
      if (response.data?.totalPages) {
        setTransactionsTotalPages(response.data.totalPages);
        setTransactionsTotalCount(response.data.total);
      } else {
        // Fallback for old format
         setTransactionsTotalPages(Math.max(1, Math.ceil((Array.isArray(data) ? data.length : 0) / limit)));
         setTransactionsTotalCount(Array.isArray(data) ? data.length : 0);
      }

      const categorySet = new Set<string>(expenseCategories);
      (Array.isArray(data) ? data : [])
        .map((tx: Transaction) => tx.expenseCategory)
        .filter((category: string | undefined): category is string => Boolean(category && category.trim()))
        .forEach((category: string) => categorySet.add(category.trim()));
      setExpenseCategories(Array.from(categorySet));
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients?selectList=true');
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

  const handleAddExpenseCategory = () => {
    const trimmed = newExpenseCategory.trim();
    if (!trimmed) return;
    if (!expenseCategories.includes(trimmed)) {
      setExpenseCategories([...expenseCategories, trimmed]);
    }
    setForm({ ...form, expenseCategory: trimmed });
    setNewExpenseCategory('');
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
      setNewExpenseCategory('');
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

  useEffect(() => {
    if (!isMobile || !editTransactionId) return;
    const txn = transactions.find((t) => t.id === editTransactionId);
    if (txn) {
      handleEdit(txn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, editTransactionId, transactions]);

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

  // Transactions are now server-side paginated, so 'transactions' holds exactly the current page's data
  // But for fallback or total computation we might preserve some logic
  const paginatedTransactions = transactions;

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
    <div className="px-2 sm:px-6 py-6 min-h-screen bg-gray-50/50 pb-24">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-white/80 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
            <Icon icon="lucide:arrow-right-left" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
              Tranzaksiyalar
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Kirim, chiqim va ish haqi bo'yicha to'lovlar</p>
          </div>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPreviousYearDebtForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 text-gray-700 border border-gray-200/50 rounded-xl hover:bg-orange-50 hover:text-orange-700 transition-all shadow-sm ring-1 ring-black/5"
            >
              <Icon icon="lucide:history" className="w-4 h-4" />
              <span className="font-semibold text-sm">O'tgan yil qarzlarini yozish</span>
            </button>
            <button
              onClick={() => {
                if (isMobile) {
                  navigate('/transactions/new');
                } else {
                  setShowForm(true);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30"
            >
              <Icon icon="lucide:plus-circle" className="w-4 h-4" />
              <span className="font-semibold text-sm">Yangi Tranzaksiya</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="mb-6 bg-white/60 backdrop-blur-xl p-4 rounded-xl shadow-sm border border-white/80 ring-1 ring-black/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Izoh bo'yicha qidiruv"
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setTransactionsPage(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          />
          <select
            value={filters.type}
            onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setTransactionsPage(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          >
            <option value="">Barcha turlari</option>
            <option value="INCOME">Kirim</option>
            <option value="EXPENSE">Chiqim</option>
            <option value="SALARY">Ish haqi</option>
          </select>
          <select
            value={filters.paymentMethod}
            onChange={(e) => { setFilters({ ...filters, paymentMethod: e.target.value }); setTransactionsPage(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
          >
            <option value="">Barcha to'lov turi</option>
            <option value="CASH">Naqt</option>
            <option value="CARD">Karta</option>
          </select>
          {user?.role === 'ADMIN' && (
            <select
              value={filters.workerId}
              onChange={(e) => { setFilters({ ...filters, workerId: e.target.value }); setTransactionsPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
            >
              <option value="">Xodim</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          {user?.role === 'ADMIN' && (
            <select
              value={filters.clientId}
              onChange={(e) => { setFilters({ ...filters, clientId: e.target.value }); setTransactionsPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
            >
              <option value="">Mijoz</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex gap-2 lg:col-span-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setTransactionsPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
              title="Boshlanish sanasi"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setTransactionsPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white transition-colors"
              title="Tugash sanasi"
            />
          </div>
        </div>
      </div>

      {/* Monthly Stats Cards */}
      {user?.role === 'ADMIN' && monthlyStats && monthlyStats.income && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Income Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
            <div className="absolute top-4 right-4">
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${monthlyStats.income?.change >= 0
                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                }`}>
                <span className="inline-flex items-center gap-1">
                  <Icon icon={monthlyStats.income?.change >= 0 ? "lucide:trending-up" : "lucide:trending-down"} className="w-3.5 h-3.5" />
                  {formatChange(monthlyStats.income?.change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                <Icon icon="lucide:arrow-down-left" className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-sm text-gray-500 font-semibold tracking-wide">OYLIK KIRIM</div>
            </div>
            <div className="text-2xl font-black text-gray-800 tracking-tight">
              {formatCurrency(monthlyStats.income?.current || 0, monthlyStats.currency || 'UZS')}
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
            <div className="absolute top-4 right-4">
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${monthlyStats.expense?.change >= 0
                ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                }`}>
                <span className="inline-flex items-center gap-1">
                  <Icon icon={monthlyStats.expense?.change >= 0 ? "lucide:trending-up" : "lucide:trending-down"} className="w-3.5 h-3.5" />
                  {formatChange(monthlyStats.expense?.change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform duration-300">
                <Icon icon="lucide:arrow-up-right" className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-sm text-gray-500 font-semibold tracking-wide">OYLIK CHIQIM</div>
            </div>
            <div className="text-2xl font-black text-gray-800 tracking-tight">
              {formatCurrency(monthlyStats.expense?.current || 0, monthlyStats.currency || 'UZS')}
            </div>
          </div>

          {/* Net Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
            <div className="absolute top-4 right-4">
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${monthlyStats.net?.change >= 0
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                }`}>
                <span className="inline-flex items-center gap-1">
                  <Icon icon={monthlyStats.net?.change >= 0 ? "lucide:trending-up" : "lucide:trending-down"} className="w-3.5 h-3.5" />
                  {formatChange(monthlyStats.net?.change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <Icon icon="lucide:briefcase" className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-gray-500 font-semibold tracking-wide">SOF FOYDA</div>
            </div>
            <div className="text-2xl font-black text-gray-800 tracking-tight">
              {formatCurrency(monthlyStats.net?.current || 0, monthlyStats.currency || 'UZS')}
            </div>
          </div>
        </div>
      )}

      {showTransactionForm && (
        <div
          className={isMobile && isNewTransactionRoute
            ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
            : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm'}
          style={isMobile && isNewTransactionRoute ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (isMobile && isNewTransactionRoute) {
                navigate('/transactions');
              } else {
                setShowForm(false);
              }
            }
          }}
        >
          <div
            className={isMobile && isNewTransactionRoute
              ? 'bg-white w-full h-full p-6 overflow-y-auto'
              : 'bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'}
            style={isMobile && isNewTransactionRoute ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Yangi transaction</h2>
              <button
                onClick={() => {
                  if (isMobile && isNewTransactionRoute) {
                    navigate('/transactions');
                  } else {
                    setShowForm(false);
                  }
                }}
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
                        onClick={handleAddExpenseCategory}
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
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
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
                      // Karta tanlansa, currency avtomatik UZS bo'ladi
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
                  onClick={() => {
                    if (isMobile && isNewTransactionRoute) {
                      navigate('/transactions');
                    } else {
                      setShowForm(false);
                    }
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

      {/* Edit Modal */}
      {showEditTransactionForm && editingTransaction && (
        <div
          className={isMobile && editTransactionId
            ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
            : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm'}
          style={isMobile && editTransactionId ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (isMobile && editTransactionId) {
                navigate('/transactions');
              } else {
                setShowEditModal(false);
                setEditingTransaction(null);
              }
            }
          }}
        >
          <div
            className={isMobile && editTransactionId
              ? 'bg-white w-full h-full p-6 overflow-y-auto'
              : 'bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'}
            style={isMobile && editTransactionId ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Transactionni tahrirlash</h2>
              <button
                onClick={() => {
                  if (isMobile && editTransactionId) {
                    navigate('/transactions');
                  } else {
                    setShowEditModal(false);
                    setEditingTransaction(null);
                  }
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
                        onClick={handleAddExpenseCategory}
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
                      // Karta tanlansa, currency avtomatik UZS bo'ladi
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
        <div className="text-center py-12 text-gray-500 font-medium bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">Yuklanmoqda...</div>
      ) : (
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-slate-700/60 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
          <div className="overflow-auto max-h-[calc(100vh-18rem)] custom-scrollbar">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border-b border-gray-100/80 dark:border-slate-700/80">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:hash" className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Type
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:user" className="w-4 h-4 text-emerald-500" />
                      Client/Worker/Category
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:coins" className="w-4 h-4 text-amber-500" />
                      Amount
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:credit-card" className="w-4 h-4 text-indigo-500" />
                      To'lov usuli
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:calendar" className="w-4 h-4 text-cyan-500" />
                      Date
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:message-square" className="w-4 h-4 text-purple-500" />
                      Comment
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5 justify-end w-full">
                      <Icon icon="lucide:sliders-horizontal" className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60 dark:divide-slate-700/60 bg-white/40 dark:bg-slate-900/40">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-200/50">
                          <Icon icon="lucide:search" className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Ma'lumotlar yo'q</h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Siz qidirayotgan qidiruv so'rovi yoki filtrlarga mos keluvchi tranzaksiya topilmadi.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t, index) => (
                    <tr key={t.id} className="group transition-all duration-200 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-sm">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === 'INCOME'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/50'
                            : t.type === 'EXPENSE'
                              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800/50'
                              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/50'
                            }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-medium">
                        {t.type === 'INCOME' && t.client
                          ? t.client.name
                          : t.type === 'SALARY' && t.worker
                            ? t.worker.name
                            : t.expenseCategory || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-gray-100">
                        {t.amount} {t.currency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-300">
                        {t.paymentMethod ? (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.paymentMethod === 'CASH'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/50'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 ring-1 ring-purple-200 dark:ring-purple-800/50'
                            }`}>
                            {t.paymentMethod === 'CASH' ? 'Naqt' : 'Karta'}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="max-w-xs truncate" title={t.comment || undefined}>
                          {t.comment || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {user?.role === 'ADMIN' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (isMobile) {
                                  navigate(`/transactions/${t.id}/edit`);
                                } else {
                                  handleEdit(t);
                                }
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm ring-1 ring-blue-200/60 dark:ring-blue-800/60 transition-all hover:shadow hover:shadow-blue-500/20"
                              title="O'zgartirish"
                            >
                              <Icon icon="lucide:pencil" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm ring-1 ring-rose-200/60 dark:ring-rose-800/60 transition-all hover:shadow hover:shadow-rose-500/20"
                              title="O'chirish"
                            >
                              <Icon icon="lucide:trash-2" className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {transactionsTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-b-2xl">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {((transactionsPage - 1) * TRANSACTIONS_PAGE_SIZE) + 1}–
                {Math.min(transactionsPage * TRANSACTIONS_PAGE_SIZE, transactionsTotalCount)} / {transactionsTotalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTransactionsPage((p) => Math.max(1, p - 1))}
                  disabled={transactionsPage <= 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow"
                >
                  <Icon icon="lucide:chevron-left" className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-0.5 mx-2">
                  <span className="px-3 py-1 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold border border-gray-200 dark:border-slate-700 shadow-sm">
                    {transactionsPage} / {transactionsTotalPages}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTransactionsPage((p) => Math.min(transactionsTotalPages, p + 1))}
                  disabled={transactionsPage >= transactionsTotalPages}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow"
                >
                  <Icon icon="lucide:chevron-right" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
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
