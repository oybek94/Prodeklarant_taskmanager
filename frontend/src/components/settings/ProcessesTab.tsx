import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';
import type { ProcessSetting } from '../../types/settings';

export const ProcessesTab = () => {
  const [processSettings, setProcessSettings] = useState<ProcessSetting[]>([]);
  const [loadingProcessSettings, setLoadingProcessSettings] = useState(true);
  const [processSettingsEdits, setProcessSettingsEdits] = useState<Record<string, { estimatedTime: string; reminder1: string; reminder2: string; reminder3: string }>>({});
  const [savingProcessSettings, setSavingProcessSettings] = useState(false);

  useEffect(() => {
    loadProcessSettings();
  }, []);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200">Jarayon Sozlamalari (Eslatmalar)</h2>
        <button
          onClick={handleSaveProcessSettings}
          disabled={savingProcessSettings}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {savingProcessSettings ? (
            <>
              <Icon icon="solar:refresh-bold-duotone" className="w-4 h-4 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Icon icon="solar:diskette-bold-duotone" className="w-4 h-4" />
              Barchasini saqlash
            </>
          )}
        </button>
      </div>

      {loadingProcessSettings ? (
        <div className="text-center py-8 text-gray-500 dark:text-slate-400">Yuklanmoqda...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-slate-300">Jarayon turi</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-slate-300">Taxminiy vaqt (kun)</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-slate-300">1-eslatma (kun)</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-slate-300">2-eslatma (kun)</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-slate-300">3-eslatma (kun)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processSettings.map((setting) => (
                  <tr key={setting.processType} className="hover:bg-gray-50 dark:bg-slate-900/50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-800 dark:text-slate-200">
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
                        className="w-20 mx-auto px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
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
                        className="w-20 mx-auto px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
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
                        className="w-20 mx-auto px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
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
                        className="w-20 mx-auto px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
