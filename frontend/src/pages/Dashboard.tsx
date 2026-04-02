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
    weekly: Array<{ userId: number; name: string; completedStages: number }>;
    monthly: Array<{ userId: number; name: string; completedStages: number }>;
    yearly: Array<{ userId: number; name: string; completedStages: number }>;
  };
  workerErrorRanking?: {
    weekly: Array<{ userId: number; name: string; errorsCount: number }>;
    monthly: Array<{ userId: number; name: string; errorsCount: number }>;
    yearly: Array<{ userId: number; name: string; errorsCount: number }>;
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

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [errorRankingPeriod, setErrorRankingPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<CompletedSummary | null>(null);
  const [loadingCompletedSummary, setLoadingCompletedSummary] = useState(true);

  useEffect(() => {
    loadStats();
    loadChartData();
    loadRecentTasks();
    loadExchangeRate();
  }, [period]);

  useEffect(() => {
    loadCompletedSummary();
  }, []);

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
      const response = await apiClient.get('/dashboard/stats');
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

      setStats(statsData);
    } catch (error: any) {
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
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  });

  const sparklineOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
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

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-gray-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/40 via-purple-50/20 to-white pb-12 pt-4 px-2 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        {/* Page Header (Hero style) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 p-6">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Assalomu alaykum, {user?.name || 'Foydalanuvchi'}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Bugun {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {exchangeRate && (
            <div className="mt-4 md:mt-0 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Icon icon="lucide:dollar-sign" className="text-emerald-600 w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Valyuta kursi</p>
                <p className="text-sm font-bold text-emerald-700">{formatUzs(exchangeRate)} UZS</p>
              </div>
            </div>
          )}
        </div>

        {/* Completed Tasks Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[
            { key: 'today', title: 'Bugun', suffix: 'kechagidan', icon: 'lucide:calendar', accent: 'text-emerald-600', spark: '#34d399', showChart: false },
            { key: 'week', title: 'Haftalik', suffix: 'o‘tgan haftadan', icon: 'lucide:calendar-range', accent: 'text-blue-600', spark: '#60a5fa', showChart: true },
            { key: 'month', title: 'Oylik', suffix: 'o‘tgan oydan', icon: 'lucide:calendar-days', accent: 'text-purple-600', spark: '#a78bfa', showChart: true },
            { key: 'year', title: 'Yillik', suffix: 'o‘tgan yildan', icon: 'lucide:calendar', accent: 'text-orange-600', spark: '#fb923c', showChart: true },
          ].map((item) => {
            const data = completedSummary?.[item.key as keyof CompletedSummary];
            const delta = data?.deltaPercent ?? null;
            const deltaLabel = loadingCompletedSummary
              ? 'Yuklanmoqda...'
              : delta === null || delta === undefined
                ? 'Taqqoslash uchun ma\'lumot yo\'q'
                : `${item.suffix} ${formatDeltaLabel(delta, '')} ${delta >= 0 ? 'yuqori' : 'past'}`.trim();
            const deltaTone = delta === null ? 'text-gray-400' : delta >= 0 ? 'text-emerald-600' : 'text-red-600';
            const sparkLabels = data?.series?.labels ?? [];
            const sparkData = data?.series?.data ?? [];

            return (
              <div
                key={item.key}
                className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Decorative blob */}
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700 bg-[${item.spark}]`} style={{ backgroundColor: item.spark }}></div>

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white" style={{ background: `linear-gradient(135deg, #ffffff, ${item.spark}20)` }}>
                      <Icon icon={item.icon} className={item.accent} />
                    </div>
                    <div className="text-sm font-medium text-gray-500 tracking-wide uppercase">{item.title}</div>
                  </div>
                  <div className={`text-4xl font-extrabold tracking-tight ${item.accent}`}>
                    {loadingCompletedSummary ? '-' : data?.count ?? 0}
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100/50 pt-4 flex items-center justify-between gap-4 relative z-10">
                  {item.showChart && Array.isArray(sparkData) && sparkData.length > 0 ? (
                    <div className="h-10 w-28 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Line
                        data={buildSparklineData(sparkLabels, sparkData, item.spark)}
                        options={sparklineOptions}
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-28 flex items-center text-gray-400 opacity-50">
                      <span className="text-xs font-medium">Barchasi ko'rildi</span>
                    </div>
                  )}
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${delta === null ? 'bg-gray-100 text-gray-500' : delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {deltaLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart and Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Done Graph */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50" style={{ height: '503px' }}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Oylik monitoring</h2>
                  <p className="text-xs text-gray-500 font-medium">Bajarilgan vazifalar dinamikasi</p>
                </div>
                <div className="flex gap-2 bg-gray-100/80 p-1 rounded-xl">
                  <button
                    onClick={() => setPeriod('weekly')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${period === 'weekly'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Haftalik
                  </button>
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${period === 'monthly'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Oylik
                  </button>
                  <button
                    onClick={() => setPeriod('yearly')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${period === 'yearly'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Yillik
                  </button>
                </div>
              </div>

              {/* Charts.js Line Chart */}
              {chartDataWithLabels.labels.length > 0 ? (
                <div className="h-[400px]">
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
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-indigo-50 to-indigo-100">
                    <Icon icon="lucide:building" className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Filiallar ulushi</h2>
                    <p className="text-xs text-gray-500 font-medium">Bajarilgan ishlarning hududlarga foizi</p>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                        {/* Debug info - faqat development'da ko'rinadi */}
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
                        {import.meta.env.DEV && (
                          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left max-w-md mx-auto">
                            <p className="font-semibold mb-1">Debug Info:</p>
                            <p>Valid branches: {validBranches.length}</p>
                            <p>Labels: {JSON.stringify(labels)}</p>
                            <p>Series: {JSON.stringify(series)}</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div>
                      <Chart
                        key={`branch-chart-${series.join('-')}-${labels.join('-')}`}
                        options={{
                          chart: {
                            type: 'pie',
                            height: 350,
                            toolbar: { show: false },
                          },
                          labels: labels,
                          colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'],
                          legend: {
                            position: 'bottom',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                          },
                          dataLabels: {
                            enabled: true,
                            formatter: (val: number) => `${val.toFixed(1)}%`,
                            style: {
                              fontSize: '12px',
                              fontWeight: 600,
                            },
                          },
                          tooltip: {
                            y: {
                              formatter: (value: number) => `${value} ta task`,
                            },
                          },
                        }}
                        series={series}
                        type="pie"
                        height={350}
                      />
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        {validBranches.map((branch: any) => (
                          <div key={branch.branchId ?? branch.branchName} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{branch.branchName}:</span>
                            <span className="font-semibold text-gray-900">{branch.count} ta</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Worker completion ranking */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-emerald-50 to-teal-100">
                      <Icon icon="lucide:trophy" className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-tight">Peshqadamlar</h2>
                      <p className="text-xs text-gray-500 font-medium">Eng ko'p ish bajargan xodimlar</p>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
                    <button
                      onClick={() => setRankingPeriod('weekly')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${rankingPeriod === 'weekly'
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      Haftalik
                    </button>
                    <button
                      onClick={() => setRankingPeriod('monthly')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${rankingPeriod === 'monthly'
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      Oylik
                    </button>
                    <button
                      onClick={() => setRankingPeriod('yearly')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${rankingPeriod === 'yearly'
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      Yillik
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (() => {
                  const rankingData = stats?.workerCompletionRanking;
                  const ranking = rankingData?.[rankingPeriod] || [];
                  if (!Array.isArray(ranking) || ranking.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <Icon icon="lucide:users" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Reyting uchun ma'lumotlar topilmadi</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {ranking.map((worker, index) => (
                        <div key={worker.userId} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-gray-100">
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold shadow-sm ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white ring-2 ring-yellow-100' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white ring-2 ring-gray-100' :
                                index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white ring-2 ring-orange-100' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {index + 1}
                            </span>
                            <span className="font-semibold text-gray-800">{worker.name}</span>
                          </div>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs">{worker.completedStages} ta</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Yearly Goal Gauge Chart */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-blue-50 to-indigo-100">
                  <Icon icon="lucide:target" className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Yillik maqsad</h2>
                  <p className="text-xs text-gray-500 font-medium">Joriy 2026 yil uchun progress</p>
                </div>
              </div>
              {loadingCompletedSummary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                        background: '#e5e7eb',
                        strokeWidth: '97%',
                        margin: 5,
                      },
                      dataLabels: {
                        name: {
                          show: true,
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          offsetY: -10,
                        },
                        value: {
                          show: true,
                          fontSize: '32px',
                          fontWeight: 700,
                          color: '#1f2937',
                          offsetY: 10,
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
                  labels: ['Yakunlangan tasklar'],
                };

                return (
                  <div>
                    <div className="flex justify-center mb-0" style={{ lineHeight: '28px' }}>
                      <Chart
                        options={gaugeOptions}
                        series={gaugeOptions.series}
                        type="radialBar"
                        height={280}
                      />
                    </div>
                    <div className="mt-6 space-y-3 pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Maqsad:</span>
                        <span className="text-lg font-bold text-gray-900">{TARGET_TASKS.toLocaleString('uz-UZ')} task</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Yakunlangan:</span>
                        <span className="text-lg font-bold text-blue-600">{completed.toLocaleString('uz-UZ')} task</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Qolgan:</span>
                        <span className="text-lg font-bold text-orange-600">{remaining.toLocaleString('uz-UZ')} task</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-center mt-2">
                          <span className="text-xs font-medium text-gray-600">
                            {percentage.toFixed(1)}% bajarildi
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Worker error ranking */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-red-50 to-orange-100">
                    <Icon icon="lucide:alert-circle" className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Eng ko'p xato qilganlar</h2>
                    <p className="text-xs text-gray-500 font-medium">Ishchilar bo'yicha xatolar soni</p>
                  </div>
                </div>
                <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
                  <button
                    onClick={() => setErrorRankingPeriod('weekly')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${errorRankingPeriod === 'weekly'
                      ? 'bg-white text-red-700 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Haftalik
                  </button>
                  <button
                    onClick={() => setErrorRankingPeriod('monthly')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${errorRankingPeriod === 'monthly'
                      ? 'bg-white text-red-700 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Oylik
                  </button>
                  <button
                    onClick={() => setErrorRankingPeriod('yearly')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${errorRankingPeriod === 'yearly'
                      ? 'bg-white text-red-700 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Yillik
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (() => {
                const errorRankingData = stats?.workerErrorRanking;
                const errorRanking = errorRankingData?.[errorRankingPeriod] || [];
                if (!Array.isArray(errorRanking) || errorRanking.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <Icon icon="lucide:users" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Reyting uchun ma'lumotlar topilmadi</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {errorRanking.map((worker, index) => (
                      <div key={worker.userId} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-gray-100">
                        <div className="flex items-center gap-4">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold shadow-sm ${index === 0 ? 'bg-gradient-to-br from-red-400 to-red-600 text-white ring-2 ring-red-100' :
                            index === 1 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white ring-2 ring-orange-100' :
                              index === 2 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white ring-2 ring-amber-100' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {index + 1}
                          </span>
                          <span className="font-semibold text-gray-800">{worker.name}</span>
                        </div>
                        <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs">{worker.errorsCount} ta</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Financial Stats Chart */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50 mb-6 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-emerald-50 to-teal-100">
              <Icon icon="lucide:bar-chart-2" className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Umumiy Sof Foyda Dinamikasi</h2>
              <p className="text-xs text-gray-500 font-medium">Davrlar kesimida daromad ko'rsatkichlari (USD va UZS)</p>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
          ) : (() => {
            const netProfitSeries = [
              {
                name: 'Daromad (USD)',
                data: [
                  stats?.todayNetProfit?.usd || 0,
                  stats?.weeklyNetProfit?.usd || 0,
                  stats?.monthlyNetProfit?.usd || 0,
                  stats?.yearlyNetProfit?.usd || 0
                ]
              },
              {
                name: 'Daromad (UZS)',
                data: [
                  stats?.todayNetProfit?.uzs || 0,
                  stats?.weeklyNetProfit?.uzs || 0,
                  stats?.monthlyNetProfit?.uzs || 0,
                  stats?.yearlyNetProfit?.uzs || 0
                ]
              }
            ];

            const netProfitOptions: any = {
              chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
              plotOptions: { bar: { horizontal: false, columnWidth: '45%', borderRadius: 6 } },
              dataLabels: { enabled: false },
              stroke: { show: true, width: 4, colors: ['transparent'] },
              xaxis: { categories: ['Bugun', 'Haftalik', 'Oylik', 'Yillik'], labels: { style: { fontWeight: 600, colors: '#6b7280' } } },
              yaxis: {
                labels: { formatter: (val: number) => formatUzs(val) }
              },
              fill: { opacity: 1 },
              colors: ['#10b981', '#3b82f6'],
              tooltip: {
                y: { formatter: (val: number, { seriesIndex }: any) => formatUzs(val) + (seriesIndex === 0 ? ' $' : ' UZS') }
              },
              legend: { position: 'top', horizontalAlign: 'right' },
              grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
            };

            return (
              <div style={{ minHeight: '350px' }}>
                <Chart options={netProfitOptions} series={netProfitSeries} type="bar" height={350} />
              </div>
            );
          })()}
        </div>

        {/* Qarzlarning Umumiy Holati (Donut) & Ro'yxatlar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50 lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-orange-50 to-amber-100">
                <Icon icon="lucide:pie-chart" className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Umumiy Qarzdorlik</h2>
                <p className="text-xs text-gray-500 font-medium">Barcha qarzlar balansi</p>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>
            ) : (() => {
              const paymentReminders = stats?.paymentReminders || [];
              const totalDebtUSD = paymentReminders.filter((p: any) => p.currency === 'USD').reduce((sum: number, p: any) => sum + (p.currentDebt || 0), 0);
              const totalDebtUZS = paymentReminders.filter((p: any) => p.currency === 'UZS').reduce((sum: number, p: any) => sum + (p.currentDebt || 0), 0);
              const totalDebtorsUzs = totalDebtUZS + (totalDebtUSD * (exchangeRate || 12800));

              const certifierDebtUzs = stats?.certifierDebt?.remaining?.total || 0;
              const workerDebtUsd = (stats?.workerDebts || []).reduce((sum: number, w: any) => sum + w.pendingUsd, 0);
              const totalLiabilitiesUzs = certifierDebtUzs + (workerDebtUsd * (exchangeRate || 12800));

              const debtSeries = [totalDebtorsUzs, totalLiabilitiesUzs];
              const debtOptions: any = {
                chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
                labels: ['Mijozlar qarzi (Aktivlar)', 'Bizning qarzimiz (Passivlar)'],
                colors: ['#f59e0b', '#ef4444'],
                plotOptions: {
                  pie: { donut: { size: '75%', labels: { show: true, name: { show: true }, value: { show: true, formatter: (val: number) => formatUzs(val) + ' UZS' }, total: { show: true, label: 'Jami Qarzlar', formatter: function (w: any) { return formatUzs(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) + ' UZS' } } } } }
                },
                dataLabels: { enabled: false },
                legend: { position: 'bottom' },
                tooltip: { y: { formatter: (val: number) => formatUzs(val) + ' UZS' } }
              };

              return (
                <div className="flex flex-col items-center justify-center" style={{ minHeight: '320px' }}>
                  {totalDebtorsUzs === 0 && totalLiabilitiesUzs === 0 ? (
                    <div className="flex flex-col items-center text-gray-400 mt-10">
                      <Icon icon="lucide:check-circle" className="w-12 h-12 mb-2 opacity-50" />
                      <p>Qarzlar mavjud emas</p>
                    </div>
                  ) : (
                    <Chart options={debtOptions} series={debtSeries} type="donut" height={320} width="100%" />
                  )}
                </div>
              );
            })()}
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/50 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white bg-gradient-to-br from-indigo-50 to-blue-100">
                <Icon icon="lucide:list" className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Qarzlar Tafsiloti</h2>
                <p className="text-xs text-gray-500 font-medium">Barcha qarzdorlar va ishchilardan qarzlar</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mijozlar qarzi */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200/60 pb-2">Mijozlar qarzi</h3>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {!(stats?.paymentReminders?.length) ? (
                      <p className="text-xs text-gray-400">Qarzdorlar mavjud emas</p>
                    ) : (
                      stats.paymentReminders.map((reminder: any) => (
                        <div key={reminder.clientId} className="flex justify-between items-center p-2 hover:bg-white/50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                          <span className="text-sm font-medium text-gray-800">{reminder.clientName}</span>
                          <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                            <CurrencyDisplay amount={reminder.currentDebt || 0} originalCurrency={reminder.currency || 'USD'} />
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ishchilar/Sert ro'yxati */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200/60 pb-2">Sertifikat va Ishchilar</h3>
                  <div className="space-y-6 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sertifikatchilar qoldig'i</div>
                      {stats?.certifierDebt && stats.certifierDebt.remaining.total > 0 ? (
                        <div className="flex justify-between items-center p-3 rounded-xl bg-red-50/70 border border-red-100/50">
                          <span className="text-sm font-semibold text-gray-800">Oltiariq ({stats.certifierDebt.taskCount} ta)</span>
                          <span className="text-sm font-bold text-red-600">{formatUzs(stats.certifierDebt.remaining.total)} UZS</span>
                        </div>
                      ) : <p className="text-xs text-gray-400">Ma'lumot yo'q</p>}
                    </div>
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ishchilar qarzi</div>
                      {!(stats?.workerDebts?.length) ? (
                        <p className="text-xs text-gray-400">Ishchilardan qarz yo'q</p>
                      ) : (
                        <div className="space-y-1">
                          {stats.workerDebts.map((worker: any) => (
                            <div key={worker.userId} className="flex justify-between items-center p-2 hover:bg-white/50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                              <span className="text-sm font-medium text-gray-800">{worker.name}</span>
                              <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{worker.pendingUsd.toFixed(2)} $</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
