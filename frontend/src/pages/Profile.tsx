import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { Icon } from '@iconify/react';
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
// No longer using ActivityCalendar
import TrophyRoom from '../components/medals/TrophyRoom';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface Stats {
  period: string;
  totalKPI: number;
  completedStages: number;
  tasksAssigned: number;
  totalEarned: number;
  totalPaid: number;
  pending: number;
  legacyDebt: number;
  salaryCurrency: 'USD' | 'UZS';
  payments?: PaymentStat[];
}

interface PaymentStat {
  id: number;
  earnedAmountUsd: number;
  paidAmountUsd: number;
  paidAmountUzs: number;
  paidCurrency: string;
  paymentDate: string;
  comment: string | null;
  isLegacyPayment: boolean;
}

interface StageStat {
  stageName: string;
  participationCount: number;
  earnedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  percentage: number;
  /** Har bir bosqich uchun amalda qo‘llanadigan to‘lov summasi (USD) — Sozlamalar tarifi */
  tariffUsd?: number;
}

interface StageStats {
  period: string;
  stageStats: StageStat[];
  totals: {
    totalParticipation: number;
    totalTasks?: number;
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
  const [contributions, setContributions] = useState<{ date: string; count: number; level: number }[]>([]);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stageStatsLoading, setStageStatsLoading] = useState(true);
  const [errorStatsLoading, setErrorStatsLoading] = useState(true);
  const [period, setPeriod] = useState('all');
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

  // Earnings Modal States
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [currentEarnings, setCurrentEarnings] = useState<any[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);

  // New Modal States
  const [showParticipationsModal, setShowParticipationsModal] = useState(false);
  const [participations, setParticipations] = useState<any[]>([]);
  const [participationsLoading, setParticipationsLoading] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showErrorsModal, setShowErrorsModal] = useState(false);

  const workerId = id ? parseInt(id) : user?.id;

  useEffect(() => {
    if (workerId) {
      loadStats();
      loadStageStats();
      loadContributions();
      loadErrorStats();
      if (id) {
        loadWorkerDetail();
      }
    }
    loadBranches();
  }, [workerId, period, id]);

  const loadContributions = async () => {
    try {
      const response = await apiClient.get(`/workers/${workerId}/contributions`);
      setContributions(response.data);
    } catch (error) {
      console.error('Error loading contributions:', error);
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

  const openParticipationsModal = async () => {
    setShowParticipationsModal(true);
    setParticipationsLoading(true);
    try {
      const response = await apiClient.get(`/workers/${workerId}/participations`, {
        params: { period }
      });
      setParticipations(response.data);
    } catch (error) {
      console.error('Error loading participations:', error);
    } finally {
      setParticipationsLoading(false);
    }
  };

  const openEarningsModal = async () => {
    setShowEarningsModal(true);
    setEarningsLoading(true);
    try {
      const response = await apiClient.get(`/workers/${workerId}/current-earnings`, {
        params: { period }
      });
      setCurrentEarnings(response.data);
    } catch (error) {
      console.error('Error loading current earnings:', error);
    } finally {
      setEarningsLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Personal Cabinet</h1>
        {isAdmin && id && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Icon icon="lucide:pencil" className="w-4 h-4" />
              O'zgartirish
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              O'chirish
            </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <TrophyRoom />
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              <div 
                className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={openParticipationsModal}
              >
                <div className="text-xs text-blue-600 mb-1 flex items-center justify-between">
                  <span>Jami tasklarda ishtirok</span>
                  <Icon icon="lucide:info" className="w-4 h-4 opacity-70" />
                </div>
                <div className="text-xl font-bold text-blue-800">
                  {stageStats?.totals?.totalTasks ?? stageStats?.totals?.totalParticipation ?? 0}
                </div>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 border-2 border-gray-300">
                <div className="text-xs text-gray-700 mb-1">O'tgan mavsum qoldig'i</div>
                <div className="text-xl font-bold text-gray-900">
                  {loading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (
                    <CurrencyDisplay
                      amount={stats?.legacyDebt || 0}
                      originalCurrency="USD"
                      forceOriginal={true}
                    />
                  )}
                </div>
              </div>
              <div 
                className="bg-green-50 rounded-lg p-3 border-2 border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={openEarningsModal}
              >
                <div className="text-xs text-green-700 mb-1 flex items-center justify-between">
                  <span>Joriy mavsum (Ishlab topilgan)</span>
                  <Icon icon="lucide:info" className="w-4 h-4 opacity-70" />
                </div>
                <div className="text-xl font-bold text-green-900">
                  {loading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (
                    <CurrencyDisplay
                      amount={stats?.totalEarned || 0}
                      originalCurrency="UZS"
                      forceOriginal={true}
                    />
                  )}
                </div>
              </div>
              <div 
                className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => setShowPaymentsModal(true)}
              >
                <div className="text-xs text-purple-700 mb-1 flex items-center justify-between">
                  <span>Joriy mavsum (Olingan)</span>
                  <Icon icon="lucide:info" className="w-4 h-4 opacity-70" />
                </div>
                <div className="text-xl font-bold text-purple-900">
                  {loading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (
                    <CurrencyDisplay
                      amount={stats?.totalPaid || 0}
                      originalCurrency="UZS"
                      forceOriginal={true}
                    />
                  )}
                </div>
              </div>
              <div className={`rounded-lg p-3 border-2 ${(stats?.pending || 0) > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs mb-1 ${(stats?.pending || 0) > 0 ? 'text-orange-700' : 'text-gray-600'}`}>Joriy mavsum (Qolgan haq)</div>
                <div className={`text-xl font-bold ${(stats?.pending || 0) > 0 ? 'text-orange-900' : 'text-gray-800'}`}>
                  {loading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (
                    <CurrencyDisplay
                      amount={stats?.pending || 0}
                      originalCurrency="UZS"
                      forceOriginal={true}
                    />
                  )}
                </div>
              </div>
              <div 
                className="bg-red-50 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => setShowErrorsModal(true)}
              >
                <div className="text-xs text-red-600 mb-1 flex items-center justify-between">
                  <span>Jami xatolar summasi</span>
                  <Icon icon="lucide:info" className="w-4 h-4 opacity-70" />
                </div>
                <div className="text-xl font-bold text-red-800">
                  {errorStatsLoading ? (
                    <span className="text-gray-400">Yuklanmoqda...</span>
                  ) : (
                    <CurrencyDisplay
                      amount={Number(errorStats?.totalErrorAmount || 0)}
                      originalCurrency="UZS"
                      forceOriginal={true}
                    />
                  )}
                </div>
              </div>
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
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Ishlab topilgan (summa)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageStats.stageStats.map((stat, idx) => {
                      // Bosqich to'lovi — amalda qo‘llanadigan tarif (Sozlamalar), yoki o‘rtacha (eski API uchun)
                      const stagePayment = stat.tariffUsd ?? (stat.participationCount > 0
                        ? Number(stat.earnedAmount) / stat.participationCount
                        : 0);
                      
                      return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-800">{stat.stageName}</td>
                        <td className="py-3 px-4 text-center text-gray-800 font-semibold">
                        {stagePayment > 0 ? (
                          <CurrencyDisplay
                            amount={stagePayment}
                            originalCurrency="UZS"
                            forceOriginal={true}
                          />
                        ) : '-'}
                      </td>
                        <td className="py-3 px-4 text-center text-gray-800 font-semibold">
                          {stat.participationCount}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-semibold">
                          <CurrencyDisplay
                            amount={Number(stat.earnedAmount)}
                            originalCurrency="UZS"
                            forceOriginal={true}
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
                              return `Summa: ${context.parsed.y.toLocaleString('ru-RU')}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value: any) {
                              return value.toLocaleString('ru-RU');
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

      {/* Contribution Graph - Dashboard Style */}
      {contributions.length > 0 && (
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col justify-center mt-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:opacity-100 transition-opacity duration-700 pointer-events-none opacity-50"></div>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30">
              <Icon icon="lucide:calendar-days" className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Umumiy Faollik</h2>
              <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Jonli Holat (So'nggi 6 oy)</p>
            </div>
          </div>

          <div className="relative z-10 overflow-x-auto custom-scrollbar pb-4 pt-2 px-1">
            {(() => {
              const map = new Map();
              contributions.forEach((a: any) => map.set(a.date, a.count));

              const today = new Date();
              const daysToSubtract = 180;
              const startDate = new Date(today.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

              const startDay = startDate.getDay();
              const startOfGrid = new Date(startDate.getTime() - startDay * 24 * 60 * 60 * 1000);
              const weeks = [];
              let currentWeek = [];

              for (let d = new Date(startOfGrid); d <= today; d.setDate(d.getDate() + 1)) {
                // Set time to noon to avoid timezone shift dropping dates
                const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
                const dateStr = dLocal.toISOString().split('T')[0];
                const count = map.get(dateStr) || 0;

                currentWeek.push({ date: dateStr, count, isFuture: dLocal > today });

                if (currentWeek.length === 7) {
                  weeks.push(currentWeek);
                  currentWeek = [];
                }
              }
              if (currentWeek.length > 0) {
                weeks.push(currentWeek);
              }

              return (
                <div className="flex gap-[3px] sm:gap-[5px] mt-1 w-max">
                  <div className="flex flex-col gap-[3px] sm:gap-[5px] pr-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 items-end mt-0.5">
                    <div className="h-[12px] sm:h-[14px]">Yak</div>
                    <div className="h-[12px] sm:h-[14px] opacity-0">Dush</div>
                    <div className="h-[12px] sm:h-[14px]">Sesh</div>
                    <div className="h-[12px] sm:h-[14px] opacity-0">Chor</div>
                    <div className="h-[12px] sm:h-[14px]">Pay</div>
                    <div className="h-[12px] sm:h-[14px] opacity-0">Jum</div>
                    <div className="h-[12px] sm:h-[14px]">Shan</div>
                  </div>
                  {weeks.map((week, i) => (
                    <div key={i} className="flex flex-col gap-[3px] sm:gap-[5px]">
                      {week.map((day, j) => {
                        let colorClass = "bg-gray-100 dark:bg-gray-800/80";
                        if (day.isFuture) colorClass = "bg-transparent opacity-0 pointer-events-none";
                        else if (day.count > 0 && day.count <= 3) colorClass = "bg-emerald-200 dark:bg-emerald-800/70";
                        else if (day.count > 3 && day.count <= 8) colorClass = "bg-emerald-400 dark:bg-emerald-600/90";
                        else if (day.count > 8 && day.count <= 15) colorClass = "bg-emerald-500 dark:bg-emerald-500";
                        else if (day.count > 15) colorClass = "bg-emerald-600 dark:bg-emerald-400";

                        return (
                          <div
                            key={j}
                            title={`${day.date}: ${day.count} ta vazifa bajarildi`}
                            className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px] sm:rounded-[4px] transition-colors cursor-pointer hover:ring-2 hover:ring-gray-400/50 ${colorClass}`}
                          ></div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="relative z-10 flex items-center justify-end gap-2 mt-auto pt-4 text-[11px] font-medium text-gray-500 dark:text-gray-400 lg:pl-10">
            <span>Kam</span>
            <div className="flex gap-[3px] sm:gap-[5px]">
              <div className="w-[12px] h-[12px] rounded-[3px] bg-gray-100 dark:bg-gray-800/80"></div>
              <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-200 dark:bg-emerald-800/70"></div>
              <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-400 dark:bg-emerald-600/90"></div>
              <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-500 dark:bg-emerald-500"></div>
              <div className="w-[12px] h-[12px] rounded-[3px] bg-emerald-600 dark:bg-emerald-400"></div>
            </div>
            <span>Ko'p</span>
          </div>
        </div>
      )}

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
                    originalCurrency="UZS"
                    forceOriginal={true}
                  />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-600 mb-1">O'rtacha xato summasi</div>
                <div className="text-xl font-bold text-yellow-800">
                  <CurrencyDisplay
                    amount={errorStats.totalErrors > 0 ? (Number(errorStats.totalErrorAmount) / errorStats.totalErrors) : 0}
                    originalCurrency="UZS"
                    forceOriginal={true}
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
                              originalCurrency="UZS"
                              forceOriginal={true}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DEKLARANT">Deklarant</option>
                  <option value="MANAGER">Menejer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {editForm.role !== 'MANAGER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial
                  </label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Barchasi (barcha filiallar ishini ko'radi)</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oylik maosh (UZS)
                </label>
                <input
                  type="number"
                  value={editForm.salary}
                  onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ixtiyoriy"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Current Earnings Breakdown Modal */}
      {showEarningsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEarningsModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl mx-4"
            style={{ 
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Joriy mavsum (Ishlab topilgan) batafsil</h2>
                <p className="text-sm text-gray-500 mt-1">Har bir ish va jarayon kesimida</p>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon icon="lucide:x" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {earningsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : currentEarnings.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-b">Sana</th>
                        <th className="px-4 py-3 font-semibold border-b">Task</th>
                        <th className="px-4 py-3 font-semibold border-b">Jarayon</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Summa (UZS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentEarnings.map((earn) => (
                        <tr key={earn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {(() => {
  const d = new Date(earn.createdAt);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
})()}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {earn.taskTitle}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                              {earn.stageName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {Number(earn.amount).toLocaleString()} UZS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold sticky bottom-0">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-gray-700 border-t">
                          Jami:
                        </td>
                        <td className="px-4 py-3 text-right text-green-700 border-t">
                          {currentEarnings.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()} UZS
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                  <Icon icon="lucide:inbox" className="w-12 h-12 mb-3 opacity-20" />
                  <p>Hozircha joriy mavsumda hech qanday daromad yo'q</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowEarningsModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participations Breakdown Modal */}
      {showParticipationsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowParticipationsModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl mx-4"
            style={{ 
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Jami tasklarda ishtirok batafsil</h2>
                <p className="text-sm text-gray-500 mt-1">Har bir bajarilgan jarayon kesimida</p>
              </div>
              <button
                onClick={() => setShowParticipationsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon icon="lucide:x" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {participationsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : participations.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-b">Sana</th>
                        <th className="px-4 py-3 font-semibold border-b">Task</th>
                        <th className="px-4 py-3 font-semibold border-b">Jarayon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {participations.map((part, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {(() => {
                              const d = new Date(part.completedAt);
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = d.getFullYear();
                              const hours = String(d.getHours()).padStart(2, '0');
                              const minutes = String(d.getMinutes()).padStart(2, '0');
                              return `${day}.${month}.${year} ${hours}:${minutes}`;
                            })()}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {part.task?.title || `Task #${part.taskId || '?'}`}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                              {part.name}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                  <Icon icon="lucide:inbox" className="w-12 h-12 mb-3 opacity-20" />
                  <p>Hozircha ishtiroklar yo'q</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowParticipationsModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Received Payments Breakdown Modal */}
      {showPaymentsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentsModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl mx-4"
            style={{ 
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Joriy mavsumda olingan to'lovlar</h2>
                <p className="text-sm text-gray-500 mt-1">Sizga berilgan barcha maosh va avanslar</p>
              </div>
              <button
                onClick={() => setShowPaymentsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon icon="lucide:x" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {stats?.payments && stats.payments.filter(p => !p.isLegacyPayment).length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-b">Sana</th>
                        <th className="px-4 py-3 font-semibold border-b">Izoh</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Summa (Asl)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.payments.filter(p => !p.isLegacyPayment).map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {(() => {
                              const d = new Date(payment.paymentDate);
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = d.getFullYear();
                              const hours = String(d.getHours()).padStart(2, '0');
                              const minutes = String(d.getMinutes()).padStart(2, '0');
                              return `${day}.${month}.${year} ${hours}:${minutes}`;
                            })()}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {payment.comment || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-purple-600">
                            {payment.paidCurrency === 'UZS' 
                              ? `${Number(payment.paidAmountUzs).toLocaleString('ru-RU')} UZS`
                              : `${(Number(payment.paidAmountUsd) * 12000).toLocaleString('ru-RU')} UZS`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold sticky bottom-0">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right text-gray-700 border-t">
                          Jami UZS hisobida:
                        </td>
                        <td className="px-4 py-3 text-right text-purple-700 border-t">
                          {stats.payments
                            .filter(p => !p.isLegacyPayment)
                            .reduce((sum, p) => sum + (p.paidCurrency === 'UZS' ? Number(p.paidAmountUzs) : Number(p.paidAmountUsd) * 12000), 0)
                            .toLocaleString('ru-RU')} UZS
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                  <Icon icon="lucide:inbox" className="w-12 h-12 mb-3 opacity-20" />
                  <p>Hozircha to'lovlar olinmagan</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowPaymentsModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Errors Breakdown Modal */}
      {showErrorsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowErrorsModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl mx-4"
            style={{ 
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Jami xatolar ro'yxati</h2>
                <p className="text-sm text-gray-500 mt-1">Sizga yozilgan barcha jarimalar</p>
              </div>
              <button
                onClick={() => setShowErrorsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon icon="lucide:x" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {errorStatsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : errorStats?.errors && errorStats.errors.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-b">Sana</th>
                        <th className="px-4 py-3 font-semibold border-b">Task</th>
                        <th className="px-4 py-3 font-semibold border-b">Izoh / Jarayon</th>
                        <th className="px-4 py-3 font-semibold border-b text-right">Jarima</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {errorStats.errors.map((error: any) => (
                        <tr key={error.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {(() => {
                              const d = new Date(error.date);
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = d.getFullYear();
                              return `${day}.${month}.${year}`;
                            })()}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {error.taskTitle || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div><span className="font-medium text-gray-700">Jarayon:</span> {error.stageName}</div>
                            {error.comment && <div className="text-xs text-gray-500 mt-1 italic">"{error.comment}"</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">
                            <CurrencyDisplay amount={Number(error.amount)} originalCurrency="UZS" forceOriginal={true} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold sticky bottom-0">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-gray-700 border-t">
                          Jami:
                        </td>
                        <td className="px-4 py-3 text-right text-red-700 border-t">
                          <CurrencyDisplay amount={errorStats.errors.reduce((sum: number, e: any) => sum + Number(e.amount), 0)} originalCurrency="UZS" forceOriginal={true} />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                  <Icon icon="lucide:inbox" className="w-12 h-12 mb-3 opacity-20" />
                  <p>Hozircha xatolar yo'q</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowErrorsModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
