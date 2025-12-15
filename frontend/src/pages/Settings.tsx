import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api';

interface BXMConfig {
  id: number;
  year: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

const Settings = () => {
  const { user } = useAuth();
  const [bxmConfigs, setBxmConfigs] = useState<BXMConfig[]>([]);
  const [currentBXM, setCurrentBXM] = useState<BXMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  useEffect(() => {
    loadBXMConfigs();
    loadCurrentBXM();
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
    setEditAmount(config.amount.toString());
  };

  const handleSave = async (year: number) => {
    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${year}`, { amount });
      await loadBXMConfigs();
      await loadCurrentBXM();
      setEditingYear(null);
      setEditAmount('');
      alert('BXM muvaffaqiyatli yangilandi');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleAddNewYear = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const newYear = currentYear + 1;
      const amount = parseFloat(editAmount);
      
      if (isNaN(amount) || amount < 0) {
        alert('Noto\'g\'ri summa');
        return;
      }

      await apiClient.put(`/bxm/${newYear}`, { amount });
      await loadBXMConfigs();
      setEditingYear(null);
      setEditAmount('');
      alert('Yangi yil uchun BXM muvaffaqiyatli qo\'shildi');
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
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sozlamalar</h1>

      {/* Current BXM */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Joriy BXM (Bazaviy Xisoblash Miqdori)</h2>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
        ) : currentBXM ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Yil: {currentBXM.year}</div>
              <div className="text-2xl font-bold text-blue-600">
                ${Number(currentBXM.amount).toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => handleEdit(currentBXM)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              O'zgartirish
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">BXM topilmadi</div>
        )}
      </div>

      {/* BXM History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">BXM tarixi</h2>
          <button
            onClick={() => {
              const currentYear = new Date().getFullYear();
              setEditingYear(currentYear + 1);
              setEditAmount('34.4');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Yangi yil qo'shish
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BXM summa"
                  />
                  <button
                    onClick={() => handleSave(config.year)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Saqlash
                  </button>
                  <button
                    onClick={() => {
                      setEditingYear(null);
                      setEditAmount('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Bekor qilish
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{config.year} yil</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${Number(config.amount).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(config)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    O'zgartirish
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
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="BXM summa"
              />
              <button
                onClick={handleAddNewYear}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Qo'shish
              </button>
              <button
                onClick={() => {
                  setEditingYear(null);
                  setEditAmount('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;