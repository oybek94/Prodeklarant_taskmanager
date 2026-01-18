import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';

interface BXMConfig {
  id: number;
  year: number;
  amount: number;
  amountUsd?: number;
  amountUzs?: number;
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

interface CompanySettings {
  id: number;
  name: string;
  legalAddress: string;
  actualAddress: string;
  inn?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAddress?: string;
  bankAccount?: string;
  swiftCode?: string;
  correspondentBank?: string;
  correspondentBankAddress?: string;
  correspondentBankSwift?: string;
}

interface KpiConfig {
  id: number;
  stageName: string;
  price: number;
  updatedAt: string;
}

const STAGE_PRICE_DEFAULTS = [
  { stageName: 'Invoys', price: 3.0 },
  { stageName: 'Zayavka', price: 3.0 },
  { stageName: 'TIR-SMR', price: 1.5 },
  { stageName: 'Sertifikat olib chiqish', price: 1.25 },
  { stageName: 'Deklaratsiya', price: 2.0 },
  { stageName: 'Tekshirish', price: 2.0 },
  { stageName: 'Topshirish', price: 1.25 },
  { stageName: 'Pochta', price: 1.0 },
];

const Settings = () => {
  const { user } = useAuth();
  const [bxmConfigs, setBxmConfigs] = useState<BXMConfig[]>([]);
  const [currentBXM, setCurrentBXM] = useState<BXMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editAmountUsd, setEditAmountUsd] = useState<string>('');
  const [editAmountUzs, setEditAmountUzs] = useState<string>('');
  const [statePayments, setStatePayments] = useState<StatePayment[]>([]);
  const [loadingStatePayments, setLoadingStatePayments] = useState(true);
  const [showStatePaymentForm, setShowStatePaymentForm] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [statePaymentForm, setStatePaymentForm] = useState({
    branchId: '',
    certificatePaymentUsd: '',
    certificatePaymentUzs: '',
    psrPriceUsd: '',
    psrPriceUzs: '',
    workerPriceUsd: '',
    workerPriceUzs: '',
  });
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loadingCompanySettings, setLoadingCompanySettings] = useState(true);
  const [showCompanySettingsForm, setShowCompanySettingsForm] = useState(false);
  const [companySettingsForm, setCompanySettingsForm] = useState({
    name: '',
    legalAddress: '',
    actualAddress: '',
    inn: '',
    phone: '',
    email: '',
    bankName: '',
    bankAddress: '',
    bankAccount: '',
    swiftCode: '',
    correspondentBank: '',
    correspondentBankAddress: '',
    correspondentBankSwift: '',
  });
  const [kpiConfigEdits, setKpiConfigEdits] = useState<Record<string, string>>({});
  const [loadingKpiConfigs, setLoadingKpiConfigs] = useState(true);
  const [savingKpiConfigs, setSavingKpiConfigs] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [deletingBranchId, setDeletingBranchId] = useState<number | null>(null);

  useEffect(() => {
    loadBXMConfigs();
    loadCurrentBXM();
    loadStatePayments();
    loadBranches();
    loadCompanySettings();
    loadKpiConfigs();
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
    setEditAmountUsd((config.amountUsd ?? config.amount).toString());
    setEditAmountUzs((config.amountUzs ?? 412000).toString());
  };

  const handleSave = async (year: number) => {
    try {
      const amountUsd = parseFloat(editAmountUsd);
      const amountUzs = parseFloat(editAmountUzs);
      if (isNaN(amountUsd) || amountUsd < 0 || isNaN(amountUzs) || amountUzs < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${year}`, { amountUsd, amountUzs });
      await loadBXMConfigs();
      await loadCurrentBXM();
      setEditingYear(null);
      setEditAmountUsd('');
      setEditAmountUzs('');
      alert('BXM muvaffaqiyatli yangilandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleAddNewYear = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const newYear = currentYear + 1;
      const amountUsd = parseFloat(editAmountUsd);
      const amountUzs = parseFloat(editAmountUzs);
      
      if (isNaN(amountUsd) || amountUsd < 0 || isNaN(amountUzs) || amountUzs < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${newYear}`, { amountUsd, amountUzs });
      await loadBXMConfigs();
      setEditingYear(null);
      setEditAmountUsd('');
      setEditAmountUzs('');
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
      setBranches([]);
    }
  };

  const handleCreateBranch = async (branchName: string) => {
    try {
      await apiClient.post('/branches', { name: branchName });
      await loadBranches();
      alert('Filial muvaffaqiyatli qo\'shildi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteBranch = async (branchId: number, branchName: string) => {
    if (!confirm(`"${branchName}" filialini o'chirishni xohlaysizmi?`)) return;
    try {
      setDeletingBranchId(branchId);
      await apiClient.delete(`/branches/${branchId}`);
      await loadBranches();
      alert('Filial muvaffaqiyatli o\'chirildi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setDeletingBranchId(null);
    }
  };

  const handleStatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/state-payments', {
        branchId: Number(statePaymentForm.branchId),
        certificatePaymentUsd: Number(statePaymentForm.certificatePaymentUsd),
        certificatePaymentUzs: Number(statePaymentForm.certificatePaymentUzs),
        psrPriceUsd: Number(statePaymentForm.psrPriceUsd),
        psrPriceUzs: Number(statePaymentForm.psrPriceUzs),
        workerPriceUsd: Number(statePaymentForm.workerPriceUsd),
        workerPriceUzs: Number(statePaymentForm.workerPriceUzs),
      });
      setShowStatePaymentForm(false);
      setStatePaymentForm({
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

  const handleDeleteStatePayment = async (id: number) => {
    if (!confirm('Bu davlat to\'lovini o\'chirishni xohlaysizmi?')) return;
    try {
      await apiClient.delete(`/state-payments/${id}`);
      await loadStatePayments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatCurrency = (amount: number, currency: 'USD' | 'UZS') => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(amount).replace(/,/g, ' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadCompanySettings = async () => {
    try {
      setLoadingCompanySettings(true);
      const response = await apiClient.get('/company-settings');
      if (response.data) {
        setCompanySettings(response.data);
        setCompanySettingsForm({
          name: response.data.name || '',
          legalAddress: response.data.legalAddress || '',
          actualAddress: response.data.actualAddress || '',
          inn: response.data.inn || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          bankName: response.data.bankName || '',
          bankAddress: response.data.bankAddress || '',
          bankAccount: response.data.bankAccount || '',
          swiftCode: response.data.swiftCode || '',
          correspondentBank: response.data.correspondentBank || '',
          correspondentBankAddress: response.data.correspondentBankAddress || '',
          correspondentBankSwift: response.data.correspondentBankSwift || '',
        });
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoadingCompanySettings(false);
    }
  };

  const loadKpiConfigs = async () => {
    try {
      setLoadingKpiConfigs(true);
      const response = await apiClient.get('/kpi/configs');
      const configMap = new Map<string, number>(
        response.data.map((config: KpiConfig) => [config.stageName, Number(config.price)])
      );
      const edits: Record<string, string> = {};
      STAGE_PRICE_DEFAULTS.forEach((stage) => {
        const value = configMap.get(stage.stageName) ?? stage.price;
        edits[stage.stageName] = value.toString();
      });
      setKpiConfigEdits(edits);
    } catch (error) {
      console.error('Error loading KPI configs:', error);
    } finally {
      setLoadingKpiConfigs(false);
    }
  };

  const handleSaveKpiConfigs = async () => {
    try {
      setSavingKpiConfigs(true);
      const payload = STAGE_PRICE_DEFAULTS.map((stage) => {
        const rawValue = kpiConfigEdits[stage.stageName];
        const price = parseFloat(rawValue);
        if (isNaN(price) || price < 0) {
          throw new Error(`Noto'g'ri summa: ${stage.stageName}`);
        }
        return { stageName: stage.stageName, price };
      });
      await apiClient.put('/kpi/configs', payload);
      await loadKpiConfigs();
      alert('Jarayonlar bo\'yicha summalar saqlandi');
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Xatolik yuz berdi');
    } finally {
      setSavingKpiConfigs(false);
    }
  };

  const handleCompanySettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/company-settings', companySettingsForm);
      setShowCompanySettingsForm(false);
      await loadCompanySettings();
      alert('Kompaniya sozlamalari muvaffaqiyatli saqlandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
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
                {formatCurrency(Number(currentBXM.amountUsd ?? currentBXM.amount), 'USD')}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {formatCurrency(Number(currentBXM.amountUzs ?? 412000), 'UZS')}
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
              setEditAmountUsd('34.4');
              setEditAmountUzs('412000');
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
                    value={editAmountUsd}
                    onChange={(e) => setEditAmountUsd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BXM USD"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editAmountUzs}
                    onChange={(e) => setEditAmountUzs(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BXM UZS"
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
                      setEditAmountUsd('');
                      setEditAmountUzs('');
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
                      {formatCurrency(Number(config.amountUsd ?? config.amount), 'USD')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(Number(config.amountUzs ?? 412000), 'UZS')}
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
                value={editAmountUsd}
                onChange={(e) => setEditAmountUsd(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="BXM USD"
              />
              <input
                type="number"
                step="0.01"
                value={editAmountUzs}
                onChange={(e) => setEditAmountUzs(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="BXM UZS"
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
                  setEditAmountUsd('');
                  setEditAmountUzs('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Branches Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filiallar</h2>
          <button
            onClick={() => setShowBranchForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Filial qo'shish
          </button>
        </div>

        {branches.length === 0 ? (
          <div className="text-center py-4 text-gray-400">Filiallar topilmadi</div>
        ) : (
          <div className="space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="text-gray-800 font-medium">{branch.name}</div>
                <button
                  onClick={() => handleDeleteBranch(branch.id, branch.name)}
                  disabled={deletingBranchId === branch.id}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                >
                  {deletingBranchId === branch.id ? 'O\'chirilmoqda...' : 'O\'chirish'}
                </button>
              </div>
            ))}
          </div>
        )}

        {showBranchForm && (
          <div className="mt-4 p-4 border-2 border-green-300 rounded-lg bg-green-50">
            <h3 className="text-md font-semibold text-gray-800 mb-3">Yangi filial</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Filial nomi"
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newBranchName.trim()) {
                    handleCreateBranch(newBranchName.trim());
                    setNewBranchName('');
                    setShowBranchForm(false);
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  if (newBranchName.trim()) {
                    handleCreateBranch(newBranchName.trim());
                    setNewBranchName('');
                    setShowBranchForm(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Qo'shish
              </button>
              <button
                onClick={() => {
                  setShowBranchForm(false);
                  setNewBranchName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Yaratilgan</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {statePayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800 font-medium">{payment.branch.name}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-sm text-gray-700">{formatCurrency(Number(payment.certificatePaymentUsd ?? payment.certificatePayment), 'USD')}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(Number(payment.certificatePaymentUzs ?? payment.certificatePayment), 'UZS')}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-sm text-gray-700">{formatCurrency(Number(payment.psrPriceUsd ?? payment.psrPrice), 'USD')}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(Number(payment.psrPriceUzs ?? payment.psrPrice), 'UZS')}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-sm text-gray-700">{formatCurrency(Number(payment.workerPriceUsd ?? payment.workerPrice), 'USD')}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(Number(payment.workerPriceUzs ?? payment.workerPrice), 'UZS')}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatDate(payment.createdAt)}</td>
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
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={statePaymentForm.certificatePaymentUsd}
                      onChange={(e) => setStatePaymentForm({ ...statePaymentForm, certificatePaymentUsd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                      placeholder="USD"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={statePaymentForm.certificatePaymentUzs}
                      onChange={(e) => setStatePaymentForm({ ...statePaymentForm, certificatePaymentUzs: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
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
                      value={statePaymentForm.psrPriceUsd}
                      onChange={(e) => setStatePaymentForm({ ...statePaymentForm, psrPriceUsd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                      placeholder="USD"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={statePaymentForm.psrPriceUzs}
                      onChange={(e) => setStatePaymentForm({ ...statePaymentForm, psrPriceUzs: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
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
                      value={statePaymentForm.workerPriceUsd}
                      onChange={(e) => setStatePaymentForm({ ...statePaymentForm, workerPriceUsd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                      placeholder="USD"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={statePaymentForm.workerPriceUzs}
                      onChange={(e) => setStatePaymentForm({ ...statePaymentForm, workerPriceUzs: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                      placeholder="UZS"
                    />
                  </div>
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

      {/* Stage fixed amounts */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Jarayonlar bo'yicha qatiy summalar</h2>
            <div className="text-sm text-gray-500">Barcha summalar USD da kiritiladi</div>
          </div>
          <button
            onClick={handleSaveKpiConfigs}
            disabled={savingKpiConfigs || loadingKpiConfigs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {savingKpiConfigs ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
        {loadingKpiConfigs ? (
          <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Jarayon</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Summa (USD)</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_PRICE_DEFAULTS.map((stage) => (
                  <tr key={stage.stageName} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800 font-medium">{stage.stageName}</td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={kpiConfigEdits[stage.stageName] ?? ''}
                        onChange={(e) =>
                          setKpiConfigEdits({
                            ...kpiConfigEdits,
                            [stage.stageName]: e.target.value,
                          })
                        }
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={stage.price.toString()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Company Settings Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Kompaniya ma'lumotlari</h2>
          <button
            onClick={() => {
              if (companySettings) {
                setShowCompanySettingsForm(true);
              } else {
                setShowCompanySettingsForm(true);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {companySettings ? 'O\'zgartirish' : '+ Qo\'shish'}
          </button>
        </div>

        {loadingCompanySettings ? (
          <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
        ) : companySettings ? (
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">Nomi:</span> {companySettings.name}</div>
            <div><span className="font-semibold">Yuridik manzil:</span> {companySettings.legalAddress}</div>
            <div><span className="font-semibold">Haqiqiy manzil:</span> {companySettings.actualAddress}</div>
            {companySettings.inn && <div><span className="font-semibold">INN:</span> {companySettings.inn}</div>}
            {companySettings.phone && <div><span className="font-semibold">Telefon:</span> {companySettings.phone}</div>}
            {companySettings.email && <div><span className="font-semibold">Email:</span> {companySettings.email}</div>}
            {companySettings.bankName && <div><span className="font-semibold">Bank:</span> {companySettings.bankName}</div>}
            {companySettings.bankAccount && <div><span className="font-semibold">Hisob raqami:</span> {companySettings.bankAccount}</div>}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            Kompaniya ma'lumotlari kiritilmagan. Invoice yaratish uchun kompaniya ma'lumotlarini kiriting.
          </div>
        )}
      </div>

      {/* Company Settings Form Modal */}
      {showCompanySettingsForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompanySettingsForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Kompaniya ma'lumotlari</h3>
              <button
                onClick={() => setShowCompanySettingsForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCompanySettingsSubmit}>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kompaniya nomi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companySettingsForm.name}
                    onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yuridik manzil <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={companySettingsForm.legalAddress}
                    onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, legalAddress: e.target.value })}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Haqiqiy manzil <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={companySettingsForm.actualAddress}
                    onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, actualAddress: e.target.value })}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">INN</label>
                    <input
                      type="text"
                      value={companySettingsForm.inn}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, inn: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input
                      type="text"
                      value={companySettingsForm.phone}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={companySettingsForm.email}
                    onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, email: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Bank ma'lumotlari</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank nomi</label>
                    <input
                      type="text"
                      value={companySettingsForm.bankName}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank manzili</label>
                    <textarea
                      value={companySettingsForm.bankAddress}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, bankAddress: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hisob raqami</label>
                    <input
                      type="text"
                      value={companySettingsForm.bankAccount}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, bankAccount: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT kodi</label>
                    <input
                      type="text"
                      value={companySettingsForm.swiftCode}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, swiftCode: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Bank-korrespondent ma'lumotlari</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank-korrespondent</label>
                    <input
                      type="text"
                      value={companySettingsForm.correspondentBank}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, correspondentBank: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank-korrespondent manzili</label>
                    <textarea
                      value={companySettingsForm.correspondentBankAddress}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, correspondentBankAddress: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank-korrespondent SWIFT</label>
                    <input
                      type="text"
                      value={companySettingsForm.correspondentBankSwift}
                      onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, correspondentBankSwift: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    />
                  </div>
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
                  onClick={() => setShowCompanySettingsForm(false)}
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