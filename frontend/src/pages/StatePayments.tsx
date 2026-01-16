import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';

interface StatePayment {
  id: number;
  branchId: number;
  certificatePayment: number;
  psrPrice: number;
  workerPrice: number;
  customsPayment: number;
  certificatePaymentUsd?: number;
  certificatePaymentUzs?: number;
  psrPriceUsd?: number;
  psrPriceUzs?: number;
  workerPriceUsd?: number;
  workerPriceUzs?: number;
  customsPaymentUsd?: number;
  customsPaymentUzs?: number;
  branch: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface Branch {
  id: number;
  name: string;
}

const StatePayments = () => {
  const [statePayments, setStatePayments] = useState<StatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    branchId: '',
    certificatePaymentUsd: '',
    certificatePaymentUzs: '',
    psrPriceUsd: '',
    psrPriceUzs: '',
    workerPriceUsd: '',
    workerPriceUzs: '',
  });

  useEffect(() => {
    loadStatePayments();
    loadBranches();
  }, []);

  const loadStatePayments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/state-payments');
      setStatePayments(response.data);
    } catch (error) {
      console.error('Error loading state payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/state-payments', {
        branchId: Number(form.branchId),
        certificatePaymentUsd: Number(form.certificatePaymentUsd),
        certificatePaymentUzs: Number(form.certificatePaymentUzs),
        psrPriceUsd: Number(form.psrPriceUsd),
        psrPriceUzs: Number(form.psrPriceUzs),
        workerPriceUsd: Number(form.workerPriceUsd),
        workerPriceUzs: Number(form.workerPriceUzs),
      });
      setShowForm(false);
      setForm({
        branchId: '',
        certificatePaymentUsd: '',
        certificatePaymentUzs: '',
        psrPriceUsd: '',
        psrPriceUzs: '',
        workerPriceUsd: '',
        workerPriceUzs: '',
      });
      await loadStatePayments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };


  const handleDelete = async (id: number) => {
    if (!confirm('Bu davlat to\'lovini o\'chirishni xohlaysizmi?')) return;
    try {
      await apiClient.delete(`/state-payments/${id}`);
      await loadStatePayments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatCurrency = (amount: number, currency: 'USD' | 'UZS') => {
    return <CurrencyDisplay amount={amount} originalCurrency={currency} />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Davlat to'lovlari</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Qo'shish
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Filial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Sertifikat to'lovi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                PSR narxi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Ishchi narxi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Jami to'lovlar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Yaratilgan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statePayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Ma'lumotlar yo'q. Birinchi davlat to'lovini qo'shing.
                </td>
              </tr>
            ) : (
              statePayments.map((payment) => {
                const certUsd = Number(payment.certificatePaymentUsd ?? payment.certificatePayment) || 0;
                const certUzs = Number(payment.certificatePaymentUzs ?? payment.certificatePayment) || 0;
                const psrUsd = Number(payment.psrPriceUsd ?? payment.psrPrice) || 0;
                const psrUzs = Number(payment.psrPriceUzs ?? payment.psrPrice) || 0;
                const workerUsd = Number(payment.workerPriceUsd ?? payment.workerPrice) || 0;
                const workerUzs = Number(payment.workerPriceUzs ?? payment.workerPrice) || 0;
                const totalPaymentsUzs = certUzs + psrUzs + workerUzs;
                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.branch.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatCurrency(certUsd, 'USD')}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(certUzs, 'UZS')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatCurrency(psrUsd, 'USD')}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(psrUzs, 'UZS')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatCurrency(workerUsd, 'USD')}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(workerUzs, 'UZS')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(totalPaymentsUzs, 'UZS')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        O'chirish
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Yangi davlat to'lovi</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tanlang...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sertifikat to'lovi <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.certificatePaymentUsd}
                      onChange={(e) => setForm({ ...form, certificatePaymentUsd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="USD"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.certificatePaymentUzs}
                      onChange={(e) => setForm({ ...form, certificatePaymentUzs: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="UZS"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PSR narxi <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.psrPriceUsd}
                      onChange={(e) => setForm({ ...form, psrPriceUsd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="USD"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.psrPriceUzs}
                      onChange={(e) => setForm({ ...form, psrPriceUzs: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="UZS"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ishchi narxi <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.workerPriceUsd}
                      onChange={(e) => setForm({ ...form, workerPriceUsd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="USD"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.workerPriceUzs}
                      onChange={(e) => setForm({ ...form, workerPriceUzs: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="UZS"
                    />
                  </div>
                </div>


              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StatePayments;
