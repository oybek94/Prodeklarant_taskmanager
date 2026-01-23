import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { useAuth } from '../contexts/AuthContext';

interface Invoice {
  id: number;
  invoiceNumber: string;
  contractNumber?: string;
  taskId: number;
  clientId: number;
  date: string;
  currency: 'USD' | 'UZS';
  totalAmount: number;
  task?: {
    id: number;
    title: string;
    status: string;
  };
  client?: {
    id: number;
    name: string;
  };
  branch?: {
    id: number;
    name: string;
  };
}

interface Client {
  id: number;
  name: string;
}

interface Contract {
  id: number;
  contractNumber: string;
  contractDate: string;
  sellerName: string;
  buyerName: string;
}

interface Branch {
  id: number;
  name: string;
}

const Invoices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    loadInvoices();
    loadClients();
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadContracts(Number(selectedClientId));
    } else {
      setContracts([]);
      setSelectedContractId('');
    }
  }, [selectedClientId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/invoices');
      if (Array.isArray(response.data)) {
        setInvoices(response.data);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      if (Array.isArray(response.data)) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/branches');
      if (Array.isArray(response.data)) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    }
  };

  const loadContracts = async (clientId: number) => {
    try {
      setLoadingContracts(true);
      const response = await apiClient.get(`/contracts/client/${clientId}`);
      if (Array.isArray(response.data)) {
        setContracts(response.data);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      setContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedClientId) {
      alert('Iltimos, mijozni tanlang');
      return;
    }
    if (!selectedContractId) {
      alert('Iltimos, shartnomani tanlang');
      return;
    }

    try {
      setCreatingTask(true);
      
      // Client'ning birinchi task'idan branchId ni olish yoki default branch tanlash
      let branchId: number | undefined = undefined;
      
      try {
        // Client'ning birinchi task'ini topish
        const tasksResponse = await apiClient.get(`/tasks?clientId=${selectedClientId}`);
        if (Array.isArray(tasksResponse.data) && tasksResponse.data.length > 0) {
          const firstTask = tasksResponse.data[0];
          branchId = firstTask.branch?.id;
        }
      } catch (error) {
        console.error('Error loading client tasks:', error);
      }
      
      // Agar task topilmasa, default branch (Oltiariq) ni tanlash
      if (!branchId && branches.length > 0) {
        const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
        branchId = oltiariqBranch?.id || branches[0]?.id;
      }
      
      if (!branchId) {
        alert('Filial topilmadi. Iltimos, avval filial qo\'shing.');
        setCreatingTask(false);
        return;
      }

      // Tanlangan shartnoma ma'lumotlarini olish
      const contractResponse = await apiClient.get(`/contracts/${selectedContractId}`);
      const contract = contractResponse.data;
      
      // Task yaratish
      const taskTitle = `Invoice - ${contract.contractNumber}`;
      const taskResponse = await apiClient.post('/tasks', {
        clientId: Number(selectedClientId),
        branchId: branchId,
        title: taskTitle,
        comments: `Invoice yaratish uchun avtomatik yaratilgan task. Shartnoma: ${contract.contractNumber}`,
        hasPsr: false,
      });
      
      const createdTask = taskResponse.data;
      
      setShowCreateModal(false);
      // Invoice yaratish sahifasiga o'tish - taskId va contractId bilan
      navigate(`/invoices/task/${createdTask.id}?contractId=${selectedContractId}`);
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert(error.response?.data?.error || 'Task yaratishda xatolik yuz berdi');
    } finally {
      setCreatingTask(false);
    }
  };

  

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoice'lar</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Yangi Invoice
        </button>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Yangi Invoice yaratish</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mijoz tanlang *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setSelectedContractId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Mijoz tanlang</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedClientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shartnoma tanlang *
                  </label>
                  {loadingContracts ? (
                    <div className="text-sm text-gray-500 py-2">Yuklanmoqda...</div>
                  ) : contracts.length === 0 ? (
                    <div className="text-sm text-red-500 py-2">
                      Bu mijoz uchun shartnomalar topilmadi. Iltimos, mijoz profiliga kirib shartnoma qo'shing.
                    </div>
                  ) : (
                    <select
                      value={selectedContractId}
                      onChange={(e) => setSelectedContractId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Shartnoma tanlang</option>
                      {contracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.contractNumber} - {contract.buyerName} ({new Date(contract.contractDate).toLocaleDateString('uz-UZ')})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleCreateInvoice}
                  disabled={!selectedClientId || !selectedContractId || loadingContracts || creatingTask}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {creatingTask ? 'Yaratilmoqda...' : 'Yaratish'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedClientId('');
                    setSelectedContractId('');
                    setContracts([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Invoice'lar topilmadi. Yangi invoice yaratish uchun "Yangi Invoice" tugmasini bosing.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice №
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shartnoma №
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mijoz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Summa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.contractNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.task ? (
                      <button
                        onClick={() => navigate(`/tasks/${invoice.taskId}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {invoice.task.title}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <CurrencyDisplay
                      amount={invoice.totalAmount}
                      originalCurrency={invoice.currency}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/invoices/task/${invoice.taskId}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Tahrirlash
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Invoices;

