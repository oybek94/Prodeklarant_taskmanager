import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  branch: { id: number; name: string };
}

interface Transaction {
  id: number;
  amount: number | string;
  currency: string;
  date: string;
  comment?: string;
}

interface Client {
  id: number;
  name: string;
  dealAmount?: number;
  phone?: string;
  tasks: Task[];
  transactions: Transaction[];
  stats: {
    dealAmount: number | string;
    totalDealAmount?: number | string; // Jami shartnoma summasi (PSR hisobga olingan)
    totalIncome: number | string;
    balance: number | string;
    tasksByBranch: Record<string, number>;
    totalTasks: number;
    tasksWithPsr?: number; // PSR bor bo'lgan tasklar soni
  };
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/clients/${id}`);
      setClient(response.data);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>;
  }

  if (!client) {
    return <div className="text-center py-8 text-gray-500">Client topilmadi</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/clients')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Orqaga
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Telefon</div>
            <div className="font-medium">{client.phone || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Kelishuv summasi (bitta task)</div>
            <div className="font-medium">${Number(client.stats.dealAmount).toFixed(2)}</div>
            {client.stats.totalDealAmount !== undefined && (
              <>
                <div className="text-xs text-gray-400 mt-1">Jami (PSR hisobga olingan)</div>
                <div className="font-medium text-blue-600">${Number(client.stats.totalDealAmount).toFixed(2)}</div>
                {client.stats.tasksWithPsr !== undefined && client.stats.tasksWithPsr > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    (+${(client.stats.tasksWithPsr * 10).toFixed(2)} PSR uchun)
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">Jami tushgan</div>
            <div className="font-medium">${Number(client.stats.totalIncome).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Balans</div>
            <div
              className={`font-medium ${
                Number(client.stats.balance) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${Number(client.stats.balance).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats by Branch */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filial bo'yicha statistika</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(client.stats.tasksByBranch).map(([branch, count]) => (
            <div key={branch} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{count}</div>
              <div className="text-sm text-gray-500">{branch}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Buyurtmalar ({client.tasks.length})</h2>
        {client.tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Buyurtmalar yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'TAYYOR'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'JARAYONDA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {task.status === 'TAYYOR'
                          ? 'Completed'
                          : task.status === 'JARAYONDA'
                          ? 'In Progress'
                          : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">To'lovlar ({client.transactions.length})</h2>
        {client.transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">To'lovlar yo'q</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Summa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Comment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${Number(t.amount).toFixed(2)} {t.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;

