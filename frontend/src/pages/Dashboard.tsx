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
      
      console.log('[Dashboard] Fetching exchange rate for today:', todayStr, 'Current time:', now.toISOString(), 'UTC date:', todayUTC.toISOString());
      
      // First, try to fetch from CBU API directly for today (this will get the latest rate)
      try {
        console.log('[Dashboard] Fetching latest rate from CBU API...');
        const fetchResponse = await apiClient.post('/finance/exchange-rates/fetch');
        if (fetchResponse.data?.rate) {
          const rate = parseFloat(fetchResponse.data.rate);
          console.log('[Dashboard] Fetched latest rate from CBU:', rate);
          setExchangeRate(rate);
          return;
        }
      } catch (fetchError: any) {
        console.log('[Dashboard] Could not fetch from CBU API:', fetchError?.response?.data || fetchError?.message);
      }
      
      // If CBU fetch failed, try to get from database with today's date
      console.log('[Dashboard] Trying to get rate from database for date:', todayStr);
      const response = await apiClient.get(`/finance/exchange-rates/for-date?date=${todayStr}`).catch((error) => {
        // Handle 404 and other errors
        if (error.response?.status === 404) {
          // 404 means no rate found, but might have fallback in response
          return error.response;
        }
        throw error;
      });
      
      console.log('[Dashboard] Exchange rate response:', response?.data);
      
      if (response?.data?.rate !== undefined && response?.data?.rate !== null) {
        const rate = parseFloat(response.data.rate);
        
        // If it's a fallback (yesterday's rate), try to fetch today's rate from CBU again
        if (response.data.fallback) {
          console.log('[Dashboard] Rate is fallback, trying to fetch today\'s rate from CBU again...');
          // Try to fetch from CBU API endpoint
          try {
            const fetchResponse = await apiClient.post('/finance/exchange-rates/fetch');
            if (fetchResponse.data?.rate) {
              const newRate = parseFloat(fetchResponse.data.rate);
              console.log('[Dashboard] Fetched today\'s rate from CBU:', newRate);
              setExchangeRate(newRate);
              return;
            }
          } catch (fetchError) {
            console.log('[Dashboard] Could not fetch from CBU API, using fallback rate');
          }
        }
        
        setExchangeRate(rate);
        console.log('[Dashboard] Exchange rate loaded:', rate, 'fallback:', response.data.fallback, 'date:', response.data.date);
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
      console.log('[Dashboard] Stats response:', response.data);
      console.log('[Dashboard] tasksByBranch:', response.data?.tasksByBranch);
      console.log('[Dashboard] tasksByBranch type:', typeof response.data?.tasksByBranch);
      console.log('[Dashboard] tasksByBranch isArray:', Array.isArray(response.data?.tasksByBranch));
      console.log('[Dashboard] tasksByBranch length:', response.data?.tasksByBranch?.length);

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
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-0 py-0">
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
              <div key={item.key} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                      <Icon icon={item.icon} className="text-gray-600" />
                    </div>
                    <div className="text-sm text-gray-600">{item.title}</div>
                  </div>
                  <div className={`text-3xl font-bold ${item.accent}`}>
                    {loadingCompletedSummary ? '-' : data?.count ?? 0}
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4 flex items-center justify-between gap-4">
                  {item.showChart && Array.isArray(sparkData) && sparkData.length > 0 ? (
                    <div className="h-8 w-24">
                      <Line
                        data={buildSparklineData(sparkLabels, sparkData, item.spark)}
                        options={sparklineOptions}
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-24 flex items-center justify-center text-gray-300">
                      <span className="text-xs">Ma'lumot yo‘q</span>
                    </div>
                  )}
                  <div className={`text-xs font-medium ${deltaTone}`}>{deltaLabel}</div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" style={{ height: '503px' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Task Done</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPeriod('weekly')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      period === 'weekly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Haftalik
                  </button>
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      period === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Oylik
                  </button>
                  <button
                    onClick={() => setPeriod('yearly')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      period === 'yearly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Icon icon="lucide:building" className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Filiallar bo'yicha tasklar</h2>
                    <p className="text-xs text-gray-500">Qaysi filialda qancha ish bo'lgani</p>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (() => {
                  const branches = stats?.tasksByBranch;
                  
                  // Debug information - faqat development uchun
                  console.log('[Dashboard Debug] tasksByBranch raw:', branches);
                  console.log('[Dashboard Debug] tasksByBranch type:', typeof branches);
                  console.log('[Dashboard Debug] tasksByBranch isArray:', Array.isArray(branches));
                  console.log('[Dashboard Debug] tasksByBranch length:', branches?.length);
                  console.log('[Dashboard Debug] Full stats object:', stats);
                  console.log('[Dashboard Debug] statsError:', statsError);
                  
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Icon icon="lucide:trophy" className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Eng ko'p ish bajarganlar</h2>
                      <p className="text-xs text-gray-500">Ishchilar bo'yicha yakunlangan jarayonlar</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRankingPeriod('weekly')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        rankingPeriod === 'weekly'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Haftalik
                    </button>
                    <button
                      onClick={() => setRankingPeriod('monthly')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        rankingPeriod === 'monthly'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Oylik
                    </button>
                    <button
                      onClick={() => setRankingPeriod('yearly')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        rankingPeriod === 'yearly'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                        <div key={worker.userId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-50 text-emerald-700'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{worker.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{worker.completedStages} ta</span>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon icon="lucide:target" className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Yillik maqsad</h2>
                  <p className="text-xs text-gray-500">2026 yil uchun</p>
                </div>
              </div>
              {loadingCompletedSummary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (() => {
                const TARGET_TASKS = 2000;
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Icon icon="lucide:alert-circle" className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Eng ko'p xato qilganlar</h2>
                    <p className="text-xs text-gray-500">Ishchilar bo'yicha xatolar soni</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setErrorRankingPeriod('weekly')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      errorRankingPeriod === 'weekly'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Haftalik
                  </button>
                  <button
                    onClick={() => setErrorRankingPeriod('monthly')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      errorRankingPeriod === 'monthly'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Oylik
                  </button>
                  <button
                    onClick={() => setErrorRankingPeriod('yearly')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      errorRankingPeriod === 'yearly'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      <div key={worker.userId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold ${
                            index === 0 ? 'bg-red-100 text-red-700' :
                            index === 1 ? 'bg-orange-100 text-orange-700' :
                            index === 2 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{worker.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{worker.errorsCount} ta</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 mt-6">
          {/* Bugun sof foyda - birinchi card */}
          {(() => {
            const todayNetProfit = stats?.todayNetProfit;
            const hasUsd = todayNetProfit?.usd !== undefined && todayNetProfit.usd !== 0;
            const hasUzs = todayNetProfit?.uzs !== undefined && todayNetProfit.uzs !== 0;
            const totalProfit = (todayNetProfit?.usd || 0) + (todayNetProfit?.uzs || 0);
            const isPositive = totalProfit >= 0;
            const accentColor = isPositive ? 'text-emerald-600' : 'text-red-600';
            const bgColor = isPositive ? 'bg-emerald-50' : 'bg-red-50';
            const icon = isPositive ? 'lucide:trending-up' : 'lucide:trending-down';

            return (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-lg`}>
                      <Icon icon={icon} className={accentColor} />
                    </div>
                    <div className="text-sm text-gray-600">Sof foyda</div>
                  </div>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <div className={`text-3xl font-bold ${accentColor}`}>
                      <span className="text-gray-300">-</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hasUsd && (
                        <div className={`text-2xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={todayNetProfit!.usd}
                            originalCurrency="USD"
                            className="inline"
                          />
                          {todayNetProfit!.usdCount > 0 && (
                            <span className="ml-2 text-sm font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={todayNetProfit!.usd / todayNetProfit!.usdCount}
                                originalCurrency="USD"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {hasUzs && (
                        <div className={`text-lg font-semibold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={todayNetProfit!.uzs}
                            originalCurrency="UZS"
                            className="inline"
                          />
                          {todayNetProfit!.uzsCount > 0 && (
                            <span className="ml-2 text-xs font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={todayNetProfit!.uzs / todayNetProfit!.uzsCount}
                                originalCurrency="UZS"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {!hasUsd && !hasUzs && (
                        <div className={`text-3xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={0}
                            originalCurrency="USD"
                            className="inline"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-500">Bugun</div>
                </div>
              </div>
            );
          })()}

          {/* Haftalik sof foyda - ikkinchi card */}
          {(() => {
            const weeklyNetProfit = stats?.weeklyNetProfit;
            const hasUsd = weeklyNetProfit?.usd !== undefined && weeklyNetProfit.usd !== 0;
            const hasUzs = weeklyNetProfit?.uzs !== undefined && weeklyNetProfit.uzs !== 0;
            const totalProfit = (weeklyNetProfit?.usd || 0) + (weeklyNetProfit?.uzs || 0);
            const isPositive = totalProfit >= 0;
            const accentColor = isPositive ? 'text-emerald-600' : 'text-red-600';
            const bgColor = isPositive ? 'bg-emerald-50' : 'bg-red-50';
            const icon = isPositive ? 'lucide:trending-up' : 'lucide:trending-down';

            return (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-lg`}>
                      <Icon icon={icon} className={accentColor} />
                    </div>
                    <div className="text-sm text-gray-600">Sof foyda</div>
                  </div>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <div className={`text-3xl font-bold ${accentColor}`}>
                      <span className="text-gray-300">-</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hasUsd && (
                        <div className={`text-2xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={weeklyNetProfit!.usd}
                            originalCurrency="USD"
                            className="inline"
                          />
                          {weeklyNetProfit!.usdCount > 0 && (
                            <span className="ml-2 text-sm font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={weeklyNetProfit!.usd / weeklyNetProfit!.usdCount}
                                originalCurrency="USD"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {hasUzs && (
                        <div className={`text-lg font-semibold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={weeklyNetProfit!.uzs}
                            originalCurrency="UZS"
                            className="inline"
                          />
                          {weeklyNetProfit!.uzsCount > 0 && (
                            <span className="ml-2 text-xs font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={weeklyNetProfit!.uzs / weeklyNetProfit!.uzsCount}
                                originalCurrency="UZS"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {!hasUsd && !hasUzs && (
                        <div className={`text-3xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={0}
                            originalCurrency="USD"
                            className="inline"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-500">Haftalik</div>
                </div>
              </div>
            );
          })()}

          {/* Oylik sof foyda - uchinchi card */}
          {(() => {
            const monthlyNetProfit = stats?.monthlyNetProfit;
            const hasUsd = monthlyNetProfit?.usd !== undefined && monthlyNetProfit.usd !== 0;
            const hasUzs = monthlyNetProfit?.uzs !== undefined && monthlyNetProfit.uzs !== 0;
            const totalProfit = (monthlyNetProfit?.usd || 0) + (monthlyNetProfit?.uzs || 0);
            const isPositive = totalProfit >= 0;
            const accentColor = isPositive ? 'text-emerald-600' : 'text-red-600';
            const bgColor = isPositive ? 'bg-emerald-50' : 'bg-red-50';
            const icon = isPositive ? 'lucide:trending-up' : 'lucide:trending-down';

            return (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-lg`}>
                      <Icon icon={icon} className={accentColor} />
                    </div>
                    <div className="text-sm text-gray-600">Sof foyda</div>
                  </div>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <div className={`text-3xl font-bold ${accentColor}`}>
                      <span className="text-gray-300">-</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hasUsd && (
                        <div className={`text-2xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={monthlyNetProfit!.usd}
                            originalCurrency="USD"
                            className="inline"
                          />
                          {monthlyNetProfit!.usdCount > 0 && (
                            <span className="ml-2 text-sm font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={monthlyNetProfit!.usd / monthlyNetProfit!.usdCount}
                                originalCurrency="USD"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {hasUzs && (
                        <div className={`text-lg font-semibold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={monthlyNetProfit!.uzs}
                            originalCurrency="UZS"
                            className="inline"
                          />
                          {monthlyNetProfit!.uzsCount > 0 && (
                            <span className="ml-2 text-xs font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={monthlyNetProfit!.uzs / monthlyNetProfit!.uzsCount}
                                originalCurrency="UZS"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {!hasUsd && !hasUzs && (
                        <div className={`text-3xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={0}
                            originalCurrency="USD"
                            className="inline"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-500">Oylik</div>
                </div>
              </div>
            );
          })()}

          {/* Yillik sof foyda - to'rtinchi card */}
          {(() => {
            const yearlyNetProfit = stats?.yearlyNetProfit;
            const hasUsd = yearlyNetProfit?.usd !== undefined && yearlyNetProfit.usd !== 0;
            const hasUzs = yearlyNetProfit?.uzs !== undefined && yearlyNetProfit.uzs !== 0;
            const totalProfit = (yearlyNetProfit?.usd || 0) + (yearlyNetProfit?.uzs || 0);
            const isPositive = totalProfit >= 0;
            const accentColor = isPositive ? 'text-emerald-600' : 'text-red-600';
            const bgColor = isPositive ? 'bg-emerald-50' : 'bg-red-50';
            const icon = isPositive ? 'lucide:trending-up' : 'lucide:trending-down';

            return (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-lg`}>
                      <Icon icon={icon} className={accentColor} />
                    </div>
                    <div className="text-sm text-gray-600">Sof foyda</div>
                  </div>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <div className={`text-3xl font-bold ${accentColor}`}>
                      <span className="text-gray-300">-</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {hasUsd && (
                        <div className={`text-2xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={yearlyNetProfit!.usd}
                            originalCurrency="USD"
                            className="inline"
                          />
                          {yearlyNetProfit!.usdCount > 0 && (
                            <span className="ml-2 text-sm font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={yearlyNetProfit!.usd / yearlyNetProfit!.usdCount}
                                originalCurrency="USD"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {hasUzs && (
                        <div className={`text-lg font-semibold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={yearlyNetProfit!.uzs}
                            originalCurrency="UZS"
                            className="inline"
                          />
                          {yearlyNetProfit!.uzsCount > 0 && (
                            <span className="ml-2 text-xs font-medium text-gray-500">
                              (
                              <CurrencyDisplay
                                amount={yearlyNetProfit!.uzs / yearlyNetProfit!.uzsCount}
                                originalCurrency="UZS"
                                className="inline"
                              />
                              )
                            </span>
                          )}
                        </div>
                      )}
                      {!hasUsd && !hasUzs && (
                        <div className={`text-3xl font-bold ${accentColor}`}>
                          <CurrencyDisplay
                            amount={0}
                            originalCurrency="USD"
                            className="inline"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-500">Yillik</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Qarzdorlar va sertifikatchi qarzi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Icon icon="lucide:users" className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Qarzdorlar ro'yxati</h2>
                  <p className="text-xs text-gray-500">To'lov qilish kerak bo'lgan mijozlar</p>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (() => {
              const paymentReminders = stats?.paymentReminders || [];
              if (!Array.isArray(paymentReminders) || paymentReminders.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400">
                    <Icon icon="lucide:check-circle" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Qarzdorlar mavjud emas</p>
                  </div>
                );
              }
              
              // Calculate totals by currency
              const totalDebtUSD = paymentReminders
                .filter((p: PaymentReminder) => p.currency === 'USD')
                .reduce((sum, p) => sum + (p.currentDebt || 0), 0);
              const totalDebtUZS = paymentReminders
                .filter((p: PaymentReminder) => p.currency === 'UZS')
                .reduce((sum, p) => sum + (p.currentDebt || 0), 0);

              return (
                <div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {paymentReminders.map((reminder: PaymentReminder) => (
                      <div
                        key={reminder.clientId}
                        className="p-3 bg-white rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{reminder.clientName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold text-red-600">
                              {reminder.currentDebt !== undefined && (
                                <CurrencyDisplay
                                  amount={reminder.currentDebt}
                                  originalCurrency={reminder.currency || 'USD'}
                                  className="inline"
                                />
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Jami qarz */}
                  {(totalDebtUSD > 0 || totalDebtUZS > 0) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-2">
                        {totalDebtUSD > 0 && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-gray-500" />
                              <span className="text-sm font-medium text-gray-600">Jami qarz (USD):</span>
                            </div>
                            <span className="text-base font-semibold text-red-600">
                              <CurrencyDisplay
                                amount={totalDebtUSD}
                                originalCurrency="USD"
                                className="inline"
                              />
                            </span>
                          </div>
                        )}
                        {totalDebtUZS > 0 && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-gray-500" />
                              <span className="text-sm font-medium text-gray-600">Jami qarz (UZS):</span>
                            </div>
                            <span className="text-base font-semibold text-red-600">
                              <CurrencyDisplay
                                amount={totalDebtUZS}
                                originalCurrency="UZS"
                                className="inline"
                              />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:clipboard-list" className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sertifikatchilar qarzi</h2>
                <p className="text-xs text-gray-500">Oltiariq filialidan</p>
              </div>
            </div>

            {!stats?.certifierDebt ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="lucide:clipboard" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ma'lumotlar topilmadi</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-gray-500">
                  Tasklar soni: <span className="font-semibold text-gray-700">{stats.certifierDebt.taskCount}</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'ST-1', key: 'st1' as const },
                    { label: 'FITO', key: 'fito' as const },
                    { label: 'AKT', key: 'akt' as const },
                  ].map(({ label, key }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className="font-semibold text-red-600">
                          {formatUzs(stats.certifierDebt.remaining[key])} so'm
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Hisob: {formatUzs(stats.certifierDebt.accrued[key])}</span>
                        <span>To'landi: {formatUzs(stats.certifierDebt.paid[key])}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Jami qoldiq</span>
                  <span className="font-semibold text-red-600">
                    {formatUzs(stats.certifierDebt.remaining.total)} so'm
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:wallet" className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ishchilarga qarz</h2>
                <p className="text-xs text-gray-500">Sizning ishchilardan qarzingiz (USD)</p>
              </div>
            </div>

            {!stats?.workerDebts || stats.workerDebts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon icon="lucide:check-circle" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ishchilardan qarz mavjud emas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {stats.workerDebts.map((worker) => (
                  <div key={worker.userId} className="flex items-center justify-between p-3 bg-white rounded-md">
                    <span className="text-sm font-medium text-gray-700">{worker.name}</span>
                    <span className="text-sm font-semibold text-red-600">
                      {worker.pendingUsd.toFixed(2)} $
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
