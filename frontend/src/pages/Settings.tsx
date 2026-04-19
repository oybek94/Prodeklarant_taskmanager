import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../utils/useIsMobile';
import {
  addTnvedProduct,
  deleteTnvedProduct,
  getTnvedProducts,
  updateTnvedProduct,
  type TnvedProduct,
} from '../utils/tnvedProducts';
interface PackagingTypeItem {
  id: string;
  name: string;
  code?: string;
}

interface BXMConfig {
  id: number;
  amountUsd: number;
  amountUzs: number;
  effectiveFrom: string;
  note?: string;
  createdAt: string;
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
  effectiveFrom: string;
  note?: string;
  createdAt: string;
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
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [tnvedProducts, setTnvedProductsLocal] = useState<TnvedProduct[]>([]);
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
  const [editingBxmId, setEditingBxmId] = useState<number | null>(null);
  const [editAmountUsd, setEditAmountUsd] = useState<string>('');
  const [editAmountUzs, setEditAmountUzs] = useState<string>('');
  const [showAddBXMForm, setShowAddBXMForm] = useState(false);
  const [newBxmUsd, setNewBxmUsd] = useState('');
  const [newBxmUzs, setNewBxmUzs] = useState('');
  const [newBxmEffective, setNewBxmEffective] = useState(() => new Date().toISOString().slice(0, 16));
  const [newBxmNote, setNewBxmNote] = useState('');
  const [statePayments, setStatePayments] = useState<StatePayment[]>([]);
  const [loadingStatePayments, setLoadingStatePayments] = useState(true);
  const [showStatePaymentForm, setShowStatePaymentForm] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [statePaymentForm, setStatePaymentForm] = useState({
    st1Payment: '',
    fitoPayment: '',
    fumigationPayment: '',
    internalCertPayment: '',
    certificatePaymentUzs: '',
    psrPriceUzs: '',
    workerPriceUzs: '',
    customsPaymentUzs: '',
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
  const [kpiHistory, setKpiHistory] = useState<KpiConfig[]>([]);
  const [showKpiHistoryModal, setShowKpiHistoryModal] = useState(false);
  const [showAddKpiForm, setShowAddKpiForm] = useState(false);
  const [newKpiEffective, setNewKpiEffective] = useState(() => new Date().toISOString().slice(0, 16));
  const [newKpiNote, setNewKpiNote] = useState('');
  const [newKpiPrices, setNewKpiPrices] = useState<Record<string, string>>({});
  const [activeKpiStages, setActiveKpiStages] = useState<{ stageName: string; price: number }[]>([]);
  const [showAddStageForm, setShowAddStageForm] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStagePrice, setNewStagePrice] = useState('0');
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
  type TabType = 'general' | 'financial' | 'structure' | 'specs' | 'processes';
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const tabs = [
    { id: 'general', label: "Umumiy", icon: 'lucide:settings' },
    { id: 'financial', label: "Moliyaviy", icon: 'lucide:dollar-sign' },
    { id: 'structure', label: "Tuzilma", icon: 'lucide:building-2' },
    { id: 'specs', label: "Spetsifikatsiyalar", icon: 'lucide:box' },
    { id: 'processes', label: "Jarayonlar", icon: 'lucide:git-pull-request' }
  ];

  const [processSettings, setProcessSettings] = useState<ProcessSetting[]>([]);
  const [loadingProcessSettings, setLoadingProcessSettings] = useState(true);
  const [processSettingsEdits, setProcessSettingsEdits] = useState<Record<string, { estimatedTime: string; reminder1: string; reminder2: string; reminder3: string }>>({});
  const [savingProcessSettings, setSavingProcessSettings] = useState(false);

  const refreshTnvedProducts = async () => {
    try {
      const products = await getTnvedProducts();
      setTnvedProductsLocal(products);
    } catch {
      setTnvedProductsLocal([]);
    }
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
    refreshTnvedProducts();
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

  const handleEditBxm = (config: BXMConfig) => {
    setEditingBxmId(config.id);
    setEditAmountUsd(config.amountUsd.toString());
    setEditAmountUzs(config.amountUzs.toString());
  };

  const cancelEditBxm = () => {
    setEditingBxmId(null);
    setEditAmountUsd('');
    setEditAmountUzs('');
  };

  const handleSaveBxm = async (id: number) => {
    try {
      const amountUsd = parseFloat(editAmountUsd);
      const amountUzs = parseFloat(editAmountUzs);
      if (isNaN(amountUsd) || amountUsd < 0 || isNaN(amountUzs) || amountUzs < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${id}`, { amountUsd, amountUzs });
      await Promise.all([loadBXMConfigs(), loadCurrentBXM()]);
      cancelEditBxm();
      alert('BXM muvaffaqiyatli yangilandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleAddBXM = async () => {
    try {
      const amountUsd = parseFloat(newBxmUsd);
      const amountUzs = parseFloat(newBxmUzs);
      if (isNaN(amountUsd) || amountUsd < 0 || isNaN(amountUzs) || amountUzs < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.post('/bxm', {
        amountUsd,
        amountUzs,
        effectiveFrom: newBxmEffective ? new Date(newBxmEffective).toISOString() : new Date().toISOString(),
        note: newBxmNote || undefined,
      });
      await Promise.all([loadBXMConfigs(), loadCurrentBXM()]);
      setShowAddBXMForm(false);
      setNewBxmUsd('');
      setNewBxmUzs('');
      setNewBxmEffective(new Date().toISOString().slice(0, 16));
      setNewBxmNote('');
      alert('Yangi BXM qo\'shildi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteBxm = async (id: number) => {
    if (!confirm('Ushbu BXM yozuvini o\'chirishni istaysizmi?')) return;
    try {
      await apiClient.delete(`/bxm/${id}`);
      await Promise.all([loadBXMConfigs(), loadCurrentBXM()]);
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

  const handleAddTnvedProduct = async () => {
    if (!tnvedName.trim() || !tnvedCode.trim()) {
      alert('Mahsulot nomi va TNVED kodi majburiy');
      return;
    }
    await addTnvedProduct(tnvedName.trim(), tnvedCode.trim(), tnvedBotanical.trim());
    setTnvedName('');
    setTnvedCode('');
    setTnvedBotanical('');
    await refreshTnvedProducts();
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

  const handleSaveTnved = async () => {
    if (!editingTnvedId) return;
    if (!editingTnvedName.trim() || !editingTnvedCode.trim()) {
      alert('Mahsulot nomi va TNVED kodi majburiy');
      return;
    }
    await updateTnvedProduct(
      editingTnvedId,
      editingTnvedName.trim(),
      editingTnvedCode.trim(),
      editingTnvedBotanical.trim()
    );
    cancelEditTnved();
    await refreshTnvedProducts();
  };

  const handleDeleteTnved = async (id: string, name: string) => {
    if (!confirm(`"${name}" mahsulotini o'chirishni xohlaysizmi?`)) return;
    await deleteTnvedProduct(id);
    await refreshTnvedProducts();
  };

  const handleResetTnved = async () => {
    if (!confirm('Standart spetsifikatsiya ro\'yxatini tiklaysizmi?')) return;
    // Server bazadagi ma'lumotlar allaqachon standart ro'yxat bilan seed qilingan.
    // Qayta yuklaymiz.
    await refreshTnvedProducts();
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
        st1Payment: Number(statePaymentForm.st1Payment || 0),
        fitoPayment: Number(statePaymentForm.fitoPayment || 0),
        fumigationPayment: Number(statePaymentForm.fumigationPayment || 0),
        internalCertPayment: Number(statePaymentForm.internalCertPayment || 0),
        certificatePaymentUzs: Number(statePaymentForm.certificatePaymentUzs || 0),
        psrPriceUzs: Number(statePaymentForm.psrPriceUzs || 0),
        workerPriceUzs: Number(statePaymentForm.workerPriceUzs || 0),
        customsPaymentUzs: Number(statePaymentForm.customsPaymentUzs || 0),
        certificatePaymentUsd: 0,
        psrPriceUsd: 0,
        workerPriceUsd: 0,
        customsPaymentUsd: 0,
      });
      setShowStatePaymentForm(false);
      setStatePaymentForm({
        st1Payment: '', fitoPayment: '', fumigationPayment: '', internalCertPayment: '',
        certificatePaymentUzs: '', psrPriceUzs: '', workerPriceUzs: '', customsPaymentUzs: '',
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
      const response = await apiClient.get('/kpi/configs/current');
      const configs: KpiConfig[] = response.data;

      // Backend'dan kelgan aktual stagelarni set qilamiz
      const stages = configs.map(c => ({ stageName: c.stageName, price: Number(c.price) }));

      // Agar bazada hech narsa yo'q bo'lsa, defaultlarni ko'rsatamiz
      if (stages.length === 0) {
        setActiveKpiStages(STAGE_PRICE_DEFAULTS);
        const edits: Record<string, string> = {};
        STAGE_PRICE_DEFAULTS.forEach(s => { edits[s.stageName] = s.price.toString(); });
        setKpiConfigEdits(edits);
      } else {
        setActiveKpiStages(stages);
        const edits: Record<string, string> = {};
        stages.forEach(s => { edits[s.stageName] = s.price.toString(); });
        setKpiConfigEdits(edits);
      }
    } catch (error) {
      console.error('Error loading KPI configs:', error);
    } finally {
      setLoadingKpiConfigs(false);
    }
  };

  const loadKpiHistory = async () => {
    try {
      const response = await apiClient.get('/kpi/configs/history');
      setKpiHistory(response.data);
    } catch (error) {
      console.error('Error loading KPI history:', error);
    }
  };

  const handleSaveKpiConfigs = async () => {
    try {
      setSavingKpiConfigs(true);
      const payload = activeKpiStages.map((stage) => {
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

  const handleAddKpiBatch = async () => {
    try {
      setSavingKpiConfigs(true);
      const prices = activeKpiStages.map((stage) => {
        const rawValue = newKpiPrices[stage.stageName];
        const price = parseFloat(rawValue);
        if (isNaN(price) || price < 0) {
          throw new Error(`Noto'g'ri summa: ${stage.stageName}`);
        }
        return { stageName: stage.stageName, price };
      });
      await apiClient.post('/kpi/configs/batch', {
        effectiveFrom: newKpiEffective ? new Date(newKpiEffective).toISOString() : new Date().toISOString(),
        note: newKpiNote || undefined,
        prices,
      });
      await loadKpiConfigs();
      setShowAddKpiForm(false);
      setNewKpiPrices({});
      setNewKpiNote('');
      setNewKpiEffective(new Date().toISOString().slice(0, 16));
      alert('Yangi KPI narxlari qo\'shildi');
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Xatolik yuz berdi');
    } finally {
      setSavingKpiConfigs(false);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      alert('Jarayon nomini kiriting');
      return;
    }
    const price = parseFloat(newStagePrice);
    if (isNaN(price) || price < 0) {
      alert('Noto\'g\'ri narx');
      return;
    }
    try {
      await apiClient.post('/kpi/stages', { stageName: newStageName.trim(), price });
      await loadKpiConfigs();
      setShowAddStageForm(false);
      setNewStageName('');
      setNewStagePrice('0');
      alert(`"${newStageName.trim()}" jarayoni qo'shildi`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteStage = async (stageName: string) => {
    if (!confirm(`"${stageName}" jarayonini o'chirishni istaysizmi?\n\nEslatma: Tarixiy hisob-kitoblar (KPI log) saqlanib qoladi.`)) return;
    try {
      await apiClient.delete(`/kpi/stages/${encodeURIComponent(stageName)}`);
      await loadKpiConfigs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
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
    <div className={`max-w-7xl mx-auto p-4 md:p-6 lg:p-8 ${isMobile ? 'pb-32' : ''}`}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-1 sticky top-6">
            <div className="px-3 py-2 mb-2">
              <h1 className="text-xl font-bold text-gray-800">Sozlamalar</h1>
              <p className="text-xs text-gray-500 mt-1">Asosiy ma'lumotlar, tariflar...</p>
            </div>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }`}
              >
                <Icon icon={tab.icon} className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">

          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Icon icon="lucide:settings" className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Umumiy Ma'lumotlar</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon icon="lucide:building-2" className="w-4 h-4 text-blue-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">Kompaniya ma'lumotlari</h2>
                    </div>
                    <button
                      onClick={() => setShowCompanySettingsForm(true)}
                      className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Tahrirlash"
                    >
                      <Icon icon="lucide:edit-2" className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-semibold">Nomi</div>
                      <div className="text-sm text-gray-800 font-medium">{companySettingsForm.name || "Kiritilmagan"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-semibold">Yuridik manzil</div>
                      <div className="text-sm text-gray-800">{companySettingsForm.legalAddress || "Kiritilmagan"}</div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 uppercase font-semibold">Telefon</div>
                        <div className="text-sm text-gray-800">{companySettingsForm.phone || "Kiritilmagan"}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 uppercase font-semibold">Email</div>
                        <div className="text-sm text-gray-800">{companySettingsForm.email || "Kiritilmagan"}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-semibold">INN</div>
                      <div className="text-sm text-gray-800">{companySettingsForm.inn || "Kiritilmagan"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">

                  <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                          <Icon icon="lucide:target" className="w-4 h-4 text-green-600" />
                        </div>
                        <h2 className="text-base font-bold text-gray-800">Yillik maqsad</h2>
                      </div>
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
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Moliyaviy Sozlamalar</h2>
              </div>
              {/* ═══ JORIY BXM Hero Card ═══ */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="lucide:coins" className="w-5 h-5 text-indigo-200" />
                      <span className="text-indigo-200 text-sm font-medium">Joriy BXM</span>
                    </div>
                    {loading ? (
                      <div className="text-indigo-200 animate-pulse">Yuklanmoqda...</div>
                    ) : currentBXM ? (
                      <>
                        <div className="text-4xl font-bold">{formatCurrency(Number(currentBXM.amountUsd), 'USD')}</div>
                        <div className="text-indigo-200 text-lg mt-0.5">{formatCurrency(Number(currentBXM.amountUzs), 'UZS')}</div>
                        <div className="text-indigo-300 text-xs mt-2 flex items-center gap-1.5">
                          <Icon icon="lucide:calendar-check" className="w-3.5 h-3.5" />
                          {formatDate(currentBXM.effectiveFrom)} dan boshlab kuchda
                        </div>
                        {currentBXM.note && (
                          <div className="text-indigo-300 text-xs mt-1 italic">{currentBXM.note}</div>
                        )}
                      </>
                    ) : <div className="text-indigo-200">BXM topilmadi</div>}
                  </div>
                  <div>
                    {editingBxmId === currentBXM?.id ? (
                      <button onClick={cancelEditBxm} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors">Bekor</button>
                    ) : (
                      <button onClick={() => currentBXM && handleEditBxm(currentBXM)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-colors shadow">
                        <Icon icon="lucide:pencil" className="w-4 h-4" />
                        O'zgartirish
                      </button>
                    )}
                  </div>
                </div>
                {editingBxmId === currentBXM?.id && (
                  <div className="mt-5 pt-5 border-t border-white/20">
                    <div className="text-sm text-indigo-200 font-medium mb-3">Yangi qiymat kiriting:</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-indigo-300 mb-1 block">BXM (USD)</label>
                        <input type="number" step="0.01" value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)} className="w-full px-4 py-2.5 bg-white/10 border border-white/30 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="34.4" />
                      </div>
                      <div>
                        <label className="text-xs text-indigo-300 mb-1 block">BXM (UZS)</label>
                        <input type="number" step="1" value={editAmountUzs} onChange={(e) => setEditAmountUzs(e.target.value)} className="w-full px-4 py-2.5 bg-white/10 border border-white/30 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="412000" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => currentBXM && handleSaveBxm(currentBXM.id)} className="flex-1 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                        <Icon icon="lucide:check" className="w-4 h-4" />Saqlash
                      </button>
                      <button onClick={cancelEditBxm} className="px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">Bekor</button>
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-white/20 flex items-start gap-2 text-xs text-indigo-300">
                  <Icon icon="lucide:info" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>BXM yil davomida istalgan vaqt o'zgarishi mumkin. Yangi qiymat kiritilgandan keyin bajariladigan Deklaratsiya tasklari yangi BXM bilan hisoblanadi.</span>
                </div>
              </div>

              {/* ═══ GRID: BXM tarixi + Sertifikatchi ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BXM tarixi */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Icon icon="lucide:history" className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">BXM tarixi</h2>
                    </div>
                    <button
                      onClick={() => { setShowAddBXMForm(true); setNewBxmEffective(new Date().toISOString().slice(0, 16)); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                    >
                      <Icon icon="lucide:plus" className="w-3.5 h-3.5" />Yangi
                    </button>
                  </div>

                  {/* Add new BXM form */}
                  {showAddBXMForm && (
                    <div className="mb-4 p-4 border-2 border-emerald-200 rounded-xl bg-emerald-50">
                      <div className="text-sm font-semibold text-emerald-700 mb-3">Yangi BXM qiymati</div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">USD</label>
                          <input type="number" step="0.01" value={newBxmUsd} onChange={(e) => setNewBxmUsd(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="34.4" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">UZS</label>
                          <input type="number" step="1" value={newBxmUzs} onChange={(e) => setNewBxmUzs(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="412000" />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="text-xs text-gray-500 mb-1 block">Kuchga kirish sanasi</label>
                        <input type="datetime-local" value={newBxmEffective} onChange={(e) => setNewBxmEffective(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">Izoh (ixtiyoriy)</label>
                        <input type="text" value={newBxmNote} onChange={(e) => setNewBxmNote(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none" placeholder="Masalan: Prezident qarori 123" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddBXM} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Qo'shish</button>
                        <button onClick={() => setShowAddBXMForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {bxmConfigs.map((config) => (
                      <div key={config.id}>
                        {editingBxmId === config.id && editingBxmId !== currentBXM?.id ? (
                          <div className="p-4 border-2 border-indigo-200 rounded-xl bg-indigo-50">
                            <div className="text-sm font-semibold text-indigo-700 mb-3">{formatDate(config.effectiveFrom)} — Tahrirlash</div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <input type="number" step="0.01" value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)} className="px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="USD" />
                              <input type="number" step="1" value={editAmountUzs} onChange={(e) => setEditAmountUzs(e.target.value)} className="px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="UZS" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleSaveBxm(config.id)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Saqlash</button>
                              <button onClick={cancelEditBxm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors group ${config.id === currentBXM?.id ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-blue-600">{formatCurrency(Number(config.amountUsd), 'USD')}</div>
                                {config.id === currentBXM?.id && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Joriy</span>}
                              </div>
                              <div className="text-xs text-gray-400">{formatCurrency(Number(config.amountUzs), 'UZS')}</div>
                              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <Icon icon="lucide:calendar" className="w-3 h-3" />
                                {formatDate(config.effectiveFrom)}
                                {config.note && <span className="ml-1 italic">— {config.note}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditBxm(config)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="O'zgartirish">
                                <Icon icon="lucide:pencil" className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteBxm(config.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="O'chirish">
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sertifikatchi tariflari */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Icon icon="lucide:percent" className="w-4 h-4 text-orange-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">Sertifikatchi tariflari</h2>
                    </div>
                    <button onClick={() => setShowCertifierFeeForm(true)} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors" title={certifierFeeConfig ? "O'zgartirish" : "Qo'shish"}>
                      {certifierFeeConfig ? <IconEdit /> : <IconAdd />}
                    </button>
                  </div>
                  {loadingCertifierFeeConfig ? (
                    <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
                  ) : certifierFeeConfig ? (
                    <div className="space-y-2">
                      {[{ label: 'ST-1', value: certifierFeeConfig.st1Rate }, { label: 'FITO', value: certifierFeeConfig.fitoRate }, { label: 'AKT', value: certifierFeeConfig.aktRate }].map(item => (
                        <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
                          <span className="text-sm font-semibold text-gray-500">{item.label}</span>
                          <span className="text-base font-bold text-gray-800">{formatCurrency(Number(item.value), 'UZS')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Icon icon="lucide:plus-circle" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <div className="text-sm">Sertifikatchi tariflari kiritilmagan</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Icon icon="lucide:credit-card" className="w-4 h-4 text-purple-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-800">Davlat to'lovlari</h2>
                  </div>
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
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">№</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">ST-1</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">FITO</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Fumigatsiya</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Ichki sertifikat</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Yaratilgan</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Amallar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statePayments.map((payment, index) => (
                          <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-800 font-medium">{statePayments.length - index}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(Number(payment.st1Payment), 'UZS')}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(Number(payment.fitoPayment), 'UZS')}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(Number(payment.fumigationPayment), 'UZS')}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(Number(payment.internalCertPayment), 'UZS')}</td>
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
          )}

          {activeTab === 'structure' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Icon icon="lucide:building-2" className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Tuzilma (Filial va Hududlar)</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Icon icon="lucide:map-pin" className="w-4 h-4 text-violet-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">Filiallar</h2>
                    </div>
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
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                        <Icon icon="lucide:hash" className="w-4 h-4 text-sky-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">Hudud kodlari</h2>
                    </div>
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
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Icon icon="lucide:box" className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Spetsifikatsiyalar</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* TNVED Products Section */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon icon="lucide:package" className="w-4 h-4 text-blue-600" />
                      </div>
                      <h2 className="text-base font-bold text-gray-800">TNVED Mahsulotlari</h2>
                    </div>
                    <button
                      onClick={handleResetTnved}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      title="Asli holatiga qaytarish"
                    >
                      <Icon icon="lucide:rotate-ccw" className="w-4 h-4" />
                      Qaytarish
                    </button>
                  </div>

                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-800 mb-3">Yangi mahsulot qo'shish</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={tnvedName}
                        onChange={(e) => setTnvedName(e.target.value)}
                        placeholder="Mahsulot nomi"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      <input
                        type="text"
                        value={tnvedCode}
                        onChange={(e) => setTnvedCode(e.target.value)}
                        placeholder="TNVED kodi"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      <input
                        type="text"
                        value={tnvedBotanical}
                        onChange={(e) => setTnvedBotanical(e.target.value)}
                        placeholder="Botanika nomi (ixtiyoriy)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={handleAddTnvedProduct}
                      className="mt-3 w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Qo'shish
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Mahsulot</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">TNVED kodi</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Botanika nomi</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Amallar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tnvedProducts.map((product) => (
                          <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              {editingTnvedId === product.id ? (
                                <input
                                  type="text"
                                  value={editingTnvedName}
                                  onChange={(e) => setEditingTnvedName(e.target.value)}
                                  className="w-full px-2 py-1 border border-blue-300 rounded outline-none"
                                />
                              ) : (
                                <span className="text-gray-800 font-medium">{product.name}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {editingTnvedId === product.id ? (
                                <input
                                  type="text"
                                  value={editingTnvedCode}
                                  onChange={(e) => setEditingTnvedCode(e.target.value)}
                                  className="w-full px-2 py-1 border border-blue-300 rounded outline-none"
                                />
                              ) : (
                                <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 text-xs">{product.code}</code>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-500 italic">
                              {editingTnvedId === product.id ? (
                                <input
                                  type="text"
                                  value={editingTnvedBotanical}
                                  onChange={(e) => setEditingTnvedBotanical(e.target.value)}
                                  className="w-full px-2 py-1 border border-blue-300 rounded outline-none"
                                />
                              ) : (
                                product.botanicalName || '-'
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center gap-2">
                                {editingTnvedId === product.id ? (
                                  <>
                                    <button onClick={handleSaveTnved} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Saqlash"><Icon icon="lucide:check" className="w-4 h-4" /></button>
                                    <button onClick={cancelEditTnved} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded" title="Bekor qilish"><Icon icon="lucide:x" className="w-4 h-4" /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEditTnved(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded text-sm" title="Tahrirlash"><Icon icon="lucide:edit-2" className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteTnved(product.id, product.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded text-sm" title="O'chirish"><Icon icon="lucide:trash-2" className="w-4 h-4" /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Packaging Types Section */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <Icon icon="lucide:package-2" className="w-4 h-4 text-green-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-800">Qadoq turlari</h2>
                  </div>

                  <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                    <h3 className="text-sm font-semibold text-green-800 mb-3">Yangi qadoq turi qo'shish</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={packagingName}
                        onChange={(e) => setPackagingName(e.target.value)}
                        placeholder="Qadoq nomi (masalan: Quti)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                      <input
                        type="text"
                        value={packagingCode}
                        onChange={(e) => setPackagingCode(e.target.value)}
                        placeholder="Kod (ixitiyoriy)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={handleAddPackagingType}
                      className="mt-3 w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Qo'shish
                    </button>
                  </div>

                  {loadingPackagingTypes ? (
                    <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {packagingTypes.map((type) => (
                        <div key={type.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-green-200 hover:bg-green-50/30 transition-all">
                          {editingPackagingId === type.id ? (
                            <div className="flex flex-col gap-2 w-full">
                              <input
                                type="text"
                                value={editingPackagingName}
                                onChange={(e) => setEditingPackagingName(e.target.value)}
                                className="px-2 py-1 border border-green-300 rounded outline-none text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button onClick={handleSavePackaging} className="flex-1 bg-green-600 text-white py-1 rounded text-xs">Saqlash</button>
                                <button onClick={cancelEditPackaging} className="flex-1 bg-gray-200 text-gray-600 py-1 rounded text-xs">Bekor</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <div className="text-gray-800 font-medium">{type.name}</div>
                                {type.code && <div className="text-xs text-gray-400">Kod: {type.code}</div>}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => startEditPackaging(type)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Icon icon="lucide:edit-2" className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeletePackaging(type.id, type.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Icon icon="lucide:trash-2" className="w-3.5 h-3.5" /></button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'processes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-800">Jarayon Sozlamalari (Eslatmalar)</h2>
                <button
                  onClick={handleSaveProcessSettings}
                  disabled={savingProcessSettings}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProcessSettings ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:save" className="w-4 h-4" />
                      Barchasini saqlash
                    </>
                  )}
                </button>
              </div>

              {loadingProcessSettings ? (
                <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-4 px-6 font-semibold text-gray-700">Jarayon turi</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700">Taxminiy vaqt (kun)</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700">1-eslatma (kun)</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700">2-eslatma (kun)</th>
                          <th className="text-center py-4 px-6 font-semibold text-gray-700">3-eslatma (kun)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processSettings.map((setting) => (
                          <tr key={setting.processType} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-6 font-medium text-gray-800">
                              {setting.processType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="number"
                                value={processSettingsEdits[setting.processType]?.estimatedTime || ''}
                                onChange={(e) => setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [setting.processType]: { ...processSettingsEdits[setting.processType], estimatedTime: e.target.value }
                                })}
                                className="w-20 mx-auto px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="number"
                                value={processSettingsEdits[setting.processType]?.reminder1 || ''}
                                onChange={(e) => setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [setting.processType]: { ...processSettingsEdits[setting.processType], reminder1: e.target.value }
                                })}
                                className="w-20 mx-auto px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="number"
                                value={processSettingsEdits[setting.processType]?.reminder2 || ''}
                                onChange={(e) => setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [setting.processType]: { ...processSettingsEdits[setting.processType], reminder2: e.target.value }
                                })}
                                className="w-20 mx-auto px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="number"
                                value={processSettingsEdits[setting.processType]?.reminder3 || ''}
                                onChange={(e) => setProcessSettingsEdits({
                                  ...processSettingsEdits,
                                  [setting.processType]: { ...processSettingsEdits[setting.processType], reminder3: e.target.value }
                                })}
                                className="w-20 mx-auto px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* KPI / Worker payments section */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon icon="lucide:wallet" className="w-5 h-5 text-violet-200" />
                        <h3 className="text-lg font-bold">Ishchilarga to'lovlar (KPI)</h3>
                      </div>
                      <p className="text-violet-200 text-sm">Har bir bosqich uchun to'lanadigan summa (USD). Narxlar o'zgartirilganda eski tasklar oldingi narxda qoladi.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setShowKpiHistoryModal(true); loadKpiHistory(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Icon icon="lucide:history" className="w-3.5 h-3.5" />Tarix
                      </button>
                      <button
                        onClick={() => {
                          const prices: Record<string, string> = {};
                          activeKpiStages.forEach(s => { prices[s.stageName] = (kpiConfigEdits[s.stageName] ?? s.price).toString(); });
                          setNewKpiPrices(prices);
                          setShowAddKpiForm(true);
                          setNewKpiEffective(new Date().toISOString().slice(0, 16));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Icon icon="lucide:calendar-plus" className="w-3.5 h-3.5" />Yangi tarif
                      </button>
                      <button
                        onClick={() => setShowAddStageForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-semibold transition-colors shadow"
                      >
                        <Icon icon="lucide:plus" className="w-3.5 h-3.5" />Jarayon
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add new stage form */}
                {showAddStageForm && (
                  <div className="mx-6 mt-4 mb-2 p-5 border-2 border-emerald-200 rounded-xl bg-emerald-50">
                    <div className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                      <Icon icon="lucide:layers" className="w-4 h-4" />
                      Yangi jarayon (bosqich) qo'shish
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Jarayon nomi</label>
                        <input type="text" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Masalan: Qayta tekshirish" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Boshlang'ich narx ($)</label>
                        <input type="number" step="0.01" min="0" value={newStagePrice} onChange={(e) => setNewStagePrice(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center font-semibold" placeholder="0" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleAddStage} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                        <Icon icon="lucide:check" className="w-4 h-4" />Qo'shish
                      </button>
                      <button onClick={() => { setShowAddStageForm(false); setNewStageName(''); setNewStagePrice('0'); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                    </div>
                  </div>
                )}

                {/* Add new KPI batch form */}
                {showAddKpiForm && (
                  <div className="mx-6 mt-4 mb-2 p-5 border-2 border-violet-200 rounded-xl bg-violet-50">
                    <div className="text-sm font-bold text-violet-700 mb-4 flex items-center gap-2">
                      <Icon icon="lucide:calendar-plus" className="w-4 h-4" />
                      Yangi narx to'plami (sanadan boshlab kuchga kiradi)
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Kuchga kirish sanasi</label>
                        <input type="datetime-local" value={newKpiEffective} onChange={(e) => setNewKpiEffective(e.target.value)} className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Izoh (ixtiyoriy)</label>
                        <input type="text" value={newKpiNote} onChange={(e) => setNewKpiNote(e.target.value)} className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none" placeholder="Masalan: Yangi tarif rejasi" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {activeKpiStages.map((stage) => (
                        <div key={stage.stageName} className="bg-white rounded-lg p-3 border border-violet-100">
                          <label className="text-xs text-gray-500 mb-1 block truncate" title={stage.stageName}>{stage.stageName}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newKpiPrices[stage.stageName] ?? stage.price}
                            onChange={(e) => setNewKpiPrices({ ...newKpiPrices, [stage.stageName]: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-violet-500 outline-none text-center font-semibold"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddKpiBatch} disabled={savingKpiConfigs} className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {savingKpiConfigs ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" /> : <Icon icon="lucide:check" className="w-4 h-4" />}
                        Qo'shish
                      </button>
                      <button onClick={() => setShowAddKpiForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                    </div>
                  </div>
                )}

                {/* Current prices */}
                <div className="p-6">
                  {loadingKpiConfigs ? (
                    <div className="text-center py-8 text-gray-500">
                      <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Yuklanmoqda...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                          Hozirgi narxlar — {activeKpiStages.length} ta jarayon
                        </div>
                        <button
                          onClick={handleSaveKpiConfigs}
                          disabled={savingKpiConfigs}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {savingKpiConfigs ? (
                            <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                          ) : (
                            <Icon icon="lucide:save" className="w-4 h-4" />
                          )}
                          Saqlash
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {activeKpiStages.map((stage) => (
                          <div key={stage.stageName} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group relative">
                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteStage(stage.stageName)}
                              className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                              title="Jarayonni o'chirish"
                            >
                              <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-xs font-semibold text-gray-500 mb-2 truncate group-hover:text-indigo-600 transition-colors pr-5" title={stage.stageName}>
                              {stage.stageName}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={kpiConfigEdits[stage.stageName] ?? stage.price}
                                onChange={(e) => setKpiConfigEdits({
                                  ...kpiConfigEdits,
                                  [stage.stageName]: e.target.value
                                })}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-center font-bold text-lg bg-white"
                              />
                            </div>
                          </div>
                        ))}
                        {/* Yangi jarayon qo'shish card */}
                        <button
                          onClick={() => setShowAddStageForm(true)}
                          className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-500 min-h-[90px]"
                        >
                          <Icon icon="lucide:plus-circle" className="w-6 h-6" />
                          <span className="text-xs font-medium">Yangi jarayon</span>
                        </button>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-400">
                        <Icon icon="lucide:info" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Jarayonni o'chirsangiz, oldingi tarix va hisob-kitoblar saqlanib qoladi. Narxlarni "Saqlash" tugmasidan o'zgartirsangiz, hozirgi sanadan boshlab kuchga kiradi.</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KPI History Modal */}
              {showKpiHistoryModal && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
                  onClick={(e) => { if (e.target === e.currentTarget) setShowKpiHistoryModal(false); }}
                >
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:history" className="w-5 h-5" />
                        <h3 className="text-lg font-bold">KPI narxlar tarixi</h3>
                      </div>
                      <button onClick={() => setShowKpiHistoryModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <Icon icon="lucide:x" className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                      {kpiHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">Tarix topilmadi</div>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            // Guruhlab ko'rsatish — effectiveFrom bo'yicha
                            const groups = new Map<string, KpiConfig[]>();
                            kpiHistory.forEach(cfg => {
                              const key = cfg.effectiveFrom;
                              if (!groups.has(key)) groups.set(key, []);
                              groups.get(key)!.push(cfg);
                            });
                            return Array.from(groups.entries()).map(([dateStr, configs]) => (
                              <div key={dateStr} className="border border-gray-100 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                                  <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm font-semibold text-gray-600">{formatDate(dateStr)}</span>
                                  {configs[0]?.note && <span className="text-xs text-gray-400 italic ml-2">— {configs[0].note}</span>}
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-px bg-gray-100">
                                  {configs.map(cfg => (
                                    <div key={cfg.id} className="bg-white px-3 py-2.5">
                                      <div className="text-xs text-gray-500 truncate">{cfg.stageName}</div>
                                      <div className="text-sm font-bold text-blue-600">${Number(cfg.price).toFixed(2)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      <label className="block text-sm font-medium text-gray-700 mb-1">ST-1 to'lovi <span className="text-red-500">*</span></label>
                      <input type="number" step="1" value={statePaymentForm.st1Payment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, st1Payment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" placeholder="UZS" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">FITO to'lovi <span className="text-red-500">*</span></label>
                      <input type="number" step="1" value={statePaymentForm.fitoPayment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, fitoPayment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" placeholder="UZS" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fumigatsiya to'lovi <span className="text-red-500">*</span></label>
                      <input type="number" step="1" value={statePaymentForm.fumigationPayment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, fumigationPayment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" placeholder="UZS" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ichki sertifikat <span className="text-red-500">*</span></label>
                      <input type="number" step="1" value={statePaymentForm.internalCertPayment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, internalCertPayment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" placeholder="UZS" />
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">Tarixiy maydonlar (Zayavkalar hisobi uchun)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">PSR narxi</label>
                          <input type="number" step="1" value={statePaymentForm.psrPriceUzs} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, psrPriceUzs: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 outline-none text-sm" placeholder="UZS" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Ishchi narxi</label>
                          <input type="number" step="1" value={statePaymentForm.workerPriceUzs} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, workerPriceUzs: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 outline-none text-sm" placeholder="UZS" />
                        </div>
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
      </div>
    </div>
  );
};
export default Settings;
