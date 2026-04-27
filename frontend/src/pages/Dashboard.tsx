import { useState, useEffect, useMemo } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { formatCurrencyForRole, getCurrencyVisibility, type Role } from '../utils/currencyFormatting';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';
import { useIsMobile } from '../utils/useIsMobile';
import DashboardNotes from '../components/dashboard/DashboardNotes';
import { useSocket } from '../contexts/SocketContext';
import { UnratedErrorsModal } from '../components/dashboard/UnratedErrorsModal';
import { MEDAL_DETAILS, TIER_LABELS, formatPeriod, type UserMedal } from '../types/medals';
import MedalsNominationPanel from '../components/medals/MedalsNominationPanel';

import silver1 from '../assets/ranks/silver_1.png';
import silver2 from '../assets/ranks/silver_2.png';
import silver3 from '../assets/ranks/silver_3.png';
import silver4 from '../assets/ranks/silver_4.png';
import silverElite from '../assets/ranks/silver_elite.png';
import silverEliteMaster from '../assets/ranks/silver_elite_master.png';
import goldNova1 from '../assets/ranks/gold_nova_1.png';
import goldNova2 from '../assets/ranks/gold_nova_2.png';
import goldNova3 from '../assets/ranks/gold_nova_3.png';
import goldNovaMaster from '../assets/ranks/gold_nova_master.png';
import masterGuardian1 from '../assets/ranks/master_guardian_1.png';
import masterGuardian2 from '../assets/ranks/master_guardian_2.png';
import masterGuardianElite from '../assets/ranks/master_guardian_elite.png';
import distinguishedMasterGuardian from '../assets/ranks/distinguished_master_guardian.png';
import legendaryEagle from '../assets/ranks/legendary_eagle.png';
import legendaryEagleMaster from '../assets/ranks/legendary_eagle_master.png';
import supremeMasterFirstClass from '../assets/ranks/supreme_master_first_class.png';
import globalElite from '../assets/ranks/global_elite.png';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PaymentReminder {
  clientId: number;
  clientName: string;
  phone: string | null;
  creditType: string;
  creditLimit: number | null;
  dueReason: string;
  creditStartDate: string;
  currentDebt?: number;
  currency?: 'USD' | 'UZS';
}

interface DashboardStats {
  newTasks: number;
  completedTasks: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  processStats: Array<{ status: string; count: number }>;
  workerActivity: Array<{ userId: number; name: string; totalKPI: number; completedStages: number }>;
  workerCompletionRanking?: {
    weekly: Array<{ userId: number; name: string; completedStages: number; invoiceCount: number; errorCount?: number }>;
    monthly: Array<{ userId: number; name: string; completedStages: number; invoiceCount: number; errorCount?: number }>;
    yearly: Array<{ userId: number; name: string; completedStages: number; invoiceCount: number; errorCount?: number }>;
  };

  financialStats: Array<{ type: string; total: number }>;
  paymentReminders?: PaymentReminder[];
  todayNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  weeklyNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  monthlyNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  yearlyNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  tasksByBranch?: Array<{ branchId: number; branchName: string; count: number }>;
  certifierDebt?: {
    branchId: number;
    branchName: string;
    taskCount: number;
    rates: { st1Rate: number; fitoRate: number; aktRate: number };
    accrued: { st1: number; fito: number; akt: number; total: number };
    paid: { st1: number; fito: number; akt: number; total: number };
    remaining: { st1: number; fito: number; akt: number; total: number };
  } | null;
  workerDebts?: Array<{
    userId: number;
    name: string;
    totalEarnedUsd: number;
    totalPaidUsd: number;
    pendingUsd: number;
  }>;
  yearlyGoalTarget?: number;
}

interface CompletedSummaryItem {
  count: number;
  deltaPercent: number | null;
  series: { labels: string[]; data: number[] };
}

interface CompletedSummary {
  today: CompletedSummaryItem;
  week: CompletedSummaryItem;
  month: CompletedSummaryItem;
  year: CompletedSummaryItem;
}

interface ChartData {
  period: string;
  dateRange?: {
    start: string;
    end: string;
  };
  previousDateRange?: {
    start: string;
    end: string;
  };
  tasksCompleted: Array<{ date: string }>;
  previousTasksCompleted?: Array<{ date: string }>;
  kpiByWorker: Array<{ userId: number; name: string; total: number }>;
  transactionsByType: Array<{ type: string; date: string; amount: number }>;
}

interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  client: { name: string };
  branch: { name: string };
}

export const getCsgoRank = (total: number) => {
  if (total >= 10000) return { title: 'The Global Elite', short: 'GE', image: globalElite, color: 'from-blue-400 to-cyan-500', next: null, target: null };
  if (total >= 8000) return { title: 'Supreme Master First Class', short: 'Supreme', image: supremeMasterFirstClass, color: 'from-teal-400 to-emerald-500', next: 'The Global Elite', target: 10000 };
  if (total >= 6500) return { title: 'Legendary Eagle Master', short: 'LEM', image: legendaryEagleMaster, color: 'from-fuchsia-500 to-purple-600', next: 'Supreme Master First Class', target: 8000 };
  if (total >= 5200) return { title: 'Legendary Eagle', short: 'LE', image: legendaryEagle, color: 'from-purple-500 to-pink-500', next: 'Legendary Eagle Master', target: 6500 };
  if (total >= 4200) return { title: 'Distinguished Master Guardian', short: 'DMG', image: distinguishedMasterGuardian, color: 'from-rose-400 to-red-500', next: 'Legendary Eagle', target: 5200 };
  if (total >= 3300) return { title: 'Master Guardian Elite', short: 'MGE', image: masterGuardianElite, color: 'from-red-500 to-orange-500', next: 'Distinguished Master Guardian', target: 4200 };
  if (total >= 2600) return { title: 'Master Guardian II', short: 'MG2', image: masterGuardian2, color: 'from-orange-400 to-amber-500', next: 'Master Guardian Elite', target: 3300 };
  if (total >= 2000) return { title: 'Master Guardian I', short: 'MG1', image: masterGuardian1, color: 'from-amber-400 to-orange-500', next: 'Master Guardian II', target: 2600 };
  if (total >= 1500) return { title: 'Gold Nova Master', short: 'GNM', image: goldNovaMaster, color: 'from-yellow-400 to-amber-400', next: 'Master Guardian I', target: 2000 };
  if (total >= 1100) return { title: 'Gold Nova III', short: 'GN3', image: goldNova3, color: 'from-yellow-300 to-yellow-400', next: 'Gold Nova Master', target: 1500 };
  if (total >= 800) return { title: 'Gold Nova II', short: 'GN2', image: goldNova2, color: 'from-yellow-200 to-yellow-300', next: 'Gold Nova III', target: 1100 };
  if (total >= 600) return { title: 'Gold Nova I', short: 'GN1', image: goldNova1, color: 'from-yellow-100 to-yellow-200', next: 'Gold Nova II', target: 800 };
  if (total >= 400) return { title: 'Silver Elite Master', short: 'SEM', image: silverEliteMaster, color: 'from-slate-400 to-gray-500', next: 'Gold Nova I', target: 600 };
  if (total >= 250) return { title: 'Silver Elite', short: 'SE', image: silverElite, color: 'from-slate-300 to-gray-400', next: 'Silver Elite Master', target: 400 };
  if (total >= 150) return { title: 'Silver IV', short: 'S4', image: silver4, color: 'from-slate-200 to-gray-300', next: 'Silver Elite', target: 250 };
  if (total >= 100) return { title: 'Silver III', short: 'S3', image: silver3, color: 'from-gray-300 to-gray-400', next: 'Silver IV', target: 150 };
  if (total >= 50) return { title: 'Silver II', short: 'S2', image: silver2, color: 'from-gray-400 to-gray-500', next: 'Silver III', target: 100 };
  return { title: 'Silver I', short: 'S1', image: silver1, color: 'from-gray-500 to-slate-600', next: 'Silver II', target: 50 };
};

export const RANK_GROUPS = [
  {
    name: 'Silver',
    description: 'Boshlang\'ich Kadrlarni Kengaytirish',
    color: 'text-gray-300 border-gray-400',
    ranks: [
      { id: 1, title: 'Silver I', xp: 0, image: silver1 },
      { id: 2, title: 'Silver II', xp: 50, image: silver2 },
      { id: 3, title: 'Silver III', xp: 100, image: silver3 },
      { id: 4, title: 'Silver IV', xp: 150, image: silver4 },
      { id: 5, title: 'Silver Elite', xp: 250, image: silverElite },
      { id: 6, title: 'Silver Elite Master', xp: 400, image: silverEliteMaster },
    ]
  },
  {
    name: 'Gold Nova',
    description: 'Stabil Mutaxassislar (O\'rta level)',
    color: 'text-amber-400 border-amber-500',
    ranks: [
      { id: 7, title: 'Gold Nova I', xp: 600, image: goldNova1 },
      { id: 8, title: 'Gold Nova II', xp: 800, image: goldNova2 },
      { id: 9, title: 'Gold Nova III', xp: 1100, image: goldNova3 },
      { id: 10, title: 'Gold Nova Master', xp: 1500, image: goldNovaMaster },
    ]
  },
  {
    name: 'Master Guardian',
    description: 'Ishonchli va Tajribali Xodimlar',
    color: 'text-orange-500 border-orange-500',
    ranks: [
      { id: 11, title: 'Master Guardian I', xp: 2000, image: masterGuardian1 },
      { id: 12, title: 'Master Guardian II', xp: 2600, image: masterGuardian2 },
      { id: 13, title: 'Master Guardian Elite', xp: 3300, image: masterGuardianElite },
      { id: 14, title: 'Distinguished Master Guardian', xp: 4200, image: distinguishedMasterGuardian },
    ]
  },
  {
    name: 'The Elite',
    description: 'Kompaniya Faxrlari (Top 1%)',
    color: 'text-purple-400 border-fuchsia-500',
    ranks: [
      { id: 15, title: 'Legendary Eagle', xp: 5200, image: legendaryEagle },
      { id: 16, title: 'Legendary Eagle Master', xp: 6500, image: legendaryEagleMaster },
      { id: 17, title: 'Supreme Master First Class', xp: 8000, image: supremeMasterFirstClass },
      { id: 18, title: 'The Global Elite', xp: 10000, image: globalElite },
    ]
  }
];

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');

  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [premiumStats, setPremiumStats] = useState<any>(null);
  const [completedSummary, setCompletedSummary] = useState<CompletedSummary | null>(null);
  const [loadingCompletedSummary, setLoadingCompletedSummary] = useState(true);
  const [showRanksModal, setShowRanksModal] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [allMedals, setAllMedals] = useState<UserMedal[]>([]);
  const [myMedals, setMyMedals] = useState<UserMedal[]>([]);
  const [unratedErrors, setUnratedErrors] = useState<any[]>([]);
  const [showUnratedModal, setShowUnratedModal] = useState(false);
  const [showNominationsModal, setShowNominationsModal] = useState<false | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>(false);
  const loadUnratedErrors = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const response = await apiClient.get('/tasks/errors/unrated');
      setUnratedErrors(response.data);
    } catch (error) {
      console.error('Error loading unrated errors:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await apiClient.get('/auth/me/achievements');
      setAchievements(response.data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadMedals = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        apiClient.get('/medals/all'),
        apiClient.get('/medals/my-medals')
      ]);
      setAllMedals(allRes.data);
      setMyMedals(myRes.data);
    } catch (error) {
      console.error('Error loading medals:', error);
    }
  };

  useEffect(() => {
    loadStats();
    loadChartData();
    loadRecentTasks();
    loadExchangeRate();
  }, [period]);

  useEffect(() => {
    loadCompletedSummary();
    loadAchievements();
    loadMedals();
    if (user?.role === 'ADMIN') {
      loadUnratedErrors();
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const triggerUpdate = () => {
      loadStats();
      loadChartData();
      loadCompletedSummary();
      loadRecentTasks();
    };

    socket.on('task:created', triggerUpdate);
    socket.on('task:updated', triggerUpdate);
    socket.on('task:deleted', triggerUpdate);
    socket.on('task:stageUpdated', triggerUpdate);
    socket.on('invoice:saved', triggerUpdate);
    socket.on('invoice:deleted', triggerUpdate);

    return () => {
      socket.off('task:created', triggerUpdate);
      socket.off('task:updated', triggerUpdate);
      socket.off('task:deleted', triggerUpdate);
      socket.off('task:stageUpdated', triggerUpdate);
      socket.off('invoice:saved', triggerUpdate);
      socket.off('invoice:deleted', triggerUpdate);
    };
  }, [socket, period]);

  useEffect(() => {
    if (!socket) return;

    const handleBounty = (data: any) => {
      loadAchievements();
      loadUnratedErrors();
    };

    const handleQuality = (data: any) => {
      loadAchievements();
    };

    const handleAdminError = (data: any) => {
      if (user?.role === 'ADMIN') loadUnratedErrors();
    };

    socket.on('user:bounty_awarded', handleBounty);
    socket.on('user:quality_award', handleQuality);
    socket.on('admin_new_error_report', handleAdminError);

    return () => {
      socket.off('user:bounty_awarded', handleBounty);
      socket.off('user:quality_award', handleQuality);
      socket.off('admin_new_error_report', handleAdminError);
    };
  }, [socket, user]);

  const loadCompletedSummary = async () => {
    try {
      setLoadingCompletedSummary(true);
      const response = await apiClient.get('/dashboard/completed-summary');
      setCompletedSummary(response.data);
    } catch (error) {
      console.error('Error loading completed summary:', error);
      setCompletedSummary(null);
    } finally {
      setLoadingCompletedSummary(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      setLoadingExchangeRate(true);
      // Always use today's date - get current date in local timezone
      // Use UTC to avoid timezone issues
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const todayStr = todayUTC.toISOString().split('T')[0];

      // First, try to fetch from CBU API directly for today (this will get the latest rate)
      try {
        const fetchResponse = await apiClient.post('/finance/exchange-rates/fetch');
        if (fetchResponse.data?.rate) {
          const rate = parseFloat(fetchResponse.data.rate);
          setExchangeRate(rate);
          return;
        }
      } catch (fetchError: any) {
      }

      // If CBU fetch failed, try to get from database with today's date
      const response = await apiClient.get(`/finance/exchange-rates/for-date?date=${todayStr}`).catch((error) => {
        // Handle 404 and other errors
        if (error.response?.status === 404) {
          // 404 means no rate found, but might have fallback in response
          return error.response;
        }
        throw error;
      });
      if (response?.data?.rate !== undefined && response?.data?.rate !== null) {
        const rate = parseFloat(response.data.rate);

        // If it's a fallback (yesterday's rate), try to fetch today's rate from CBU again
        if (response.data.fallback) {
          // Try to fetch from CBU API endpoint
          try {
            const fetchResponse = await apiClient.post('/finance/exchange-rates/fetch');
            if (fetchResponse.data?.rate) {
              const newRate = parseFloat(fetchResponse.data.rate);
              setExchangeRate(newRate);
              return;
            }
          } catch (fetchError) {
          }
        }

        setExchangeRate(rate);
      } else {
        console.warn('[Dashboard] No rate in response:', response?.data);
      }
    } catch (error: any) {
      console.error('[Dashboard] Error loading exchange rate:', error);
      console.error('[Dashboard] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setStatsError(null);
      const [response, premiumResponse] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/dashboard/premium-stats').catch(() => null)
      ]);

      if (premiumResponse && premiumResponse.data) {
        setPremiumStats(premiumResponse.data);
      }
      if (response.status >= 400 || response.data?.error) {
        const errorMessage = response.data?.error || `Dashboard statistikasi yuklanmadi (status: ${response.status})`;
        setStatsError(errorMessage);
        setStats({
          newTasks: 0,
          completedTasks: 0,
          tasksByStatus: [],
          processStats: [],
          workerActivity: [],
          financialStats: [],
          tasksByBranch: [],
          certifierDebt: null,
          workerDebts: [],
        });
        return;
      }

      // Ensure tasksByBranch is always an array
      const statsData = {
        ...response.data,
        tasksByBranch: Array.isArray(response.data?.tasksByBranch)
          ? response.data.tasksByBranch
          : [],
      };

      setStats(statsData);    } catch (error: any) {
      console.error('Error loading stats:', error);
      const errorMessage =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message ||
        'Dashboard statistikasi yuklanmadi';
      setStatsError(errorMessage);
      // Set empty stats on error to prevent rendering issues
      setStats({
        newTasks: 0,
        completedTasks: 0,
        tasksByStatus: [],
        processStats: [],
        workerActivity: [],
        financialStats: [],
        tasksByBranch: [],
        certifierDebt: null,
        workerDebts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const params: any = { period };
      const response = await apiClient.get('/dashboard/charts', { params });
      setChartData(response.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadRecentTasks = async () => {
    try {
      const response = await apiClient.get('/tasks?status=JARAYONDA');
      setTasks(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const formatCurrency = (amount: number, originalCurrency: 'USD' | 'UZS' = 'USD', amountUzs?: number, exchangeRate?: number) => {
    const role = (user?.role || 'DEKLARANT') as Role;
    return formatCurrencyForRole(amount, originalCurrency, role, amountUzs, exchangeRate);
  };
  const formatUzs = (value: number) => value.toLocaleString('uz-UZ');

  const chartDataWithLabels = useMemo(() => {
    if (!chartData?.tasksCompleted || !chartData?.dateRange) {
      return { labels: [], current: [], previous: [] };
    }

    const startDate = new Date(chartData.dateRange.start);
    const endDate = new Date(chartData.dateRange.end);
    const previousTasks = chartData.previousTasksCompleted || [];

    const labels: string[] = [];
    const current: number[] = [];
    const previous: number[] = [];

    if (period === 'weekly') {
      const weekDays = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
      const currentByWeekday = Array.from({ length: 7 }, () => 0);
      const previousByWeekday = Array.from({ length: 7 }, () => 0);

      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        const dayIndex = (date.getDay() + 6) % 7;
        currentByWeekday[dayIndex] += 1;
      });
      previousTasks.forEach((item) => {
        const date = new Date(item.date);
        const dayIndex = (date.getDay() + 6) % 7;
        previousByWeekday[dayIndex] += 1;
      });

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const dayIndex = (cursor.getDay() + 6) % 7;
        labels.push(weekDays[dayIndex]);
        current.push(currentByWeekday[dayIndex] || 0);
        previous.push(previousByWeekday[dayIndex] || 0);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'monthly') {
      const monthShort = ['yan.', 'fev.', 'mar.', 'apr.', 'may', 'iyun', 'iyul', 'avg.', 'sen.', 'okt.', 'noy.', 'dek.'];
      const currentByDay = new Map<number, number>();
      const previousByDay = new Map<number, number>();

      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        currentByDay.set(date.getDate(), (currentByDay.get(date.getDate()) || 0) + 1);
      });
      previousTasks.forEach((item) => {
        const date = new Date(item.date);
        previousByDay.set(date.getDate(), (previousByDay.get(date.getDate()) || 0) + 1);
      });

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const day = cursor.getDate();
        labels.push(`${day} ${monthShort[cursor.getMonth()]}`);
        current.push(currentByDay.get(day) || 0);
        previous.push(previousByDay.get(day) || 0);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'yearly') {
      const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
      const targetYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const currentByMonth = Array.from({ length: 12 }, () => 0);
      const previousByMonth = Array.from({ length: 12 }, () => 0);

      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        if (date.getFullYear() === targetYear) {
          currentByMonth[date.getMonth()] += 1;
        }
      });
      previousTasks.forEach((item) => {
        const date = new Date(item.date);
        previousByMonth[date.getMonth()] += 1;
      });

      for (let month = 0; month <= endMonth; month++) {
        labels.push(monthNames[month]);
        current.push(currentByMonth[month] || 0);
        previous.push(previousByMonth[month] || 0);
      }
    }

    return { labels, current, previous };
  }, [chartData, period]);

  const getTaskProgress = (task: Task) => {
    if (task.status === 'YAKUNLANDI' || task.status === 'TAYYOR') return 100;
    if (task.status === 'JARAYONDA') return 50;
    return 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TAYYOR':
      case 'YAKUNLANDI':
        return 'bg-emerald-100 text-emerald-700';
      case 'JARAYONDA':
        return 'bg-blue-100 text-blue-700';
      case 'BOSHLANMAGAN':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'TAYYOR':
        return 'Tayyor';
      case 'YAKUNLANDI':
        return 'Yakunlandi';
      case 'JARAYONDA':
        return 'Jarayonda';
      case 'BOSHLANMAGAN':
        return 'Boshlanmagan';
      default:
        return status;
    }
  };

  const formatDeltaLabel = (value: number | null, suffix: string) => {
    if (value === null || value === undefined) return 'Taqqoslash uchun ma\'lumot yo\'q';
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${Math.abs(value).toFixed(1)}% ${suffix}`;
  };

  const buildSparklineData = (labels: string[], data: number[], color: string) => ({
    labels,
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '150, 150, 150';
          };
          const rgb = hexToRgb(color);
          gradient.addColorStop(0, `rgba(${rgb}, 0.35)`);
          gradient.addColorStop(1, `rgba(${rgb}, 0.0)`);
          return gradient;
        },
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        fill: true,
      },
    ],
  });

  const sparklineOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 4, bottom: 0, left: 0, right: 0 }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      datalabels: { display: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    events: [],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  let greeting = 'Xayrli kun';
  if (hour < 10) greeting = 'Xayrli tong';
  else if (hour < 17) greeting = 'Xayrli kun';
  else greeting = 'Xayrli kech';

  return (
    <div className={`min-h-screen bg-[#f3f4f6] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/40 via-purple-50/20 to-white dark:bg-none dark:bg-gray-900 pb-12 pt-4 px-2 sm:px-6 lg:px-8 overflow-x-hidden ${isMobile ? 'pb-32' : ''}`}>

      {/* Main Content */}

      <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 relative z-30">
            {/* Premium Page Header (Hero style) */}
            <div className="relative h-full bg-gradient-to-r from-indigo-50/80 via-white/80 to-purple-50/80 dark:from-indigo-950/40 dark:via-gray-900/60 dark:to-purple-950/40 backdrop-blur-3xl rounded-[24px] shadow-sm border border-white/60 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-center">
              {/* Abstract blobs */}
              <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none z-0">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl pointer-events-none"></div>
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1.5 flex flex-wrap items-center gap-2">
                      {greeting},
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        {user?.name?.split(' ')[0] || 'Foydalanuvchi'}
                      </span>
                      {(() => {
                        if (!stats || !user) return null;
                        const currentUserYearly = stats?.workerCompletionRanking?.yearly?.find((y: any) => y.userId === user?.id);
                        const userXP = currentUserYearly ? currentUserYearly.completedStages : 0;
                        const userRank = getCsgoRank(userXP);
                        return (
                          <div className="ml-4 flex items-start gap-1.5">
                            <div className="flex items-start gap-1.5 hover:scale-105 transition-transform cursor-pointer" title={userRank.title} onClick={() => setShowRanksModal(true)}>
                              <img src={userRank.image} alt={userRank.title} className="w-16 sm:w-20 h-auto drop-shadow-md" />
                              <span className="text-[10px] sm:text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pt-0.5 whitespace-nowrap hidden sm:block">
                                {userRank.title}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </h1>
                    <p className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Icon icon="lucide:calendar-clock" className="w-4 h-4 opacity-70" />
                      {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    {/* Unrated Errors Alert for Admin */}
                    {user?.role === 'ADMIN' && unratedErrors.length > 0 && (
                      <div className="mt-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 sm:p-4 shadow-sm animate-pulse-slow">
                        <div className="flex items-center gap-3 mb-3 sm:mb-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-800/50 flex flex-shrink-0 items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
                            <i className="fas fa-exclamation-triangle text-xl sm:text-2xl"></i>
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-orange-800 dark:text-orange-300">Baholanmagan xatolar mavjud!</h3>
                            <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-400 text-opacity-90 mt-0.5">
                              Sizda barcha filiallar bo'yicha jami <strong>{unratedErrors.length}</strong> ta xato kutmoqda. Ularni hoziroq baholang.
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setShowUnratedModal(true)} className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                          <i className="fas fa-star text-orange-200"></i> Baholashni Boshlash
                        </button>
                      </div>
                    )}

                    {/* Tungi Boyqush Admin Reminder */}
                    {user?.role === 'ADMIN' && (
                      <div className="mt-4 mb-2 flex items-center justify-between bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🦉</div>
                          <div>
                            <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">"Tungi Boyqush" medalini topshirish</h3>
                            <p className="text-xs text-purple-700 dark:text-purple-400">Oyning eng mehnatkash xodimini rag'batlantirish esdan chiqmasin.</p>
                          </div>
                        </div>
                        <button onClick={() => setShowNominationsModal('MONTHLY')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors">
                          Nomzodlarni ko'rish
                        </button>
                      </div>
                    )}

                    {/* Achievements Showcase (Medals Cabinet) */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 shadow-sm backdrop-blur-md self-start inline-flex min-h-[52px]">
                      <span className="text-[10px] sm:text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mr-2 flex items-center gap-1.5">
                        <i className="fas fa-medal text-yellow-500 opacity-80"></i> Mening medallarim:
                      </span>

                      {myMedals.length > 0 ? myMedals.map((medal) => {
                        const details = MEDAL_DETAILS[medal.medalType];
                        return (
                          <div key={medal.id} className="relative group cursor-pointer flex items-center justify-center" onClick={() => navigate('/profile')}>
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform ${details.bgClass} border-2 border-white dark:border-gray-700 overflow-hidden`}>
                              <img src={details.image} alt={details.name} className="w-full h-full object-contain p-1 drop-shadow-sm" />
                            </div>
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center border border-gray-700">
                              <div className={`font-extrabold ${details.color} tracking-wider mb-1.5 text-sm uppercase`}>{details.name}</div>
                              <div className="text-gray-200 font-medium leading-tight mb-2">{details.description}</div>
                              <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase border-t border-gray-700 pt-1.5 mt-1 flex justify-between">
                                <span>{formatPeriod(medal.period)}</span>
                                <span>+{medal.cashBonus / 1000}k UZS</span>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="relative group cursor-pointer flex items-center justify-center" onClick={() => navigate('/profile')}>
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 flex items-center justify-center opacity-60 transition-opacity hover:opacity-100">
                            <i className="fas fa-lock text-gray-400 dark:text-gray-500 text-xs shadow-inner"></i>
                          </div>
                          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-52 p-2.5 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center border border-gray-700">
                            <div className="font-bold text-gray-300 mb-1">Medallar Qulflangan</div>
                            <div className="text-gray-400 text-[10px]">A'lo darajadagi xizmatlaringiz uchun maxsus medallar shu yerda paydo bo'ladi. Ko'rish uchun bosing.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {exchangeRate && (
                  <div className="flex items-center self-start lg:self-center bg-white/70 dark:bg-gray-800/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center mr-4 shadow-inner">
                      <Icon icon="lucide:banknote" className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Valyuta kursi</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-gray-900 dark:text-white leading-none">1 <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">$</span></span>
                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500 mx-1">=</span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{formatUzs(exchangeRate)} <span className="text-sm font-semibold">UZS</span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Tasks To do */}
          <div className="lg:col-span-1">
            <DashboardNotes />
          </div>
        </div>

        {/* Top Summary & Activity Heatmap */}
        {/* Top Summary & Activity Heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Left: 4 Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'today', title: 'BUGUN', suffix: 'kechagiga nisbatan', icon: 'lucide:calendar', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-100/60 dark:border-emerald-800/30', spark: '#10b981', showChart: true },
              { key: 'week', title: 'HAFTALIK', suffix: 'o‘tgan haftadan', icon: 'lucide:calendar-range', bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-100/60 dark:border-blue-800/30', spark: '#3b82f6', showChart: true },
              { key: 'month', title: 'OYLIK', suffix: 'o‘tgan oydan', icon: 'lucide:calendar-days', bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-100/60 dark:border-purple-800/30', spark: '#8b5cf6', showChart: true },
              { key: 'year', title: 'YILLIK', suffix: 'o‘tgan yildan', icon: 'lucide:calendar', bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-100/60 dark:border-orange-800/30', spark: '#f97316', showChart: true },
            ].map((item) => {
              const data = completedSummary?.[item.key as keyof CompletedSummary];
              const delta = data?.deltaPercent ?? null;
              const deltaLabel = loadingCompletedSummary
                ? '...'
                : delta === null || delta === undefined
                  ? '0%'
                  : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
              const sparkLabels = data?.series?.labels ?? [];
              const sparkData = data?.series?.data ?? [];

              return (
                <div
                  key={item.key}
                  className={`group relative ${item.bg} rounded-[20px] shadow-sm border ${item.border} hover:shadow-md dark:hover:shadow-white/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col pt-3`}
                >
                  {/* Top highlight glare */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 dark:from-white/5 to-transparent pointer-events-none rounded-t-[20px]" />

                  {/* Header -> Count -> Badge row */}
                  <div className="relative z-10 px-4 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-gray-800/50 backdrop-blur-md flex items-center justify-center shadow-sm border border-white dark:border-gray-700/50 shrink-0">
                        <Icon icon={item.icon} className={`w-3.5 h-3.5 ${item.text}`} />
                      </div>
                      <div className="text-[10px] mt-0.5 font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase truncate">{item.title}</div>
                    </div>

                    <div className="flex items-end justify-between gap-1 mb-1 relative z-20">
                      <div className={`text-3xl font-black tracking-tighter leading-none ${item.text} drop-shadow-sm truncate pr-1`}>
                        {loadingCompletedSummary ? '...' : data?.count ?? 0}
                      </div>
                      <div className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 mb-0.5 ${delta === null ? 'bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400' : delta >= 0 ? 'bg-emerald-100/60 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100/60 dark:bg-red-500/20 text-red-700 dark:text-red-400'} shadow-sm`}>
                        {delta !== null && delta !== undefined && !loadingCompletedSummary && (
                          <Icon icon={delta >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'} className="w-3 h-3" />
                        )}
                        <span>{deltaLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Chart Spread */}
                  <div className="absolute inset-x-0 bottom-0 h-[65px] opacity-80 pointer-events-none rounded-b-[20px]">
                    {item.showChart && Array.isArray(sparkData) && sparkData.length > 0 ? (
                      <div className="w-full h-full pb-0.5">
                        <Line
                          data={buildSparklineData(sparkLabels, sparkData, item.spark)}
                          options={{ ...sparklineOptions, maintainAspectRatio: false }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-0 mt-1">
                        <span className="text-[9px] font-bold text-gray-400/50 dark:text-gray-500/70 uppercase">0 Vazifa</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Github Activity Heatmap Row */}
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col justify-center">
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
              {!premiumStats ? (
                <div className="flex items-center justify-center py-6 h-[100px]"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div></div>
              ) : (() => {
                const activityList = premiumStats.githubActivity || [];
                const map = new Map();
                activityList.forEach((a: any) => map.set(a.date, a.count));

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
                  <div className="flex gap-[3px] sm:gap-[5px] mt-1">
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
                              title={`${day.date}: ${day.count} ta kelib tushgan vazifa`}
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart and Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Done Graph */}
            <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50 dark:border-gray-700/50 flex flex-col" style={{ height: '565px' }}>
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Oylik monitoring</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bajarilgan vazifalar dinamikasi</p>
                </div>
                <div className="flex gap-2 bg-gray-100/80 dark:bg-gray-700/80 p-1 rounded-xl">
                  <button
                    onClick={() => setPeriod('weekly')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${period === 'weekly'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Haftalik
                  </button>
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${period === 'monthly'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Oylik
                  </button>
                  <button
                    onClick={() => setPeriod('yearly')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${period === 'yearly'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Yillik
                  </button>
                </div>
              </div>

              {/* Charts.js Line Chart */}
              {chartDataWithLabels.labels.length > 0 ? (
                <div className="flex-1 w-full min-h-0">
                  <Line
                    data={{
                      labels: chartDataWithLabels.labels,
                      datasets: [
                        {
                          label: 'Joriy davr',
                          data: chartDataWithLabels.current,
                          borderColor: 'rgb(99, 102, 241)',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          borderWidth: 2,
                          fill: true,
                          tension: 0.4,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          pointBackgroundColor: 'rgb(99, 102, 241)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointHoverBackgroundColor: 'rgb(79, 70, 229)',
                          pointHoverBorderColor: '#fff',
                          yAxisID: 'y',
                        },
                        {
                          label: 'O‘tgan davr',
                          hidden: true,
                          data: chartDataWithLabels.previous,
                          borderColor: 'rgb(148, 163, 184)',
                          backgroundColor: 'rgba(148, 163, 184, 0.1)',
                          borderWidth: 2,
                          fill: false,
                          tension: 0.35,
                          pointRadius: 3,
                          pointHoverRadius: 5,
                          pointBackgroundColor: 'rgb(148, 163, 184)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 1,
                          yAxisID: 'y1',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index' as const,
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top' as const,
                        },
                        tooltip: {
                          mode: 'index' as const,
                          intersect: false,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          titleFont: {
                            size: 14,
                            weight: 'bold' as const,
                          },
                          bodyFont: {
                            size: 13,
                          },
                        },
                      },
                      scales: {
                        y: {
                          type: 'linear' as const,
                          display: true,
                          position: 'left' as const,
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                            precision: 0,
                            display: true,
                          },
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                          },
                        },
                        y1: {
                          type: 'linear' as const,
                          display: true,
                          position: 'right' as const,
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                            precision: 0,
                            display: false,
                          },
                          grid: {
                            drawOnChartArea: false,
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                          ticks: {
                            maxRotation: period === 'yearly' ? 0 : 45,
                            minRotation: period === 'yearly' ? 0 : 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="w-full text-center text-gray-400 py-12">Ma'lumotlar yo'q</div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tasks by Branch Chart */}
              <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 flex flex-col h-full relative overflow-hidden group" style={{ height: '515px' }}>
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
                    <Icon icon="lucide:pie-chart" className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Filiallar ulushi</h2>
                    <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Bajarilgan ishlar</p>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                ) : (() => {
                  const branches = stats?.tasksByBranch;

                  const hasValidData = branches &&
                    Array.isArray(branches) &&
                    branches.length > 0 &&
                    branches.some((b: any) => b && b.count > 0);

                  if (statsError) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Icon icon="lucide:building" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>{statsError}</p>
                      </div>
                    );
                  }

                  if (!hasValidData) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Icon icon="lucide:building" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Filiallar bo'yicha ma'lumotlar topilmadi</p>
                        {import.meta.env.DEV && (
                          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left max-w-md mx-auto">
                            <p className="font-semibold mb-1">Debug Info:</p>
                            <p>Type: {typeof branches}</p>
                            <p>Is Array: {Array.isArray(branches) ? 'Yes' : 'No'}</p>
                            <p>Length: {branches?.length ?? 'undefined'}</p>
                            <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
                              {JSON.stringify(branches, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const validBranches = branches.filter((b: any) => b && b.branchName && b.count > 0);
                  const labels = validBranches.map((b: any) => b.branchName);
                  const series = validBranches.map((b: any) => b.count);

                  if (labels.length === 0 || series.length === 0 || series.every((s: number) => s === 0)) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Icon icon="lucide:building" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Filiallar bo'yicha ma'lumotlar topilmadi</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative z-10 flex flex-col flex-1">
                      <div className="flex justify-center -mt-2">
                        <Chart
                          key={`branch-chart-${series.join('-')}-${labels.join('-')}`}
                          options={{
                            chart: {
                              type: 'donut',
                              height: 280,
                              toolbar: { show: false },
                              animations: { speed: 600 }
                            },
                            plotOptions: {
                              pie: {
                                donut: {
                                  size: '72%',
                                  labels: {
                                    show: true,
                                    name: { show: true, fontSize: '13px', fontWeight: 600, color: '#9ca3af', offsetY: -5 },
                                    value: { show: true, fontSize: '30px', fontWeight: 800, color: '#6366f1', offsetY: 5 },
                                    total: {
                                      show: true,
                                      showAlways: true,
                                      label: 'Jami task',
                                      color: '#9ca3af',
                                      formatter: function (w) {
                                        return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0).toLocaleString('uz-UZ') + ' ta';
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            labels: labels,
                            colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'],
                            legend: {
                              show: false, // Hidden standard legend, manual below
                            },
                            dataLabels: {
                              enabled: false, // Keeps chart clean
                            },
                            stroke: {
                              width: 0, // Seamless gradient-like cuts
                            },
                            tooltip: {
                              theme: 'dark',
                              y: {
                                formatter: function (value: number, opts: any) {
                                  const total = opts.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                                  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                  return `${value} ta (${percent}%)`;
                                }
                              },
                            },
                          }}
                          series={series}
                          type="donut"
                          height={280}
                        />
                      </div>
                      <div className="mt-auto pt-5 border-t border-gray-100/60 dark:border-white/10 flex flex-wrap justify-center gap-2.5">
                        {validBranches.map((branch: any, idx: number) => {
                          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'];
                          const color = colors[idx % colors.length];
                          return (
                            <div key={branch.branchId ?? branch.branchName} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }}></span>
                              <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">{branch.branchName}</span>
                              <span className="text-[12px] font-black text-gray-900 dark:text-white ml-0.5">{branch.count} <span className="text-gray-400 font-normal ml-0.5 text-[10px]">ta</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Worker completion ranking - CSGO THEMED */}
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-[20px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-700/50 relative overflow-hidden group flex flex-col h-full ring-1 ring-white/5" style={{ height: '515px' }}>
                {/* Premium Effect */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                <div className="flex flex-col gap-4 mb-4 relative z-10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <Icon icon="lucide:crosshair" className="w-6 h-6 text-blue-400 relative z-10 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                        Peshqadamlar
                        <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 tracking-widest mt-0.5">RANKED</span>
                      </h2>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">Xodimlar o'rtasidagi raqobat</p>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
                    <button
                      onClick={() => setRankingPeriod('weekly')}
                      className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${rankingPeriod === 'weekly'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Hafta
                    </button>
                    <button
                      onClick={() => setRankingPeriod('monthly')}
                      className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${rankingPeriod === 'monthly'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Oy
                    </button>
                    <button
                      onClick={() => setRankingPeriod('yearly')}
                      className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${rankingPeriod === 'yearly'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Yil
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12 relative z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
                  </div>
                ) : (() => {
                  const rankingData = stats?.workerCompletionRanking;
                  const rawRanking = rankingData?.[rankingPeriod] || [];
                  const ranking = rawRanking.filter((w: any) => w.completedStages > 0).slice(0, 7); // Top 7 peshqadamlar, faqat natijasi yozilganlar

                  if (!Array.isArray(ranking) || ranking.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
                        <Icon icon="lucide:award" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Reyting uchun ma'lumotlar topilmadi</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative z-10 flex flex-col flex-1 h-full mt-1 overflow-hidden">
                      <div className="space-y-2 w-full pr-1 pb-2 overflow-y-auto custom-scrollbar">
                        {ranking.map((w: any, index: number) => {
                          const yearlyData = stats?.workerCompletionRanking?.yearly || [];
                          const yearlyMatch = yearlyData.find((y: any) => y.userId === w.userId);
                          const totalAllTime = yearlyMatch ? yearlyMatch.completedStages : 0;

                          const rank = getCsgoRank(totalAllTime);
                          const progressPct = rank.target ? Math.min(100, Math.max(0, (totalAllTime / rank.target) * 100)) : 100;



                          return (
                            <div key={w.name} className="flex flex-col p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 transition-all border border-slate-700/60 relative group">
                              {/* Background Glow based on rank */}
                              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                                <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br ${rank.color} rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity`}></div>
                              </div>

                              <div className="flex items-center justify-between mb-2 relative z-20">
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center justify-center w-12 h-12 rounded-[10px] bg-gradient-to-br ${rank.color} shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-white/10 shrink-0`}>
                                    <img src={rank.image} alt={rank.title} className="w-10 h-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[14px] text-white leading-none pr-1">{w.name}</span>
                                      <span className="text-[9px] uppercase font-black tracking-widest text-white/90 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">{rank.short}</span>
                                      {(() => {
                                        const userMedals = allMedals.filter((m: any) => m.userId === w.userId);
                                        if (userMedals.length === 0) return null;
                                        const tierScore: Record<string, number> = { 'YEARLY': 4, 'QUARTERLY': 3, 'MONTHLY': 2, 'WEEKLY': 1 };
                                        const topMedal = userMedals.sort((a: any, b: any) => {
                                          const aScore = tierScore[MEDAL_DETAILS[a.medalType as keyof typeof MEDAL_DETAILS]?.tier || 'WEEKLY'] || 0;
                                          const bScore = tierScore[MEDAL_DETAILS[b.medalType as keyof typeof MEDAL_DETAILS]?.tier || 'WEEKLY'] || 0;
                                          return bScore - aScore;
                                        })[0];
                                        const details = MEDAL_DETAILS[topMedal.medalType as keyof typeof MEDAL_DETAILS];
                                        if (!details) return null;
                                        return (
                                          <div className="group/medal relative cursor-help flex items-center justify-center -ml-1 hover:z-[100]">
                                            <img src={details.image} alt={details.name} className="w-5 h-5 drop-shadow-md rounded-full" />
                                            <div className={`absolute ${index < 3 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 bg-gray-900/95 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/medal:opacity-100 group-hover/medal:visible transition-all z-[100] pointer-events-none whitespace-normal text-center border border-gray-700 shadow-xl`}>
                                              <div className={`font-bold ${details.color}`}>{details.name}</div>
                                              <div className="text-gray-400 mt-0.5">{TIER_LABELS[details.tier]}</div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1 flex items-center font-medium">
                                      <span className="uppercase tracking-wide text-[9px] mr-1 opacity-80">INVOYS K/D:</span>
                                      <span className="ml-1">
                                        <span className="text-emerald-400 font-bold">
                                          {w.errorCount === 0 && w.invoiceCount > 0 ? (
                                            <span className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)] uppercase tracking-wider font-black text-[10px] bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">MVP</span>
                                          ) : (
                                            w.errorCount ? Math.round(w.invoiceCount / w.errorCount) : w.invoiceCount
                                          )}
                                        </span>
                                        <span className="text-slate-400 ml-1">
                                          (<span className="text-blue-400">{w.invoiceCount || 0}</span> ish / <span className="text-red-500">{w.errorCount || 0}</span> ta xato)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end pl-2">
                                  <span className="font-black text-white text-[16px] leading-none">{w.completedStages} <span className="text-blue-400 font-bold text-[10px] ml-0.5">XP</span></span>
                                  {index === 0 && <span className="text-[9px] text-yellow-400 font-black uppercase tracking-wider absolute -top-0 -right-0 bg-slate-900/80 px-2 rounded-bl-xl border-b border-l border-yellow-500/30">First Blood</span>}
                                  {index === 1 && <span className="text-[9px] text-slate-300 font-black uppercase tracking-wider absolute -top-0 -right-0 bg-slate-900/80 px-2 rounded-bl-xl border-b border-l border-slate-500/30">Silver</span>}
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="relative z-10 w-full">
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-0.5">
                                  <span>Total XP: {totalAllTime}</span>
                                  <span>{rank.next ? `NEXT: ${rank.target}` : 'MAX LEVEL REACHED'}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-900 shadow-inner rounded-full overflow-hidden border border-slate-700/80">
                                  <div
                                    className={`h-full bg-gradient-to-r ${rank.color} transition-all duration-1000 ease-out relative`}
                                    style={{ width: `${progressPct}%` }}
                                  >
                                    <div className="absolute inset-0 bg-white/20 w-1/2 blur-sm rotate-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Yearly Goal Gauge Chart */}
            <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col justify-between" style={{ height: '565px' }}>
              {/* Premium Glow Effect */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                  <Icon icon="lucide:target" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Yillik maqsad</h2>
                  <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Joriy 2026 yil</p>
                </div>
              </div>

              {loadingCompletedSummary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              ) : (() => {
                const TARGET_TASKS = stats?.yearlyGoalTarget ?? 2000;
                const completed = completedSummary?.year?.count ?? 0;
                const percentage = Math.min((completed / TARGET_TASKS) * 100, 100);
                const remaining = Math.max(TARGET_TASKS - completed, 0);

                const gaugeOptions: any = {
                  chart: {
                    type: 'radialBar',
                    height: 280,
                  },
                  series: [percentage],
                  plotOptions: {
                    radialBar: {
                      startAngle: -90,
                      endAngle: 90,
                      track: {
                        background: 'rgba(150, 150, 150, 0.15)',
                        strokeWidth: '97%',
                        margin: 5,
                      },
                      dataLabels: {
                        name: {
                          show: true,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#9ca3af',
                          offsetY: -25,
                        },
                        value: {
                          show: true,
                          fontSize: '30px',
                          fontWeight: 800,
                          color: '#6366f1',
                          offsetY: -5,
                          formatter: function (val: number) {
                            return Math.round((val / 100) * TARGET_TASKS).toString();
                          },
                        },
                      },
                    },
                  },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shade: 'light',
                      type: 'horizontal',
                      shadeIntensity: 0.5,
                      gradientToColors: ['#3b82f6', '#8b5cf6'],
                      inverseColors: true,
                      opacityFrom: 1,
                      opacityTo: 1,
                      stops: [0, 100],
                    },
                  },
                  stroke: {
                    lineCap: 'round',
                  },
                  labels: ['Yakunlangan'],
                };

                return (
                  <div className="relative z-10">
                    <div className="flex justify-center mb-0" style={{ lineHeight: '28px' }}>
                      <Chart
                        options={gaugeOptions}
                        series={gaugeOptions.series}
                        type="radialBar"
                        height={280}
                      />
                    </div>
                    <div className="mt-6 space-y-4 pt-6 border-t border-gray-100/60 dark:border-white/10">
                      <div className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span> Maqsad:
                        </span>
                        <span className="text-base font-black text-gray-900 dark:text-white">{TARGET_TASKS.toLocaleString('uz-UZ')} ta</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Yakunlangan:
                        </span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{completed.toLocaleString('uz-UZ')} ta</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span> Qolgan:
                        </span>
                        <span className="text-base font-black text-orange-600 dark:text-orange-400">{remaining.toLocaleString('uz-UZ')} ta</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100/60 dark:border-white/10">
                        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden flex items-center">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-700 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-center mt-2.5">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                            <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 text-emerald-500" />
                            {percentage.toFixed(1)}% bajarildi
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Process Times Widget */}
            <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col h-full" style={{ height: '515px' }}>
              {/* Premium Glow Effect */}
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              <div className="flex flex-col gap-4 mb-6 relative z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30">
                    <Icon icon="lucide:clock" className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Jarayonga sarflangan vaqt</h2>
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-0.5">O'rtacha ko'rsatkichlar</p>
                  </div>
                </div>
              </div>

              {!premiumStats ? (
                <div className="flex items-center justify-center py-12 relative z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400"></div>
                </div>
              ) : (() => {
                const processTimes = premiumStats?.processTimes || [];
                const averageTaskTotalMinutes = premiumStats?.averageTaskTotalMinutes || 0;

                if (!Array.isArray(processTimes) || processTimes.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
                      <Icon icon="lucide:clock" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Vaqt ko'rsatkichlari yo'q</p>
                    </div>
                  );
                }

                // eng kop vaqt sarflanganiga qarab progressni hisoblash
                const maxTime = Math.max(...processTimes.map((p: any) => p.averageMinutes), 1);

                return (
                  <div className="relative z-10 flex flex-col flex-1 h-full overflow-hidden">
                    {/* Umumiy O'rtacha Vaqt */}
                    {averageTaskTotalMinutes > 0 && (
                      <div className="mb-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 border border-teal-100 dark:border-teal-800/50 text-center shrink-0">
                        <p className="text-[11px] uppercase tracking-widest text-teal-600 dark:text-teal-400 font-bold mb-1">Umumiy bitta ish uchun qirqimda</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                          {Math.floor(averageTaskTotalMinutes / 60)} soat {averageTaskTotalMinutes % 60} daqiqa
                        </h3>
                      </div>
                    )}
                    
                    <div className="space-y-3 w-full overflow-y-auto pr-1 pb-2 custom-scrollbar">
                      {processTimes.map((p: any) => {
                        const widthPercent = Math.min((p.averageMinutes / maxTime) * 100, 100);
                        const hours = Math.floor(p.averageMinutes / 60);
                        const mins = p.averageMinutes % 60;
                        const timeString = hours > 0 ? `${hours}s ${mins}daq` : `${mins} daqiqa`;
                        
                        return (
                          <div key={p.name} className="flex flex-col gap-1.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-700/40 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors border border-gray-100 dark:border-gray-700/60">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[13px] text-gray-800 dark:text-gray-200">
                                {p.name}
                              </span>
                              <span className="font-black text-teal-600 dark:text-teal-400 text-[12px] bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/50">
                                {timeString}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600/50 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${widthPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Premium Additions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* Top Clients Chart */}
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col h-full" style={{ height: '515px' }}>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="flex flex-col gap-4 mb-6 relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
                  <Icon icon="lucide:crown" className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Top Mijozlar</h2>
                  <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-0.5">Vazifalar soni bo'yicha</p>
                </div>
              </div>
            </div>

            {!premiumStats ? (
              <div className="flex items-center justify-center py-12 relative z-10 h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              </div>
            ) : (() => {
              const allClients = premiumStats.topClients || [];
              const clients = allClients.filter((c: any) => (c.count || 0) > 0);
              if (clients.length === 0) return <div className="text-center py-12 text-gray-400">Ma'lumot yo'q</div>;

              const isDark = document.documentElement.classList.contains('dark');
              return (
                <div className="relative z-10 flex-1 w-full mt-2 flex flex-col">
                  <Chart
                    options={{
                      chart: { type: 'pie', toolbar: { show: false } },
                      labels: clients.map((c: any) => c.name),
                      colors: ['#eab308', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#9ca3af'],
                      dataLabels: {
                        enabled: true,
                        formatter: (val: any, opts: any) => {
                          const count = opts.w.config.series[opts.seriesIndex];
                          return `${count} ta`;
                        },
                        style: { fontSize: '11px', fontWeight: 800, colors: ['#fff'] },
                        dropShadow: { enabled: true, top: 1, left: 1, blur: 2, color: '#000', opacity: 0.5 }
                      },
                      stroke: { width: 2, colors: [isDark ? '#1f2937' : '#ffffff'] },
                      legend: {
                        position: 'bottom',
                        horizontalAlign: 'center',
                        labels: { colors: isDark ? '#9ca3af' : '#4b5563' },
                        fontSize: '12px',
                        fontWeight: 600,
                        markers: { strokeWidth: 0 }
                      },
                      plotOptions: {
                        pie: {
                          expandOnClick: true,
                        }
                      },
                      tooltip: {
                        theme: 'dark',
                        y: {
                          formatter: (val: any) => {
                            const total = clients.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
                            const percent = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return `${val} ta vazifa (${percent}%)`;
                          }
                        }
                      }
                    }}
                    series={clients.map((c: any) => c.count)}
                    type="pie"
                    height={350}
                  />
                </div>
              );
            })()}
          </div>

          {/* Active Tasks Distribution */}
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col h-full" style={{ height: '515px' }}>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-fuchsia-50 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/30">
                <Icon icon="lucide:activity" className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Kim qaysi ishni ko'proq bajaryapti</h2>
                <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Xizmatlar kesimida</p>
              </div>
            </div>

            {!premiumStats ? (
              <div className="flex items-center justify-center py-12 h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div></div>
            ) : (() => {
              const activeTasks = premiumStats.activeTasks || [];
              if (activeTasks.length === 0) return <div className="text-center py-12 text-gray-400">Jarayonda vazifalar yo'q</div>;

              const isDark = document.documentElement.classList.contains('dark');

              // Extract all unique stage names across top 3 of every worker
              const allUniqueStages = Array.from(new Set(activeTasks.flatMap((w: any) => w.stages?.map((s: any) => s.name) || [])));

              const series = allUniqueStages.map(stageName => ({
                name: stageName as string,
                data: activeTasks.map((w: any) => {
                  const stageObj = w.stages?.find((s: any) => s.name === stageName);
                  return stageObj ? stageObj.count : 0;
                })
              }));

              const categories = activeTasks.map((w: any) => w.name);

              return (
                <div className="relative z-10 flex flex-col flex-1 mt-2">
                  <Chart
                    options={{
                      chart: { type: 'bar', stacked: true, toolbar: { show: false } },
                      plotOptions: {
                        bar: {
                          horizontal: true,
                          borderRadius: 2,
                          dataLabels: { total: { enabled: true, style: { fontSize: '11px', fontWeight: 800, color: isDark ? '#fff' : '#000' } } }
                        }
                      },
                      colors: [
                        '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6',
                        '#06b6d4', '#f43f5e', '#84cc16', '#d946ef', '#14b8a6'
                      ], // Extended colors just in case
                      dataLabels: {
                        enabled: true,
                        style: { fontSize: '10px', colors: ['#fff'] },
                        formatter: function (val: number) {
                          return val > 0 ? val : '';
                        }
                      },
                      stroke: { width: 1, colors: [isDark ? '#1f2937' : '#fff'] },
                      xaxis: {
                        categories: categories,
                        labels: { style: { colors: isDark ? '#9ca3af' : '#4b5563', fontSize: '11px' } },
                        axisBorder: { show: false },
                        axisTicks: { show: false }
                      },
                      yaxis: {
                        labels: {
                          maxWidth: 100,
                          style: {
                            fontSize: '11px',
                            fontWeight: 600,
                            colors: isDark ? '#9ca3af' : '#4b5563'
                          }
                        }
                      },
                      grid: {
                        borderColor: isDark ? '#374151' : '#f3f4f6',
                        strokeDashArray: 4,
                        xaxis: { lines: { show: true } },
                        yaxis: { lines: { show: false } }
                      },
                      legend: {
                        position: 'bottom',
                        labels: { colors: isDark ? '#d1d5db' : '#374151' },
                        markers: {}
                      },
                      tooltip: {
                        theme: 'dark'
                      }
                    }}
                    series={series}
                    type="bar"
                    height={350}
                  />
                </div>
              );
            })()}
          </div>
        </div>

        {/* Ranks Modal Overlay */}
        {showRanksModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowRanksModal(false)}></div>

            <div className="relative z-10 w-full max-w-6xl h-[90vh] sm:h-[85vh] bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl flex flex-col border border-white/10"
              style={{
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98)), url('https://storage.googleapis.com/pod_public/1300/3142.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>

              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400">
                    <Icon icon="lucide:swords" className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">CS:GO Unvonlar Jadvali</h3>
                    <p className="text-xs text-slate-400 font-medium">Barcha darajalar va ularga yetish narxi (XP - Shaxsan Bajarilgan Jarayonlar soni)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRanksModal(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Icon icon="lucide:x" className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 gap-12">
                  {RANK_GROUPS.map((group, groupIdx) => (
                    <div key={groupIdx} className="relative">
                      {groupIdx !== 0 && (
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-6"></div>
                      )}

                      <div className="mb-6 flex flex-col items-center sm:items-start text-center sm:text-left">
                        <h4 className={`text-2xl font-black uppercase tracking-widest \${group.color.split(' ')[0]} drop-shadow-md`}>{group.name}</h4>
                        <p className="text-sm font-medium text-slate-400">{group.description}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {group.ranks.map((rank) => (
                          <div key={rank.id} className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border \${group.color.split(' ')[1]}/30 hover:bg-black/60 hover:-translate-y-2 transition-all duration-300 w-full group`}>
                            <img src={rank.image} alt={rank.title} className="w-20 sm:w-24 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all mb-4" />
                            <div className="flex flex-col items-center w-full mt-auto">
                              <span className="text-[11px] font-bold text-white text-center leading-tight min-h-[30px] flex items-center">{rank.title}</span>
                              <div className="w-full h-px bg-white/10 my-2"></div>
                              <span className="text-[12px] font-black tracking-widest text-emerald-400">XP {rank.xp.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <UnratedErrorsModal
          show={showUnratedModal}
          onClose={() => setShowUnratedModal(false)}
          errors={unratedErrors}
          onRateSuccess={() => { loadUnratedErrors(); setShowUnratedModal(false); }}
        />

        {showNominationsModal && (
          <MedalsNominationPanel 
            initialTab={showNominationsModal as any}
            onClose={() => {
              setShowNominationsModal(false);
              loadMedals();
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
