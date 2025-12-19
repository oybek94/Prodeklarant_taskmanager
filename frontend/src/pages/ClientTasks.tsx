import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../contexts/ClientAuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Logo from '../components/Logo';

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
  TOPSHIRILDI: 'bg-brand-primary/10 text-brand-primary',
  YAKUNLANDI: 'bg-green-100 text-green-800',
};

export default function ClientTasks() {
  const { logout } = useClientAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [psrFilter, setPsrFilter] = useState(''); // '' | 'true' | 'false'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, psrFilter, startDate, endDate]);

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

    // PSR filter
    if (psrFilter) {
      const hasPsr = psrFilter === 'true';
      filtered = filtered.filter(task => task.hasPsr === hasPsr);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(task => {
        const taskDate = new Date(task.createdAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate <= end;
      });
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-brand-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Logo size="md" showText={true} showTagline={false} />
              <div className="border-l-2 border-gray-200 pl-6">
                <h1 className="text-2xl font-bold text-brand-primary">Mening loyihalarim</h1>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/client/dashboard')}
                className="px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-secondary/90 transition font-medium shadow-sm"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
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
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Qidiruv va filtrlash</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Qidirish
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Loyiha nomini kiriting..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Sana oralig'i
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                />
              </div>
            </div>

            {/* PSR Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PSR
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <select
                  value={psrFilter}
                  onChange={(e) => setPsrFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary appearance-none bg-white"
                >
                  <option value="">Barchasi</option>
                  <option value="true">Ha</option>
                  <option value="false">Yo'q</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Results and Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              {filteredTasks.length} ta natija {(searchQuery || psrFilter || startDate || endDate) && '(filtrlangan)'}
            </p>
            
            <div className="flex items-center gap-2">
              {(searchQuery || psrFilter || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPsrFilter('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Tozalash
                </button>
              )}
              
              <button
                onClick={exportToExcel}
                disabled={filteredTasks.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
            </div>
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
              {searchQuery || psrFilter || startDate || endDate ? 'Qidiruv bo\'yicha natija topilmadi' : 'Hozircha sizda loyihalar yo\'q'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loyiha nomi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filial
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sana
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jarayon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map(task => {
                    const progress = calculateProgress(task);
                    const completedStages = task.stages.filter(s => s.status === 'TAYYOR').length;
                    const totalStages = task.stages.length;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => navigate(`/client/tasks/${task.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{task.branch.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(task.createdAt).toLocaleDateString('uz-UZ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {task.snapshotDealAmount ? (
                            <div className="text-sm font-medium text-green-600">
                              ${Number(task.snapshotDealAmount).toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">-</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                              <div
                                className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 min-w-[3rem]">
                              {completedStages}/{totalStages}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_LABELS[task.status] || task.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

