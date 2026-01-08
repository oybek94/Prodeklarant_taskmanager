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

interface ChartData {
  period: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tasksCompleted: Array<{ date: string }>;
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

  useEffect(() => {
    loadStats();
    loadChartData();
    loadRecentTasks();
    loadExchangeRate();
  }, [period]);

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

  // Prepare chart data with all dates included (even days with no tasks)
  const chartDataWithLabels = useMemo(() => {
    if (!chartData?.tasksCompleted || !chartData?.dateRange) {
      return { labels: [], data: [] };
    }

    const startDate = new Date(chartData.dateRange.start);
    const endDate = new Date(chartData.dateRange.end);
    
    // Group tasks by date
    const tasksByDate = chartData.tasksCompleted.reduce((acc: any, item) => {
      const date = item.date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const labels: string[] = [];
    const data: number[] = [];
    const currentDate = new Date(startDate);

    if (period === 'weekly') {
      // Show all 7 days
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        labels.push(
          currentDate.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' })
        );
        data.push(tasksByDate[dateStr] || 0);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (period === 'monthly') {
      // Show all days in the month
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        labels.push(
          currentDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
        );
        data.push(tasksByDate[dateStr] || 0);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (period === 'yearly') {
      // Show all months in the year
      const monthCounts: { [key: string]: number } = {};
      const targetYear = startDate.getFullYear();
      
      // Count tasks by month (only for the target year)
      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        // Only count tasks from the target year
        if (date.getFullYear() === targetYear) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        }
      });

      // Generate all months for the target year
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(targetYear, month, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        labels.push(
          monthDate.toLocaleDateString('uz-UZ', { month: 'short' })
        );
        data.push(monthCounts[monthKey] || 0);
      }
    }

    return { labels, data };
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

  // Calculate stats for cards
  const completedTasksCount = stats?.completedTasks || 0;
  const newTasksCount = stats?.newTasks || 0;
  const projectDoneCount = stats?.tasksByStatus?.find(t => t.status === 'YAKUNLANDI')?.count || 0;

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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Task Completed */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
    <div>
                <p className="text-sm text-gray-600 mb-1">Task Completed</p>
                <p className="text-3xl font-bold text-gray-900">{completedTasksCount}</p>
              </div>
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {completedTasksCount > 0 ? `${completedTasksCount}+ more from last week` : 'No completed tasks'}
            </div>
          </div>

          {/* New Task */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">New Task</p>
                <p className="text-3xl font-bold text-gray-900">{newTasksCount}</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {newTasksCount > 0 ? `${newTasksCount}+ more from last week` : 'No new tasks'}
            </div>
          </div>

          {/* Project Done */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Project Done</p>
                <p className="text-3xl font-bold text-gray-900">{projectDoneCount}</p>
              </div>
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {projectDoneCount > 0 ? `${projectDoneCount}+ more from last week` : 'No projects done'}
            </div>
          </div>
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
                          label: 'Bajarilgan tasklar',
                          data: chartDataWithLabels.data,
                          borderColor: 'rgb(99, 102, 241)',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          borderWidth: 2,
                          fill: true,
                          tension: 0.4, // Smooth curve (interpolation)
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          pointBackgroundColor: 'rgb(99, 102, 241)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointHoverBackgroundColor: 'rgb(79, 70, 229)',
                          pointHoverBorderColor: '#fff',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
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
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                            precision: 0,
                          },
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
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
                      interaction: {
                        mode: 'nearest' as const,
                        axis: 'x' as const,
                        intersect: false,
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
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
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
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
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
                          {reminder.dueReason.split(/Joriy qardorlik:/)[0].trim()}
                        </p>
                        <p className="text-xs">
                          <span className="text-gray-600">Joriy qardorlik: </span>
                          <span className="text-red-600 font-bold">
                            <CurrencyDisplay
                              amount={reminder.currentDebt || 0}
                              originalCurrency="USD"
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
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
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
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
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
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
