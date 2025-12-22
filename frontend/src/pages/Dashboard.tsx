import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, formatDate } from '../utils/dateFormat';

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
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    loadStats();
    loadChartData();
    loadRecentTasks();
  }, [period]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data for tasks over time
  const prepareTasksChartData = () => {
    if (!chartData?.tasksCompleted) return [];
    const grouped = chartData.tasksCompleted.reduce((acc: any, item) => {
      const date = item.date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  };

  const tasksChartData = prepareTasksChartData();
  const maxTasksCount = Math.max(...tasksChartData.map((d: any) => Number(d.count)), 1);

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
      <div className="max-w-7xl mx-auto px-6 py-6">
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
                    onClick={() => setPeriod('daily')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      period === 'daily'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setPeriod('weekly')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      period === 'weekly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      period === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
        </div>
              
              {/* Simple Line Chart */}
              <div className="h-64 flex items-end justify-between gap-2">
          {tasksChartData.length > 0 ? (
                  tasksChartData.map((item, idx) => {
                    const height = (Number(item.count) / maxTasksCount) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex items-end justify-center h-full">
                          <div
                            className="w-full bg-gradient-to-t from-purple-500 to-blue-400 rounded-t transition-all duration-300 hover:from-purple-600 hover:to-blue-500 cursor-pointer"
                            style={{ height: `${Math.max(height, 5)}%`, minHeight: '4px' }}
                            title={`${item.date}: ${item.count} tasks`}
                          />
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {String(item.count)}
                  </div>
                </div>
                        <div className="text-xs text-gray-500 text-center w-full truncate mt-2">
                  {formatDate(item.date)}
                </div>
              </div>
                    );
                  })
          ) : (
                  <div className="w-full text-center text-gray-400 py-12">Ma'lumotlar yo'q</div>
          )}
        </div>
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
                                    Start from {formatDateTime(task.createdAt)}
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
            {/* Payment Reminders - Main Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">To'lov qilishi kerak</h2>
                    <p className="text-xs text-gray-500">
                      {stats?.paymentReminders && stats.paymentReminders.length > 0 
                        ? `${stats.paymentReminders.length} ta mijoz` 
                        : 'Mijozlar yo\'q'}
                    </p>
                  </div>
                </div>
                {stats?.paymentReminders && stats.paymentReminders.length > 0 && (
                  <button
                    onClick={() => navigate('/clients')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Barchasini ko'rish
                  </button>
                )}
              </div>
              
              {!stats?.paymentReminders || stats.paymentReminders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">To'lov qilishi kerak bo'lgan mijozlar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats.paymentReminders.map((reminder) => (
                    <div
                      key={reminder.clientId}
                      onClick={() => navigate(`/clients`)}
                      className="group bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-red-700 transition-colors">
                            {reminder.clientName}
                          </h3>
                          {reminder.phone && (
                            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {reminder.phone}
                            </p>
                          )}
                        </div>
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0">
                          To'lov kerak
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-2 bg-white/60 rounded px-2 py-1.5 border border-red-100">
                        {reminder.dueReason}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Boshlangan: {formatDateTime(reminder.creditStartDate)}</span>
                      </div>
                    </div>
                  ))}
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
