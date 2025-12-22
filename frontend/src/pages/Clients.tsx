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
  balance?: number;
  totalDealAmount?: number;
  totalIncome?: number;
}

interface ClientDetail {
  id: number;
  name: string;
  dealAmount?: number | string | null;
  phone?: string;
  createdAt: string;
  creditType?: string | null;
  creditLimit?: number | string | null;
  creditStartDate?: string | null;
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
    totalDealAmount?: number; // Jami shartnoma summasi (PSR hisobga olingan)
    totalIncome: number;
    balance: number;
    totalTasks: number;
    tasksByBranch: Record<string, number>;
    tasksWithPsr?: number; // PSR bor bo'lgan tasklar soni
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingClient, setLoadingClient] = useState(false);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [monthlyTasks, setMonthlyTasks] = useState<MonthlyTask[]>([]);
  const [form, setForm] = useState({
    name: '',
    dealAmount: '',
    phone: '',
    creditType: '' as 'TASK_COUNT' | 'AMOUNT' | '',
    creditLimit: '',
    creditStartDate: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    dealAmount: '',
    phone: '',
    creditType: '' as 'TASK_COUNT' | 'AMOUNT' | '',
    creditLimit: '',
    creditStartDate: '',
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (Array.isArray(response.data)) {
        // Ensure balance is calculated for each client
        const clientsWithBalance = response.data.map((client: any) => {
          if (client.balance === undefined || client.balance === null) {
            const dealAmount = Number(client.dealAmount || 0);
            const totalTasks = client.tasks?.length || 0;
            const tasksWithPsr = client.tasks?.filter((t: any) => t.hasPsr).length || 0;
            const totalDealAmount = (dealAmount * totalTasks) + (10 * tasksWithPsr);
            const totalIncome = client.transactions?.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0) || 0;
            const balance = totalDealAmount - totalIncome;
            return { ...client, balance, totalDealAmount, totalIncome };
          }
          return client;
        });
        setClients(clientsWithBalance);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
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
      const createData: any = {
        name: form.name,
        dealAmount: form.dealAmount ? parseFloat(form.dealAmount) : undefined,
        phone: form.phone || undefined,
      };

      // Handle credit fields - if creditType is empty, set to null, otherwise use the value
      if (form.creditType === '') {
        createData.creditType = null;
        createData.creditLimit = null;
        createData.creditStartDate = null;
      } else if (form.creditType) {
        // Validate that creditLimit and creditStartDate are provided when creditType is set
        if (!form.creditLimit || !form.creditStartDate) {
          alert('Nasiya turi tanlangan bo\'lsa, limit va boshlanish sanasini kiriting');
          return;
        }
        createData.creditType = form.creditType;
        createData.creditLimit = parseFloat(form.creditLimit);
        createData.creditStartDate = form.creditStartDate;
      }

      await apiClient.post('/clients', createData);
      setShowForm(false);
      setForm({ name: '', dealAmount: '', phone: '', creditType: '', creditLimit: '', creditStartDate: '' });
      await loadClients();
      await loadStats();
    } catch (error: any) {
      console.error('Create error:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      dealAmount: client.dealAmount ? client.dealAmount.toString() : '',
      phone: client.phone || '',
      creditType: client.creditType || '',
      creditLimit: client.creditLimit ? client.creditLimit.toString() : '',
      creditStartDate: client.creditStartDate ? new Date(client.creditStartDate).toISOString().split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      const updateData: any = {
        name: editForm.name,
        dealAmount: editForm.dealAmount ? parseFloat(editForm.dealAmount) : undefined,
        phone: editForm.phone || undefined,
      };

      // Handle credit fields - if creditType is empty, set to null, otherwise use the value
      if (editForm.creditType === '') {
        updateData.creditType = null;
        updateData.creditLimit = null;
        updateData.creditStartDate = null;
      } else if (editForm.creditType) {
        updateData.creditType = editForm.creditType;
        updateData.creditLimit = editForm.creditLimit ? parseFloat(editForm.creditLimit) : null;
        updateData.creditStartDate = editForm.creditStartDate ? editForm.creditStartDate : null;
      }

      console.log('=== Sending update data ===');
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      console.log('Credit fields being sent:', {
        creditType: updateData.creditType,
        creditLimit: updateData.creditLimit,
        creditStartDate: updateData.creditStartDate,
      });
      
      const response = await apiClient.patch(`/clients/${editingClient.id}`, updateData);
      
      console.log('=== Update response ===');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      console.log('Credit fields in response:', {
        creditType: response.data.creditType,
        creditLimit: response.data.creditLimit,
        creditStartDate: response.data.creditStartDate,
      });
      
      if (!response.data.creditType && updateData.creditType) {
        console.error('⚠️ WARNING: creditType was sent but not returned!');
      }
      if (!response.data.creditLimit && updateData.creditLimit) {
        console.error('⚠️ WARNING: creditLimit was sent but not returned!');
      }
      if (!response.data.creditStartDate && updateData.creditStartDate) {
        console.error('⚠️ WARNING: creditStartDate was sent but not returned!');
      }
      
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({ name: '', dealAmount: '', phone: '', creditType: '', creditLimit: '', creditStartDate: '' });
      
      // Reload clients list to get updated data
      await loadClients();
      await loadStats();
      
      // If client detail modal is open, reload it
      if (selectedClient && selectedClient.id === editingClient.id) {
        await loadClientDetail(editingClient.id);
      }
    } catch (error: any) {
      console.error('Update error:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.error || error.response?.data?.details || 'Xatolik yuz berdi');
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
      'bg-blue-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const sortedClients = Array.isArray(clients) ? clients.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

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
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                stats.total.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{stats.total.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(stats.total.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.total.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Jami mijozlar</div>
          </div>

          {/* Active Clients */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                stats.active.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{stats.active.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(stats.active.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.active.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Faol mijozlar</div>
          </div>

          {/* Inactive Clients */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                stats.inactive.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{stats.inactive.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(stats.inactive.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.inactive.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Nofaol mijozlar</div>
          </div>

          {/* Archived Clients */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            <div className="absolute top-3 right-3">
              <div className={`px-2 py-1 rounded text-xs font-medium shadow-md backdrop-blur-sm ${
                stats.archived.change >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="inline-flex items-center">
                  <span className="mr-1">{stats.archived.change >= 0 ? '↑' : '↓'}</span>
                  {formatChange(stats.archived.change)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.archived.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Arxivlangan mijozlar</div>
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
              
              {/* Nasiya shartlari */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Nasiya shartlari (ixtiyoriy)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nasiya turi</label>
                    <select
                      value={form.creditType}
                      onChange={(e) => setForm({ ...form, creditType: e.target.value as 'TASK_COUNT' | 'AMOUNT' | '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Nasiya yo'q</option>
                      <option value="TASK_COUNT">Ma'lum bir ish sonigacha</option>
                      <option value="AMOUNT">Ma'lum bir summagacha</option>
                    </select>
                  </div>
                  {form.creditType && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {form.creditType === 'TASK_COUNT' ? 'Ish soni' : 'Summa (USD)'}
                        </label>
                        <input
                          type="number"
                          step={form.creditType === 'TASK_COUNT' ? '1' : '0.01'}
                          value={form.creditLimit}
                          onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                          required={!!form.creditType}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder={form.creditType === 'TASK_COUNT' ? 'Masalan: 5' : 'Masalan: 1000'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nasiya boshlangan sana</label>
                        <input
                          type="date"
                          value={form.creditStartDate}
                          onChange={(e) => setForm({ ...form, creditStartDate: e.target.value })}
                          required={!!form.creditType}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                </div>
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
                  Mijoz qardorligi
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        // Get balance from client data
                        const balance = typeof client.balance === 'number' ? client.balance : 
                                       (client.balance !== undefined && client.balance !== null ? Number(client.balance) : null);
                        
                        if (balance !== null && balance !== undefined && !isNaN(balance)) {
                          return (
                            <span className={`font-medium ${
                              balance > 0
                                ? 'text-red-600'
                                : balance === 0
                                ? 'text-gray-600'
                                : 'text-green-600'
                            }`}>
                              {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                            </span>
                          );
                        }
                        
                        // Fallback: calculate balance if not provided
                        const dealAmount = Number(client.dealAmount || 0);
                        const totalTasks = client.tasks?.length || 0;
                        const tasksWithPsr = client.tasks?.filter((t: any) => t.hasPsr).length || 0;
                        const totalDealAmount = (dealAmount * totalTasks) + (10 * tasksWithPsr);
                        const calculatedBalance = totalDealAmount;
                        
                        return (
                          <span className={`font-medium ${
                            calculatedBalance > 0
                              ? 'text-red-600'
                              : calculatedBalance === 0
                              ? 'text-gray-600'
                              : 'text-green-600'
                          }`}>
                            {calculatedBalance > 0 ? '+' : ''}${calculatedBalance.toFixed(2)}
                          </span>
                        );
                      })()}
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
                  <div className="text-sm text-gray-600 mb-1">Barcha loyihalar summasi (PSR hisobga olingan)</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${selectedClient.stats.totalDealAmount !== undefined 
                      ? Number(selectedClient.stats.totalDealAmount).toFixed(2)
                      : (Number(selectedClient.stats.totalTasks) * Number(selectedClient.stats.dealAmount)).toFixed(2)}
                  </div>
                  {selectedClient.stats.tasksWithPsr !== undefined && selectedClient.stats.tasksWithPsr > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      ({selectedClient.stats.tasksWithPsr} ta PSR bor task uchun +${(selectedClient.stats.tasksWithPsr * 10).toFixed(2)})
                    </div>
                  )}
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
                <div className="text-sm text-gray-500 mb-1">Shartnoma summasi (bitta task)</div>
                <div className="font-medium text-gray-900">
                  {selectedClient.dealAmount
                    ? `$${Number(selectedClient.dealAmount).toFixed(2)}`
                    : '-'}
                </div>
                {selectedClient.stats?.totalDealAmount !== undefined && (
                  <>
                    <div className="text-sm text-gray-500 mb-1 mt-2">Jami shartnoma summasi (PSR hisobga olingan)</div>
                    <div className="font-medium text-blue-600">
                      ${Number(selectedClient.stats.totalDealAmount).toFixed(2)}
                    </div>
                    {selectedClient.stats.tasksWithPsr !== undefined && selectedClient.stats.tasksWithPsr > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ({selectedClient.stats.tasksWithPsr} ta PSR bor task uchun +${(selectedClient.stats.tasksWithPsr * 10).toFixed(2)})
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Kelishuv shartlari (Nasiya shartlari) */}
            {(selectedClient.creditType || selectedClient.creditLimit) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Kelishuv shartlari (Nasiya)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-600 mb-1">Nasiya turi</div>
                    <div className="font-semibold text-gray-900">
                      {selectedClient.creditType === 'TASK_COUNT' 
                        ? 'Ma\'lum bir ish sonigacha'
                        : selectedClient.creditType === 'AMOUNT'
                        ? 'Ma\'lum bir summagacha'
                        : 'Nasiya yo\'q'}
                    </div>
                  </div>
                  {selectedClient.creditLimit && (
                    <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-gray-600 mb-1">
                        {selectedClient.creditType === 'TASK_COUNT' ? 'Ish soni limiti' : 'Summa limiti'}
                      </div>
                      <div className="font-semibold text-gray-900">
                        {selectedClient.creditType === 'TASK_COUNT'
                          ? `${Number(selectedClient.creditLimit)} ta ish`
                          : `$${Number(selectedClient.creditLimit).toFixed(2)}`}
                      </div>
                    </div>
                  )}
                  {selectedClient.creditStartDate && (
                    <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-gray-600 mb-1">Nasiya boshlangan sana</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(selectedClient.creditStartDate).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {selectedClient.creditType && selectedClient.creditLimit && (
                  <div className="mt-4 p-3 bg-blue-100/50 rounded-lg border border-blue-200">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Shart:</span>{' '}
                      {selectedClient.creditType === 'TASK_COUNT'
                        ? `${Number(selectedClient.creditLimit)} ta ishdan keyin to'lov qilish kerak`
                        : `Qardorlik $${Number(selectedClient.creditLimit).toFixed(2)} ga yetganda to'lov qilish kerak`}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-500 hover:from-blue-600 hover:to-blue-500 cursor-pointer relative"
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
              
              {/* Nasiya shartlari */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Nasiya shartlari (ixtiyoriy)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nasiya turi</label>
                    <select
                      value={editForm.creditType}
                      onChange={(e) => setEditForm({ ...editForm, creditType: e.target.value as 'TASK_COUNT' | 'AMOUNT' | '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Nasiya yo'q</option>
                      <option value="TASK_COUNT">Ma'lum bir ish sonigacha</option>
                      <option value="AMOUNT">Ma'lum bir summagacha</option>
                    </select>
                  </div>
                  {editForm.creditType && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {editForm.creditType === 'TASK_COUNT' ? 'Ish soni' : 'Summa (USD)'}
                        </label>
                        <input
                          type="number"
                          step={editForm.creditType === 'TASK_COUNT' ? '1' : '0.01'}
                          value={editForm.creditLimit}
                          onChange={(e) => setEditForm({ ...editForm, creditLimit: e.target.value })}
                          required={!!editForm.creditType}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder={editForm.creditType === 'TASK_COUNT' ? 'Masalan: 5' : 'Masalan: 1000'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nasiya boshlangan sana</label>
                        <input
                          type="date"
                          value={editForm.creditStartDate}
                          onChange={(e) => setEditForm({ ...editForm, creditStartDate: e.target.value })}
                          required={!!editForm.creditType}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                </div>
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
