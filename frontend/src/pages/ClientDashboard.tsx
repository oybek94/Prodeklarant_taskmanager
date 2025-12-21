import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'transactions'>('tasks');
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'JARAYONDA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BOSHLANMAGAN':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
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

  // Calculate stats
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const activeTasks = tasks.filter(t => t.status === 'JARAYONDA').length;
  const completedTasks = tasks.filter(t => t.status === 'YAKUNLANDI' || t.status === 'TAYYOR').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-red-600 bg-white p-6 rounded-lg shadow-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Minimal Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-light text-gray-900">{client?.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Shaxsiy kabinet</p>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Minimal Design */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Jami ishlar</p>
            <p className="text-3xl font-light text-gray-900">{tasks.length}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Jarayondagi ishlar</p>
            <p className="text-3xl font-light text-blue-600">{activeTasks}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Tugallangan</p>
            <p className="text-3xl font-light text-emerald-600">{completedTasks}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-600 mb-2">Jami tushgan</p>
            <p className="text-3xl font-light text-gray-900">
              {totalIncome.toLocaleString()} {transactions[0]?.currency || 'UZS'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200/50 bg-white/40">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'tasks'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                Ishlar ({tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'transactions'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                Tranzaksiyalar ({transactions.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'tasks' && (
              <div>
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Ishlar mavjud emas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="group bg-white/80 rounded-xl p-5 border border-gray-200/50 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>{task.branch?.name || 'Filial topilmadi'}</span>
                              <span>•</span>
                              <span>{new Date(task.createdAt).toLocaleDateString('uz-UZ', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</span>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}
                          >
                            {getStatusText(task.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Tranzaksiyalar mavjud emas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="bg-white/80 rounded-xl p-5 border border-gray-200/50 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 text-lg">
                              {transaction.amount.toLocaleString()} {transaction.currency}
                            </p>
                            {transaction.comment && (
                              <p className="text-sm text-gray-600 mt-1">{transaction.comment}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(transaction.date).toLocaleDateString('uz-UZ', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal - Minimal Design */}
      {isTaskModalOpen && selectedTask && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeTaskModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-light text-gray-900">Task ma'lumotlari</h2>
              <button
                onClick={closeTaskModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Task Basic Info */}
              <div className="mb-8">
                <h3 className="text-2xl font-light text-gray-900 mb-6">{selectedTask.title}</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(selectedTask.status)}`}>
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
                      {new Date(selectedTask.createdAt).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Yangilangan</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedTask.updatedAt).toLocaleString('uz-UZ')}
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

              {/* Stages Progress - Minimal Design */}
              <div>
                <h3 className="text-lg font-light text-gray-900 mb-6">Jarayonlar</h3>
                <div className="space-y-6">
                  {selectedTask.stages.map((stage, index) => (
                    <div key={stage.id} className="flex items-start gap-4">
                      {/* Progress Indicator */}
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
                      
                      {/* Stage Info */}
                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{stage.name}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(stage.status)}`}>
                            {getStatusText(stage.status)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{stage.durationText}</p>
                          {stage.assignedTo && (
                            <p className="text-xs">Mas'ul: {stage.assignedTo.name}</p>
                          )}
                          {stage.startedAt && (
                            <p className="text-xs">Boshlangan: {new Date(stage.startedAt).toLocaleString('uz-UZ')}</p>
                          )}
                          {stage.completedAt && (
                            <p className="text-xs">Tugallangan: {new Date(stage.completedAt).toLocaleString('uz-UZ')}</p>
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
