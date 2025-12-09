import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface Stats {
  period: string;
  totalKPI: number;
  completedStages: number;
  totalSalary: number;
  tasksAssigned: number;
}

interface WorkerDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  position?: string;
  salary?: number | string;
  branch?: { id: number; name: string };
}

const Profile = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    position: '',
    salary: '',
  });

  const workerId = id ? parseInt(id) : user?.id;

  useEffect(() => {
    if (workerId) {
      loadStats();
      if (id) {
        loadWorkerDetail();
      }
    }
  }, [workerId, period, id]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showEditModal) {
        setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showEditModal]);

  const loadWorkerDetail = async () => {
    try {
      const response = await apiClient.get(`/users/${workerId}`);
      setWorkerDetail(response.data);
      setEditForm({
        name: response.data.name,
        email: response.data.email,
        password: '',
        position: response.data.position || '',
        salary: response.data.salary ? response.data.salary.toString() : '',
      });
    } catch (error) {
      console.error('Error loading worker detail:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/workers/${workerId}/stats`, {
        params: { period },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (workerDetail) {
      setEditForm({
        name: workerDetail.name,
        email: workerDetail.email,
        password: '',
        position: workerDetail.position || '',
        salary: workerDetail.salary ? Number(workerDetail.salary).toString() : '',
      });
      setShowEditModal(true);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;

    try {
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        position: editForm.position || undefined,
        salary: editForm.salary ? parseFloat(editForm.salary) : undefined,
      };
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await apiClient.put(`/users/${workerId}`, updateData);
      setShowEditModal(false);
      await loadWorkerDetail();
      if (id) {
        // If viewing someone else's profile, reload stats too
        await loadStats();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async () => {
    if (!workerId) return;
    if (!confirm('Bu ishchini o\'chirishni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi.')) return;

    try {
      await apiClient.delete(`/users/${workerId}`);
      alert('Ishchi muvaffaqiyatli o\'chirildi');
      navigate('/workers');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const displayUser = id ? workerDetail : user;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Personal Cabinet</h1>
        {isAdmin && id && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              O'zgartirish
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              O'chirish
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Profil ma'lumotlari</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Ism:</span>
              <div className="font-medium">{displayUser?.name}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email:</span>
              <div className="font-medium">{displayUser?.email}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Rol:</span>
              <div className="font-medium">{displayUser?.role}</div>
            </div>
            {workerDetail?.position && (
              <div>
                <span className="text-sm text-gray-500">Lavozim:</span>
                <div className="font-medium">{workerDetail.position}</div>
              </div>
            )}
            {workerDetail?.salary && (
              <div>
                <span className="text-sm text-gray-500">Oylik maosh:</span>
                <div className="font-medium">${Number(workerDetail.salary).toFixed(2)}</div>
              </div>
            )}
            {workerDetail?.branch && (
              <div>
                <span className="text-sm text-gray-500">Filial:</span>
                <div className="font-medium">{workerDetail.branch.name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Statistika</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="day">Kun</option>
              <option value="week">Hafta</option>
              <option value="month">Oy</option>
              <option value="year">Yil</option>
            </select>
          </div>
          {loading ? (
            <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
          ) : stats ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Qancha pul olgan (KPI)</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${Number(stats.totalKPI).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Qancha ish qilgan</div>
                <div className="text-xl font-bold text-gray-800">
                  {stats.completedStages} ta bosqich
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {stats.tasksAssigned} ta task yakunlangan
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Oylik to'lov</div>
                <div className="text-xl font-bold text-gray-800">
                  ${Number(stats.totalSalary).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Balans</div>
                <div
                  className={`text-xl font-bold ${
                    Number(stats.totalKPI) - Number(stats.totalSalary) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  ${(Number(stats.totalKPI) - Number(stats.totalSalary)).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Number(stats.totalKPI) - Number(stats.totalSalary) >= 0 ? 'Haqdor' : 'Qarzdor'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">Ma'lumotlar yo'q</div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && workerDetail && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Ishchini tahrirlash</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ism <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ishchi ismi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yangi parol
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Parolni o'zgartirish uchun kiriting (ixtiyoriy)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lavozim
                </label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lavozim"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oylik maosh
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.salary}
                  onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
