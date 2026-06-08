import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';
import { IconAdd, IconTrash, IconCancel } from './icons';
import type { Branch, RegionCode } from '../../types/settings';
import { useAuth } from '../../contexts/AuthContext';

export const StructureTab = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
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

  useEffect(() => {
    loadBranches();
    loadRegionCodes();
  }, []);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
          <Icon icon="lucide:building-2" className="w-5 h-5 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Tuzilma (Filial va Hududlar)</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user?.role === 'ADMIN' && (
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
                  >
                    <IconAdd />
                  </button>
                  <button
                    onClick={() => {
                      setShowBranchForm(false);
                      setNewBranchName('');
                    }}
                    className="inline-flex items-center justify-center p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    <IconCancel />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
                  {regionCodes.map((rc) => (
                    <tr key={rc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{rc.name}</td>
                      <td className="py-2 px-3 text-gray-600">{rc.internalCode}</td>
                      <td className="py-2 px-3 text-gray-600">{rc.externalCode}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteRegionCode(rc.id, rc.name)}
                          disabled={deletingRegionCodeId === rc.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
                          title="O'chirish"
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

          {showRegionCodeForm && (
            <div className="mt-4 p-4 border-2 border-green-300 rounded-lg bg-green-50">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Yangi hudud kodi</h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={regionCodeForm.name}
                  onChange={(e) => setRegionCodeForm({ ...regionCodeForm, name: e.target.value })}
                  placeholder="Hudud nomi (masalan: Toshkent)"
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                  autoFocus
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
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
