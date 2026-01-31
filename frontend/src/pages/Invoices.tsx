import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';
import DateInput from '../components/DateInput';
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
  additionalInfo?: { vehicleNumber?: string; [k: string]: unknown };
  task?: {
    id: number;
    title: string;
    status: string;
  };
  client?: {
    id: number;
    name: string;
  };
  contract?: {
    sellerName: string;
    buyerName: string;
    consigneeName?: string | null;
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
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [filters, setFilters] = useState<{
    branchId: string;
    clientId: string;
    startDate: string;
    endDate: string;
  }>({ branchId: '', clientId: '', startDate: '', endDate: '' });

  const filteredInvoices = useMemo(() => {
    let list = [...invoices];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((inv) => {
        const invoiceNum = (inv.invoiceNumber || '').toLowerCase();
        const clientName = (inv.client?.name || '').toLowerCase();
        const vehicleNum = (inv.additionalInfo?.vehicleNumber || '').toLowerCase();
        const contractNames = [
          inv.contract?.sellerName,
          inv.contract?.buyerName,
          inv.contract?.consigneeName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const contractNum = (inv.contractNumber || '').toLowerCase();
        return (
          invoiceNum.includes(q) ||
          clientName.includes(q) ||
          vehicleNum.includes(q) ||
          contractNames.includes(q) ||
          contractNum.includes(q)
        );
      });
    }
    if (filters.branchId) {
      list = list.filter((inv) => String(inv.branch?.id) === filters.branchId);
    }
    if (filters.clientId) {
      list = list.filter((inv) => String(inv.clientId) === filters.clientId);
    }
    if (filters.startDate) {
      list = list.filter((inv) => inv.date >= filters.startDate);
    }
    if (filters.endDate) {
      list = list.filter((inv) => inv.date <= filters.endDate);
    }
    return list;
  }, [invoices, searchQuery, filters]);

  const hasActiveFilters =
    searchQuery.trim() ||
    filters.branchId ||
    filters.clientId ||
    filters.startDate ||
    filters.endDate;

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
      // Dublikat qilinganda tovarlar tozalanadi — faqat shartnoma, mijoz, filial va qo'shimcha ma'lumotlar nusxalanadi
      const items: Array<{ name: string; unit: string; quantity: number; unitPrice: number; totalPrice: number }> = [];
      // Invoys huddi shundayligicha nusxalanadi — faqat invoice raqam, avtomobil raqami va tovarlar tozalanadi
      const sourceAdditionalInfo =
        full.additionalInfo != null && typeof full.additionalInfo === 'object'
          ? { ...(full.additionalInfo as Record<string, unknown>), vehicleNumber: '' }
          : undefined;
      // Shartnoma bo'yicha keyingi invoice raqamini olish
      let invoiceNumber: string | undefined;
      if (full.contractId) {
        const nextRes = await apiClient.get(`/invoices/next-number?contractId=${full.contractId}`);
        invoiceNumber = (nextRes.data as { nextNumber: string }).nextNumber;
      }
      const postRes = await apiClient.post('/invoices', {
        taskId: newTask.id,
        clientId,
        contractId: full.contractId,
        contractNumber: full.contractNumber,
        ...(invoiceNumber ? { invoiceNumber } : {}),
        date: full.date,
        currency: full.currency,
        totalAmount: 0,
        notes: full.notes,
        additionalInfo: sourceAdditionalInfo,
        items,
      });
      if (postRes.status >= 400) {
        const errData = postRes.data as { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } };
        const msg = typeof errData?.error === 'string' ? errData.error : (errData?.error as any)?.formErrors?.[0] || JSON.stringify(errData?.error) || 'Invoice dublikat qilishda xatolik';
        throw new Error(msg);
      }
      loadInvoices();
      const contractQuery = full.contractId ? `?contractId=${full.contractId}` : '';
      navigate(`/invoices/task/${newTask.id}${contractQuery}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invoice dublikat qilishda xatolik';
      alert(msg);
    } finally {
      setDuplicatingInvoiceId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const startItem =
    filteredInvoices.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredInvoices.length);

  useEffect(() => {
    setCurrentPage((prev) =>
      Math.min(prev, Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE)))
    );
  }, [filteredInvoices.length]);

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon icon="lucide:file-text" className="w-8 h-8 text-blue-600" />
          Invoice'lar
        </h1>
        <div className="flex items-center gap-2 relative">
          {/* Qidiruv va filtrlash */}
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className="relative p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm hover:shadow z-10"
            title="Qidirish va filtrlash"
          >
            <Icon icon="lucide:search" className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            )}
          </button>
          {showFiltersPanel && (
            <div className="absolute right-0 top-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-20 min-w-[500px] animate-slideIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Icon icon="lucide:filter" className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Qidiruv va filtrlash</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFiltersPanel(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Icon icon="lucide:search" className="w-3.5 h-3.5 text-blue-600" />
                    Qidirish
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon icon="lucide:search" className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Invoice №, mijoz, avtomobil raqami, shartnoma..."
                      className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <Icon icon="lucide:x" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Icon icon="lucide:building" className="w-3.5 h-3.5 text-blue-600" />
                    Filial
                  </label>
                  <select
                    value={filters.branchId}
                    onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm shadow-sm hover:border-gray-300"
                  >
                    <option value="">Barcha filiallar</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Icon icon="lucide:users" className="w-3.5 h-3.5 text-blue-600" />
                    Mijoz
                  </label>
                  <select
                    value={filters.clientId}
                    onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm shadow-sm hover:border-gray-300"
                  >
                    <option value="">Barcha mijozlar</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id.toString()}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Icon icon="lucide:calendar-range" className="w-3.5 h-3.5 text-blue-600" />
                    Sana oralig&apos;i
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <DateInput
                      value={filters.startDate}
                      onChange={(value) => setFilters({ ...filters, startDate: value })}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm shadow-sm hover:border-gray-300"
                      placeholder="Boshlanish"
                    />
                    <DateInput
                      value={filters.endDate}
                      onChange={(value) => setFilters({ ...filters, endDate: value })}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm shadow-sm hover:border-gray-300"
                      placeholder="Tugash"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Icon icon="lucide:files" className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium text-gray-700">
                      {filteredInvoices.length} ta natija
                    </span>
                    {hasActiveFilters && (
                      <span className="text-gray-500">(filtrlangan)</span>
                    )}
                  </div>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({ branchId: '', clientId: '', startDate: '', endDate: '' });
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md border border-gray-300"
                  >
                    <Icon icon="lucide:x-circle" className="w-3.5 h-3.5" />
                    Filtrlarni tozalash
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setShowTnvedSettingsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
          >
            <Icon icon="lucide:settings" className="w-4 h-4" />
            Sozlamalar
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Yangi Invoice
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Icon icon="lucide:file-text" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-1">Invoice&apos;lar topilmadi.</p>
          <p className="text-sm text-gray-400">Yangi invoice yaratish uchun &quot;Yangi Invoice&quot; tugmasini bosing.</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Icon icon="lucide:search" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-1">Filtrlarga mos natija topilmadi.</p>
          <p className="text-sm text-gray-400">Qidiruv yoki filtrlarni o&apos;zgartiring.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:hash" className="w-4 h-4 text-gray-500" />
                    Invoice №
                  </span>
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:user" className="w-4 h-4 text-gray-500" />
                    Mijoz
                  </span>
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:car" className="w-4 h-4 text-gray-500" />
                    Avtomobil raqami
                  </span>
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:building-2" className="w-4 h-4 text-gray-500" />
                    Sotuvchi/sotib oluvchi/Yukni qabul qiluvchi
                  </span>
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-500" />
                    Sana
                  </span>
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:dollar-sign" className="w-4 h-4 text-gray-500" />
                    Summa
                  </span>
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="lucide:sliders-horizontal" className="w-4 h-4 text-gray-500" />
                    Amallar
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-2 whitespace-nowrap text-sm font-semibold text-blue-700">
                    #{invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800">
                    {invoice.client?.name || '-'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 font-mono">
                    {invoice.additionalInfo?.vehicleNumber || '-'}
                  </td>
                  <td className="px-6 py-2 text-sm text-gray-700 max-w-xs truncate" title={[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName].filter(Boolean).join(' / ') || undefined}>
                    {[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName]
                      .filter(Boolean)
                      .join(' / ') || '-'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                    <CurrencyDisplay
                      amount={invoice.totalAmount}
                      originalCurrency={invoice.currency}
                    />
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/task/${invoice.taskId}`)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Tahrirlash"
                      >
                        <Icon icon="lucide:pencil" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateInvoice(invoice)}
                        disabled={duplicatingInvoiceId === invoice.id}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Dublikat"
                      >
                        <Icon icon="lucide:copy" className="w-4 h-4" />
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
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                        title="O'chirish"
                      >
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredInvoices.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-600">
                {startItem}-{endItem} / {filteredInvoices.length} invoice
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Oldingi sahifa"
                >
                  <Icon icon="lucide:chevron-left" className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-0.5 mx-2">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) pageNum = i + 1;
                    else if (currentPage <= 4) pageNum = i + 1;
                    else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
                    else pageNum = currentPage - 3 + i;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Keyingi sahifa"
                >
                  <Icon icon="lucide:chevron-right" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Invoices;

