import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/api';

interface Training {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  active: boolean;
  materials: Material[];
  exams: Exam[];
  _count: {
    materials: number;
    exams: number;
  };
}

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO';
  fileUrl?: string;
  orderIndex: number;
  durationMin?: number;
}

interface Exam {
  id: number;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMin?: number;
  active: boolean;
  _count: {
    questions: number;
  };
}

export default function TrainingManagement() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    orderIndex: 0,
    active: true,
  });

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const response = await apiClient.get('/training');
      setTrainings(response.data);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      title: '',
      description: '',
      orderIndex: trainings.length,
      active: true,
    });
    setShowAddModal(true);
  };

  const handleEdit = (training: Training) => {
    setSelectedTraining(training);
    setFormData({
      title: training.title,
      description: training.description || '',
      orderIndex: training.orderIndex,
      active: training.active,
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTraining) {
        // Edit
        await apiClient.put(`/training/${selectedTraining.id}`, formData);
      } else {
        // Add
        await apiClient.post('/training', formData);
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedTraining(null);
      fetchTrainings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('O\'qitish kursini o\'chirishni tasdiqlaysizmi?')) return;

    try {
      await apiClient.put(`/training/${id}`, { active: false });
      fetchTrainings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
              <Icon icon="lucide:graduation-cap" className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              O'qitish Kurslarini Boshqarish
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Kompaniya xodimlari uchun o'quv dasturlarini yaratish, materiallarni tahrirlash va testlarni boshqarish markazi.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <Icon icon="lucide:plus" className="w-5 h-5" />
          Yangi Kurs Qo'shish
        </button>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-slate-700 p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="lucide:book-open" className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hozircha kurslar yo'q</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Xodimlarni o'qitishni boshlash uchun dastlabki o'quv kursini yarating.
          </p>
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Birinchi kursni yaratish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {trainings.map((training) => (
            <div
              key={training.id}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Card Header with Gradient */}
              <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 relative">
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-md ${training.active
                      ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                      : 'bg-gray-500/20 text-gray-100 border border-gray-500/30'
                      }`}
                  >
                    {training.active ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                  <Icon icon="lucide:book-open" className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-6 left-6 right-6">
                  <div className="bg-white dark:bg-slate-700 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-slate-600">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {training.title}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tartib: #{training.orderIndex}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-10">
                {training.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-6 min-h-[40px]">
                    {training.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Materiallar</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{training._count.materials} ta</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Icon icon="lucide:clipboard-check" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Testlar</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{training._count.exams} ta</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <Link
                    to={`/training/${training.id}/manage`}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    Boshqarish
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(training)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Icon icon="lucide:edit-2" className="w-4 h-4" />
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDelete(training.id)}
                      className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold transition-all"
                      title="O'chirish"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Yangi O'qitish Kursi</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sarlavha *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tavsif
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    value={formData.orderIndex}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orderIndex: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Faol</label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Yaratish
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">O'qitish Kursini Tahrirlash</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sarlavha *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tavsif
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    value={formData.orderIndex}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orderIndex: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Faol</label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTraining(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

