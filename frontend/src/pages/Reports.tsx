import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import CurrencyDisplay from '../components/CurrencyDisplay';
import DateInput from '../components/DateInput';
import { shouldShowExchangeRate, type Role } from '../utils/currencyFormatting';

interface TransactionWithRate {
  id: number;
  type: 'INCOME' | 'EXPENSE' | 'SALARY';
  amount_original: number;
  currency_universal: 'USD' | 'UZS';
  exchange_rate: number | null;
  exchange_source: 'CBU' | 'MANUAL' | null;
  exchange_date: string;
  amount_uzs: number;
  date: string;
  comment?: string | null;
  expenseCategory?: string | null;
  paymentMethod?: 'CASH' | 'CARD' | null;
  client?: { id: number; name: string } | null;
  worker?: { id: number; name: string; role: string } | null;
  operationalAmount?: number;
  operationalCurrency?: 'USD' | 'UZS';
}

interface ExchangeRateMetadata {
  rate: number;
  source: 'CBU' | 'MANUAL';
  transactionCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface ReportResult {
  accounting: {
    total: number;
    currency: 'UZS';
    transactions: TransactionWithRate[];
  };
  operational: {
    total: number;
    currency: 'USD' | 'UZS';
    transactions: TransactionWithRate[];
  };
  metadata: {
    dateRange: { start: string | null; end: string | null };
    filters: any;
    exchangeRatesUsed: ExchangeRateMetadata[];
    transactionCount: number;
  };
}

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'profit' | 'expense' | 'balance' | 'transactions' | 'summary'>('profit');
  const [view, setView] = useState<'both' | 'accounting' | 'operational'>('both');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    currency: '' as '' | 'USD' | 'UZS',
    startDate: '',
    endDate: '',
    clientId: '',
    workerId: '',
    certifierId: '',
  });

  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [workers, setWorkers] = useState<Array<{ id: number; name: string; role: string }>>([]);

  useEffect(() => {
    loadClients();
    loadWorkers();
  }, []);

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      setClients(response.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadWorkers = async () => {
    try {
      const response = await apiClient.get('/workers');
      setWorkers(response.data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        view,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      };

      const response = await apiClient.get(`/reports/${reportType}`, { params });
      setReportData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Hisobotni yuklashda xatolik yuz berdi');
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadReport();
    }
  }, [reportType, view, user]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(amount).replace(/,/g, ' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Sizda hisobotlarni ko'rish huquqi yo'q.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Hisobotlar</h1>

        {/* Report Type Selector */}
        <div className="flex gap-2 mb-4">
          {(['profit', 'expense', 'balance', 'transactions', 'summary'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type === 'profit' && 'Foyda'}
              {type === 'expense' && 'Xarajat'}
              {type === 'balance' && 'Balans'}
              {type === 'transactions' && 'Transactionlar'}
              {type === 'summary' && 'Umumiy'}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('both')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'both' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Ikkala ko'rinish
          </button>
          <button
            onClick={() => setView('accounting')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'accounting' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Hisob (UZS)
          </button>
          <button
            onClick={() => setView('operational')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'operational' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Operatsion (USD)
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold mb-3">Filterlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valyuta</label>
              <select
                value={filters.currency}
                onChange={(e) => setFilters({ ...filters, currency: e.target.value as '' | 'USD' | 'UZS' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Barchasi</option>
                <option value="USD">USD</option>
                <option value="UZS">UZS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Boshlanish sanasi</label>
              <DateInput
                value={filters.startDate}
                onChange={(value) => setFilters({ ...filters, startDate: value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tugash sanasi</label>
              <DateInput
                value={filters.endDate}
                onChange={(value) => setFilters({ ...filters, endDate: value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz</label>
              <select
                value={filters.clientId}
                onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Barchasi</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ishchi</label>
              <select
                value={filters.workerId}
                onChange={(e) => setFilters({ ...filters, workerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Barchasi</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sertifikat ishchisi</label>
              <select
                value={filters.certifierId}
                onChange={(e) => setFilters({ ...filters, certifierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Barchasi</option>
                {workers.filter(w => w.role === 'CERTIFICATE_WORKER').map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={loadReport}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Yuklanmoqda...' : 'Hisobotni yuklash'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(view === 'both' || view === 'accounting') && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2">Hisob ko'rinishi (UZS)</h3>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(reportData.accounting.total, 'UZS')}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {reportData.metadata.transactionCount} ta transaction
                </p>
              </div>
            )}

            {(view === 'both' || view === 'operational') && reportData.operational && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2">
                  Operatsion ko'rinish ({reportData.operational.currency})
                </h3>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(reportData.operational.total, reportData.operational.currency)}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {reportData.metadata.transactionCount} ta transaction
                </p>
              </div>
            )}
          </div>

          {/* Exchange Rates Used */}
          {reportData.metadata.exchangeRatesUsed.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Ishlatilgan valyuta kurslari</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kurs</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manba</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactionlar soni</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana oralig'i</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.metadata.exchangeRatesUsed.map((rate, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {rate.rate.toLocaleString('uz-UZ', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            rate.source === 'CBU' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rate.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{rate.transactionCount}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {formatDate(rate.dateRange.start)} - {formatDate(rate.dateRange.end)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          {reportData.accounting.transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Transactionlar</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turi</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mijoz/Ishchi</th>
                      {(view === 'both' || view === 'accounting') && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summa (UZS)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asl valyuta</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kurs</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kurs manbasi</th>
                        </>
                      )}
                      {(view === 'both' || view === 'operational') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Summa ({reportData.operational.currency})
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Izoh</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(view === 'both' ? reportData.accounting.transactions : 
                      view === 'accounting' ? reportData.accounting.transactions : 
                      reportData.operational.transactions).map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDate(tx.date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.type === 'INCOME' ? 'bg-green-100 text-green-800' :
                            tx.type === 'EXPENSE' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {tx.client?.name || tx.worker?.name || tx.expenseCategory || '-'}
                        </td>
                        {(view === 'both' || view === 'accounting') && (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              {formatCurrency(tx.amount_uzs, 'UZS')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {tx.amount_original} {tx.currency_universal}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {tx.exchange_rate ? tx.exchange_rate.toLocaleString('uz-UZ', {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4
                              }) : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {tx.exchange_source ? (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  tx.exchange_source === 'CBU' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {tx.exchange_source}
                                </span>
                              ) : '-'}
                            </td>
                          </>
                        )}
                        {(view === 'both' || view === 'operational') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {formatCurrency(
                              view === 'both' ? (tx.operationalAmount || tx.amount_original) : 
                              (tx.operationalAmount || tx.amount_original),
                              reportData.operational.currency
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm">{tx.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportData.accounting.transactions.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">Hech qanday transaction topilmadi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;

