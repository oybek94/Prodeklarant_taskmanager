import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';
import { TableSkeleton } from '../components/common/Skeleton';
import toast from 'react-hot-toast';

// Extracted components
import { TransactionsHeader } from '../components/transactions/TransactionsHeader';
import { TransactionsFilterPanel } from '../components/transactions/TransactionsFilterPanel';
import { TransactionsStatsCards } from '../components/transactions/TransactionsStatsCards';
import { TransactionsTable } from '../components/transactions/TransactionsTable';
import { TransactionsMobileList } from '../components/transactions/TransactionsMobileList';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { PreviousYearDebtModal } from '../components/transactions/PreviousYearDebtModal';

// Shared types
import type { 
  Transaction, 
  Client, 
  User, 
  MonthlyStats, 
  TransactionFilters, 
  TransactionFormData, 
  PreviousYearDebtFormData 
} from '../components/transactions/types';

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

const Transactions = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const TRANSACTIONS_PAGE_SIZE = 15;
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [transactionsTotalCount, setTransactionsTotalCount] = useState(0);

  const [filters, setFilters] = useState<TransactionFilters>({
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
  
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [workerStats, setWorkerStats] = useState<{
    totalEarned: number;
    totalPaid: number;
    totalPending: number;
  } | null>(null);

  const [previousYearDebts, setPreviousYearDebts] = useState<any[]>([]);
  const [previousYearDebtForm, setPreviousYearDebtForm] = useState<PreviousYearDebtFormData>({
    workerId: '',
    totalEarned: '',
    totalPaid: '',
    year: (new Date().getFullYear() - 1).toString(),
    comment: '',
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Transport', 'Ofis', 'Boshqa', 'ST-1', 'FITO', 'AKT'
  ]);
  const [newExpenseCategory, setNewExpenseCategory] = useState('');

  const [form, setForm] = useState<TransactionFormData>({
    type: 'INCOME',
    amount: '',
    // Transaksiyalar faqat UZS'da kiritiladi
    currency: 'UZS',
    exchangeRate: '',
    paymentMethod: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    workerId: '',
    expenseCategory: '',
    virtualCardId: '',
    isLegacyPayment: false,
  });

  const isNewTransactionRoute = location.pathname === '/transactions/new';
  const editMatch = location.pathname.match(/^\/transactions\/(\d+)\/edit$/);
  const editTransactionId = editMatch ? Number(editMatch[1]) : null;
  const showTransactionForm = showForm || (isMobile && isNewTransactionRoute);
  const showEditTransactionForm = showEditModal || (isMobile && !!editTransactionId);

  // Callbacks
  const handleFilterChange = useCallback((key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setTransactionsPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setTransactionsPage(page);
  }, []);

  const handleOpenPreviousYearDebt = useCallback(() => {
    setShowPreviousYearDebtForm(true);
  }, []);

  const handleOpenNewTransaction = useCallback(() => {
    if (isMobile) {
      navigate('/transactions/new');
    } else {
      setShowForm(true);
    }
  }, [isMobile, navigate]);

  const handleCloseNewTransaction = useCallback(() => {
    if (isMobile && isNewTransactionRoute) {
      navigate('/transactions');
    } else {
      setShowForm(false);
    }
  }, [isMobile, isNewTransactionRoute, navigate]);

  const handleCloseEditTransaction = useCallback(() => {
    if (isMobile && editTransactionId) {
      navigate('/transactions');
    } else {
      setShowEditModal(false);
      setEditingTransaction(null);
    }
  }, [isMobile, editTransactionId, navigate]);

  useEscKey(showTransactionForm, handleCloseNewTransaction);
  useEscKey(showEditTransactionForm, handleCloseEditTransaction);
  useEscKey(showPreviousYearDebtForm, () => setShowPreviousYearDebtForm(false));

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const limit = TRANSACTIONS_PAGE_SIZE;
      const params = new URLSearchParams([
        ['page', transactionsPage.toString()],
        ['limit', limit.toString()],
        ...Object.entries(filters).filter(([_, v]) => v !== '')
      ]);
      const response = await apiClient.get(`/transactions?${params.toString()}`);
      
      const data = response.data?.data || response.data;
      setTransactions(Array.isArray(data) ? data : []);
      
      if (response.data?.totalPages) {
        setTransactionsTotalPages(response.data.totalPages);
        setTransactionsTotalCount(response.data.total);
      } else {
         setTransactionsTotalPages(Math.max(1, Math.ceil((Array.isArray(data) ? data.length : 0) / limit)));
         setTransactionsTotalCount(Array.isArray(data) ? data.length : 0);
      }

      setExpenseCategories(prev => {
        const categorySet = new Set<string>(prev);
        let changed = false;
        (Array.isArray(data) ? data : [])
          .map((tx: Transaction) => tx.expenseCategory)
          .filter((category: string | undefined): category is string => Boolean(category && category.trim()))
          .forEach((category: string) => {
            const trimmed = category.trim();
            if (!categorySet.has(trimmed)) {
              categorySet.add(trimmed);
              changed = true;
            }
          });
        return changed ? Array.from(categorySet) : prev;
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [transactionsPage, filters]);

  const loadClients = useCallback(async () => {
    try {
      const response = await apiClient.get('/clients?selectList=true');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      const response = await apiClient.get('/workers');
      if (Array.isArray(response.data)) {
        setWorkers(response.data.filter((u: any) => u.role === 'DEKLARANT' || u.role === 'ADMIN' || u.role === 'MANAGER'));
      } else {
        setWorkers([]);
      }
    } catch (error: any) {
      setWorkers([]);
    }
  }, []);

  const loadMonthlyStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/transactions/stats/monthly');
      if (response.data?.accounting) {
        setMonthlyStats(response.data.accounting);
      } else {
        setMonthlyStats(response.data);
      }
    } catch (error) {
      setMonthlyStats(null);
    }
  }, []);

  const loadWorkerStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/transactions/worker-stats');
      setWorkerStats(response.data);
    } catch (error) {
      console.error('Error loading worker stats:', error);
    }
  }, []);

  const loadPreviousYearDebts = useCallback(async () => {
    try {
      const previousYear = new Date().getFullYear() - 1;
      const response = await apiClient.get(`/workers/previous-year-debts?year=${previousYear}`);
      setPreviousYearDebts(response.data || []);
    } catch (error) {
      console.error('Error loading previous year debts:', error);
    }
  }, []);

  const loadWorkerStatsForUser = useCallback(async (workerId: number) => {
    try {
      const statsResponse = await apiClient.get(`/workers/${workerId}/stats?period=all`);
      const totalKPI = statsResponse.data.totalKPI || 0;

      const stageStatsResponse = await apiClient.get(`/workers/${workerId}/stage-stats?period=all`);
      const totals = stageStatsResponse.data.totals;

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
        }
      } catch (debtError) {
        // null
      }

      const previousYearBalance = previousYearDebtData?.balance || 0;

      setWorkerStats({
        totalEarned: totalKPI + (previousYearDebtData?.totalEarned || 0),
        totalPaid: totals.totalReceived + (previousYearDebtData?.totalPaid || 0),
        totalPending: (totalKPI - totals.totalReceived) + (previousYearBalance),
      });
    } catch (error) {
      console.error('Error loading worker stats for user:', error);
    }
  }, []);

  // Admin bo'lmagan xodim uchun forma har doim "o'zim olgan pul" (SALARY) rejimida
  useEffect(() => {
    if (isAdmin || !user) return;
    const workerId = user.id.toString();
    setForm(prev =>
      prev.type === 'SALARY' && prev.workerId === workerId
        ? prev
        : { ...prev, type: 'SALARY', workerId }
    );
  }, [isAdmin, user]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadClients();
    loadWorkers();
    if (user?.role === 'ADMIN') {
      loadMonthlyStats();
      loadWorkerStats();
      loadPreviousYearDebts();
    } else if (user?.id) {
      loadWorkerStatsForUser(user.id);
    }
  }, [user, loadClients, loadWorkers, loadMonthlyStats, loadWorkerStats, loadPreviousYearDebts, loadWorkerStatsForUser]);

  const handleAddExpenseCategory = useCallback(() => {
    const trimmed = newExpenseCategory.trim();
    if (!trimmed) return;
    if (!expenseCategories.includes(trimmed)) {
      setExpenseCategories(prev => [...prev, trimmed]);
    }
    setForm(prev => ({ ...prev, expenseCategory: trimmed }));
    setNewExpenseCategory('');
  }, [newExpenseCategory, expenseCategories]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency || 'UZS',
        comment: form.comment,
        date: new Date(form.date),
      };

      if (!isAdmin) {
        // Xodim faqat o'zi olgan pulni yozadi — tur va ishchi majburlanadi
        if (!user) return;
        payload.type = 'SALARY';
        payload.workerId = user.id;
      } else if (form.type === 'INCOME') {
        if (!form.clientId) { alert('Mijozni tanlang'); return; }
        payload.clientId = parseInt(form.clientId);
      } else if (form.type === 'EXPENSE') {
        if (!form.expenseCategory) { alert('Xarajat kategoriyasini kiriting'); return; }
        payload.expenseCategory = form.expenseCategory;
      } else if (form.type === 'SALARY') {
        if (!form.workerId) { alert('Ishchini tanlang'); return; }
        payload.workerId = parseInt(form.workerId);
        payload.isLegacyPayment = form.isLegacyPayment;
      }

      if (isAdmin && form.virtualCardId) {
        payload.virtualCardId = parseInt(form.virtualCardId);
      }

      const { data: created } = await apiClient.post('/transactions', payload);
      if (created?.workerPaymentWarning) {
        toast.error(created.workerPaymentWarning, { duration: 8000 });
      }
      handleCloseNewTransaction();
      setForm({
        type: isAdmin ? 'INCOME' : 'SALARY', amount: '', currency: 'UZS', exchangeRate: '', paymentMethod: '',
        comment: '', date: new Date().toISOString().split('T')[0], clientId: '',
        workerId: isAdmin ? '' : (user?.id.toString() ?? ''),
        expenseCategory: '', virtualCardId: '', isLegacyPayment: false,
      });
      await loadTransactions();
      setNewExpenseCategory('');
      if (isAdmin) {
        await loadMonthlyStats();
      } else if (user) {
        await loadWorkerStatsForUser(user.id);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [form, user, handleCloseNewTransaction, loadTransactions, loadMonthlyStats, loadWorkerStatsForUser, isAdmin]);

  const handleEdit = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setForm({
      type: transaction.type,
      amount: transaction.amount.toString(),
      // Tahrirlangan transaksiya har doim UZS bo'lib saqlanadi
      currency: 'UZS',
      exchangeRate: '',
      paymentMethod: (transaction.paymentMethod || '') as '' | 'CASH' | 'CARD',
      comment: transaction.comment || '',
      date: new Date(transaction.date).toISOString().split('T')[0],
      clientId: transaction.client?.id ? transaction.client.id.toString() : '',
      workerId: transaction.worker?.id ? transaction.worker.id.toString() : '',
      expenseCategory: transaction.expenseCategory || '',
      virtualCardId: (transaction as any).virtualCardId ? (transaction as any).virtualCardId.toString() : '',
      isLegacyPayment: false,
    });
    setShowEditModal(true);
  }, []);

  useEffect(() => {
    if (!isMobile || !editTransactionId) return;
    const txn = transactions.find((t) => t.id === editTransactionId);
    if (txn) {
      handleEdit(txn);
    }
  }, [isMobile, editTransactionId, transactions, handleEdit]);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const payload: any = {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency || 'UZS',
        paymentMethod: form.paymentMethod || undefined,
        comment: form.comment,
        date: new Date(form.date),
      };

      if (form.type === 'INCOME') {
        if (!form.clientId) { alert('Mijozni tanlang'); return; }
        payload.clientId = parseInt(form.clientId);
      } else if (form.type === 'EXPENSE') {
        if (!form.expenseCategory) { alert('Xarajat kategoriyasini kiriting'); return; }
        payload.expenseCategory = form.expenseCategory;
      } else if (form.type === 'SALARY') {
        if (!form.workerId) { alert('Ishchini tanlang'); return; }
        payload.workerId = parseInt(form.workerId);
        payload.isLegacyPayment = form.isLegacyPayment;
      }

      if (form.virtualCardId) {
        payload.virtualCardId = parseInt(form.virtualCardId);
      }

      const { data: updated } = await apiClient.put(`/transactions/${editingTransaction.id}`, payload);
      if (updated?.workerPaymentWarning) {
        toast.error(updated.workerPaymentWarning, { duration: 8000 });
      }
      handleCloseEditTransaction();
      setForm({
        type: 'INCOME', amount: '', currency: 'UZS', exchangeRate: '', paymentMethod: '',
        comment: '', date: new Date().toISOString().split('T')[0], clientId: '', workerId: '',
        expenseCategory: '', virtualCardId: '', isLegacyPayment: false,
      });
      await loadTransactions();
      if (isAdmin) await loadMonthlyStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [editingTransaction, form, handleCloseEditTransaction, loadTransactions, loadMonthlyStats, isAdmin]);

  // Admin hammasini tahrirlaydi; xodim faqat o'zi bugun qo'shgan yozuvini o'chira oladi
  const canEdit = useCallback((_t: Transaction) => isAdmin, [isAdmin]);

  const canDelete = useCallback((t: Transaction) => {
    if (isAdmin) return true;
    if (!user || t.type !== 'SALARY' || t.worker?.id !== user.id) return false;
    if (!t.createdAt) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(t.createdAt) >= startOfToday;
  }, [isAdmin, user]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Bu transactionni o\'chirishni xohlaysizmi?')) return;

    try {
      await apiClient.delete(`/transactions/${id}`);
      await loadTransactions();
      if (isAdmin) {
        await loadMonthlyStats();
      } else if (user) {
        await loadWorkerStatsForUser(user.id);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [loadTransactions, loadMonthlyStats, loadWorkerStatsForUser, user, isAdmin]);

  const handleSavePreviousYearDebt = useCallback(async (e: React.FormEvent) => {
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
      await loadWorkerStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  }, [previousYearDebtForm, loadPreviousYearDebts, loadWorkerStats]);

  return (
    <div className="px-2 sm:px-6 py-6 min-h-screen bg-gray-50/50 pb-24">
      <TransactionsHeader 
        isAdmin={isAdmin}
        onOpenPreviousYearDebt={handleOpenPreviousYearDebt}
        onOpenNewTransaction={handleOpenNewTransaction}
      />

      <TransactionsFilterPanel 
        filters={filters}
        onFilterChange={handleFilterChange}
        isAdmin={isAdmin}
        workers={workers}
        clients={clients}
      />

      {isAdmin && monthlyStats && (
        <TransactionsStatsCards monthlyStats={monthlyStats} />
      )}

      {showTransactionForm && (
        <TransactionFormModal
          isMobile={isMobile}
          isNewTransactionRoute={isNewTransactionRoute}
          editTransactionId={null}
          form={form}
          setForm={setForm}
          clients={clients}
          workers={workers}
          expenseCategories={expenseCategories}
          newExpenseCategory={newExpenseCategory}
          setNewExpenseCategory={setNewExpenseCategory}
          onAddExpenseCategory={handleAddExpenseCategory}
          isAdmin={isAdmin}
          currentUserName={user?.name ?? ''}
          onSubmit={handleSubmit}
          onClose={handleCloseNewTransaction}
          isEditing={false}
        />
      )}

      {showEditTransactionForm && editingTransaction && (
        <TransactionFormModal
          isMobile={isMobile}
          isNewTransactionRoute={isNewTransactionRoute}
          editTransactionId={editTransactionId}
          form={form}
          setForm={setForm}
          clients={clients}
          workers={workers}
          expenseCategories={expenseCategories}
          newExpenseCategory={newExpenseCategory}
          setNewExpenseCategory={setNewExpenseCategory}
          onAddExpenseCategory={handleAddExpenseCategory}
          isAdmin={isAdmin}
          currentUserName={user?.name ?? ''}
          onSubmit={handleUpdate}
          onClose={handleCloseEditTransaction}
          isEditing={true}
        />
      )}

      {loading ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm p-4">
          <TableSkeleton columns={6} rows={10} />
        </div>
      ) : isMobile ? (
        <TransactionsMobileList
          paginatedTransactions={transactions}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <TransactionsTable
          transactions={transactions}
          paginatedTransactions={transactions}
          transactionsTotalPages={transactionsTotalPages}
          transactionsTotalCount={transactionsTotalCount}
          transactionsPage={transactionsPage}
          TRANSACTIONS_PAGE_SIZE={TRANSACTIONS_PAGE_SIZE}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPageChange={handlePageChange}
        />
      )}

      {showPreviousYearDebtForm && (
        <PreviousYearDebtModal
          form={previousYearDebtForm}
          setForm={setPreviousYearDebtForm}
          workers={workers}
          previousYearDebts={previousYearDebts}
          onSubmit={handleSavePreviousYearDebt}
          onClose={() => setShowPreviousYearDebtForm(false)}
        />
      )}
    </div>
  );
};

export default Transactions;
