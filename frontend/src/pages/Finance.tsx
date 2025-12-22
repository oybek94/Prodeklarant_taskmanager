import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface AccountBalance {
  id: number;
  type: 'CASH' | 'CARD';
  balance: number;
  currency: string;
  updatedAt: string;
}

interface Debt {
  id: number;
  debtorType: 'CLIENT' | 'WORKER' | 'CERTIFICATE_WORKER' | 'OTHER';
  debtorId: number;
  amount: number;
  currency: string;
  comment?: string;
  date: string;
  debtorName?: string;
  debtorInfo?: any;
}

interface CurrencyStatistics {
  balances: {
    total: number;
    cash: number;
    card: number;
  };
  debts: {
    total: number;
    fromDebtTable: number;
    fromClients: number;
    byType: {
      [key: string]: number;
    };
  };
  netBalance: number;
}

interface Statistics {
  USD?: CurrencyStatistics;
  UZS?: CurrencyStatistics;
}

const Finance = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<AccountBalance | null>(null);
  const [balanceForm, setBalanceForm] = useState({ balance: '' });
  const [debtForm, setDebtForm] = useState({
    debtorType: 'CLIENT' as 'CLIENT' | 'WORKER' | 'CERTIFICATE_WORKER' | 'OTHER',
    debtorId: '',
    amount: '',
    currency: 'USD',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [workers, setWorkers] = useState<{ id: number; name: string; role: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadBalances(),
        loadDebts(),
        loadStatistics(),
        loadClients(),
        loadWorkers(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    try {
      const response = await apiClient.get('/finance/balance');
      // Backend returns { byCurrency: {...}, all: [...] }
      const balancesData = response.data.all || response.data;
      setBalances(Array.isArray(balancesData) ? balancesData : []);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const loadDebts = async () => {
    try {
      const response = await apiClient.get('/finance/debts');
      setDebts(response.data);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiClient.get('/finance/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      setClients(response.data.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadWorkers = async () => {
    try {
      const response = await apiClient.get('/users');
      setWorkers(response.data.filter((u: any) => u.role === 'DEKLARANT' || u.role === 'CERTIFICATE_WORKER'));
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleUpdateBalance = async () => {
    if (!selectedBalance) return;
    try {
      await apiClient.post('/finance/balance', {
        type: selectedBalance.type,
        balance: parseFloat(balanceForm.balance),
        currency: selectedBalance.currency,
      });
      setShowBalanceModal(false);
      setSelectedBalance(null);
      setBalanceForm({ balance: '' });
      loadBalances();
      loadStatistics();
    } catch (error: any) {
      alert('Xatolik: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddDebt = async () => {
    try {
      await apiClient.post('/finance/debt', {
        ...debtForm,
        debtorId: parseInt(debtForm.debtorId),
        amount: parseFloat(debtForm.amount),
      });
      setShowDebtModal(false);
      setDebtForm({
        debtorType: 'CLIENT',
        debtorId: '',
        amount: '',
        currency: 'USD',
        comment: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadDebts();
      loadStatistics();
    } catch (error: any) {
      alert('Xatolik: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteDebt = async (id: number) => {
    if (!confirm('Qarzni o\'chirishni tasdiqlaysizmi?')) return;
    try {
      await apiClient.delete(`/finance/debt/${id}`);
      loadDebts();
      loadStatistics();
    } catch (error: any) {
      alert('Xatolik: ' + (error.response?.data?.error || error.message));
    }
  };

  const getDebtorTypeLabel = (type: string) => {
    switch (type) {
      case 'CLIENT':
        return 'Mijoz';
      case 'WORKER':
        return 'Ishchi';
      case 'CERTIFICATE_WORKER':
        return 'Sertifikatchi';
      case 'OTHER':
        return 'Boshqa';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pul nazorati</h1>
          <p className="text-gray-600 mt-2">Barcha pullarni nazorat qilish va boshqarish</p>
        </div>

        {/* Statistika kartalari - har bir valyuta uchun */}
        {statistics && (
          <>
            {/* USD Statistika */}
            {statistics.USD && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">USD Statistika</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Jami balans (USD)</p>
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.USD.balances.total)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Naqt pul (USD)</p>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.USD.balances.cash)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Karta (USD)</p>
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.USD.balances.card)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Jami qarz (USD)</p>
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.USD.debts.total)}</p>
                  </div>
                </div>

                {/* Sof balans USD */}
                <div className="mb-6">
                  <div className={`bg-gradient-to-r rounded-xl p-6 shadow-sm border-2 ${
                    statistics.USD.netBalance >= 0
                      ? 'from-green-50 to-emerald-50 border-green-200'
                      : 'from-red-50 to-orange-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Sof balans (USD)</p>
                        <p className={`text-3xl font-bold ${
                          statistics.USD.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(statistics.USD.netBalance)}
                        </p>
                      </div>
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                        statistics.USD.netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <svg className={`w-8 h-8 ${
                          statistics.USD.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UZS Statistika */}
            {statistics.UZS && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">UZS Statistika</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Jami balans (UZS)</p>
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.UZS.balances.total)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Naqt pul (UZS)</p>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.UZS.balances.cash)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Karta (UZS)</p>
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.UZS.balances.card)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Jami qarz (UZS)</p>
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.UZS.debts.total)}</p>
                  </div>
                </div>

                {/* Sof balans UZS */}
                <div className="mb-6">
                  <div className={`bg-gradient-to-r rounded-xl p-6 shadow-sm border-2 ${
                    statistics.UZS.netBalance >= 0
                      ? 'from-green-50 to-emerald-50 border-green-200'
                      : 'from-red-50 to-orange-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Sof balans (UZS)</p>
                        <p className={`text-3xl font-bold ${
                          statistics.UZS.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(statistics.UZS.netBalance)}
                        </p>
                      </div>
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                        statistics.UZS.netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <svg className={`w-8 h-8 ${
                          statistics.UZS.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balanslar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Balanslar</h2>
              <button
                onClick={() => {
                  setSelectedBalance(null);
                  setBalanceForm({ balance: '' });
                  setShowBalanceModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Balans qo'shish
              </button>
            </div>
            <div className="space-y-3">
              {balances.map((balance) => (
                <div
                  key={balance.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      balance.type === 'CASH' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {balance.type === 'CASH' ? (
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {balance.type === 'CASH' ? 'Naqt pul' : 'Karta'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(balance.updatedAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(balance.balance)}</p>
                    <button
                      onClick={() => {
                        setSelectedBalance(balance);
                        setBalanceForm({ balance: balance.balance.toString() });
                        setShowBalanceModal(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      Yangilash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qarzlar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Qarzlar</h2>
              <button
                onClick={() => setShowDebtModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Qarz qo'shish
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {debts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Qarzlar mavjud emas</p>
                </div>
              ) : (
                debts.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-red-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{debt.debtorName || 'Noma\'lum'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getDebtorTypeLabel(debt.debtorType)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{formatCurrency(debt.amount)}</p>
                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="text-xs text-red-600 hover:text-red-700 mt-1"
                        >
                          O'chirish
                        </button>
                      </div>
                    </div>
                    {debt.comment && (
                      <p className="text-xs text-gray-600 mt-2">{debt.comment}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(debt.date).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Qarzlar bo'yicha statistika */}
        {statistics && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Qarzlar bo'yicha statistika</h2>
            {statistics.USD && statistics.USD.debts.byType && Object.keys(statistics.USD.debts.byType).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">USD</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(statistics.USD.debts.byType).map(([type, amount]) => (
                    <div key={`USD-${type}`} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">{getDebtorTypeLabel(type)}</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(amount as number)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {statistics.UZS && statistics.UZS.debts.byType && Object.keys(statistics.UZS.debts.byType).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">UZS</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(statistics.UZS.debts.byType).map(([type, amount]) => (
                    <div key={`UZS-${type}`} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">{getDebtorTypeLabel(type)}</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(amount as number)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Balans yangilash modali */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedBalance ? 'Balansni yangilash' : 'Yangi balans qo\'shish'}
              </h3>
              <button
                onClick={() => {
                  setShowBalanceModal(false);
                  setSelectedBalance(null);
                  setBalanceForm({ balance: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {selectedBalance && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turi
                  </label>
                  <input
                    type="text"
                    value={selectedBalance.type === 'CASH' ? 'Naqt pul' : 'Karta'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              )}
              {!selectedBalance && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBalance?.type || ''}
                    onChange={(e) => {
                      const balance = balances.find(b => b.type === e.target.value);
                      if (balance) {
                        setSelectedBalance(balance);
                        setBalanceForm({ balance: balance.balance.toString() });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tanlang...</option>
                    <option value="CASH">Naqt pul</option>
                    <option value="CARD">Karta</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceForm.balance}
                  onChange={(e) => setBalanceForm({ balance: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateBalance}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Saqlash
                </button>
                <button
                  onClick={() => {
                    setShowBalanceModal(false);
                    setSelectedBalance(null);
                    setBalanceForm({ balance: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Bekor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Qarz qo'shish modali */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Qarz qo'shish</h3>
              <button
                onClick={() => setShowDebtModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qarzdor turi <span className="text-red-500">*</span>
                </label>
                <select
                  value={debtForm.debtorType}
                  onChange={(e) => setDebtForm({ ...debtForm, debtorType: e.target.value as any, debtorId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="CLIENT">Mijoz</option>
                  <option value="WORKER">Ishchi</option>
                  <option value="CERTIFICATE_WORKER">Sertifikatchi</option>
                  <option value="OTHER">Boshqa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {debtForm.debtorType === 'CLIENT' ? 'Mijoz' : debtForm.debtorType === 'WORKER' || debtForm.debtorType === 'CERTIFICATE_WORKER' ? 'Ishchi' : 'Qarzdor'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={debtForm.debtorId}
                  onChange={(e) => setDebtForm({ ...debtForm, debtorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tanlang...</option>
                  {debtForm.debtorType === 'CLIENT' && clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {(debtForm.debtorType === 'WORKER' || debtForm.debtorType === 'CERTIFICATE_WORKER') && workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={debtForm.amount}
                  onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={debtForm.date}
                  onChange={(e) => setDebtForm({ ...debtForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Izoh
                </label>
                <textarea
                  value={debtForm.comment}
                  onChange={(e) => setDebtForm({ ...debtForm, comment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddDebt}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Qo'shish
                </button>
                <button
                  onClick={() => setShowDebtModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Bekor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;

