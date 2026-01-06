import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface Stats {
  period: string;
  totalKPI: number;
  completedStages: number;
  totalSalary: number;
  tasksAssigned: number;
}

interface StageStat {
  stageName: string;
  participationCount: number;
  earnedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  percentage: number;
}

interface StageStats {
  period: string;
  stageStats: StageStat[];
  totals: {
    totalParticipation: number;
    totalEarned: number;
    totalReceived: number;
    totalPending: number;
  };
}

interface WorkerDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  salary?: number | string;
  branchId?: number | null;
  branch?: { id: number; name: string };
}

const Profile = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [stageStats, setStageStats] = useState<StageStats | null>(null);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stageStatsLoading, setStageStatsLoading] = useState(true);
  const [errorStatsLoading, setErrorStatsLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [previousYearDebt, setPreviousYearDebt] = useState<{
    totalEarned: number;
    totalPaid: number;
    balance: number;
  } | null>(null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEKLARANT' as 'ADMIN' | 'MANAGER' | 'DEKLARANT',
    branchId: '',
    salary: '',
  });
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  const workerId = id ? parseInt(id) : user?.id;

  useEffect(() => {
    if (workerId) {
      loadStats();
      loadStageStats();
      loadErrorStats();
      loadPreviousYearDebt();
      if (id) {
        loadWorkerDetail();
      }
    }
    loadBranches();
  }, [workerId, period, id]);

  const loadPreviousYearDebt = async () => {
    if (!workerId) return;
    try {
      // Avval o'tgan yil (2024) uchun qidirib ko'ramiz
      const previousYear = 2024;
      console.log('Loading previous year debt for workerId:', workerId, 'year:', previousYear);
      let response = await apiClient.get(`/workers/${workerId}/previous-year-debt?year=${previousYear}`);
      console.log('Previous year debt API response (2024):', response.data);
      
      // Agar 2024 uchun topilmasa, 2025 uchun qidirib ko'ramiz
      if (!response.data) {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        if (lastYear !== previousYear) {
          console.log('Trying year:', lastYear);
          response = await apiClient.get(`/workers/${workerId}/previous-year-debt?year=${lastYear}`);
          console.log('Previous year debt API response (' + lastYear + '):', response.data);
        }
      }
      
      if (response.data) {
        const debtData = {
          totalEarned: Number(response.data.totalEarned || 0),
          totalPaid: Number(response.data.totalPaid || 0),
          balance: Number(response.data.balance || 0),
        };
        console.log('Setting previous year debt:', debtData);
        setPreviousYearDebt(debtData);
      } else {
        console.log('No previous year debt data found');
        setPreviousYearDebt(null);
      }
    } catch (error: any) {
      console.error('Error loading previous year debt:', error);
      console.error('Error details:', error.response?.data || error.message);
      // O'tgan yil qarzi yo'q bo'lishi mumkin
      setPreviousYearDebt(null);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

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
        role: response.data.role || 'DEKLARANT',
        branchId: response.data.branchId ? response.data.branchId.toString() : '',
        salary: response.data.salary ? response.data.salary.toString() : '',
      });
    } catch (error) {
      console.error('Error loading worker detail:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setStats(null); // Clear old stats when period changes
      const response = await apiClient.get(`/workers/${workerId}/stats`, {
        params: { period },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStageStats = async () => {
    try {
      setStageStatsLoading(true);
      const response = await apiClient.get(`/workers/${workerId}/stage-stats`, {
        params: { period },
      });
      setStageStats(response.data);
    } catch (error) {
      console.error('Error loading stage stats:', error);
    } finally {
      setStageStatsLoading(false);
    }
  };

  const loadErrorStats = async () => {
    try {
      setErrorStatsLoading(true);
      const response = await apiClient.get(`/workers/${workerId}/error-stats`, {
        params: { period },
      });
      setErrorStats(response.data);
    } catch (error) {
      console.error('Error loading error stats:', error);
    } finally {
      setErrorStatsLoading(false);
    }
  };

  const handleEdit = () => {
    if (workerDetail) {
      setEditForm({
        name: workerDetail.name,
        email: workerDetail.email,
        password: '',
        role: (workerDetail.role || 'DEKLARANT') as 'ADMIN' | 'MANAGER' | 'DEKLARANT',
        branchId: workerDetail.branch?.id ? workerDetail.branch.id.toString() : '',
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
        role: editForm.role,
        salary: editForm.salary ? parseFloat(editForm.salary) : undefined,
      };
      // BranchId ni yuborish - agar tanlangan bo'lsa yoki MANAGER bo'lsa
      if (editForm.role === 'MANAGER') {
        updateData.branchId = null;
      } else if (editForm.branchId) {
        updateData.branchId = parseInt(editForm.branchId);
      }
      // Agar branchId bo'sh bo'lsa va MANAGER bo'lmasa, branchId ni yubormaymiz (mavjud qiymat saqlanadi)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayUser = id ? workerDetail : user;
  const isAdmin = user?.role === 'ADMIN';

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

      {/* Stage Statistics */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Jarayonlar bo'yicha statistika</h2>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
            }}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="day">Kun</option>
            <option value="week">Hafta</option>
            <option value="month">Oy</option>
            <option value="year">Yil</option>
              <option value="all">Barchasi</option>
          </select>
        </div>

        {stageStatsLoading ? (
          <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
        ) : (
          <>
            {/* Summary Cards - Always show, even if no stage stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 mb-1">Jami ishtirok</div>
                <div className="text-xl font-bold text-blue-800">
                  {stageStats?.totals?.totalParticipation || 0}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 mb-1">Ishlab topilgan (KPI)</div>
                <div className="text-xl font-bold text-green-800">
                  {loading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (() => {
                    const currentEarned = stats 
                      ? Number(stats.totalKPI)
                      : (stageStats?.totals?.totalEarned || 0);
                    const previousYearEarned = previousYearDebt?.totalEarned || 0;
                    const totalEarned = currentEarned + previousYearEarned;
                    return (
                      <CurrencyDisplay
                        amount={totalEarned}
                        originalCurrency="USD"
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                <div className="text-xs text-purple-600 mb-1">Jami olingan</div>
                <div className="text-xl font-bold text-purple-800">
                  {loading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (() => {
                    const currentReceived = stats 
                      ? Number(stats.totalSalary)
                      : (stageStats?.totals?.totalReceived || 0);
                    const previousYearPaid = previousYearDebt?.totalPaid || 0;
                    const totalReceived = currentReceived + previousYearPaid;
                    return (
                      <CurrencyDisplay
                        amount={totalReceived}
                        originalCurrency="USD"
                      />
                    );
                  })()}
                </div>
              </div>
              {(() => {
                // Joriy davrdagi qolgan haq
                const currentPending = loading 
                  ? 0 
                  : stats 
                    ? (Number(stats.totalKPI) - Number(stats.totalSalary))
                    : (stageStats?.totals?.totalPending || 0);
                
                // O'tgan yil qarzini qo'shish
                const previousYearBalance = previousYearDebt?.balance || 0;
                
                // Umumiy qolgan haq (joriy + o'tgan yil)
                const totalPending = currentPending + previousYearBalance;
                const hasPending = totalPending > 0;
                
                return (
                  <div className={`rounded-lg p-3 border-2 ${
                    hasPending
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      hasPending ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      Qolgan haq
                    </div>
                    <div className={`text-xl font-bold ${
                      hasPending ? 'text-orange-800' : 'text-gray-800'
                    }`}>
                      {loading ? (
                        <span className="text-gray-400">Yuklanmoqda...</span>
                      ) : (
                        <CurrencyDisplay
                          amount={totalPending}
                          originalCurrency="USD"
                        />
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Stage Details Table and Pie Chart - Only show if there are stage stats */}
            {stageStats && stageStats.stageStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table - 50% */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Jarayon</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Bosqich to'lovi</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Ishtirok</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Ishlab topilgan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageStats.stageStats.map((stat, idx) => {
                      // Calculate stage payment per participation
                      const stagePayment = stat.participationCount > 0 
                        ? (Number(stat.earnedAmount) / stat.participationCount) 
                        : 0;
                      
                      return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-800">{stat.stageName}</td>
                        <td className="py-3 px-4 text-center text-gray-800 font-semibold">
                        {stagePayment > 0 ? (
                          <CurrencyDisplay
                            amount={stagePayment}
                            originalCurrency="USD"
                          />
                        ) : '-'}
                      </td>
                        <td className="py-3 px-4 text-center text-gray-800 font-semibold">
                          {stat.participationCount}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-semibold">
                          <CurrencyDisplay
                            amount={Number(stat.earnedAmount)}
                            originalCurrency="USD"
                          />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pie Chart - 50% */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ishtirok foizi</h3>
                <div className="flex flex-col items-center">
                  {(() => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const totalParticipation = stageStats.totals.totalParticipation || 1;
                    const colors = [
                      '#3b82f6', // blue
                      '#10b981', // green
                      '#8b5cf6', // purple
                      '#f97316', // orange
                      '#ef4444', // red
                      '#eab308', // yellow
                      '#ec4899', // pink
                      '#6366f1', // indigo
                      '#14b8a6', // teal
                    ];
                    
                    const chartData = {
                      labels: stageStats.stageStats.map(stat => stat.stageName),
                      datasets: [
                        {
                          data: stageStats.stageStats.map(stat => stat.participationCount),
                          backgroundColor: stageStats.stageStats.map((_, idx) => colors[idx % colors.length]),
                          borderColor: '#fff',
                          borderWidth: 2,
                        },
                      ],
                    };
                    
                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        datalabels: {
                          color: '#fff',
                          font: {
                            size: 9,
                            weight: 'bold' as const,
                          },
                          formatter: (value: number, context: any) => {
                            const label = context.chart.data.labels[context.dataIndex];
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                            // Agar segment kichik bo'lsa (5% dan kichik), faqat foizni ko'rsat
                            if (Number(percentage) < 5) {
                              return '';
                            }
                            // Katta segmentlarda jarayon nomi va foizni ko'rsat
                            return `${label}\n${percentage}%`;
                          },
                          anchor: 'center' as const,
                          align: 'center' as const,
                          textAlign: 'center' as const,
                        },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const label = context.label || '';
                              const value = context.parsed || 0;
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                              return `${label}: ${value} (${percentage}%)`;
                            },
                          },
                        },
                      },
                    };
                    
                    return (
                      <div className="w-full" style={{ maxWidth: '400px' }}>
                        <Pie data={chartData} options={chartOptions} />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            )}

            {/* Charts */}
            {stageStats && stageStats.stageStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Participation Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ishtirok soni</h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: stageStats.stageStats.map(stat => stat.stageName),
                      datasets: [
                        {
                          label: 'Ishtirok soni',
                          data: stageStats.stageStats.map(stat => stat.participationCount),
                          backgroundColor: '#3b82f6',
                          borderColor: '#2563eb',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              return `Ishtirok: ${context.parsed.y}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Earnings Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ishlab topilgan summa</h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: stageStats.stageStats.map(stat => stat.stageName),
                      datasets: [
                        {
                          label: 'Ishlab topilgan summa',
                          data: stageStats.stageStats.map(stat => Number(stat.earnedAmount)),
                          backgroundColor: '#10b981',
                          borderColor: '#059669',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              return `Summa: $${context.parsed.y.toFixed(2)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return '$' + value.toFixed(2);
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
            )}
            
            {/* Show message if no stage stats but summary cards are shown */}
            {(!stageStats || stageStats.stageStats.length === 0) && (
              <div className="text-center py-8 text-gray-400 mt-6">
                Hozircha jarayonlar bo'yicha ma'lumotlar yo'q
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Statistics */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Xatoliklar statistikasi</h2>
        </div>

        {errorStatsLoading ? (
          <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
        ) : errorStats && errorStats.totalErrors > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600 mb-1">Jami xatolar</div>
                <div className="text-xl font-bold text-red-800">
                  {errorStats.totalErrors}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-xs text-orange-600 mb-1">Jami undirilgan summa</div>
                <div className="text-xl font-bold text-orange-800">
                  <CurrencyDisplay
                    amount={Number(errorStats.totalErrorAmount)}
                    originalCurrency="USD"
                  />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-600 mb-1">O'rtacha xato summasi</div>
                <div className="text-xl font-bold text-yellow-800">
                  <CurrencyDisplay
                    amount={errorStats.totalErrors > 0 ? (Number(errorStats.totalErrorAmount) / errorStats.totalErrors) : 0}
                    originalCurrency="USD"
                  />
                </div>
              </div>
            </div>

            {/* Errors by Stage */}
            {errorStats.errorsByStage && errorStats.errorsByStage.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bosqichlar bo'yicha xatolar</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Bosqich</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Xatolar soni</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Jami summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorStats.errorsByStage.map((stage: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{stage.stageName}</td>
                          <td className="py-3 px-4 text-center text-gray-800 font-semibold">
                            {stage.count}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 font-semibold">
                            <CurrencyDisplay
                              amount={Number(stage.totalAmount)}
                              originalCurrency="USD"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Errors */}
            {errorStats.errors && errorStats.errors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">So'nggi xatolar</h3>
                <div className="space-y-2">
                  {errorStats.errors.slice(0, 10).map((error: any) => (
                    <div key={error.id} className="border rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{error.taskTitle}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Bosqich: {error.stageName} | Summa: <CurrencyDisplay amount={Number(error.amount)} originalCurrency="USD" /> | Sana: {new Date(error.date).toLocaleDateString()}
                          </div>
                          {error.comment && (
                            <div className="text-sm text-gray-600 mt-2">{error.comment}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">Xatolar yo'q</div>
        )}
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
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Parolni o'zgartirish uchun kiriting (ixtiyoriy)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'ADMIN' | 'MANAGER' | 'DEKLARANT', branchId: e.target.value === 'MANAGER' ? '' : editForm.branchId })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DEKLARANT">DEKLARANT</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {editForm.role !== 'MANAGER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={editForm.role !== ('MANAGER' as any)}
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Filialni tanlang</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
