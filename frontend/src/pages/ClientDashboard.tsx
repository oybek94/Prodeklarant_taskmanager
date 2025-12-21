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
        return 'bg-green-100 text-green-800';
      case 'JARAYONDA':
        return 'bg-blue-100 text-blue-800';
      case 'BOSHLANMAGAN':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'TAYYOR':
        return 'Tayyor';
      case 'JARAYONDA':
        return 'Jarayonda';
      case 'BOSHLANMAGAN':
        return 'Boshlanmagan';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mijoz kabineti</h1>
              {client && (
                <p className="text-sm text-gray-600 mt-1">{client.name}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Jami ishlar</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{tasks.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Jami tranzaksiyalar</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{transactions.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Shartnoma summasi</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {client?.dealAmount ? `${client.dealAmount.toLocaleString()} UZS` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'tasks'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Ishlar
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'transactions'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tranzaksiyalar
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'tasks' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Ishlar ro'yxati</h2>
                {tasks.length === 0 ? (
                  <p className="text-gray-500">Ishlar mavjud emas</p>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {task.branch?.name || 'Filial topilmadi'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(task.createdAt).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              task.status === 'YAKUNLANDI'
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'JARAYONDA'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {task.status}
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
                <h2 className="text-lg font-semibold mb-4">Tranzaksiyalar ro'yxati</h2>
                {transactions.length === 0 ? (
                  <p className="text-gray-500">Tranzaksiyalar mavjud emas</p>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.amount.toLocaleString()} {transaction.currency}
                            </p>
                            {transaction.comment && (
                              <p className="text-sm text-gray-600 mt-1">{transaction.comment}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(transaction.date).toLocaleDateString('uz-UZ')}
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

      {/* Task Detail Modal */}
      {isTaskModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Task ma'lumotlari</h2>
              <button
                onClick={closeTaskModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Task Basic Info */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{selectedTask.title}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusColor(selectedTask.status)}`}>
                      {getStatusText(selectedTask.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Filial</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.branch.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Yaratilgan sana</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(selectedTask.createdAt).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Yangilangan sana</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(selectedTask.updatedAt).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                  {selectedTask.hasPsr && (
                    <div>
                      <p className="text-sm text-gray-600">PSR</p>
                      <p className="text-sm font-medium text-green-600 mt-1">Bor</p>
                    </div>
                  )}
                  {selectedTask.driverPhone && (
                    <div>
                      <p className="text-sm text-gray-600">Haydovchi telefon</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.driverPhone}</p>
                    </div>
                  )}
                </div>
                {selectedTask.comments && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Izohlar</p>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">{selectedTask.comments}</p>
                  </div>
                )}
              </div>

              {/* Stages Progress */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Jarayonlar</h3>
                <div className="space-y-4">
                  {selectedTask.stages.map((stage, index) => (
                    <div key={stage.id} className="flex items-start gap-4">
                      {/* Progress Line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            stage.status === 'TAYYOR'
                              ? 'bg-green-500'
                              : stage.status === 'JARAYONDA'
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        {index < selectedTask.stages.length - 1 && (
                          <div
                            className={`w-0.5 h-16 ${
                              stage.status === 'TAYYOR'
                                ? 'bg-green-500'
                                : stage.status === 'JARAYONDA'
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        )}
                      </div>
                      
                      {/* Stage Info */}
                      <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{stage.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {stage.durationText}
                            </p>
                            {stage.assignedTo && (
                              <p className="text-xs text-gray-500 mt-1">
                                Mas'ul: {stage.assignedTo.name}
                              </p>
                            )}
                            {stage.startedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Boshlangan: {new Date(stage.startedAt).toLocaleString('uz-UZ')}
                              </p>
                            )}
                            {stage.completedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Tugallangan: {new Date(stage.completedAt).toLocaleString('uz-UZ')}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                            {getStatusText(stage.status)}
                          </span>
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
