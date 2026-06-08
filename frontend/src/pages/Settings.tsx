import { useState } from 'react';
import { Icon } from '@iconify/react';
import { GeneralTab } from '../components/settings/GeneralTab';
import { FinancialTab } from '../components/settings/FinancialTab';
import { StructureTab } from '../components/settings/StructureTab';
import { SpecsTab } from '../components/settings/SpecsTab';
import { ProcessesTab } from '../components/settings/ProcessesTab';
import { SystemTab } from '../components/settings/SystemTab';

type TabType = 'general' | 'financial' | 'structure' | 'specs' | 'processes' | 'system';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const tabs = [
    { id: 'general', label: 'Umumiy', icon: 'lucide:settings' },
    { id: 'financial', label: 'Moliya', icon: 'lucide:dollar-sign' },
    { id: 'structure', label: 'Tuzilma', icon: 'lucide:building-2' },
    { id: 'specs', label: 'Spetsifikatsiyalar', icon: 'lucide:file-text' },
    { id: 'processes', label: 'Jarayonlar', icon: 'lucide:git-commit' },
    { id: 'system', label: 'Tizim', icon: 'lucide:monitor' },
  ];

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Icon icon="lucide:sliders" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sozlamalar</h1>
              <p className="text-sm text-gray-500 font-medium">Tizim va moliyaviy parametrlarni boshqarish</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon icon={tab.icon} className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'financial' && <FinancialTab />}
            {activeTab === 'structure' && <StructureTab />}
            {activeTab === 'specs' && <SpecsTab />}
            {activeTab === 'processes' && <ProcessesTab />}
            {activeTab === 'system' && <SystemTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
