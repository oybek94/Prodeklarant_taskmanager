import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface Client {
  id: number;
  name: string;
  dealAmount?: number | string | null;
  phone?: string;
  createdAt: string;
  tasks?: { id: number }[];
}

interface ClientDetail {
  id: number;
  name: string;
  dealAmount?: number | string | null;
  phone?: string;
  createdAt: string;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    createdAt: string;
    branch: { name: string };
  }>;
  transactions: Array<{
    id: number;
    amount: number;
    currency: string;
    date: string;
    comment?: string;
  }>;
  stats?: {
    dealAmount: number;
    totalIncome: number;
    balance: number;
    totalTasks: number;
    tasksByBranch: Record<string, number>;
  };
}

interface MonthlyTask {
  month: string;
  count: number;
}

interface ClientStats {
  total: { current: number; change: number };
  active: { current: number; change: number };
  inactive: { current: number; change: number };
  archived: { current: number; change: number };
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [monthlyTasks, setMonthlyTasks] = useState<MonthlyTask[]>([]);
  const [form, setForm] = useState({
    name: '',
    dealAmount: '',
    phone: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    dealAmount: '',
    phone: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
    loadStats();
  }, []);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showClientModal) {
          setShowClientModal(false);
          setSelectedClient(null);
        } else if (showForm) {
          setShowForm(false);
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm, showClientModal]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/clients/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadClientDetail = async (clientId: number) => {
    try {
      setLoadingClient(true);
      const response = await apiClient.get(`/clients/${clientId}`);
      setSelectedClient(response.data);
      setShowClientModal(true);
      
      // Load monthly tasks data
      const monthlyResponse = await apiClient.get(`/clients/${clientId}/monthly-tasks`);
      setMonthlyTasks(monthlyResponse.data);
    } catch (error) {
      console.error('Error loading client detail:', error);
      alert('Mijoz ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoadingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/clients', {
        name: form.name,
        dealAmount: form.dealAmount ? parseFloat(form.dealAmount) : undefined,
        phone: form.phone || undefined,
      });
      setShowForm(false);
      setForm({ name: '', dealAmount: '', phone: '' });
      await loadClients();
      await loadStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      dealAmount: client.dealAmount ? client.dealAmount.toString() : '',
      phone: client.phone || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      await apiClient.patch(`/clients/${editingClient.id}`, {
        name: editForm.name,
        dealAmount: editForm.dealAmount ? parseFloat(editForm.dealAmount) : undefined,
        phone: editForm.phone || undefined,
      });
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({ name: '', dealAmount: '', phone: '' });
      await loadClients();
      await loadStats();
      if (selectedClient && selectedClient.id === editingClient.id) {
        await loadClientDetail(editingClient.id);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu mijozni o\'chirishni xohlaysizmi?')) return;

    try {
      await apiClient.delete(`/clients/${id}`);
      await loadClients();
      await loadStats();
      if (selectedClient && selectedClient.id === id) {
        setShowClientModal(false);
        setSelectedClient(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const sortedClients = clients.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
          <div className="text-sm text-gray-500 mt-1">Home &gt; Clients</div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Clients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                stats.total.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.total.change >= 0 ? '↑' : '↓'} {formatChange(stats.total.change)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total.current}</div>
            <div className="text-xs text-gray-500">Jami mijozlar</div>
          </div>

          {/* Active Clients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                stats.active.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.active.change >= 0 ? '↑' : '↓'} {formatChange(stats.active.change)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.active.current}</div>
            <div className="text-xs text-gray-500">Faol mijozlar</div>
          </div>

          {/* Inactive Clients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                stats.inactive.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.inactive.change >= 0 ? '↑' : '↓'} {formatChange(stats.inactive.change)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.inactive.current}</div>
            <div className="text-xs text-gray-500">Nofaol mijozlar</div>
          </div>

          {/* Archived Clients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                stats.archived.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {stats.archived.change >= 0 ? '↑' : '↓'} {formatChange(stats.archived.change)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.archived.current}</div>
            <div className="text-xs text-gray-500">Arxivlangan mijozlar</div>
          </div>
        </div>
      )}


      {/* Add Client Modal */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Yangi mijoz</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.dealAmount}
                  onChange={(e) => setForm({ ...form, dealAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Deal Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  No of Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    Ma'lumotlar yo'q
                  </td>
                </tr>
              ) : (
                sortedClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => loadClientDetail(client.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-full ${getAvatarColor(
                            client.name
                          )} flex items-center justify-center text-sm font-semibold text-white mr-3`}
                        >
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.dealAmount
                        ? `$${Number(client.dealAmount).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.tasks?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(client.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                          title="O'zgartirish"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                          title="O'chirish"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Detail Modal */}
      {showClientModal && selectedClient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowClientModal(false);
              setSelectedClient(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full ${getAvatarColor(
                    selectedClient.name
                  )} flex items-center justify-center text-xl font-semibold text-white`}
                >
                  {getInitials(selectedClient.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">{selectedClient.name}</h2>
                  <div className="text-sm text-gray-500 mt-1">
                    Yaratilgan: {formatDate(selectedClient.createdAt)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setSelectedClient(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* Top Financial Summary */}
            {selectedClient.stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Barcha loyihalar summasi</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(Number(selectedClient.stats.totalTasks) * Number(selectedClient.stats.dealAmount)).toFixed(2)}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Jami to'lovlar</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${Number(selectedClient.stats.totalIncome).toFixed(2)}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${
                  selectedClient.stats.balance > 0 
                    ? 'bg-red-50 border-red-200' 
                    : selectedClient.stats.balance === 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="text-sm text-gray-600 mb-1">Qarzorligi</div>
                  <div className={`text-2xl font-bold ${
                    selectedClient.stats.balance > 0 
                      ? 'text-red-600' 
                      : selectedClient.stats.balance === 0
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}>
                    {selectedClient.stats.balance < 0 ? '-' : ''}${Math.abs(Number(selectedClient.stats.balance)).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Telefon</div>
                <div className="font-medium text-gray-900">{selectedClient.phone || '-'}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Shartnoma summasi</div>
                <div className="font-medium text-gray-900">
                  {selectedClient.dealAmount
                    ? `$${Number(selectedClient.dealAmount).toFixed(2)}`
                    : '-'}
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            {selectedClient.stats && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Statistika</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Jami loyihalar</div>
                    <div className="text-xl font-bold text-gray-900">{selectedClient.stats.totalTasks}</div>
                  </div>
                  {Object.entries(selectedClient.stats.tasksByBranch).map(([branch, count]) => (
                    <div key={branch}>
                      <div className="text-sm text-gray-600">{branch} filiali</div>
                      <div className="text-xl font-bold text-gray-900">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Tasks Chart */}
            {monthlyTasks.length > 0 && (
              <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Oylik ishlar soni</h3>
                <div className="flex items-end justify-between gap-1 h-64">
                  {monthlyTasks.map((item, index) => {
                    const maxCount = Math.max(...monthlyTasks.map(m => m.count), 1);
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                        <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '200px' }}>
                          {item.count > 0 && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                              {item.count}
                            </div>
                          )}
                          <div
                            className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t transition-all duration-500 hover:from-purple-600 hover:to-purple-500 cursor-pointer relative"
                            style={{ 
                              height: `${height}%`,
                              minHeight: item.count > 0 ? '4px' : '0px'
                            }}
                            title={`${item.month}: ${item.count} ish`}
                          />
                        </div>
                        <div className="text-xs text-gray-600 text-center w-full truncate" style={{ maxWidth: '100%' }}>
                          {item.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transactions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Tranzaksiyalar ({selectedClient.transactions.length})</h3>
              {selectedClient.transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Tranzaksiyalar yo'q</div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Izoh</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedClient.transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                              +${Number(transaction.amount).toFixed(2)} {transaction.currency}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {transaction.comment || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && editingClient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setEditingClient(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Mijozni tahrirlash</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClient(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.dealAmount}
                  onChange={(e) => setEditForm({ ...editForm, dealAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
