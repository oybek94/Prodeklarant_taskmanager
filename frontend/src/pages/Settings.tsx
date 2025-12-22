import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import { formatDateTime } from '../utils/dateFormat';

interface BXMConfig {
  id: number;
  year: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

interface StatePayment {
  id: number;
  branchId: number;
  certificatePayment: number;
  psrPrice: number;
  workerPrice: number;
  customsPayment: number;
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

const Settings = () => {
  const { user } = useAuth();
  const [bxmConfigs, setBxmConfigs] = useState<BXMConfig[]>([]);
  const [currentBXM, setCurrentBXM] = useState<BXMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [statePayments, setStatePayments] = useState<StatePayment[]>([]);
  const [loadingStatePayments, setLoadingStatePayments] = useState(true);
  const [showStatePaymentForm, setShowStatePaymentForm] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [statePaymentForm, setStatePaymentForm] = useState({
    branchId: '',
    certificatePayment: '',
    psrPrice: '',
    workerPrice: '',
    customsPayment: '',
  });

  useEffect(() => {
    loadBXMConfigs();
    loadCurrentBXM();
    loadStatePayments();
    loadBranches();
  }, []);

  const loadBXMConfigs = async () => {
    try {
      const response = await apiClient.get('/bxm');
      setBxmConfigs(response.data);
    } catch (error) {
      console.error('Error loading BXM configs:', error);
    }
  };

  const loadCurrentBXM = async () => {
    try {
      const response = await apiClient.get('/bxm/current');
      setCurrentBXM(response.data);
    } catch (error) {
      console.error('Error loading current BXM:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: BXMConfig) => {
    setEditingYear(config.year);
    setEditAmount(config.amount.toString());
  };

  const handleSave = async (year: number) => {
    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${year}`, { amount });
      await loadBXMConfigs();
      await loadCurrentBXM();
      setEditingYear(null);
      setEditAmount('');
      alert('BXM muvaffaqiyatli yangilandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleAddNewYear = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const newYear = currentYear + 1;
      const amount = parseFloat(editAmount);
      
      if (isNaN(amount) || amount < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${newYear}`, { amount });
      await loadBXMConfigs();
      setEditingYear(null);
      setEditAmount('');
      alert('Yangi yil uchun BXM muvaffaqiyatli qo\'shildi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const loadStatePayments = async () => {
    try {
      setLoadingStatePayments(true);
      const response = await apiClient.get('/state-payments');
      setStatePayments(response.data);
    } catch (error) {
      console.error('Error loading state payments:', error);
    } finally {
      setLoadingStatePayments(false);
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

  const handleStatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/state-payments', {
        branchId: Number(statePaymentForm.branchId),
        certificatePayment: Number(statePaymentForm.certificatePayment),
        psrPrice: Number(statePaymentForm.psrPrice),
        workerPrice: Number(statePaymentForm.workerPrice),
        customsPayment: Number(statePaymentForm.customsPayment),
      });
      setShowStatePaymentForm(false);
      setStatePaymentForm({
        branchId: '',
        certificatePayment: '',
        psrPrice: '',
        workerPrice: '',
        customsPayment: '',
      });
      await loadStatePayments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteStatePayment = async (id: number) => {
    if (!confirm('Bu davlat to\'lovini o\'chirishni xohlaysizmi?')) return;
    try {
      await apiClient.delete(`/state-payments/${id}`);
      await loadStatePayments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };


  if (user?.role !== 'ADMIN') {
    return (
      <div className="text-center py-8 text-gray-500">
        Sizga bu sahifaga kirish ruxsati yo'q
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sozlamalar</h1>

      {/* Current BXM */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Joriy BXM (Bazaviy Xisoblash Miqdori)</h2>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
        ) : currentBXM ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Yil: {currentBXM.year}</div>
              <div className="text-2xl font-bold text-blue-600">
                ${Number(currentBXM.amount).toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => handleEdit(currentBXM)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              O'zgartirish
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">BXM topilmadi</div>
        )}
      </div>

      {/* BXM History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">BXM tarixi</h2>
          <button
            onClick={() => {
              const currentYear = new Date().getFullYear();
              setEditingYear(currentYear + 1);
              setEditAmount('34.4');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Yangi yil qo'shish
          </button>
        </div>
        <div className="space-y-3">
          {bxmConfigs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {editingYear === config.year ? (
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium text-gray-700 w-20">{config.year}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BXM summa"
                  />
                  <button
                    onClick={() => handleSave(config.year)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Saqlash
                  </button>
                  <button
                    onClick={() => {
                      setEditingYear(null);
                      setEditAmount('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Bekor qilish
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{config.year} yil</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${Number(config.amount).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(config)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    O'zgartirish
                  </button>
                </>
              )}
            </div>
          ))}
          {editingYear && editingYear > Math.max(...bxmConfigs.map(c => c.year), 0) && (
            <div className="flex items-center gap-3 p-3 border-2 border-green-300 rounded-lg bg-green-50">
              <span className="text-sm font-medium text-gray-700 w-20">{editingYear}</span>
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="BXM summa"
              />
              <button
                onClick={handleAddNewYear}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Qo'shish
              </button>
              <button
                onClick={() => {
                  setEditingYear(null);
                  setEditAmount('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* State Payments Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Davlat to'lovlari</h2>
          <button
            onClick={() => setShowStatePaymentForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Qo'shish
          </button>
        </div>

        {loadingStatePayments ? (
          <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
        ) : statePayments.length === 0 ? (
          <div className="text-center py-4 text-gray-400">Davlat to'lovlari topilmadi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Filial</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Sertifikat to'lovi</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">PSR narxi</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Ishchi narxi</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Bojxona to'lovi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Yaratilgan</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {statePayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800 font-medium">{payment.branch.name}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(payment.certificatePayment)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(payment.psrPrice)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(payment.workerPrice)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(payment.customsPayment)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatDateTime(payment.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteStatePayment(payment.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        O'chirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* State Payment Form Modal */}
      {showStatePaymentForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStatePaymentForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Yangi davlat to'lovi</h3>
              <button
                onClick={() => setShowStatePaymentForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleStatePaymentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={statePaymentForm.branchId}
                    onChange={(e) => setStatePaymentForm({ ...statePaymentForm, branchId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
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
                  <input
                    type="number"
                    step="0.01"
                    value={statePaymentForm.certificatePayment}
                    onChange={(e) => setStatePaymentForm({ ...statePaymentForm, certificatePayment: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PSR narxi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={statePaymentForm.psrPrice}
                    onChange={(e) => setStatePaymentForm({ ...statePaymentForm, psrPrice: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ishchi narxi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={statePaymentForm.workerPrice}
                    onChange={(e) => setStatePaymentForm({ ...statePaymentForm, workerPrice: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bojxona to'lovi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={statePaymentForm.customsPayment}
                    onChange={(e) => setStatePaymentForm({ ...statePaymentForm, customsPayment: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatePaymentForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;