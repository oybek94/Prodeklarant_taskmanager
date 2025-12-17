import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

interface DashboardStats {
  newTasks: number;
  completedTasks: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  processStats: Array<{ status: string; count: number }>;
  workerActivity: Array<{ userId: number; name: string; totalKPI: number; completedStages: number }>;
  financialStats: Array<{ type: string; total: number }>;
}

interface ChartData {
  tasksCompleted: Array<{ date: string }>;
  kpiByWorker: Array<{ userId: number; name: string; total: number }>;
  transactionsByType: Array<{ type: string; date: string; amount: number }>;
}


const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    loadStats();
    loadChartData();
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

  // Prepare chart data for transactions
  const prepareTransactionsChartData = () => {
    if (!chartData?.transactionsByType) return { income: [], expense: [], salary: [] };
    const grouped = chartData.transactionsByType.reduce((acc: any, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push({ date: item.date, amount: Number(item.amount) });
      return acc;
    }, {});
    return {
      income: grouped.INCOME || [],
      expense: grouped.EXPENSE || [],
      salary: grouped.SALARY || [],
    };
  };

  const tasksChartData = prepareTasksChartData();
  const transactionsChartData = prepareTransactionsChartData();
  const maxTasksCount = Math.max(...tasksChartData.map((d: any) => Number(d.count)), 1);
  const _maxTransactionAmount = Math.max(
    ...transactionsChartData.income.map((d: any) => Number(d.amount)),
    ...transactionsChartData.expense.map((d: any) => Number(d.amount)),
    ...transactionsChartData.salary.map((d: any) => Number(d.amount)),
    1
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.newTasks}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Yangi ishlar</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.completedTasks}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Tugallangan ishlar</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">
              {stats?.processStats?.find(p => p.status === 'TAYYOR')?.count || 0}
            </div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Tugallangan jarayonlar</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats?.workerActivity?.length || 0}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Faol ishchilar</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">
              {formatCurrency(stats?.financialStats?.find(f => f.type === 'INCOME')?.total || 0)}
            </div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Jami kirim</div>
          </div>
        </div>
      ) : null}

      {/* Charts */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-lg border-2 border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Ishlar statistikasi</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="daily">Kunlik</option>
            <option value="weekly">Haftalik</option>
            <option value="monthly">Oylik</option>
          </select>
        </div>
        <div className="h-64 flex items-end gap-2">
          {tasksChartData.length > 0 ? (
            tasksChartData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-600 hover:to-blue-500 cursor-pointer relative group"
                  style={{ height: `${(item.count / maxTasksCount) * 100}%`, minHeight: '4px' }}
                  title={`${item.date}: ${item.count} ish`}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {String(item.count)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 text-center w-full truncate mt-1" style={{ maxWidth: '100%' }}>
                  {new Date(item.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            ))
          ) : (
            <div className="w-full text-center text-gray-400">Ma'lumotlar yo'q</div>
          )}
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Worker Activity Chart */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-lg border-2 border-blue-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ishchilar faoliyati (KPI)</h2>
          {stats?.workerActivity && stats.workerActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.workerActivity.slice(0, 5).map((worker) => {
                const maxKPI = Math.max(...stats.workerActivity.map(w => Number(w.totalKPI)), 1);
                const percentage = (Number(worker.totalKPI) / maxKPI) * 100;
                return (
                  <div key={worker.userId} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">{worker.name}</span>
                      <span className="text-gray-600">{formatCurrency(Number(worker.totalKPI))}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">{worker.completedStages} ta jarayon</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">Ma'lumotlar yo'q</div>
          )}
        </div>

        {/* Financial Chart */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-lg border-2 border-blue-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Moliya statistikasi</h2>
          {stats?.financialStats && stats.financialStats.length > 0 ? (
            <div className="space-y-4">
              {stats.financialStats.map((item) => {
                const total = stats.financialStats.reduce((sum, f) => sum + Number(f.total), 0);
                const percentage = total > 0 ? (Number(item.total) / total) * 100 : 0;
                const colorClass = item.type === 'INCOME' ? 'from-green-500 to-green-600' : 
                                  item.type === 'EXPENSE' ? 'from-red-500 to-red-600' : 
                                  'from-yellow-500 to-yellow-600';
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">
                        {item.type === 'INCOME' ? 'Kirim' : item.type === 'EXPENSE' ? 'Chiqim' : 'Maosh'}
                      </span>
                      <span className="text-gray-600">{formatCurrency(Number(item.total))}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`bg-gradient-to-r ${colorClass} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">Ma'lumotlar yo'q</div>
          )}
        </div>
      </div>

      {/* Tasks by Status */}
      {stats?.tasksByStatus && stats.tasksByStatus.length > 0 && (
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-lg border-2 border-blue-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ishlar holati bo'yicha</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.tasksByStatus.map((item) => {
              const statusInfo = item.status === 'TAYYOR' ? { label: 'Tugallandi', color: 'bg-green-100 text-green-800' } :
                               item.status === 'JARAYONDA' ? { label: 'Jarayonda', color: 'bg-yellow-100 text-yellow-800' } :
                               { label: 'Boshlanmagan', color: 'bg-red-100 text-red-800' };
              return (
                <div key={item.status} className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">{statusInfo.label}</div>
                  <div className="text-2xl font-bold text-gray-800">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

