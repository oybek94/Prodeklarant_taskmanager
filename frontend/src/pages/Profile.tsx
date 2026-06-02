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
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
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

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Bugun', icon: 'lucide:calendar' },
  { value: 'week', label: 'Hafta', icon: 'lucide:calendar-range' },
  { value: 'month', label: 'Oy', icon: 'lucide:calendar-days' },
  { value: 'year', label: 'Yil', icon: 'lucide:calendar-clock' },
  { value: 'all', label: 'Barchasi', icon: 'lucide:infinity' },
];

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

  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [currentEarnings, setCurrentEarnings] = useState<any[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);

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
      setStats(null);
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
      if (editForm.role === 'MANAGER') {
        updateData.branchId = null;
      } else if (editForm.branchId) {
        updateData.branchId = parseInt(editForm.branchId);
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await apiClient.put(`/users/${workerId}`, updateData);
      setShowEditModal(false);
      await loadWorkerDetail();
      if (id) {
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
  const isAdmin = user?.role === 'ADMIN';

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Menejer',
    DEKLARANT: 'Deklarant',
    CERTIFICATE_WORKER: 'Sertifikat xodimi',
    WORKER: 'Ishchi',
    OPERATOR: 'Operator',
    ACCOUNTANT: 'Buxgalter',
    OWNER: 'Egasi',
    SELLER: 'Sotuvchi',
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Xayrli tong';
    if (hour < 18) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalTasksCount = stageStats?.totals?.totalTasks ?? stageStats?.totals?.totalParticipation ?? 0;
  const paymentProgress = stats && stats.totalEarned > 0
    ? Math.min(100, Math.round((stats.totalPaid / stats.totalEarned) * 100))
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Clean Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {getUserInitials(displayUser?.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {displayUser?.name || 'Foydalanuvchi'}!
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {roleLabels[displayUser?.role || ''] || displayUser?.role}
              </span>
              {workerDetail?.branch && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 mr-1" />
                    {workerDetail.branch.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center p-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  period === opt.value
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon icon={opt.icon} className="w-4 h-4" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
          {isAdmin && id && (
            <div className="flex gap-2">
              <button onClick={handleEdit} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors shadow-sm">
                <Icon icon="lucide:pencil" className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-500 transition-colors shadow-sm">
                <Icon icon="lucide:trash-2" className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── KPI Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Tasks */}
        <button onClick={openParticipationsModal} className="bg-gradient-to-br from-white to-blue-50/80 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-5 border border-blue-100/50 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/10 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Icon icon="lucide:check-circle-2" className="w-5 h-5 text-blue-500" />
            </div>
            <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-sm font-semibold text-blue-600/80 dark:text-blue-400 mb-1">Jami ishtirok</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {stageStatsLoading ? '...' : totalTasksCount}
          </p>
        </button>

        {/* Earned */}
        <button onClick={openEarningsModal} className="bg-gradient-to-br from-white to-emerald-50/80 dark:from-gray-800 dark:to-emerald-900/20 rounded-2xl p-5 border border-emerald-100/50 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-500/10 transition-all text-left group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-3xl -z-0" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Icon icon="lucide:trending-up" className="w-5 h-5 text-emerald-500" />
              </div>
              <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-sm font-semibold text-emerald-600/80 dark:text-emerald-400 mb-1">Ishlab topilgan</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : <CurrencyDisplay amount={stats?.totalEarned || 0} originalCurrency="UZS" forceOriginal={true} />}
            </p>
          </div>
        </button>

        {/* Paid */}
        <button onClick={() => setShowPaymentsModal(true)} className="bg-gradient-to-br from-white to-indigo-50/80 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl p-5 border border-indigo-100/50 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-500/10 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Icon icon="lucide:wallet" className="w-5 h-5 text-indigo-500" />
            </div>
            <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-sm font-semibold text-indigo-600/80 dark:text-indigo-400 mb-1">Olingan maosh</p>
          <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {loading ? '...' : <CurrencyDisplay amount={stats?.totalPaid || 0} originalCurrency="UZS" forceOriginal={true} />}
          </p>
        </button>

        {/* Pending */}
        <div className="bg-gradient-to-br from-white to-amber-50/80 dark:from-gray-800 dark:to-amber-900/20 rounded-2xl p-5 border border-amber-100/50 dark:border-amber-800/40 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Icon icon="lucide:clock" className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-sm font-semibold text-amber-600/80 dark:text-amber-400 mb-1">Qolgan haq</p>
          <p className="text-xl font-extrabold text-gray-900 dark:text-white">
            {loading ? '...' : <CurrencyDisplay amount={stats?.pending || 0} originalCurrency="UZS" forceOriginal={true} />}
          </p>
        </div>

        {/* Legacy Debt */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/30 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
              <Icon icon="lucide:history" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">O'tgan mavsum</p>
          <p className="text-xl font-extrabold text-gray-900 dark:text-white">
            {loading ? '...' : <CurrencyDisplay amount={stats?.legacyDebt || 0} originalCurrency="USD" forceOriginal={true} />}
          </p>
        </div>

        {/* Errors */}
        <button onClick={() => setShowErrorsModal(true)} className="bg-gradient-to-br from-white to-red-50/80 dark:from-gray-800 dark:to-red-900/20 rounded-2xl p-5 border border-red-100/50 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-600 hover:shadow-md hover:shadow-red-500/10 transition-all text-left group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Icon icon="lucide:shield-alert" className="w-5 h-5 text-red-500" />
            </div>
            <Icon icon="lucide:arrow-up-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-red-400 transition-colors" />
          </div>
          <p className="text-sm font-semibold text-red-600/80 dark:text-red-400 mb-1">Jami xatolar</p>
          <p className="text-xl font-extrabold text-red-600 dark:text-red-400">
            {errorStatsLoading ? '...' : <CurrencyDisplay amount={Number(errorStats?.totalErrorAmount || 0)} originalCurrency="UZS" forceOriginal={true} />}
          </p>
        </button>
      </div>

      {/* ─── Middle Section (Payment Progress & Stage Chart) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Progress Ring */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center relative">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">To'lov Holati</h3>
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">Joriy mavsum</span>
          </div>
          
          <div className="w-48 h-48 my-4 relative flex items-center justify-center">
            <Doughnut
              data={{
                labels: ['To\'langan', 'Qolgan haq'],
                datasets: [{
                  data: [paymentProgress, 100 - paymentProgress],
                  backgroundColor: ['#10b981', '#f3f4f6'],
                  hoverBackgroundColor: ['#059669', '#e5e7eb'],
                  borderWidth: 0,
                  borderRadius: 8,
                }],
              }}
              options={{
                cutout: '80%',
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{paymentProgress}%</span>
              <span className="text-sm font-medium text-gray-500 mt-1">To'landi</span>
            </div>
          </div>
          
          <div className="w-full grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">To'langan</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {loading ? '...' : <CurrencyDisplay amount={stats?.totalPaid || 0} originalCurrency="UZS" forceOriginal={true} />}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Qolgan</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {loading ? '...' : <CurrencyDisplay amount={stats?.pending || 0} originalCurrency="UZS" forceOriginal={true} />}
              </p>
            </div>
          </div>
        </div>

        {/* Trophy Room (Adapted to clean style) */}
        <div className="lg:col-span-2">
          <TrophyRoom />
        </div>
      </div>

      {/* ─── Stage Statistics & Calendar ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Stage Statistics List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-gray-700/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Jarayonlar Statistikasi</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Siz ishtirok etgan barcha bosqichlar ro'yxati</p>
            </div>
            <button onClick={openParticipationsModal} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-2 rounded-xl transition-colors">
              Barchasini ko'rish
            </button>
          </div>
          
          <div className="p-0 overflow-x-auto flex-1 custom-scrollbar">
            {stageStatsLoading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
            ) : stageStats && stageStats.stageStats.length > 0 ? (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800/80">
                    <th className="px-6 py-5 font-bold">Jarayon nomi</th>
                    <th className="px-6 py-5 font-bold text-center">Tarif</th>
                    <th className="px-6 py-5 font-bold text-center">Ishtirok</th>
                    <th className="px-6 py-5 font-bold text-right">Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                  {stageStats.stageStats.map((stat, idx) => {
                    const stagePayment = stat.tariffUsd ?? (stat.participationCount > 0 ? Number(stat.earnedAmount) / stat.participationCount : 0);
                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
                    const color = colors[idx % colors.length];

                    return (
                      <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <span className={`w-2 h-2 rounded-full ${color} shadow-sm`} />
                            <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{stat.stageName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {stagePayment > 0 ? <CurrencyDisplay amount={stagePayment} originalCurrency="UZS" forceOriginal={true} /> : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-3 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                            {stat.participationCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            <CurrencyDisplay amount={Number(stat.earnedAmount)} originalCurrency="UZS" forceOriginal={true} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Icon icon="lucide:clipboard-list" className="w-12 h-12 mb-3 opacity-20" />
                <p>Ma'lumot topilmadi</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Umumiy Faollik</h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">So'nggi 6 oy</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Icon icon="lucide:calendar-days" className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center relative z-10">
            {contributions.length > 0 ? (
              <>
                <div className="overflow-x-auto custom-scrollbar pb-4 pt-2">
                  {(() => {
                    const map = new Map();
                    contributions.forEach((a: any) => map.set(a.date, a.count));

                    const today = new Date();
                    const startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
                    const startDay = startDate.getDay();
                    const startOfGrid = new Date(startDate.getTime() - startDay * 24 * 60 * 60 * 1000);
                    const weeks: { date: string; count: number; isFuture: boolean }[][] = [];
                    let currentWeek: { date: string; count: number; isFuture: boolean }[] = [];

                    for (let d = new Date(startOfGrid); d <= today; d.setDate(d.getDate() + 1)) {
                      const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
                      const dateStr = dLocal.toISOString().split('T')[0];
                      const count = map.get(dateStr) || 0;
                      currentWeek.push({ date: dateStr, count, isFuture: dLocal > today });
                      if (currentWeek.length === 7) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                      }
                    }
                    if (currentWeek.length > 0) weeks.push(currentWeek);

                    return (
                      <div className="flex gap-[4px] sm:gap-[5px] mt-1 w-max mx-auto">
                        <div className="flex flex-col gap-[4px] sm:gap-[5px] pr-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 items-end mt-0.5">
                          {['Yak', '', 'Sesh', '', 'Pay', '', 'Shan'].map((label, i) => (
                            <div key={i} className={`h-[12px] sm:h-[14px] ${!label ? 'opacity-0' : ''}`}>{label || '.'}</div>
                          ))}
                        </div>
                        {weeks.map((week, i) => (
                          <div key={i} className="flex flex-col gap-[4px] sm:gap-[5px]">
                            {week.map((day, j) => {
                              let colorClass = 'bg-gray-100 dark:bg-gray-700/50';
                              if (day.isFuture) colorClass = 'bg-transparent opacity-0 pointer-events-none';
                              else if (day.count > 15) colorClass = 'bg-indigo-600 dark:bg-indigo-500';
                              else if (day.count > 8) colorClass = 'bg-indigo-500 dark:bg-indigo-600';
                              else if (day.count > 3) colorClass = 'bg-indigo-400 dark:bg-indigo-700';
                              else if (day.count > 0) colorClass = 'bg-indigo-300 dark:bg-indigo-800';

                              return (
                                <div
                                  key={j}
                                  title={`${day.date}: ${day.count} ta vazifa`}
                                  className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] rounded-[3px] sm:rounded-[4px] transition-all cursor-pointer hover:ring-2 hover:ring-gray-300 ${colorClass}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-4 border-t border-gray-50 dark:border-gray-700/50 pt-4">
                  <span>Kam faollik</span>
                  <div className="flex gap-1.5">
                    {['bg-gray-100 dark:bg-gray-700/50', 'bg-indigo-300 dark:bg-indigo-800', 'bg-indigo-400 dark:bg-indigo-700', 'bg-indigo-500 dark:bg-indigo-600', 'bg-indigo-600 dark:bg-indigo-500'].map((c, i) => (
                      <div key={i} className={`w-3 h-3 rounded-[3px] ${c}`} />
                    ))}
                  </div>
                  <span>Ko'p</span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-400">
                <Icon icon="lucide:activity" className="w-8 h-8 mb-2 opacity-20" />
                <p>Faollik yo'q</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ═══════════════════════  MODALS  ═══════════════════════ */}


      {/* Edit Modal */}
      {showEditModal && workerDetail && (
        <ModalShell onClose={() => setShowEditModal(false)}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ishchini tahrirlash</h2>
            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <Icon icon="lucide:x" className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FieldGroup label="Ism" required>
              <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ishchi ismi" />
            </FieldGroup>
            <FieldGroup label="Email" required>
              <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="email@example.com" />
            </FieldGroup>
            <FieldGroup label="Yangi parol">
              <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ixtiyoriy" />
            </FieldGroup>
            <FieldGroup label="Role" required>
              <select required value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                <option value="DEKLARANT">Deklarant</option>
                <option value="MANAGER">Menejer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </FieldGroup>
            {editForm.role !== 'MANAGER' && (
              <FieldGroup label="Filial">
                <select value={editForm.branchId} onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                  <option value="">Barchasi</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </FieldGroup>
            )}
            <FieldGroup label="Oylik maosh (UZS)">
              <input type="number" value={editForm.salary} onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ixtiyoriy" />
            </FieldGroup>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium">Bekor qilish</button>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold">Saqlash</button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Earnings Modal */}
      {showEarningsModal && (
        <TableModal
          title="Joriy mavsum (Ishlab topilgan)"
          subtitle="Har bir ish va jarayon kesimida"
          onClose={() => setShowEarningsModal(false)}
          loading={earningsLoading}
          empty={currentEarnings.length === 0}
          emptyText="Hozircha joriy mavsumda hech qanday daromad yo'q"
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Task</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Jarayon</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {currentEarnings.map((earn) => (
                <tr key={earn.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(earn.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{earn.taskTitle}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{earn.stageName}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{Number(earn.amount).toLocaleString()} UZS</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold sticky bottom-0">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600">Jami:</td>
                <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 border-t border-gray-200 dark:border-gray-600">{currentEarnings.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()} UZS</td>
              </tr>
            </tfoot>
          </table>
        </TableModal>
      )}

      {/* Participations Modal */}
      {showParticipationsModal && (
        <TableModal
          title="Jami tasklarda ishtirok"
          subtitle="Har bir bajarilgan jarayon kesimida"
          onClose={() => setShowParticipationsModal(false)}
          loading={participationsLoading}
          empty={participations.length === 0}
          emptyText="Hozircha ishtiroklar yo'q"
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Task</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Jarayon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {participations.map((part, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(part.completedAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{part.task?.title || `Task #${part.taskId || '?'}`}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{part.name}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableModal>
      )}

      {/* Payments Modal */}
      {showPaymentsModal && (
        <TableModal
          title="Joriy mavsumda olingan to'lovlar"
          subtitle="Sizga berilgan barcha maosh va avanslar"
          onClose={() => setShowPaymentsModal(false)}
          loading={false}
          empty={!stats?.payments || stats.payments.filter(p => !p.isLegacyPayment).length === 0}
          emptyText="Hozircha to'lovlar olinmagan"
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Izoh</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {stats?.payments?.filter(p => !p.isLegacyPayment).map((payment: any) => (
                <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(payment.paymentDate)}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{payment.comment || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-violet-600 dark:text-violet-400">
                    {payment.paidCurrency === 'UZS'
                      ? `${Number(payment.paidAmountUzs).toLocaleString('ru-RU')} UZS`
                      : `${(Number(payment.paidAmountUsd) * 12000).toLocaleString('ru-RU')} UZS`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold sticky bottom-0">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600">Jami:</td>
                <td className="px-4 py-3 text-right text-violet-700 dark:text-violet-400 border-t border-gray-200 dark:border-gray-600">
                  {(stats?.payments || [])
                    .filter(p => !p.isLegacyPayment)
                    .reduce((sum, p) => sum + (p.paidCurrency === 'UZS' ? Number(p.paidAmountUzs) : Number(p.paidAmountUsd) * 12000), 0)
                    .toLocaleString('ru-RU')} UZS
                </td>
              </tr>
            </tfoot>
          </table>
        </TableModal>
      )}

      {/* Errors Modal */}
      {showErrorsModal && (
        <TableModal
          title="Jami xatolar ro'yxati"
          subtitle="Sizga yozilgan barcha jarimalar"
          onClose={() => setShowErrorsModal(false)}
          loading={errorStatsLoading}
          empty={!errorStats?.errors || errorStats.errors.length === 0}
          emptyText="Hozircha xatolar yo'q"
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Sana</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Task</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Izoh / Jarayon</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-right">Jarima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {errorStats?.errors?.map((error: any) => (
                <tr key={error.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateOnly(error.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{error.taskTitle || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{error.stageName}</span>
                    {error.comment && <p className="text-xs text-gray-400 mt-0.5 italic">"{error.comment}"</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                    <CurrencyDisplay amount={Number(error.amount)} originalCurrency="UZS" forceOriginal={true} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold sticky bottom-0">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600">Jami:</td>
                <td className="px-4 py-3 text-right text-red-700 dark:text-red-400 border-t border-gray-200 dark:border-gray-600">
                  <CurrencyDisplay amount={errorStats?.errors?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0} originalCurrency="UZS" forceOriginal={true} />
                </td>
              </tr>
            </tfoot>
          </table>
        </TableModal>
      )}
    </div>
  );
};

/* ─── Shared UI Helpers ─── */

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateOnly(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-200 dark:border-gray-700"
        style={{ animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function TableModal({ title, subtitle, onClose, loading, empty, emptyText, children }: {
  title: string; subtitle: string; onClose: () => void;
  loading: boolean; empty: boolean; emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl mx-4 border border-gray-200 dark:border-gray-700"
        style={{ animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <Icon icon="lucide:x" className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Icon icon="lucide:inbox" className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">{emptyText}</p>
            </div>
          ) : children}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-semibold">Yopish</button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default Profile;
