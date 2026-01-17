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
  financialStats: Array<{ type: string; total: number }>;
  paymentReminders?: PaymentReminder[];
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
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
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
      const response = await apiClient.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
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

  const sparklineOptions = {
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
  } as const;

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
            { key: 'today', title: 'Bugun', suffix: 'kechagidan', icon: 'mdi:calendar-today', accent: 'text-emerald-600', spark: '#34d399', showChart: false },
            { key: 'week', title: 'Haftalik', suffix: 'o‘tgan haftadan', icon: 'mdi:calendar-week', accent: 'text-blue-600', spark: '#60a5fa', showChart: true },
            { key: 'month', title: 'Oylik', suffix: 'o‘tgan oydan', icon: 'mdi:calendar-month', accent: 'text-purple-600', spark: '#a78bfa', showChart: true },
            { key: 'year', title: 'Yillik', suffix: 'o‘tgan yildan', icon: 'mdi:calendar', accent: 'text-orange-600', spark: '#fb923c', showChart: true },
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
                  {item.showChart ? (
                    <div className="h-8 w-24">
                      <Line data={buildSparklineData(sparkLabels, sparkData, item.spark)} options={sparklineOptions} />
                    </div>
                  ) : (
                    <div className="h-8 w-24" />
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                <div className="h-80">
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
                      stacked: false,
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

            {/* Tasks List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Task</h2>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Barchasini ko'rish
                </button>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Ishlar mavjud emas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const progress = getTaskProgress(task);
                return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="group bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                            <Icon icon="mdi:play-circle-outline" className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Icon icon="mdi:clock-outline" className="w-3 h-3" />
                                    Start from {new Date(task.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span>{task.client.name}</span>
                                  <span>•</span>
                                  <span>{task.branch.name}</span>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                {getStatusText(task.status)}
                              </span>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{progress}% complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                                  className={`h-2 rounded-full transition-all ${
                                    progress === 100
                                      ? 'bg-emerald-500'
                                      : progress > 0
                                      ? 'bg-blue-500'
                                      : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </div>
        </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Payment Reminders */}
            {stats?.paymentReminders && stats.paymentReminders.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-sm border-2 border-red-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Icon icon="mdi:alert" className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">To'lov eslatmalari</h2>
                    <p className="text-xs text-gray-500">{stats.paymentReminders.length} ta mijoz</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[360px] overflow-y-auto">
                  {stats.paymentReminders.map((reminder) => (
                    <div
                      key={reminder.clientId}
                      onClick={() => navigate(`/clients`)}
                      className="bg-white rounded-lg p-4 border border-red-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{reminder.clientName}</h3>
                        {reminder.phone && (
                          <p className="text-xs text-gray-500 mt-1">{reminder.phone}</p>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600">
                          {reminder.dueReason}
                        </p>
                        <p className="text-xs">
                          <span className="text-gray-600">Joriy qardorlik: </span>
                          <span className="text-red-600 font-bold">
                            <CurrencyDisplay
                              amount={reminder.currentDebt || 0}
                              originalCurrency={(reminder.currency || 'USD') as 'USD' | 'UZS'}
                              className="inline"
                            />
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exchange Rate Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon icon="mdi:currency-usd" className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Valyuta kursi</h2>
                  <p className="text-xs text-gray-500">Bugungi kurs</p>
                </div>
              </div>
              {loadingExchangeRate ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : exchangeRate ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">USD</span>
                        <Icon icon="mdi:arrow-right" className="w-5 h-5 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">UZS</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {new Intl.NumberFormat('uz-UZ', {
                        style: 'decimal',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(exchangeRate).replace(/,/g, ' ')}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date().toLocaleDateString('uz-UZ', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-lg p-2 border border-green-100">
                    <Icon icon="mdi:information-outline" className="w-4 h-4 text-green-600" />
                    <span>Markaziy Bank kursi</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm mb-2">Kurs yuklanmadi</div>
                  <button
                    onClick={loadExchangeRate}
                    className="text-xs text-green-600 hover:text-green-700 underline"
                  >
                    Qayta yuklash
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
              <div className="space-y-3">
                {[
                  { name: 'Cris Morich', message: 'Hi Angelina! How are You?', color: 'bg-yellow-100' },
                  { name: 'Charmie', message: 'Do you need that design?', color: 'bg-red-100' },
                  { name: 'Jason Mandala', message: 'What is the price of hourly...', color: 'bg-blue-100' },
                  { name: 'Charlie Chu', message: 'Awsome design!!', color: 'bg-orange-100' },
                ].map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-full ${msg.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs font-medium text-gray-700">{msg.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{msg.name}</p>
                      <p className="text-xs text-gray-600 truncate">{msg.message}</p>
                    </div>
                  </div>
                ))}
        </div>
      </div>

            {/* New Task */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">New Task</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Task Title</label>
                  <input
                    type="text"
                    placeholder="Create new"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {['🎉', '🔥', '😊', '👍', '💪', '🎯'].map((emoji, idx) => (
                    <button
                      key={idx}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 text-left">
                  Add Collaborators
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
