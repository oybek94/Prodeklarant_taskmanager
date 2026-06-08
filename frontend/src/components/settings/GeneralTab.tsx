import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';
import { IconAdd, IconEdit, IconSave, IconCancel } from './icons';
import type { CompanySettings, YearlyGoalConfig } from '../../types/settings';

export const GeneralTab = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loadingCompanySettings, setLoadingCompanySettings] = useState(true);
  const [showCompanySettingsForm, setShowCompanySettingsForm] = useState(false);
  const [companySettingsForm, setCompanySettingsForm] = useState({
    name: '', legalAddress: '', actualAddress: '', inn: '', phone: '', email: '',
    bankName: '', bankAddress: '', bankAccount: '', swiftCode: '', correspondentBank: '',
    correspondentBankAddress: '', correspondentBankSwift: '',
  });

  const [yearlyGoalConfig, setYearlyGoalConfig] = useState<YearlyGoalConfig | null>(null);
  const [loadingYearlyGoalConfig, setLoadingYearlyGoalConfig] = useState(true);
  const [showYearlyGoalForm, setShowYearlyGoalForm] = useState(false);
  const [yearlyGoalForm, setYearlyGoalForm] = useState({
    year: new Date().getFullYear().toString(),
    targetTasks: '',
  });

  useEffect(() => {
    loadCompanySettings();
    loadYearlyGoalConfig();
  }, []);

  const loadCompanySettings = async () => {
    try {
      setLoadingCompanySettings(true);
      const response = await apiClient.get('/company-settings');
      if (response.data) {
        setCompanySettings(response.data);
        setCompanySettingsForm({
          name: response.data.name || '', legalAddress: response.data.legalAddress || '',
          actualAddress: response.data.actualAddress || '', inn: response.data.inn || '',
          phone: response.data.phone || '', email: response.data.email || '',
          bankName: response.data.bankName || '', bankAddress: response.data.bankAddress || '',
          bankAccount: response.data.bankAccount || '', swiftCode: response.data.swiftCode || '',
          correspondentBank: response.data.correspondentBank || '', correspondentBankAddress: response.data.correspondentBankAddress || '',
          correspondentBankSwift: response.data.correspondentBankSwift || '',
        });
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoadingCompanySettings(false);
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

  return (
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
              </button>
            </div>
            {loadingYearlyGoalConfig ? (
              <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
            ) : yearlyGoalConfig ? (
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Yil:</span> {yearlyGoalConfig.year}</div>
                <div><span className="font-semibold">Maqsad:</span> {yearlyGoalConfig.targetTasks.toLocaleString('en-US')} task</div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Yillik maqsad kiritilmagan.
              </div>
            )}
          </div>
        </div>
      </div>

      {showYearlyGoalForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowYearlyGoalForm(false); }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Yillik maqsad</h3>
              <button
                onClick={() => setShowYearlyGoalForm(false)}
                className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
              >
                <IconCancel />
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
                <button type="submit" className="flex-1 inline-flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <IconSave />
                </button>
                <button type="button" onClick={() => setShowYearlyGoalForm(false)} className="flex-1 inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
                  <IconCancel />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompanySettingsForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompanySettingsForm(false); }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Kompaniya ma'lumotlari</h3>
              <button onClick={() => setShowCompanySettingsForm(false)} className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700">
                <IconCancel />
              </button>
            </div>
            <form onSubmit={handleCompanySettingsSubmit}>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kompaniya nomi <span className="text-red-500">*</span></label>
                  <input type="text" value={companySettingsForm.name} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, name: e.target.value })} required className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yuridik manzil <span className="text-red-500">*</span></label>
                  <textarea value={companySettingsForm.legalAddress} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, legalAddress: e.target.value })} required rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Haqiqiy manzil <span className="text-red-500">*</span></label>
                  <textarea value={companySettingsForm.actualAddress} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, actualAddress: e.target.value })} required rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">INN</label>
                    <input type="text" value={companySettingsForm.inn} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, inn: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input type="text" value={companySettingsForm.phone} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, phone: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={companySettingsForm.email} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, email: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Bank ma'lumotlari</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank nomi</label>
                    <input type="text" value={companySettingsForm.bankName} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, bankName: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank manzili</label>
                    <textarea value={companySettingsForm.bankAddress} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, bankAddress: e.target.value })} rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hisob raqami</label>
                    <input type="text" value={companySettingsForm.bankAccount} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, bankAccount: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT kodi</label>
                    <input type="text" value={companySettingsForm.swiftCode} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, swiftCode: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Bank-korrespondent ma'lumotlari</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank-korrespondent</label>
                    <input type="text" value={companySettingsForm.correspondentBank} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, correspondentBank: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank-korrespondent manzili</label>
                    <textarea value={companySettingsForm.correspondentBankAddress} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, correspondentBankAddress: e.target.value })} rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank-korrespondent SWIFT</label>
                    <input type="text" value={companySettingsForm.correspondentBankSwift} onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, correspondentBankSwift: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <IconSave />
                </button>
                <button type="button" onClick={() => setShowCompanySettingsForm(false)} className="flex-1 inline-flex items-center justify-center p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                  <IconCancel />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
