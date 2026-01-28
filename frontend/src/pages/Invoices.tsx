import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '@iconify/react';
import {
  getTnvedProducts,
  addTnvedProduct,
  updateTnvedProduct,
  deleteTnvedProduct,
  type TnvedProduct,
} from '../utils/tnvedProducts';
import {
  getPackagingTypes,
  addPackagingType,
  updatePackagingType,
  deletePackagingType,
  type PackagingType,
} from '../utils/packagingTypes';

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
  const [duplicatingInvoiceId, setDuplicatingInvoiceId] = useState<number | null>(null);
  const [showTnvedSettingsModal, setShowTnvedSettingsModal] = useState(false);
  const [tnvedProducts, setTnvedProductsState] = useState<TnvedProduct[]>([]);
  const [editingTnvedId, setEditingTnvedId] = useState<string | null>(null);
  const [editTnvedName, setEditTnvedName] = useState('');
  const [editTnvedCode, setEditTnvedCode] = useState('');
  const [newTnvedName, setNewTnvedName] = useState('');
  const [newTnvedCode, setNewTnvedCode] = useState('');
  const [settingsTab, setSettingsTab] = useState<'tnved' | 'packaging'>('tnved');
  const [packagingTypes, setPackagingTypesState] = useState<PackagingType[]>([]);
  const [editingPackagingId, setEditingPackagingId] = useState<string | null>(null);
  const [editPackagingName, setEditPackagingName] = useState('');
  const [newPackagingName, setNewPackagingName] = useState('');

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

  useEffect(() => {
    if (showTnvedSettingsModal) {
      setTnvedProductsState(getTnvedProducts());
      setPackagingTypesState(getPackagingTypes());
      setEditingTnvedId(null);
      setNewTnvedName('');
      setNewTnvedCode('');
      setEditingPackagingId(null);
      setNewPackagingName('');
    }
  }, [showTnvedSettingsModal]);

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

  const handleDuplicateInvoice = async (invoice: Invoice) => {
    try {
      setDuplicatingInvoiceId(invoice.id);
      const fullRes = await apiClient.get(`/invoices/${invoice.id}`);
      const full = fullRes.data as {
        clientId: number;
        contractId?: number;
        contractNumber?: string;
        branchId: number;
        branch?: { id: number };
        date: string;
        currency: string;
        totalAmount: number;
        notes?: string;
        additionalInfo?: unknown;
        items: Array<{
          name: string;
          unit: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
          tnvedCode?: string;
          pluCode?: string;
          packageType?: string;
          grossWeight?: number;
          netWeight?: number;
          orderIndex?: number;
        }>;
      };
      const clientId = full.clientId;
      let branchId: number | undefined = full.branchId ?? (full.branch as { id: number } | undefined)?.id;
      if (branchId == null) {
        const tasksRes = await apiClient.get(`/tasks?clientId=${clientId}`);
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        const first = tasks[0] as { branch?: { id: number } } | undefined;
        branchId = first?.branch?.id;
      }
      if (!branchId && branches.length > 0) {
        branchId = branches[0].id;
      }
      if (!branchId) {
        alert('Filial topilmadi.');
        return;
      }
      const taskRes = await apiClient.post('/tasks', {
        clientId,
        branchId,
        title: `Invoice - ${full.contractNumber || invoice.contractNumber || 'nusxa'}`,
        comments: `Invoice dublikat. Asl: №${invoice.invoiceNumber}`,
        hasPsr: false,
      });
      const newTask = taskRes.data as { id: number };
      const items = (full.items || []).map((item: { orderIndex?: number }, i: number) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        tnvedCode: item.tnvedCode,
        pluCode: item.pluCode,
        packageType: item.packageType,
        grossWeight: item.grossWeight,
        netWeight: item.netWeight,
        orderIndex: item.orderIndex ?? i,
      }));
      await apiClient.post('/invoices', {
        taskId: newTask.id,
        clientId,
        contractId: full.contractId,
        contractNumber: full.contractNumber,
        date: full.date,
        currency: full.currency,
        totalAmount: full.totalAmount,
        notes: full.notes,
        additionalInfo: full.additionalInfo,
        items,
      });
      loadInvoices();
      navigate(`/invoices/task/${newTask.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error || 'Invoice dublikat qilishda xatolik');
    } finally {
      setDuplicatingInvoiceId(null);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTnvedSettingsModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Sozlamalar
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Yangi Invoice
          </button>
        </div>
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

      {/* TNVED Sozlamalar Modal */}
      {showTnvedSettingsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTnvedSettingsModal(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sozlamalar</h2>
              <button
                onClick={() => setShowTnvedSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Tablar */}
            <div className="flex gap-2 mb-4 border-b">
              <button
                type="button"
                onClick={() => setSettingsTab('tnved')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  settingsTab === 'tnved'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                TNVED mahsulotlar
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('packaging')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  settingsTab === 'packaging'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Qadoq turlari
              </button>
            </div>

            {settingsTab === 'tnved' && (
            <>
            {/* Yangi mahsulot qo'shish */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4 pb-4 border-b">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={newTnvedName}
                  onChange={(e) => setNewTnvedName(e.target.value)}
                  placeholder="Наименование товара"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={newTnvedCode}
                  onChange={(e) => setNewTnvedCode(e.target.value)}
                  placeholder="Код ТН ВЭД"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  maxLength={10}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (newTnvedName.trim() && newTnvedCode.trim()) {
                      addTnvedProduct(newTnvedName, newTnvedCode);
                      setTnvedProductsState(getTnvedProducts());
                      setNewTnvedName('');
                      setNewTnvedCode('');
                    }
                  }}
                  disabled={!newTnvedName.trim() || !newTnvedCode.trim()}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Qo&apos;shish
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Наименование товара</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 w-32">Код ТН ВЭД</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700 w-28">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tnvedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {editingTnvedId === p.id ? (
                          <input
                            type="text"
                            value={editTnvedName}
                            onChange={(e) => setEditTnvedName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <span>{p.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editingTnvedId === p.id ? (
                          <input
                            type="text"
                            value={editTnvedCode}
                            onChange={(e) => setEditTnvedCode(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            maxLength={10}
                          />
                        ) : (
                          <span>{p.code}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingTnvedId === p.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                updateTnvedProduct(p.id, editTnvedName, editTnvedCode);
                                setTnvedProductsState(getTnvedProducts());
                                setEditingTnvedId(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Saqlash"
                            >
                              <Icon icon="lucide:check" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTnvedId(null)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                              title="Bekor"
                            >
                              <Icon icon="lucide:x" className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTnvedId(p.id);
                                setEditTnvedName(p.name);
                                setEditTnvedCode(p.code);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Tahrirlash"
                            >
                              <Icon icon="lucide:pencil" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`"${p.name}" o'chirilsinmi?`)) {
                                  deleteTnvedProduct(p.id);
                                  setTnvedProductsState(getTnvedProducts());
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="O'chirish"
                            >
                              <Icon icon="lucide:trash-2" className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
            )}

            {settingsTab === 'packaging' && (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4 pb-4 border-b">
              <div className="sm:col-span-10">
                <input
                  type="text"
                  value={newPackagingName}
                  onChange={(e) => setNewPackagingName(e.target.value)}
                  placeholder="Qadoq turi nomi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (newPackagingName.trim()) {
                      addPackagingType(newPackagingName);
                      setPackagingTypesState(getPackagingTypes());
                      setNewPackagingName('');
                    }
                  }}
                  disabled={!newPackagingName.trim()}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Qo&apos;shish
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Вид упаковки</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700 w-28">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {packagingTypes.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {editingPackagingId === p.id ? (
                          <input
                            type="text"
                            value={editPackagingName}
                            onChange={(e) => setEditPackagingName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm max-w-xs"
                            autoFocus
                          />
                        ) : (
                          <span>{p.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingPackagingId === p.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                updatePackagingType(p.id, editPackagingName);
                                setPackagingTypesState(getPackagingTypes());
                                setEditingPackagingId(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Saqlash"
                            >
                              <Icon icon="lucide:check" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPackagingId(null)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                              title="Bekor"
                            >
                              <Icon icon="lucide:x" className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPackagingId(p.id);
                                setEditPackagingName(p.name);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Tahrirlash"
                            >
                              <Icon icon="lucide:pencil" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`"${p.name}" o'chirilsinmi?`)) {
                                  deletePackagingType(p.id);
                                  setPackagingTypesState(getPackagingTypes());
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="O'chirish"
                            >
                              <Icon icon="lucide:trash-2" className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
            )}

            <div className="flex justify-end items-center gap-2 mt-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowTnvedSettingsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Yopish
              </button>
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/task/${invoice.taskId}`)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Tahrirlash"
                      >
                        <Icon icon="lucide:pencil" className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateInvoice(invoice)}
                        disabled={duplicatingInvoiceId === invoice.id}
                        className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50"
                        title="Dublikat"
                      >
                        <Icon icon="lucide:copy" className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Invoice №${invoice.invoiceNumber} o'chirilsinmi?`)) return;
                          try {
                            await apiClient.delete(`/invoices/${invoice.id}`);
                            loadInvoices();
                          } catch (err: unknown) {
                            const e = err as { response?: { data?: { error?: string } } };
                            alert(e.response?.data?.error || 'Invoice o\'chirishda xatolik');
                          }
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="O'chirish"
                      >
                        <Icon icon="lucide:trash-2" className="w-5 h-5" />
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

