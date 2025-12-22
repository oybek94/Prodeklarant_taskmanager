import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDateTime } from '../utils/dateFormat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface Client {
  id: number;
  name: string;
  phone: string | null;
  dealAmount: number | null;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  branch: {
    name: string;
  } | null;
}

interface TaskDetail {
  id: number;
  title: string;
  status: string;
  comments?: string | null;
  hasPsr?: boolean;
  driverPhone?: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    name: string;
    phone: string | null;
  };
  branch: {
    id: number;
    name: string;
  };
  stages: Array<{
    id: number;
    name: string;
    status: string;
    stageOrder: number;
    durationMin: number | null;
    startedAt: string | null;
    completedAt: string | null;
    durationText: string;
    assignedTo: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
}

interface Transaction {
  id: number;
  amount: number;
  currency: string;
  date: string;
  comment: string | null;
}

const ClientDashboard = () => {
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLoadingTaskDetail, setIsLoadingTaskDetail] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          navigate('/client/login');
          return;
        }

        // Get client info
        const clientResponse = await axios.get(`${API_BASE_URL}/auth/client/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setClient(clientResponse.data);

        // Get tasks
        const tasksResponse = await axios.get(`${API_BASE_URL}/clients/${clientResponse.data.id}/tasks`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setTasks(tasksResponse.data);

        // Get transactions
        const transactionsResponse = await axios.get(`${API_BASE_URL}/clients/${clientResponse.data.id}/transactions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setTransactions(transactionsResponse.data);
      } catch (err: any) {
        console.error('Error loading data:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          navigate('/client/login');
        } else {
          setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/client/login');
  };

  const handleTaskClick = async (taskId: number) => {
    try {
      setIsLoadingTaskDetail(true);
      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/clients/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSelectedTask(response.data);
      setIsTaskModalOpen(true);
    } catch (err: any) {
      console.error('Error loading task detail:', err);
      alert('Task ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setIsLoadingTaskDetail(false);
    }
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
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

  const getTaskProgress = (task: Task) => {
    // Calculate progress based on status
    if (task.status === 'YAKUNLANDI' || task.status === 'TAYYOR') return 100;
    if (task.status === 'JARAYONDA') return 50;
    return 0;
  };

  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'YAKUNLANDI' || t.status === 'TAYYOR').length;
  const activeTasks = tasks.filter(t => t.status === 'JARAYONDA').length;
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 bg-white p-6 rounded-lg shadow-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Xush kelibsiz, {client?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Task Completed */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tugallangan ishlar</p>
                <p className="text-3xl font-bold text-gray-900">{completedTasks}</p>
              </div>
              <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {tasks.length > 0 ? `${tasks.length} ta jami ish` : 'Ishlar mavjud emas'}
            </div>
          </div>

          {/* Active Tasks */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Jarayondagi ishlar</p>
                <p className="text-3xl font-bold text-gray-900">{activeTasks}</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {activeTasks > 0 ? `${activeTasks} ta ish jarayonda` : 'Jarayondagi ishlar yo\'q'}
            </div>
          </div>

          {/* Total Income */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Jami tushgan</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalIncome.toLocaleString()} {transactions[0]?.currency || 'UZS'}
                </p>
              </div>
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {transactions.length} ta tranzaksiya
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tasks List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tasks Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Ishlar</h2>
                <span className="text-sm text-gray-500">{tasks.length} ta ish</span>
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
                        onClick={() => handleTaskClick(task.id)}
                        className="group bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDateTime(task.createdAt)}
                                  </span>
                                  <span>•</span>
                                  <span>{task.branch?.name || 'Filial topilmadi'}</span>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                {getStatusText(task.status)}
                              </span>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{progress}%</span>
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

          {/* Right Column - Transactions & Info */}
          <div className="space-y-6">
            {/* Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Tranzaksiyalar</h2>
                <span className="text-sm text-gray-500">{transactions.length}</span>
              </div>
              
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Tranzaksiyalar mavjud emas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {transaction.amount.toLocaleString()} {transaction.currency}
                        </p>
                        {transaction.comment && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{transaction.comment}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(transaction.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {transactions.length > 5 && (
                    <button className="w-full text-sm text-blue-600 hover:text-blue-700 py-2">
                      Barcha tranzaksiyalarni ko'rish ({transactions.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Client Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ma'lumotlar</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Shartnoma summasi</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {client?.dealAmount ? `${client.dealAmount.toLocaleString()} UZS` : 'N/A'}
                  </p>
                </div>
                {client?.phone && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Telefon</p>
                    <p className="text-sm font-medium text-gray-900">{client.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ro'yxatdan o'tgan</p>
                  <p className="text-sm font-medium text-gray-900">
                    {client?.createdAt ? formatDateTime(client.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {isTaskModalOpen && selectedTask && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeTaskModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-semibold text-gray-900">Task ma'lumotlari</h2>
              <button
                onClick={closeTaskModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">{selectedTask.title}</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                      {getStatusText(selectedTask.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Filial</p>
                    <p className="text-sm font-medium text-gray-900">{selectedTask.branch.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Yaratilgan</p>
                    <p className="text-sm text-gray-900">
                      {formatDateTime(selectedTask.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Yangilangan</p>
                    <p className="text-sm text-gray-900">
                      {formatDateTime(selectedTask.updatedAt)}
                    </p>
                  </div>
                  {selectedTask.hasPsr && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">PSR</p>
                      <p className="text-sm font-medium text-emerald-600">Bor</p>
                    </div>
                  )}
                  {selectedTask.driverPhone && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Haydovchi telefon</p>
                      <p className="text-sm text-gray-900">{selectedTask.driverPhone}</p>
                    </div>
                  )}
                </div>
                {selectedTask.comments && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-2">Izohlar</p>
                    <p className="text-sm text-gray-900">{selectedTask.comments}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Jarayonlar</h3>
                <div className="space-y-6">
                  {selectedTask.stages.map((stage, index) => (
                    <div key={stage.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center pt-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            stage.status === 'TAYYOR'
                              ? 'bg-emerald-500'
                              : stage.status === 'JARAYONDA'
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        {index < selectedTask.stages.length - 1 && (
                          <div
                            className={`w-0.5 h-20 mt-2 ${
                              stage.status === 'TAYYOR'
                                ? 'bg-emerald-200'
                                : stage.status === 'JARAYONDA'
                                ? 'bg-blue-200'
                                : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{stage.name}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                            {getStatusText(stage.status)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{stage.durationText}</p>
                          {stage.assignedTo && (
                            <p className="text-xs">Mas'ul: {stage.assignedTo.name}</p>
                          )}
                          {stage.startedAt && (
                            <p className="text-xs">Boshlangan: {formatDateTime(stage.startedAt)}</p>
                          )}
                          {stage.completedAt && (
                            <p className="text-xs">Tugallangan: {formatDateTime(stage.completedAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
