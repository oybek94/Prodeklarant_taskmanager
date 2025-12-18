import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../contexts/ClientAuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  hasPsr: boolean;
  comments?: string;
  snapshotDealAmount?: number;
  branch: {
    id: number;
    name: string;
  };
  stages: Array<{
    id: number;
    name: string;
    status: string;
    stageOrder: number;
    completedAt?: string;
    durationMin?: number;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  BOSHLANMAGAN: 'Boshlanmagan',
  JARAYONDA: 'Jarayonda',
  TAYYOR: 'Tayyor',
  TEKSHIRILGAN: 'Tekshirilgan',
  TOPSHIRILDI: 'Topshirildi',
  YAKUNLANDI: 'Yakunlandi',
};

const STATUS_COLORS: Record<string, string> = {
  BOSHLANMAGAN: 'bg-gray-100 text-gray-800',
  JARAYONDA: 'bg-blue-100 text-blue-800',
  TAYYOR: 'bg-yellow-100 text-yellow-800',
  TEKSHIRILGAN: 'bg-purple-100 text-purple-800',
  TOPSHIRILDI: 'bg-indigo-100 text-indigo-800',
  YAKUNLANDI: 'bg-green-100 text-green-800',
};

export default function ClientTasks() {
  const { logout } = useClientAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, statusFilter]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('clientAccessToken');
      
      const response = await axios.get(`${API_BASE_URL}/client/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setTasks(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    setFilteredTasks(filtered);
  };

  const exportToExcel = () => {
    const exportData = filteredTasks.map(task => {
      const completedStages = task.stages.filter(s => s.status === 'TAYYOR').length;
      const totalStages = task.stages.length;
      const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

      return {
        'ID': task.id,
        'Nomi': task.title,
        'Status': STATUS_LABELS[task.status] || task.status,
        'Filial': task.branch.name,
        'Summa': task.snapshotDealAmount || 0,
        'Jarayonlar': `${completedStages}/${totalStages}`,
        'Progress (%)': progress,
        'PSR': task.hasPsr ? 'Ha' : 'Yo\'q',
        'Yaratilgan': new Date(task.createdAt).toLocaleDateString('uz-UZ'),
        'Izoh': task.comments || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loyihalar');
    
    // Set column widths
    const colWidths = [
      { wch: 8 },  // ID
      { wch: 30 }, // Nomi
      { wch: 15 }, // Status
      { wch: 20 }, // Filial
      { wch: 12 }, // Summa
      { wch: 15 }, // Jarayonlar
      { wch: 12 }, // Progress
      { wch: 8 },  // PSR
      { wch: 15 }, // Yaratilgan
      { wch: 40 }, // Izoh
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Loyihalarim_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleLogout = () => {
    logout();
    navigate('/client/login');
  };

  const calculateProgress = (task: Task) => {
    const completedStages = task.stages.filter(s => s.status === 'TAYYOR').length;
    const totalStages = task.stages.length;
    return totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Mening loyihalarim</h1>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/client/dashboard')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Qidiruv
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Loyiha nomini kiriting..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Barchasi</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Jami: {filteredTasks.length} ta loyiha
            </p>
            <button
              onClick={exportToExcel}
              disabled={filteredTasks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel ga yuklash
            </button>
          </div>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loyiha topilmadi</h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter ? 'Qidiruv bo\'yicha natija topilmadi' : 'Hozircha sizda loyihalar yo\'q'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map(task => {
              const progress = calculateProgress(task);
              const completedStages = task.stages.filter(s => s.status === 'TAYYOR').length;
              const totalStages = task.stages.length;

              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/client/tasks/${task.id}`)}
                  className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer border border-gray-200 hover:border-indigo-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {task.branch.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(task.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                        {task.snapshotDealAmount && (
                          <span className="flex items-center gap-1 font-medium text-green-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            ${Number(task.snapshotDealAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Jarayonlar: {completedStages}/{totalStages}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stages Preview */}
                  <div className="flex flex-wrap gap-2">
                    {task.stages.slice(0, 5).map(stage => (
                      <span
                        key={stage.id}
                        className={`px-2 py-1 rounded text-xs ${
                          stage.status === 'TAYYOR'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {stage.name}
                      </span>
                    ))}
                    {task.stages.length > 5 && (
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                        +{task.stages.length - 5} ta
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

