import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '@iconify/react';

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

interface Debtor {
  clientId: number;
  clientName: string;
  phone: string | null;
  creditType: string | null;
  creditLimit: number | null;
  creditStartDate: string | null;
  currentDebt: number;
  currency: 'USD' | 'UZS';
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
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<AccountBalance | null>(null);
  const [balanceForm, setBalanceForm] = useState({ balance: '', type: '' as '' | 'CASH' | 'CARD', currency: 'USD' as 'USD' | 'UZS' });
  const [convertForm, setConvertForm] = useState({
    fromType: 'CASH' as 'CASH' | 'CARD',
    fromCurrency: 'USD' as 'USD' | 'UZS',
    toType: 'CASH' as 'CASH' | 'CARD',
    toCurrency: 'UZS' as 'USD' | 'UZS',
    amount: '',
    rate: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });
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
        loadDebtors(),
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

  const loadDebtors = async () => {
    try {
      const response = await apiClient.get('/finance/debtors');
      setDebtors(response.data);
    } catch (error) {
      console.error('Error loading debtors:', error);
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
    }).format(amount).replace(/,/g, ' ');
  };

  const handleUpdateBalance = async () => {
    if (!selectedBalance) {
      // Yangi balans qo'shish
      if (!balanceForm.type) {
        alert('Turi tanlang');
        return;
      }
      // CARD faqat UZS bo'lishi kerak
      if (balanceForm.type === 'CARD' && balanceForm.currency === 'USD') {
        alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
        return;
      }
      try {
        await apiClient.post('/finance/balance', {
          type: balanceForm.type,
          balance: parseFloat(balanceForm.balance),
          currency: balanceForm.currency,
        });
        setShowBalanceModal(false);
        setSelectedBalance(null);
        setBalanceForm({ balance: '', type: '', currency: 'USD' });
        loadBalances();
        loadStatistics();
      } catch (error: any) {
        alert('Xatolik: ' + (error.response?.data?.error || error.message));
      }
      return;
    }
    // Mavjud balansni yangilash
    try {
      await apiClient.post('/finance/balance', {
        type: selectedBalance.type,
        balance: parseFloat(balanceForm.balance),
        currency: selectedBalance.currency,
      });
      setShowBalanceModal(false);
      setSelectedBalance(null);
      setBalanceForm({ balance: '', type: '', currency: 'USD' });
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

  const handleConvertCurrency = async () => {
    if (!convertForm.amount || !convertForm.rate) {
      alert('Summa va kursni kiriting');
      return;
    }

    // Validatsiya: CARD faqat UZS bo'lishi mumkin
    if (convertForm.fromType === 'CARD' && convertForm.fromCurrency === 'USD') {
      alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
      return;
    }
    if (convertForm.toType === 'CARD' && convertForm.toCurrency === 'USD') {
      alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
      return;
    }

    try {
      await apiClient.post('/finance/convert-currency', {
        fromType: convertForm.fromType,
        fromCurrency: convertForm.fromCurrency,
        toType: convertForm.toType,
        toCurrency: convertForm.toCurrency,
        amount: parseFloat(convertForm.amount),
        rate: parseFloat(convertForm.rate),
        comment: convertForm.comment,
        date: convertForm.date ? new Date(convertForm.date) : undefined,
      });
      setShowConvertModal(false);
      setConvertForm({
        fromType: 'CASH',
        fromCurrency: 'USD',
        toType: 'CASH',
        toCurrency: 'UZS',
        amount: '',
        rate: '',
        comment: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadBalances();
      loadStatistics();
      alert('Valyuta muvaffaqiyatli konvertatsiya qilindi');
    } catch (error: any) {
      alert('Xatolik: ' + (error.response?.data?.error || error.response?.data?.details || error.message));
    }
  };

  const handleDeleteDebt = async (id: number) => {
    if (!confirm('Qarzni o\'chirishni tasdiqlaysizmi?')) return;
    try {
      await apiClient.delete(`/finance/debt/${id}`);
      loadDebts();
      loadDebtors();
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
                        <Icon icon="lucide:dollar-sign" className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.USD.balances.total)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Naqt pul (USD)</p>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:wallet" className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.USD.balances.cash)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Karta (USD)</p>
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:credit-card" className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.USD.balances.card)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Jami qarz (USD)</p>
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:alert-circle" className="w-6 h-6 text-red-600" />
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
                        <Icon icon="lucide:trending-up" className={`w-8 h-8 ${statistics.USD.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
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
                        <Icon icon="lucide:dollar-sign" className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.UZS.balances.total)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Naqt pul (UZS)</p>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:wallet" className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.UZS.balances.cash)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Karta (UZS)</p>
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:credit-card" className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.UZS.balances.card)}</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Jami qarz (UZS)</p>
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:alert-circle" className="w-6 h-6 text-red-600" />
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
                        <Icon icon="lucide:trending-up" className={`w-8 h-8 ${statistics.UZS.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left and Center - Balanslar va Qarzlar */}
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balanslar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Balanslar</h2>
              <button
                onClick={() => {
                  setSelectedBalance(null);
                  setBalanceForm({ balance: '', type: '', currency: 'USD' });
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
                        <Icon icon="lucide:wallet" className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Icon icon="lucide:credit-card" className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {balance.type === 'CASH' ? 'Naqt pul' : 'Karta'} ({balance.currency})
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(balance.updatedAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {balance.currency === 'USD' 
                        ? formatCurrency(balance.balance)
                        : new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(balance.balance).replace(/,/g, ' ')
                      }
                    </p>
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

          {/* Right Sidebar - Qarzdorlar ro'yxati */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Qarzdorlar ro'yxati</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : debtors.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Icon icon="lucide:users" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Qarzdorlar mavjud emas</p>
                </div>
              ) : (
                <>
                  {debtors.map((debtor) => (
                    <div
                      key={debtor.clientId}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-red-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{debtor.clientName}</p>
                          {debtor.phone && (
                            <p className="text-xs text-gray-500 mt-1">{debtor.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {debtor.currency === 'USD' 
                              ? formatCurrency(debtor.currentDebt)
                              : new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(debtor.currentDebt).replace(/,/g, ' ')
                            }
                          </p>
                          <span className="text-xs text-gray-500">{debtor.currency}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Jami qarz */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="space-y-3">
                      {(() => {
                        const totalDebtUSD = debtors
                          .filter(d => d.currency === 'USD')
                          .reduce((sum, d) => sum + d.currentDebt, 0);
                        const totalDebtUZS = debtors
                          .filter(d => d.currency === 'UZS')
                          .reduce((sum, d) => sum + d.currentDebt, 0);
                        
                        return (
                          <>
                            {totalDebtUSD > 0 && (
                              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2">
                                  <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-red-600" />
                                  <span className="text-sm font-medium text-gray-700">Jami qarz (USD):</span>
                                </div>
                                <span className="text-lg font-bold text-red-600">
                                  {formatCurrency(totalDebtUSD)}
                                </span>
                              </div>
                            )}
                            {totalDebtUZS > 0 && (
                              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2">
                                  <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-red-600" />
                                  <span className="text-sm font-medium text-gray-700">Jami qarz (UZS):</span>
                                </div>
                                <span className="text-lg font-bold text-red-600">
                                  {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(totalDebtUZS).replace(/,/g, ' ')}
                                </span>
                              </div>
                            )}
                            {totalDebtUSD === 0 && totalDebtUZS === 0 && (
                              <div className="text-center py-4 text-gray-400">
                                <p className="text-sm">Jami qarz: 0</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
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
                  setBalanceForm({ balance: '', type: '', currency: 'USD' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="lucide:x" className="w-6 h-6" />
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
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Turi <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={balanceForm.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'CASH' | 'CARD';
                        // Agar CARD tanlansa, currency avtomatik UZS bo'ladi
                        setBalanceForm({ 
                          ...balanceForm, 
                          type: newType,
                          currency: newType === 'CARD' ? 'UZS' : balanceForm.currency
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Tanlang...</option>
                      <option value="CASH">Naqt pul</option>
                      <option value="CARD">Karta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valyuta <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={balanceForm.currency}
                      onChange={(e) => {
                        const newCurrency = e.target.value as 'USD' | 'UZS';
                        // Agar CARD tanlangan va USD tanlansa, ruxsat bermaslik
                        if (balanceForm.type === 'CARD' && newCurrency === 'USD') {
                          alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
                          return;
                        }
                        setBalanceForm({ ...balanceForm, currency: newCurrency });
                      }}
                      disabled={balanceForm.type === 'CARD'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="USD" disabled={balanceForm.type === 'CARD'}>USD</option>
                      <option value="UZS">UZS</option>
                    </select>
                    {balanceForm.type === 'CARD' && (
                      <p className="text-xs text-gray-500 mt-1">Karta faqat UZS valyutasida</p>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceForm.balance}
                  onChange={(e) => setBalanceForm({ ...balanceForm, balance: e.target.value })}
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
                    setBalanceForm({ balance: '', type: '', currency: 'USD' });
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
                <Icon icon="lucide:x" className="w-6 h-6" />
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

      {/* Valyuta konvertatsiya modali */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Valyuta konvertatsiya</h3>
              <button
                onClick={() => setShowConvertModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="lucide:x" className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              {/* From */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Qaysi balansdan</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Turi <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={convertForm.fromType}
                      onChange={(e) => {
                        const newType = e.target.value as 'CASH' | 'CARD';
                        // Agar CARD tanlansa, currency avtomatik UZS bo'ladi
                        setConvertForm({
                          ...convertForm,
                          fromType: newType,
                          fromCurrency: newType === 'CARD' ? 'UZS' : convertForm.fromCurrency,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="CASH">Naqt pul</option>
                      <option value="CARD">Karta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valyuta <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={convertForm.fromCurrency}
                      onChange={(e) => {
                        const newCurrency = e.target.value as 'USD' | 'UZS';
                        // Agar CARD tanlangan va USD tanlansa, ruxsat bermaslik
                        if (convertForm.fromType === 'CARD' && newCurrency === 'USD') {
                          alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
                          return;
                        }
                        setConvertForm({ ...convertForm, fromCurrency: newCurrency });
                      }}
                      disabled={convertForm.fromType === 'CARD'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="USD" disabled={convertForm.fromType === 'CARD'}>USD</option>
                      <option value="UZS">UZS</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Summa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={convertForm.amount}
                    onChange={(e) => setConvertForm({ ...convertForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Kurs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valyuta kursi <span className="text-red-500">*</span>
                  {convertForm.fromCurrency === 'USD' && convertForm.toCurrency === 'UZS' && (
                    <span className="text-xs text-gray-500 ml-2">(1 USD = ? UZS)</span>
                  )}
                  {convertForm.fromCurrency === 'UZS' && convertForm.toCurrency === 'USD' && (
                    <span className="text-xs text-gray-500 ml-2">(? UZS = 1 USD)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={convertForm.rate}
                  onChange={(e) => setConvertForm({ ...convertForm, rate: e.target.value })}
                  placeholder={convertForm.fromCurrency === 'USD' ? "Masalan: 12500" : "Masalan: 0.00008"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {convertForm.amount && convertForm.rate && (
                  <p className="text-sm text-gray-600 mt-2">
                    Siz oladi:{' '}
                    {convertForm.fromCurrency === 'USD'
                      ? `${(parseFloat(convertForm.amount) * parseFloat(convertForm.rate)).toFixed(2)} ${convertForm.toCurrency}`
                      : `${(parseFloat(convertForm.amount) / parseFloat(convertForm.rate)).toFixed(2)} ${convertForm.toCurrency}`}
                  </p>
                )}
              </div>

              {/* To */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Qaysi balansga</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Turi <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={convertForm.toType}
                      onChange={(e) => {
                        const newType = e.target.value as 'CASH' | 'CARD';
                        // Agar CARD tanlansa, currency avtomatik UZS bo'ladi
                        setConvertForm({
                          ...convertForm,
                          toType: newType,
                          toCurrency: newType === 'CARD' ? 'UZS' : convertForm.toCurrency,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="CASH">Naqt pul</option>
                      <option value="CARD">Karta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valyuta <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={convertForm.toCurrency}
                      onChange={(e) => {
                        const newCurrency = e.target.value as 'USD' | 'UZS';
                        // Agar CARD tanlangan va USD tanlansa, ruxsat bermaslik
                        if (convertForm.toType === 'CARD' && newCurrency === 'USD') {
                          alert('Karta faqat UZS valyutasida bo\'lishi mumkin');
                          return;
                        }
                        setConvertForm({ ...convertForm, toCurrency: newCurrency });
                      }}
                      disabled={convertForm.toType === 'CARD'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="USD" disabled={convertForm.toType === 'CARD'}>USD</option>
                      <option value="UZS">UZS</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={convertForm.date}
                  onChange={(e) => setConvertForm({ ...convertForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Izoh
                </label>
                <textarea
                  value={convertForm.comment}
                  onChange={(e) => setConvertForm({ ...convertForm, comment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ixtiyoriy izoh..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConvertCurrency}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Konvertatsiya qilish
                </button>
                <button
                  onClick={() => setShowConvertModal(false)}
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

