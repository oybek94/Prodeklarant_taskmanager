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
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
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
    </div>
  );
};

export default ClientDashboard;
