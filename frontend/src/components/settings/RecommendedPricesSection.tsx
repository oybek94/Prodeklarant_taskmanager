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

  const [syncing, setSyncing] = useState(false);

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

  const handleSyncFromSpecs = async () => {
    if (!confirm('Shartnomalardagi barcha yangi spetsifikatsiyalarni avtomatik qo\'shishni xohlaysizmi?')) return;
    try {
      setSyncing(true);
      const res = await apiClient.post('/recommended-prices/sync-from-specs');
      alert(`Sinxronizatsiya tugadi. ${res.data.addedCount} ta yangi mahsulot qo'shildi.`);
      await loadPrices();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Sinxronizatsiyada xatolik yuz berdi');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Icon icon="lucide:dollar-sign" className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Tavsiyaviy eksport narxlari</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncFromSpecs}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
            title="Sinxronlash"
          >
            <Icon icon={syncing ? "lucide:loader-2" : "lucide:refresh-cw"} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Shartnomalardan olish
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <Icon icon={showAddForm ? "lucide:minus" : "lucide:plus"} className="w-4 h-4" />
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
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            />
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="TN VED (ixtiyoriy)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            />
            <input
              type="number"
              step="any"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Narx (USD)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
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
        <div className="py-8 text-center text-gray-500">Yuklanmoqda...</div>
      ) : prices.length === 0 ? (
        <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Icon icon="lucide:box" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Hali mahsulotlar kiritilmagan.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Mahsulot nomi</th>
                <th className="px-4 py-3 font-medium w-40">TN VED kod</th>
                <th className="px-4 py-3 font-medium w-40 text-right">Narx (USD)</th>
                <th className="px-4 py-3 font-medium w-24 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prices.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
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
                          <Icon icon="lucide:check" className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-1" title="Bekor qilish">
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                      <td className="px-4 py-3 text-gray-500">{item.tnvedCode || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        ${Number(item.priceUsd).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Tahrirlash">
                          <Icon icon="lucide:edit-2" className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.productName)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="O'chirish">
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
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
