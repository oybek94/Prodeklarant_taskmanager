import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';
import { RecommendedPricesSection } from './RecommendedPricesSection';
import {
  addTnvedProduct,
  deleteTnvedProduct,
  getTnvedProducts,
  updateTnvedProduct,
  type TnvedProduct,
} from '../../utils/tnvedProducts';
import type { PackagingTypeItem } from '../../types/settings';

export const SpecsTab = () => {
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

  useEffect(() => {
    refreshTnvedProducts();
    loadPackagingTypes();
  }, []);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 pb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <Icon icon="solar:box-bold-duotone" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Spetsifikatsiyalar</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <RecommendedPricesSection />

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Icon icon="solar:box-minimalistic-bold-duotone" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">TNVED Mahsulotlari</h2>
            </div>
            <button
              onClick={handleResetTnved}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              title="Asli holatiga qaytarish"
            >
              <Icon icon="solar:restart-bold-duotone" className="w-4 h-4" />
              Qaytarish
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">Yangi mahsulot qo'shish</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={tnvedName}
                onChange={(e) => setTnvedName(e.target.value)}
                placeholder="Mahsulot nomi"
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <input
                type="text"
                value={tnvedCode}
                onChange={(e) => setTnvedCode(e.target.value)}
                placeholder="TNVED kodi"
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <input
                type="text"
                value={tnvedBotanical}
                onChange={(e) => setTnvedBotanical(e.target.value)}
                placeholder="Botanika nomi (ixtiyoriy)"
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Mahsulot</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">TNVED kodi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Botanika nomi</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-slate-300">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {tnvedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4">
                      {editingTnvedId === product.id ? (
                        <input
                          type="text"
                          value={editingTnvedName}
                          onChange={(e) => setEditingTnvedName(e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded outline-none"
                        />
                      ) : (
                        <span className="text-gray-800 dark:text-slate-200 font-medium">{product.name}</span>
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
                        <code className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-600 dark:text-slate-300 text-xs">{product.code}</code>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400 italic">
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
                            <button onClick={handleSaveTnved} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Saqlash"><Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" /></button>
                            <button onClick={cancelEditTnved} className="p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:bg-slate-900/50 rounded" title="Bekor qilish"><Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditTnved(product)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded text-sm" title="Tahrirlash"><Icon icon="solar:pen-2-bold-duotone" className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteTnved(product.id, product.name)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded text-sm" title="O'chirish"><Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" /></button>
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

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Icon icon="solar:box-bold-duotone" className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">Qadoq turlari</h2>
          </div>

          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
            <h3 className="text-sm font-semibold text-green-800 mb-3">Yangi qadoq turi qo'shish</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={packagingName}
                onChange={(e) => setPackagingName(e.target.value)}
                placeholder="Qadoq nomi (masalan: Quti)"
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
              <input
                type="text"
                value={packagingCode}
                onChange={(e) => setPackagingCode(e.target.value)}
                placeholder="Kod (ixitiyoriy)"
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
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
            <div className="text-center py-4 text-gray-500 dark:text-slate-400">Yuklanmoqda...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packagingTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-green-200 hover:bg-green-50/30 transition-all">
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
                        <button onClick={cancelEditPackaging} className="flex-1 bg-gray-200 text-gray-600 dark:text-slate-300 py-1 rounded text-xs">Bekor</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-gray-800 dark:text-slate-200 font-medium">{type.name}</div>
                        {type.code && <div className="text-xs text-gray-400 dark:text-slate-500">Kod: {type.code}</div>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditPackaging(type)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 rounded"><Icon icon="solar:pen-2-bold-duotone" className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeletePackaging(type.id, type.name)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded"><Icon icon="solar:trash-bin-trash-bold-duotone" className="w-3.5 h-3.5" /></button>
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
  );
};
