import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import {
  addTnvedProduct,
  deleteTnvedProduct,
  getTnvedProducts,
  resetTnvedProductsToDefaults,
  updateTnvedProduct,
} from '../utils/tnvedProducts';
interface PackagingTypeItem {
  id: string;
  name: string;
  code?: string;
}

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

interface CertifierFeeConfig {
  id: number;
  st1Rate: number;
  fitoRate: number;
  aktRate: number;
  createdAt: string;
  updatedAt: string;
}

interface YearlyGoalConfig {
  id: number;
  year: number;
  targetTasks: number;
  createdAt: string;
  updatedAt: string;
}

interface KpiConfig {
  id: number;
  stageName: string;
  price: number;
  updatedAt: string;
}

interface RegionCode {
  id: number;
  name: string;
  internalCode: string;
  externalCode: string;
  createdAt: string;
}

interface ProcessSetting {
  id: number;
  processType: 'TIR' | 'CERT' | 'DECLARATION';
  estimatedTime: number;
  reminder1: number;
  reminder2: number;
  reminder3: number;
  updatedAt: string;
}

const PROCESS_TYPE_LABELS: Record<string, string> = {
  TIR: 'TIR-SMR',
  CERT: 'Zayavka',
  DECLARATION: 'Deklaratsiya',
};

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

const iconClassName = 'h-4 w-4';

const IconAdd = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12.5 4.5 15.5 7.5" strokeLinecap="round" />
    <path d="M5 15h3l7.5-7.5-3-3L5 12v3z" strokeLinejoin="round" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 6h12" strokeLinecap="round" />
    <path d="M7 6V4h6v2" strokeLinejoin="round" />
    <path d="M6 6l1 10h6l1-10" strokeLinejoin="round" />
  </svg>
);

const IconSave = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCancel = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
  </svg>
);

const Settings = () => {
  const { user } = useAuth();
  const [tnvedProducts, setTnvedProducts] = useState(getTnvedProducts());
  const [tnvedName, setTnvedName] = useState('');
  const [tnvedCode, setTnvedCode] = useState('');
  const [tnvedBotanical, setTnvedBotanical] = useState('');
  const [editingTnvedId, setEditingTnvedId] = useState<string | null>(null);
  const [editingTnvedName, setEditingTnvedName] = useState('');
  const [editingTnvedCode, setEditingTnvedCode] = useState('');
  const [editingTnvedBotanical, setEditingTnvedBotanical] = useState('');
  const [packagingTypes, setPackagingTypes] = useState<PackagingTypeItem[]>([]);
  const [loadingPackagingTypes, setLoadingPackagingTypes] = useState(true);
  const [packagingName, setPackagingName] = useState('');
  const [packagingCode, setPackagingCode] = useState('');
  const [editingPackagingId, setEditingPackagingId] = useState<string | null>(null);
  const [editingPackagingName, setEditingPackagingName] = useState('');
  const [editingPackagingCode, setEditingPackagingCode] = useState('');
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
  const [certifierFeeConfig, setCertifierFeeConfig] = useState<CertifierFeeConfig | null>(null);
  const [loadingCertifierFeeConfig, setLoadingCertifierFeeConfig] = useState(true);
  const [showCertifierFeeForm, setShowCertifierFeeForm] = useState(false);
  const [certifierFeeForm, setCertifierFeeForm] = useState({
    st1Rate: '',
    fitoRate: '',
    aktRate: '',
  });
  const [yearlyGoalConfig, setYearlyGoalConfig] = useState<YearlyGoalConfig | null>(null);
  const [loadingYearlyGoalConfig, setLoadingYearlyGoalConfig] = useState(true);
  const [showYearlyGoalForm, setShowYearlyGoalForm] = useState(false);
  const [yearlyGoalForm, setYearlyGoalForm] = useState({
    year: new Date().getFullYear().toString(),
    targetTasks: '',
  });
  const [kpiConfigEdits, setKpiConfigEdits] = useState<Record<string, string>>({});
  const [loadingKpiConfigs, setLoadingKpiConfigs] = useState(true);
  const [savingKpiConfigs, setSavingKpiConfigs] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [deletingBranchId, setDeletingBranchId] = useState<number | null>(null);
  const [regionCodes, setRegionCodes] = useState<RegionCode[]>([]);
  const [loadingRegionCodes, setLoadingRegionCodes] = useState(true);
  const [showRegionCodeForm, setShowRegionCodeForm] = useState(false);
  const [regionCodeForm, setRegionCodeForm] = useState({
    name: '',
    internalCode: '',
    externalCode: '',
  });
  const [deletingRegionCodeId, setDeletingRegionCodeId] = useState<number | null>(null);
  const [processSettings, setProcessSettings] = useState<ProcessSetting[]>([]);
  const [loadingProcessSettings, setLoadingProcessSettings] = useState(true);
  const [processSettingsEdits, setProcessSettingsEdits] = useState<Record<string, { estimatedTime: string; reminder1: string; reminder2: string; reminder3: string }>>({});
  const [savingProcessSettings, setSavingProcessSettings] = useState(false);

  const refreshTnvedProducts = () => {
    setTnvedProducts(getTnvedProducts());
  };
  const loadPackagingTypes = async () => {
    try {
      setLoadingPackagingTypes(true);
      const res = await apiClient.get<PackagingTypeItem[]>('/packaging-types');
      setPackagingTypes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Qadoq turlarini yuklash:', e);
      setPackagingTypes([]);
    } finally {
      setLoadingPackagingTypes(false);
    }
  };

  useEffect(() => {
    loadBXMConfigs();
    loadCurrentBXM();
    loadStatePayments();
    loadBranches();
    loadCompanySettings();
    loadCertifierFeeConfig();
    loadYearlyGoalConfig();
    loadKpiConfigs();
    loadRegionCodes();
    loadProcessSettings();
    loadPackagingTypes();
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

  const loadRegionCodes = async () => {
    try {
      setLoadingRegionCodes(true);
      const response = await apiClient.get('/region-codes');
      setRegionCodes(response.data);
    } catch (error) {
      console.error('Error loading region codes:', error);
    } finally {
      setLoadingRegionCodes(false);
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

  const handleCreateRegionCode = async () => {
    const payload = {
      name: regionCodeForm.name.trim(),
      internalCode: regionCodeForm.internalCode.trim(),
      externalCode: regionCodeForm.externalCode.trim(),
    };
    if (!payload.name || !payload.internalCode || !payload.externalCode) {
      alert('Barcha maydonlarni to\'ldiring');
      return;
    }
    try {
      await apiClient.post('/region-codes', payload);
      setRegionCodeForm({ name: '', internalCode: '', externalCode: '' });
      setShowRegionCodeForm(false);
      await loadRegionCodes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteRegionCode = async (id: number, name: string) => {
    if (!confirm(`"${name}" hudud kodini o'chirishni xohlaysizmi?`)) return;
    try {
      setDeletingRegionCodeId(id);
      await apiClient.delete(`/region-codes/${id}`);
      await loadRegionCodes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setDeletingRegionCodeId(null);
    }
  };

  const loadProcessSettings = async () => {
    try {
      setLoadingProcessSettings(true);
      const response = await apiClient.get('/process/settings');
      const data = Array.isArray(response.data) ? response.data : [];
      setProcessSettings(data);
      const edits: Record<string, { estimatedTime: string; reminder1: string; reminder2: string; reminder3: string }> = {};
      data.forEach((s: ProcessSetting) => {
        edits[s.processType] = {
          estimatedTime: s.estimatedTime.toString(),
          reminder1: s.reminder1.toString(),
          reminder2: s.reminder2.toString(),
          reminder3: s.reminder3.toString(),
        };
      });
      setProcessSettingsEdits(edits);
    } catch (error) {
      console.error('Error loading process settings:', error);
    } finally {
      setLoadingProcessSettings(false);
    }
  };

  const handleSaveProcessSettings = async () => {
    try {
      setSavingProcessSettings(true);
      const settings = Object.entries(processSettingsEdits).map(([processType, vals]) => ({
        processType: processType as 'TIR' | 'CERT' | 'DECLARATION',
        estimatedTime: parseInt(vals.estimatedTime, 10) || 0,
        reminder1: parseInt(vals.reminder1, 10) || 0,
        reminder2: parseInt(vals.reminder2, 10) || 0,
        reminder3: parseInt(vals.reminder3, 10) || 0,
      }));
      await apiClient.put('/process/settings', { settings });
      await loadProcessSettings();
      alert('Jarayon sozlamalari muvaffaqiyatli saqlandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setSavingProcessSettings(false);
    }
  };

  const handleAddTnvedProduct = () => {
    if (!tnvedName.trim() || !tnvedCode.trim()) {
      alert('Mahsulot nomi va TNVED kodi majburiy');
      return;
    }
    addTnvedProduct(tnvedName.trim(), tnvedCode.trim(), tnvedBotanical.trim());
    setTnvedName('');
    setTnvedCode('');
    setTnvedBotanical('');
    refreshTnvedProducts();
  };

  const startEditTnved = (item: { id: string; name: string; code: string; botanicalName?: string }) => {
    setEditingTnvedId(item.id);
    setEditingTnvedName(item.name);
    setEditingTnvedCode(item.code);
    setEditingTnvedBotanical(item.botanicalName || '');
  };

  const cancelEditTnved = () => {
    setEditingTnvedId(null);
    setEditingTnvedName('');
    setEditingTnvedCode('');
    setEditingTnvedBotanical('');
  };

  const handleSaveTnved = () => {
    if (!editingTnvedId) return;
    if (!editingTnvedName.trim() || !editingTnvedCode.trim()) {
      alert('Mahsulot nomi va TNVED kodi majburiy');
      return;
    }
    updateTnvedProduct(
      editingTnvedId,
      editingTnvedName.trim(),
      editingTnvedCode.trim(),
      editingTnvedBotanical.trim()
    );
    cancelEditTnved();
    refreshTnvedProducts();
  };

  const handleDeleteTnved = (id: string, name: string) => {
    if (!confirm(`"${name}" mahsulotini o'chirishni xohlaysizmi?`)) return;
    deleteTnvedProduct(id);
    refreshTnvedProducts();
  };

  const handleResetTnved = () => {
    if (!confirm('Standart spetsifikatsiya ro\'yxatini tiklaysizmi?')) return;
    resetTnvedProductsToDefaults();
    refreshTnvedProducts();
  };

  const handleAddPackagingType = async () => {
    if (!packagingName.trim() || !packagingCode.trim()) {
      alert('Qadoq nomi va qadoq kodi majburiy');
      return;
    }
    try {
      await apiClient.post('/packaging-types', { name: packagingName.trim(), code: packagingCode.trim() });
      setPackagingName('');
      setPackagingCode('');
      await loadPackagingTypes();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Qo‘shishda xatolik');
    }
  };

  const startEditPackaging = (item: { id: string; name: string; code?: string }) => {
    setEditingPackagingId(item.id);
    setEditingPackagingName(item.name);
    setEditingPackagingCode(item.code || '');
  };

  const cancelEditPackaging = () => {
    setEditingPackagingId(null);
    setEditingPackagingName('');
    setEditingPackagingCode('');
  };

  const handleSavePackaging = async () => {
    if (!editingPackagingId) return;
    if (!editingPackagingName.trim() || !editingPackagingCode.trim()) {
      alert('Qadoq nomi va qadoq kodi majburiy');
      return;
    }
    try {
      await apiClient.put(`/packaging-types/${editingPackagingId}`, {
        name: editingPackagingName.trim(),
        code: editingPackagingCode.trim(),
      });
      cancelEditPackaging();
      await loadPackagingTypes();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Saqlashda xatolik');
    }
  };

  const handleDeletePackaging = async (id: string, name: string) => {
    if (!confirm(`"${name}" qadoq turini o'chirishni xohlaysizmi?`)) return;
    try {
      await apiClient.delete(`/packaging-types/${id}`);
      await loadPackagingTypes();
    } catch (e: any) {
      alert(e.response?.data?.error || 'O‘chirishda xatolik');
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

  const loadCertifierFeeConfig = async () => {
    try {
      setLoadingCertifierFeeConfig(true);
      const response = await apiClient.get('/certifier-fee-config');
      if (response.data) {
        setCertifierFeeConfig(response.data);
        setCertifierFeeForm({
          st1Rate: response.data.st1Rate?.toString() ?? '',
          fitoRate: response.data.fitoRate?.toString() ?? '',
          aktRate: response.data.aktRate?.toString() ?? '',
        });
      }
    } catch (error) {
      console.error('Error loading certifier fee config:', error);
    } finally {
      setLoadingCertifierFeeConfig(false);
    }
  };

  const loadYearlyGoalConfig = async () => {
    try {
      setLoadingYearlyGoalConfig(true);
      const response = await apiClient.get('/yearly-goal-config');
      if (response.data) {
        setYearlyGoalConfig(response.data);
        setYearlyGoalForm({
          year: response.data.year?.toString() ?? new Date().getFullYear().toString(),
          targetTasks: response.data.targetTasks?.toString() ?? '',
        });
      }
    } catch (error) {
      console.error('Error loading yearly goal config:', error);
    } finally {
      setLoadingYearlyGoalConfig(false);
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

  const handleCertifierFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/certifier-fee-config', {
        st1Rate: Number(certifierFeeForm.st1Rate),
        fitoRate: Number(certifierFeeForm.fitoRate),
        aktRate: Number(certifierFeeForm.aktRate),
      });
      setShowCertifierFeeForm(false);
      await loadCertifierFeeConfig();
      alert('Sertifikatchi tariflari muvaffaqiyatli saqlandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleYearlyGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/yearly-goal-config', {
        year: Number(yearlyGoalForm.year),
        targetTasks: Number(yearlyGoalForm.targetTasks),
      });
      setShowYearlyGoalForm(false);
      await loadYearlyGoalConfig();
      alert('Yillik maqsad muvaffaqiyatli saqlandi');
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
    <div className="h-full overflow-y-auto space-y-8 pr-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Sozlamalar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Asosiy ma'lumotlar, tariflar va hisob-kitob sozlamalarini tartibga keltiring.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Asosiy</h2>
          <span className="text-sm text-gray-400">Filiallar</span>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Branches Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Filiallar</h2>
              <button
                onClick={() => setShowBranchForm(true)}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Filial qo'shish"
                title="Filial qo'shish"
              >
                <IconAdd />
                <span className="sr-only">Filial qo'shish</span>
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
                      className="inline-flex items-center justify-center p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                      aria-label="Filialni o'chirish"
                      title="Filialni o'chirish"
                    >
                      <IconTrash />
                      <span className="sr-only">{deletingBranchId === branch.id ? 'O\'chirilmoqda...' : 'O\'chirish'}</span>
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
                    className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="Qo'shish"
                    title="Qo'shish"
                  >
                    <IconAdd />
                    <span className="sr-only">Qo'shish</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowBranchForm(false);
                      setNewBranchName('');
                    }}
                    className="inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    aria-label="Bekor qilish"
                    title="Bekor qilish"
                  >
                    <IconCancel />
                    <span className="sr-only">Bekor qilish</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Standart spetsifikatsiya</h2>
                <div className="text-sm text-gray-500">Mahsulot, TNVED va botanik nomlar</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
              <input
                type="text"
                value={tnvedName}
                onChange={(e) => setTnvedName(e.target.value)}
                placeholder="Mahsulot nomi"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={tnvedCode}
                onChange={(e) => setTnvedCode(e.target.value)}
                placeholder="TNVED kod"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={tnvedBotanical}
                onChange={(e) => setTnvedBotanical(e.target.value)}
                placeholder="Botanik nomi"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddTnvedProduct}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Qo'shish"
                title="Qo'shish"
              >
                <IconAdd />
                <span className="sr-only">Qo'shish</span>
              </button>
            </div>
            <div className="max-h-[360px] overflow-auto border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 w-12">№</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Mahsulot nomi</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 w-28">TNVED</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Botanik nomi</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 w-24">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {tnvedProducts.map((item, idx) => {
                    const isEditing = editingTnvedId === item.id;
                    return (
                      <tr key={`${item.id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-600">{idx + 1}</td>
                        <td className="py-2 px-3 text-gray-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTnvedName}
                              onChange={(e) => setEditingTnvedName(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          ) : (
                            item.name
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTnvedCode}
                              onChange={(e) => setEditingTnvedCode(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          ) : (
                            item.code
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTnvedBotanical}
                              onChange={(e) => setEditingTnvedBotanical(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          ) : (
                            item.botanicalName || '—'
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSaveTnved}
                                className="inline-flex items-center justify-center p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                aria-label="Saqlash"
                                title="Saqlash"
                              >
                                <IconSave />
                                <span className="sr-only">Saqlash</span>
                              </button>
                              <button
                                onClick={cancelEditTnved}
                                className="inline-flex items-center justify-center p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                                aria-label="Bekor qilish"
                                title="Bekor qilish"
                              >
                                <IconCancel />
                                <span className="sr-only">Bekor qilish</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEditTnved(item)}
                                className="inline-flex items-center justify-center p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                aria-label="Tahrirlash"
                                title="Tahrirlash"
                              >
                                <IconEdit />
                                <span className="sr-only">Tahrirlash</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTnved(item.id, item.name)}
                                className="inline-flex items-center justify-center p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                aria-label="O'chirish"
                                title="O'chirish"
                              >
                                <IconTrash />
                                <span className="sr-only">O'chirish</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Region Codes Section */}
            <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Hudud kodlari</h2>
              <button
                onClick={() => setShowRegionCodeForm(true)}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Hudud kodi qo'shish"
                title="Hudud kodi qo'shish"
              >
                <IconAdd />
                <span className="sr-only">Qo'shish</span>
              </button>
            </div>

            {loadingRegionCodes ? (
              <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
            ) : regionCodes.length === 0 ? (
              <div className="text-center py-4 text-gray-400">Hudud kodlari topilmadi</div>
            ) : (
              <div className="max-h-[520px] overflow-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Hudud</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Kod ichki</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Kod tashqi</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-700">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionCodes.map((code) => (
                      <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-800 font-medium">{code.name}</td>
                        <td className="py-2 px-3 text-gray-700">{code.internalCode}</td>
                        <td className="py-2 px-3 text-gray-700">{code.externalCode}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteRegionCode(code.id, code.name)}
                            disabled={deletingRegionCodeId === code.id}
                            className="inline-flex items-center justify-center p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs disabled:opacity-50"
                            aria-label="Hudud kodini o'chirish"
                            title="O'chirish"
                          >
                            <IconTrash />
                            <span className="sr-only">{deletingRegionCodeId === code.id ? 'O\'chirilmoqda...' : 'O\'chirish'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showRegionCodeForm && (
              <div className="mt-4 p-4 border-2 border-green-300 rounded-lg bg-green-50">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Yangi hudud kodi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={regionCodeForm.name}
                    onChange={(e) => setRegionCodeForm({ ...regionCodeForm, name: e.target.value })}
                    placeholder="Hudud nomi"
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                  <input
                    type="text"
                    value={regionCodeForm.internalCode}
                    onChange={(e) => setRegionCodeForm({ ...regionCodeForm, internalCode: e.target.value })}
                    placeholder="Kod ichki"
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                  <input
                    type="text"
                    value={regionCodeForm.externalCode}
                    onChange={(e) => setRegionCodeForm({ ...regionCodeForm, externalCode: e.target.value })}
                    placeholder="Kod tashqi"
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateRegionCode}
                    className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="Qo'shish"
                    title="Qo'shish"
                  >
                    <IconAdd />
                    <span className="sr-only">Qo'shish</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowRegionCodeForm(false);
                      setRegionCodeForm({ name: '', internalCode: '', externalCode: '' });
                    }}
                    className="inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    aria-label="Bekor qilish"
                    title="Bekor qilish"
                  >
                    <IconCancel />
                    <span className="sr-only">Bekor qilish</span>
                  </button>
                </div>
              </div>
            )}
            </div>
            {/* Stage fixed amounts */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Jarayonlar bo'yicha qatiy summalar</h2>
                  <div className="text-xs text-gray-500">Barcha summalar USD da kiritiladi</div>
                  <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    Agar jarayonlarga o‘zgartirish kiritilsa, o‘zgartirish kiritilgunga qadar bo‘lgan vaqtdagi tasklar hisob-kitoblari eski bo‘yicha qoladi. Yangilangan ma’lumotlar yangilangan paytdan keyingi ishlar uchun ta’sir qiladi.
                  </p>
                </div>
                <button
                  onClick={handleSaveKpiConfigs}
                  disabled={savingKpiConfigs || loadingKpiConfigs}
                  className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  aria-label={savingKpiConfigs ? 'Saqlanmoqda...' : 'Saqlash'}
                  title={savingKpiConfigs ? 'Saqlanmoqda...' : 'Saqlash'}
                >
                  <IconSave />
                  <span className="sr-only">{savingKpiConfigs ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                </button>
              </div>
              {loadingKpiConfigs ? (
                <div className="text-center py-3 text-gray-500 text-sm">Yuklanmoqda...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Jarayon</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Summa (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STAGE_PRICE_DEFAULTS.map((stage) => (
                        <tr key={stage.stageName} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-800 font-medium">{stage.stageName}</td>
                          <td className="py-2 px-3 text-right">
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
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Qadoq turlari */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Qadoq turlari</h2>
                <div className="text-sm text-gray-500">Qadoq nomi va qadoq kodi</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <input
                type="text"
                value={packagingName}
                onChange={(e) => setPackagingName(e.target.value)}
                placeholder="Qadoq nomi"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={packagingCode}
                onChange={(e) => setPackagingCode(e.target.value)}
                placeholder="Qadoq kodi"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddPackagingType}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Qo'shish"
                title="Qo'shish"
              >
                <IconAdd />
                <span className="sr-only">Qo'shish</span>
              </button>
            </div>
            <div className="max-h-[320px] overflow-auto border border-gray-100 rounded-lg">
              {loadingPackagingTypes ? (
                <div className="py-6 text-center text-gray-500 text-sm">Yuklanmoqda...</div>
              ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Qadoq nomi</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 w-40">Qadoq kodi</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700 w-24">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {packagingTypes.map((item) => {
                    const isEditing = editingPackagingId === item.id;
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingPackagingName}
                              onChange={(e) => setEditingPackagingName(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            item.name
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingPackagingCode}
                              onChange={(e) => setEditingPackagingCode(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            item.code || '—'
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSavePackaging}
                                className="inline-flex items-center justify-center p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                aria-label="Saqlash"
                                title="Saqlash"
                              >
                                <IconSave />
                                <span className="sr-only">Saqlash</span>
                              </button>
                              <button
                                onClick={cancelEditPackaging}
                                className="inline-flex items-center justify-center p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                                aria-label="Bekor qilish"
                                title="Bekor qilish"
                              >
                                <IconCancel />
                                <span className="sr-only">Bekor qilish</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEditPackaging(item)}
                                className="inline-flex items-center justify-center p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                aria-label="Tahrirlash"
                                title="Tahrirlash"
                              >
                                <IconEdit />
                                <span className="sr-only">Tahrirlash</span>
                              </button>
                              <button
                                onClick={() => handleDeletePackaging(item.id, item.name)}
                                className="inline-flex items-center justify-center p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                aria-label="O'chirish"
                                title="O'chirish"
                              >
                                <IconTrash />
                                <span className="sr-only">O'chirish</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </div>
          {/* Jarayon eslatmalari - Qadoq turlari yonida */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Jarayon eslatmalari</h2>
                <div className="text-xs text-gray-500">Yuklab olishdan keyin eslatma vaqtlari (daqiqa)</div>
              </div>
              <button
                onClick={handleSaveProcessSettings}
                disabled={savingProcessSettings || loadingProcessSettings}
                className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                aria-label={savingProcessSettings ? 'Saqlanmoqda...' : 'Saqlash'}
                title={savingProcessSettings ? 'Saqlanmoqda...' : 'Saqlash'}
              >
                <IconSave />
                <span className="sr-only">{savingProcessSettings ? 'Saqlanmoqda...' : 'Saqlash'}</span>
              </button>
            </div>
            {loadingProcessSettings ? (
              <div className="text-center py-3 text-gray-500 text-sm">Yuklanmoqda...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Jarayon</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Taxminiy vaqt</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Eslatma 1</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Eslatma 2</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Eslatma 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['TIR', 'CERT', 'DECLARATION'] as const).map((pt) => {
                      const e = processSettingsEdits[pt] || { estimatedTime: '', reminder1: '', reminder2: '', reminder3: '' };
                      return (
                        <tr key={pt} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-800 font-medium">{PROCESS_TYPE_LABELS[pt] || pt}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={e.estimatedTime}
                              onChange={(ev) =>
                                setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [pt]: { ...e, estimatedTime: ev.target.value },
                                })
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={e.reminder1}
                              onChange={(ev) =>
                                setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [pt]: { ...e, reminder1: ev.target.value },
                                })
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={e.reminder2}
                              onChange={(ev) =>
                                setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [pt]: { ...e, reminder2: ev.target.value },
                                })
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={e.reminder3}
                              onChange={(ev) =>
                                setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [pt]: { ...e, reminder3: ev.target.value },
                                })
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Moliyaviy</h2>
          <span className="text-sm text-gray-400">BXM, sertifikatchi va maqsad</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Current BXM */}
          <div className="bg-white rounded-lg shadow p-6">
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
                  className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  aria-label="O'zgartirish"
                  title="O'zgartirish"
                >
                  <IconEdit />
                  <span className="sr-only">O'zgartirish</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">BXM topilmadi</div>
            )}
          </div>

          {/* Certifier Fee Settings Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Sertifikatchi tariflari (Oltiariq)</h2>
              <button
                onClick={() => setShowCertifierFeeForm(true)}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label={certifierFeeConfig ? "O'zgartirish" : "Qo'shish"}
                title={certifierFeeConfig ? "O'zgartirish" : "Qo'shish"}
              >
                {certifierFeeConfig ? <IconEdit /> : <IconAdd />}
                <span className="sr-only">{certifierFeeConfig ? 'O\'zgartirish' : 'Qo\'shish'}</span>
              </button>
            </div>

            {loadingCertifierFeeConfig ? (
              <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
            ) : certifierFeeConfig ? (
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">ST-1:</span> {formatCurrency(Number(certifierFeeConfig.st1Rate), 'UZS')}</div>
                <div><span className="font-semibold">FITO:</span> {formatCurrency(Number(certifierFeeConfig.fitoRate), 'UZS')}</div>
                <div><span className="font-semibold">AKT:</span> {formatCurrency(Number(certifierFeeConfig.aktRate), 'UZS')}</div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Sertifikatchi tariflari kiritilmagan.
              </div>
            )}
          </div>

          {/* Yearly Goal Settings Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Yillik maqsad</h2>
              <button
                onClick={() => setShowYearlyGoalForm(true)}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label={yearlyGoalConfig ? "O'zgartirish" : "Qo'shish"}
                title={yearlyGoalConfig ? "O'zgartirish" : "Qo'shish"}
              >
                {yearlyGoalConfig ? <IconEdit /> : <IconAdd />}
                <span className="sr-only">{yearlyGoalConfig ? 'O\'zgartirish' : 'Qo\'shish'}</span>
              </button>
            </div>

            {loadingYearlyGoalConfig ? (
              <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
            ) : yearlyGoalConfig ? (
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Yil:</span> {yearlyGoalConfig.year}</div>
                <div><span className="font-semibold">Maqsad:</span> {yearlyGoalConfig.targetTasks.toLocaleString('uz-UZ')} task</div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Yillik maqsad kiritilmagan.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Yangi yil qo'shish"
                title="Yangi yil qo'shish"
              >
                <IconAdd />
                <span className="sr-only">Yangi yil qo'shish</span>
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
                        className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        aria-label="Saqlash"
                        title="Saqlash"
                      >
                        <IconSave />
                        <span className="sr-only">Saqlash</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingYear(null);
                          setEditAmountUsd('');
                          setEditAmountUzs('');
                        }}
                        className="inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        aria-label="Bekor qilish"
                        title="Bekor qilish"
                      >
                        <IconCancel />
                        <span className="sr-only">Bekor qilish</span>
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
                        className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        aria-label="O'zgartirish"
                        title="O'zgartirish"
                      >
                        <IconEdit />
                        <span className="sr-only">O'zgartirish</span>
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
                    className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="Qo'shish"
                    title="Qo'shish"
                  >
                    <IconAdd />
                    <span className="sr-only">Qo'shish</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingYear(null);
                      setEditAmountUsd('');
                      setEditAmountUzs('');
                    }}
                    className="inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    aria-label="Bekor qilish"
                    title="Bekor qilish"
                  >
                    <IconCancel />
                    <span className="sr-only">Bekor qilish</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* State Payments Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Davlat to'lovlari</h2>
              <button
                onClick={() => setShowStatePaymentForm(true)}
                className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Davlat to'lovi qo'shish"
                title="Davlat to'lovi qo'shish"
              >
                <IconAdd />
                <span className="sr-only">Qo'shish</span>
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
                            className="inline-flex items-center justify-center p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            aria-label="O'chirish"
                            title="O'chirish"
                          >
                            <IconTrash />
                            <span className="sr-only">O'chirish</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>


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
                className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
                aria-label="Yopish"
                title="Yopish"
              >
                <IconCancel />
                <span className="sr-only">Yopish</span>
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
                  className="flex-1 inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  aria-label="Saqlash"
                  title="Saqlash"
                >
                  <IconSave />
                  <span className="sr-only">Saqlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatePaymentForm(false)}
                  className="flex-1 inline-flex items-center justify-center p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  aria-label="Bekor qilish"
                  title="Bekor qilish"
                >
                  <IconCancel />
                  <span className="sr-only">Bekor qilish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certifier Fee Form Modal */}
      {showCertifierFeeForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCertifierFeeForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Sertifikatchi tariflari</h3>
              <button
                onClick={() => setShowCertifierFeeForm(false)}
                className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
                aria-label="Yopish"
                title="Yopish"
              >
                <IconCancel />
                <span className="sr-only">Yopish</span>
              </button>
            </div>
            <form onSubmit={handleCertifierFeeSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ST-1 (UZS)</label>
                  <input
                    type="number"
                    min="0"
                    value={certifierFeeForm.st1Rate}
                    onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, st1Rate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FITO (UZS)</label>
                  <input
                    type="number"
                    min="0"
                    value={certifierFeeForm.fitoRate}
                    onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, fitoRate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AKT (UZS)</label>
                  <input
                    type="number"
                    min="0"
                    value={certifierFeeForm.aktRate}
                    onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, aktRate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  aria-label="Saqlash"
                  title="Saqlash"
                >
                  <IconSave />
                  <span className="sr-only">Saqlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCertifierFeeForm(false)}
                  className="flex-1 inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  aria-label="Bekor qilish"
                  title="Bekor qilish"
                >
                  <IconCancel />
                  <span className="sr-only">Bekor qilish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yearly Goal Form Modal */}
      {showYearlyGoalForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowYearlyGoalForm(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Yillik maqsad</h3>
              <button
                onClick={() => setShowYearlyGoalForm(false)}
                className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
                aria-label="Yopish"
                title="Yopish"
              >
                <IconCancel />
                <span className="sr-only">Yopish</span>
              </button>
            </div>
            <form onSubmit={handleYearlyGoalSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yil</label>
                  <input
                    type="number"
                    min="2000"
                    value={yearlyGoalForm.year}
                    onChange={(e) => setYearlyGoalForm({ ...yearlyGoalForm, year: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maqsad (task)</label>
                  <input
                    type="number"
                    min="0"
                    value={yearlyGoalForm.targetTasks}
                    onChange={(e) => setYearlyGoalForm({ ...yearlyGoalForm, targetTasks: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  aria-label="Saqlash"
                  title="Saqlash"
                >
                  <IconSave />
                  <span className="sr-only">Saqlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowYearlyGoalForm(false)}
                  className="flex-1 inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  aria-label="Bekor qilish"
                  title="Bekor qilish"
                >
                  <IconCancel />
                  <span className="sr-only">Bekor qilish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
                aria-label="Yopish"
                title="Yopish"
              >
                <IconCancel />
                <span className="sr-only">Yopish</span>
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
                  className="flex-1 inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  aria-label="Saqlash"
                  title="Saqlash"
                >
                  <IconSave />
                  <span className="sr-only">Saqlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompanySettingsForm(false)}
                  className="flex-1 inline-flex items-center justify-center p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  aria-label="Bekor qilish"
                  title="Bekor qilish"
                >
                  <IconCancel />
                  <span className="sr-only">Bekor qilish</span>
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