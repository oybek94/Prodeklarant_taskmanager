import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Icon } from '@iconify/react';

export interface RecommendedPrice {
  id: number;
  productName: string;
  tnvedCode: string | null;
  priceUsd: number;
}

export function RecommendedPricesSection() {
  const [prices, setPrices] = useState<RecommendedPrice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPriceUsd, setEditPriceUsd] = useState('');



  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<RecommendedPrice[]>('/recommended-prices');
      setPrices(res.data);
    } catch (error) {
      console.error('Error loading recommended prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newPrice.trim()) {
      alert('Mahsulot nomi va narxi majburiy');
      return;
    }
    
    try {
      await apiClient.post('/recommended-prices', {
        productName: newName.trim(),
        tnvedCode: newCode.trim() || null,
        priceUsd: parseFloat(newPrice) || 0,
      });
      setNewName('');
      setNewCode('');
      setNewPrice('');
      setShowAddForm(false);
      await loadPrices();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Qo\'shishda xatolik yuz berdi');
    }
  };

  const startEdit = (item: RecommendedPrice) => {
    setEditingId(item.id);
    setEditName(item.productName);
    setEditCode(item.tnvedCode || '');
    setEditPriceUsd(item.priceUsd.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCode('');
    setEditPriceUsd('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim() || !editPriceUsd.trim()) {
      alert('Mahsulot nomi va narxi majburiy');
      return;
    }

    try {
      await apiClient.put(`/recommended-prices/${editingId}`, {
        productName: editName.trim(),
        tnvedCode: editCode.trim() || null,
        priceUsd: parseFloat(editPriceUsd) || 0,
      });
      cancelEdit();
      await loadPrices();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Saqlashda xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" narxini o'chirib tashlaysizmi?`)) return;
    try {
      await apiClient.delete(`/recommended-prices/${id}`);
      await loadPrices();
    } catch (error: any) {
      alert(error.response?.data?.error || 'O\'chirishda xatolik yuz berdi');
    }
  };



  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Icon icon="solar:dollar-bold-duotone" className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">Tavsiyaviy eksport narxlari</h2>
        </div>
        <div className="flex gap-2">

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <Icon icon={showAddForm ? "solar:minus-circle-bold-duotone" : "solar:add-circle-bold-duotone"} className="w-4 h-4" />
            {showAddForm ? "Yopish" : "Qo'shish"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
          <h3 className="text-sm font-semibold text-green-800 mb-3">Yangi narx qo'shish</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mahsulot nomi"
              className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            />
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="TN VED (ixtiyoriy)"
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            />
            <input
              type="number"
              step="any"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Narx (USD)"
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
            >
              Saqlash
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500 dark:text-slate-400">Yuklanmoqda...</div>
      ) : prices.length === 0 ? (
        <div className="py-8 text-center text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          <Icon icon="solar:box-bold-duotone" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Hali mahsulotlar kiritilmagan.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Mahsulot nomi</th>
                <th className="px-4 py-3 font-medium w-40">TN VED kod</th>
                <th className="px-4 py-3 font-medium w-40 text-right">Narx (USD)</th>
                <th className="px-4 py-3 font-medium w-24 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prices.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:bg-slate-900/50/50">
                  {editingId === item.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Ixtiyoriy"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editPriceUsd}
                          onChange={(e) => setEditPriceUsd(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700 p-1" title="Saqlash">
                          <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 p-1" title="Bekor qilish">
                          <Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.productName}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{item.tnvedCode || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        ${Number(item.priceUsd).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => startEdit(item)} className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:text-blue-400 transition-colors p-1" title="Tahrirlash">
                          <Icon icon="solar:pen-2-bold-duotone" className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.productName)} className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:text-red-400 transition-colors p-1" title="O'chirish">
                          <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
