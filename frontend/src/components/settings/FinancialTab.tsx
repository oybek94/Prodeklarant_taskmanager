import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';
import { IconAdd, IconEdit, IconTrash, IconSave, IconCancel } from './icons';
import type {
  BXMConfig,
  CertifierFeeConfig,
  StatePayment,
  KpiConfig,
} from '../../types/settings';
import { STAGE_PRICE_DEFAULTS } from '../../types/settings';

export const FinancialTab = () => {
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
  const [statePaymentForm, setStatePaymentForm] = useState({
    st1Payment: '', fitoPayment: '', fumigationPayment: '', internalCertPayment: '',
    certificatePaymentUzs: '', psrPriceUzs: '', workerPriceUzs: '', customsPaymentUzs: '',
  });

  const [certifierConfigs, setCertifierConfigs] = useState<CertifierFeeConfig[]>([]);
  const [loadingCertifierFeeConfig, setLoadingCertifierFeeConfig] = useState(true);
  const [showCertifierFeeForm, setShowCertifierFeeForm] = useState(false);
  const [certifierFeeForm, setCertifierFeeForm] = useState({
    branchId: 0, st1Rate: '', fitoRate: '', aktRate: '', fumigationRate: '', hiredWorkerRate: '',
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

  useEffect(() => {
    loadBXMConfigs();
    loadCurrentBXM();
    loadStatePayments();
    loadCertifierFeeConfig();
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
        certificatePaymentUsd: 0, psrPriceUsd: 0, workerPriceUsd: 0, customsPaymentUsd: 0,
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

  const loadCertifierFeeConfig = async () => {
    try {
      setLoadingCertifierFeeConfig(true);
      const response = await apiClient.get('/certifier-fee-config');
      if (Array.isArray(response.data)) {
        setCertifierConfigs(response.data);
      }
    } catch (error) {
      console.error('Error loading certifier fee config:', error);
    } finally {
      setLoadingCertifierFeeConfig(false);
    }
  };

  const handleCertifierFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/certifier-fee-config', {
        branchId: certifierFeeForm.branchId,
        st1Rate: Number(certifierFeeForm.st1Rate),
        fitoRate: Number(certifierFeeForm.fitoRate),
        aktRate: Number(certifierFeeForm.aktRate),
        fumigationRate: Number(certifierFeeForm.fumigationRate),
        hiredWorkerRate: Number(certifierFeeForm.hiredWorkerRate),
      });
      setShowCertifierFeeForm(false);
      await loadCertifierFeeConfig();
      alert('Sertifikatchi tarifi muvaffaqiyatli saqlandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const loadKpiConfigs = async () => {
    try {
      setLoadingKpiConfigs(true);
      const response = await apiClient.get('/kpi/configs/current');
      const configs: KpiConfig[] = response.data;
      const stages = configs.map(c => ({ stageName: c.stageName, price: Number(c.price) }));
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

  const formatCurrency = (amount: number, currency: 'USD' | 'UZS') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(amount).replace(/,/g, ' ').replace(/\./g, ',');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 pb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Moliyaviy Sozlamalar</h2>
      </div>

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
              <button onClick={cancelEditBxm} className="px-4 py-2 bg-white dark:bg-slate-800/20 hover:bg-white dark:bg-slate-800/30 rounded-xl text-sm font-medium transition-colors">Bekor</button>
            ) : (
              <button onClick={() => currentBXM && handleEditBxm(currentBXM)} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-colors shadow">
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
                <input type="number" step="0.01" value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800/10 border border-white/30 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/50" />
              </div>
              <div>
                <label className="text-xs text-indigo-300 mb-1 block">BXM (UZS)</label>
                <input type="number" step="1" value={editAmountUzs} onChange={(e) => setEditAmountUzs(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800/10 border border-white/30 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/50" />
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => currentBXM && handleSaveBxm(currentBXM.id)} className="flex-1 py-2.5 bg-white dark:bg-slate-800 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="w-4 h-4" />Saqlash
              </button>
              <button onClick={cancelEditBxm} className="px-5 py-2.5 bg-white dark:bg-slate-800/10 text-white rounded-xl hover:bg-white dark:bg-slate-800/20 transition-colors">Bekor</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Icon icon="lucide:history" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">BXM tarixi</h2>
            </div>
            <button
              onClick={() => { setShowAddBXMForm(true); setNewBxmEffective(new Date().toISOString().slice(0, 16)); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
            >
              <Icon icon="lucide:plus" className="w-3.5 h-3.5" />Yangi
            </button>
          </div>

          {showAddBXMForm && (
            <div className="mb-4 p-4 border-2 border-emerald-200 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <div className="text-sm font-semibold text-emerald-700 mb-3">Yangi BXM qiymati</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">USD</label>
                  <input type="number" step="0.01" value={newBxmUsd} onChange={(e) => setNewBxmUsd(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">UZS</label>
                  <input type="number" step="1" value={newBxmUzs} onChange={(e) => setNewBxmUzs(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="mb-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Kuchga kirish sanasi</label>
                <input type="datetime-local" value={newBxmEffective} onChange={(e) => setNewBxmEffective(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Izoh (ixtiyoriy)</label>
                <input type="text" value={newBxmNote} onChange={(e) => setNewBxmNote(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddBXM} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Qo'shish</button>
                <button onClick={() => setShowAddBXMForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
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
                      <input type="number" step="0.01" value={editAmountUsd} onChange={(e) => setEditAmountUsd(e.target.value)} className="px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      <input type="number" step="1" value={editAmountUzs} onChange={(e) => setEditAmountUzs(e.target.value)} className="px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveBxm(config.id)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Saqlash</button>
                      <button onClick={cancelEditBxm} className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors group ${config.id === currentBXM?.id ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900/50'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Number(config.amountUsd), 'USD')}</div>
                        {config.id === currentBXM?.id && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Joriy</span>}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-slate-500">{formatCurrency(Number(config.amountUzs), 'UZS')}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                        <Icon icon="lucide:calendar" className="w-3 h-3" />
                        {formatDate(config.effectiveFrom)}
                        {config.note && <span className="ml-1 italic">— {config.note}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditBxm(config)} className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-500/10 rounded-lg transition-colors">
                        <Icon icon="lucide:pencil" className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBxm(config.id)} className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:bg-red-500/10 rounded-lg transition-colors">
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                <Icon icon="lucide:percent" className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">Sertifikatchi tariflari</h2>
            </div>
          </div>
          {loadingCertifierFeeConfig ? (
            <div className="text-center py-4 text-gray-500 dark:text-slate-400">Yuklanmoqda...</div>
          ) : certifierConfigs.length > 0 ? (
            <div className="space-y-4">
              {certifierConfigs.map(config => (
                <div key={config.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-gray-800 dark:text-slate-200">{config.branch?.name || `Filial #${config.branchId}`}</h3>
                     <button onClick={() => {
                       setCertifierFeeForm({
                         branchId: config.branchId,
                         st1Rate: config.st1Rate.toString(),
                         fitoRate: config.fitoRate.toString(),
                         aktRate: config.aktRate.toString(),
                         fumigationRate: config.fumigationRate.toString(),
                         hiredWorkerRate: config.hiredWorkerRate.toString()
                       });
                       setShowCertifierFeeForm(true);
                     }} className="p-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors">
                       <IconEdit />
                     </button>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                       <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">ST-1</span>
                       <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatCurrency(Number(config.st1Rate), 'UZS')}</span>
                     </div>
                     <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                       <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">FITO</span>
                       <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatCurrency(Number(config.fitoRate), 'UZS')}</span>
                     </div>
                     <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                       <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Ichki AKT</span>
                       <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatCurrency(Number(config.aktRate), 'UZS')}</span>
                     </div>
                     <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                       <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Fumigatsiya</span>
                       <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatCurrency(Number(config.fumigationRate), 'UZS')}</span>
                     </div>
                     <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg col-span-2">
                       <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Yollanma ishchi</span>
                       <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{formatCurrency(Number(config.hiredWorkerRate), 'UZS')}</span>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-slate-500">
              <Icon icon="lucide:alert-circle" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">Sertifikatchi tariflari sozlanmagan<br/>(Filial qo'shing)</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Icon icon="lucide:credit-card" className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">Davlat to'lovlari</h2>
          </div>
          <button
            onClick={() => setShowStatePaymentForm(true)}
            className="inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <IconAdd />
          </button>
        </div>

        {loadingStatePayments ? (
          <div className="text-center py-4 text-gray-500 dark:text-slate-400">Yuklanmoqda...</div>
        ) : statePayments.length === 0 ? (
          <div className="text-center py-4 text-gray-400 dark:text-slate-500">Davlat to'lovlari topilmadi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">№</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">ST-1</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">FITO</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Fumigatsiya</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Ichki sertifikat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Yaratilgan</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {statePayments.map((payment, index) => (
                  <tr key={payment.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900/50">
                    <td className="py-3 px-4 text-gray-800 dark:text-slate-200 font-medium">{statePayments.length - index}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800 dark:text-slate-200">{formatCurrency(Number(payment.st1Payment), 'UZS')}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800 dark:text-slate-200">{formatCurrency(Number(payment.fitoPayment), 'UZS')}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800 dark:text-slate-200">{formatCurrency(Number(payment.fumigationPayment), 'UZS')}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800 dark:text-slate-200">{formatCurrency(Number(payment.internalCertPayment), 'UZS')}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400">{formatDate(payment.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteStatePayment(payment.id)}
                        className="inline-flex items-center justify-center p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="lucide:wallet" className="w-5 h-5 text-violet-200" />
                <h3 className="text-lg font-bold">Ishchilarga to'lovlar (KPI)</h3>
              </div>
              <p className="text-violet-200 text-sm">Har bir bosqich uchun to'lanadigan summa (UZS).</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowKpiHistoryModal(true); loadKpiHistory(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800/20 hover:bg-white dark:bg-slate-800/30 rounded-lg text-sm font-medium transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800/20 hover:bg-white dark:bg-slate-800/30 rounded-lg text-sm font-medium transition-colors"
              >
                <Icon icon="lucide:calendar-plus" className="w-3.5 h-3.5" />Yangi tarif
              </button>
              <button
                onClick={() => setShowAddStageForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-semibold transition-colors shadow"
              >
                <Icon icon="lucide:plus" className="w-3.5 h-3.5" />Jarayon
              </button>
            </div>
          </div>
        </div>

        {showAddStageForm && (
          <div className="mx-6 mt-4 mb-2 p-5 border-2 border-emerald-200 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
            <div className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
              <Icon icon="lucide:layers" className="w-4 h-4" />
              Yangi jarayon (bosqich) qo'shish
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Jarayon nomi</label>
                <input type="text" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Boshlang'ich narx (UZS)</label>
                <input type="number" step="0.01" min="0" value={newStagePrice} onChange={(e) => setNewStagePrice(e.target.value)} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center font-semibold" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddStage} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                <Icon icon="lucide:check" className="w-4 h-4" />Qo'shish
              </button>
              <button onClick={() => { setShowAddStageForm(false); setNewStageName(''); setNewStagePrice('0'); }} className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
            </div>
          </div>
        )}

        {showAddKpiForm && (
          <div className="mx-6 mt-4 mb-2 p-5 border-2 border-violet-200 rounded-xl bg-violet-50">
            <div className="text-sm font-bold text-violet-700 mb-4 flex items-center gap-2">
              <Icon icon="lucide:calendar-plus" className="w-4 h-4" />
              Yangi narx to'plami
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Kuchga kirish sanasi</label>
                <input type="datetime-local" value={newKpiEffective} onChange={(e) => setNewKpiEffective(e.target.value)} className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Izoh (ixtiyoriy)</label>
                <input type="text" value={newKpiNote} onChange={(e) => setNewKpiNote(e.target.value)} className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {activeKpiStages.map((stage) => (
                <div key={stage.stageName} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-violet-100">
                  <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block truncate" title={stage.stageName}>{stage.stageName}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newKpiPrices[stage.stageName] ?? stage.price}
                    onChange={(e) => setNewKpiPrices({ ...newKpiPrices, [stage.stageName]: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded text-sm focus:ring-1 focus:ring-violet-500 outline-none text-center font-semibold"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddKpiBatch} disabled={savingKpiConfigs} className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                Qo'shish
              </button>
              <button onClick={() => setShowAddKpiForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-300">Bekor</button>
            </div>
          </div>
        )}

        <div className="p-6">
          {loadingKpiConfigs ? (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">Yuklanmoqda...</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  Hozirgi narxlar — {activeKpiStages.length} ta jarayon
                </div>
                <button
                  onClick={handleSaveKpiConfigs}
                  disabled={savingKpiConfigs}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Icon icon="lucide:save" className="w-4 h-4" />
                  Saqlash
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeKpiStages.map((stage) => (
                  <div key={stage.stageName} className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group relative">
                    <button
                      onClick={() => handleDeleteStage(stage.stageName)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 truncate group-hover:text-indigo-600 transition-colors pr-5">
                      {stage.stageName}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={kpiConfigEdits[stage.stageName] ?? stage.price}
                        onChange={(e) => setKpiConfigEdits({
                          ...kpiConfigEdits,
                          [stage.stageName]: e.target.value
                        })}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-center font-bold text-lg bg-white dark:bg-slate-800"
                      />
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">UZS</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showCertifierFeeForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCertifierFeeForm(false); }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Sertifikatchi tarifi</h3>
              <button onClick={() => setShowCertifierFeeForm(false)} className="inline-flex items-center justify-center p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300">
                <IconCancel />
              </button>
            </div>
            <form onSubmit={handleCertifierFeeSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">ST-1 (UZS)</label>
                  <input type="number" min="0" value={certifierFeeForm.st1Rate} onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, st1Rate: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">FITO (UZS)</label>
                  <input type="number" min="0" value={certifierFeeForm.fitoRate} onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, fitoRate: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ichki AKT (UZS)</label>
                  <input type="number" min="0" value={certifierFeeForm.aktRate} onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, aktRate: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fumigatsiya (UZS)</label>
                  <input type="number" min="0" value={certifierFeeForm.fumigationRate} onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, fumigationRate: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Yollanma ishchi (UZS)</label>
                  <input type="number" min="0" value={certifierFeeForm.hiredWorkerRate} onChange={(e) => setCertifierFeeForm({ ...certifierFeeForm, hiredWorkerRate: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><IconSave /></button>
                <button type="button" onClick={() => setShowCertifierFeeForm(false)} className="flex-1 inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-400 transition-colors"><IconCancel /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatePaymentForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowStatePaymentForm(false); }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Yangi davlat to'lovi</h3>
              <button onClick={() => setShowStatePaymentForm(false)} className="inline-flex items-center justify-center p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300"><IconCancel /></button>
            </div>
            <form onSubmit={handleStatePaymentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">ST-1 to'lovi <span className="text-red-500">*</span></label>
                  <input type="number" step="1" value={statePaymentForm.st1Payment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, st1Payment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">FITO to'lovi <span className="text-red-500">*</span></label>
                  <input type="number" step="1" value={statePaymentForm.fitoPayment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, fitoPayment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fumigatsiya to'lovi <span className="text-red-500">*</span></label>
                  <input type="number" step="1" value={statePaymentForm.fumigationPayment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, fumigationPayment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ichki sertifikat <span className="text-red-500">*</span></label>
                  <input type="number" step="1" value={statePaymentForm.internalCertPayment} onChange={(e) => setStatePaymentForm({ ...statePaymentForm, internalCertPayment: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><IconSave /></button>
                <button type="button" onClick={() => setShowStatePaymentForm(false)} className="flex-1 inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-400 transition-colors"><IconCancel /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showKpiHistoryModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowKpiHistoryModal(false); }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:history" className="w-5 h-5" />
                <h3 className="text-lg font-bold">KPI narxlar tarixi</h3>
              </div>
              <button onClick={() => setShowKpiHistoryModal(false)} className="p-1.5 hover:bg-white dark:bg-slate-800/20 rounded-lg transition-colors">
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {kpiHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-slate-500">Tarix topilmadi</div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const groups = new Map<string, KpiConfig[]>();
                    kpiHistory.forEach(cfg => {
                      const key = cfg.effectiveFrom;
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(cfg);
                    });
                    return Array.from(groups.entries()).map(([dateStr, configs]) => (
                      <div key={dateStr} className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-900/50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700">
                          <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                          <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">{formatDate(dateStr)}</span>
                          {configs[0]?.note && <span className="text-xs text-gray-400 dark:text-slate-500 italic ml-2">— {configs[0].note}</span>}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-slate-800">
                          {configs.map(cfg => (
                            <div key={cfg.id} className="bg-white dark:bg-slate-800 px-3 py-2.5">
                              <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{cfg.stageName}</div>
                              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{Number(cfg.price).toLocaleString()} UZS</div>
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
  );
};
