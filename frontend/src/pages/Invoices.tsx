import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../lib/api';
import CurrencyDisplay from '../components/CurrencyDisplay';
import DateInput from '../components/DateInput';
import { useAuth } from '../contexts/AuthContext';
import Tasks from './Tasks';
import Clients from './Clients';
import { Icon } from '@iconify/react';

import { useSocket } from '../contexts/SocketContext';
import { useIsMobile } from '../utils/useIsMobile';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  invoiceNumber: string;
  contractNumber?: string;
  contractId?: number;
  taskId: number;
  clientId: number;
  date: string;
  currency: 'USD' | 'UZS';
  totalAmount: number;
  additionalInfo?: { vehicleNumber?: string;[k: string]: unknown };
  task?: {
    id: number;
    title: string;
    status: string;
    branch?: { id: number; name: string };
    stages?: { name: string; status: string }[];
    _count?: { errors: number };
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

const canEditInvoices = (role: string | undefined) => role === 'ADMIN' || role === 'MANAGER' || role === 'DEKLARANT';

const Invoices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canEdit = canEditInvoices(user?.role);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [createTaskForm, setCreateTaskForm] = useState<{
    branchId: string;
    hasPsr: boolean;
    driverPhone: string;
    comments: string;
  }>({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [duplicatingInvoiceId, setDuplicatingInvoiceId] = useState<number | null>(null);
  const [duplicateInvoiceId, setDuplicateInvoiceId] = useState<number | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [invoiceForErrorModal, setInvoiceForErrorModal] = useState<Invoice | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const [deleteModalAnimated, setDeleteModalAnimated] = useState(false);
  const [deleteModalClosing, setDeleteModalClosing] = useState(false);
  const [showTaskModalId, setShowTaskModalId] = useState<number | null>(null);
  const [showClientModalId, setShowClientModalId] = useState<number | null>(null);
  const [showContractModalId, setShowContractModalId] = useState<number | null>(null);
  const [workers, setWorkers] = useState<{ id: number; name: string; role?: string }[]>([]);
  const [errorForm, setErrorForm] = useState({
    workerId: '',
    stageName: '',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const filtersPanelRef = useRef<HTMLDivElement>(null);
  const [openTemplateDropdownId, setOpenTemplateDropdownId] = useState<number | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState<string | null>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFiltersPanel && filtersPanelRef.current && !filtersPanelRef.current.contains(event.target as Node)) {
        setShowFiltersPanel(false);
      }
      if (openTemplateDropdownId !== null && templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setOpenTemplateDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFiltersPanel, openTemplateDropdownId]);

  const [filters, setFilters] = useState<{
    branchId: string;
    clientId: string;
    startDate: string;
    endDate: string;
  }>({ branchId: '', clientId: '', startDate: '', endDate: '' });


  const hasActiveFilters =
    searchQuery.trim() ||
    filters.branchId ||
    filters.clientId ||
    filters.startDate ||
    filters.endDate;

  useEffect(() => {
    loadClients();
    loadBranches();
    loadWorkers();
  }, []);

  const openErrorModalForTaskId = (location.state as { openErrorModalForTaskId?: number })?.openErrorModalForTaskId;
  useEffect(() => {
    if (!openErrorModalForTaskId || invoices.length === 0) return;
    const inv = invoices.find((i) => i.taskId === openErrorModalForTaskId);
    if (inv) {
      setInvoiceForErrorModal(inv);
      setErrorForm({
        workerId: '',
        stageName: '',
        amount: '',
        comment: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowErrorModal(true);
    }
    navigate('/invoices', { replace: true, state: {} });
  }, [openErrorModalForTaskId, invoices]);

  useEffect(() => {
    if (showDeleteConfirmModal && invoiceToDelete && !deleteModalClosing) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDeleteModalAnimated(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!showDeleteConfirmModal) setDeleteModalAnimated(false);
  }, [showDeleteConfirmModal, invoiceToDelete, deleteModalClosing]);

  useEffect(() => {
    if (!deleteModalClosing) return;
    const t = setTimeout(() => {
      setShowDeleteConfirmModal(false);
      setInvoiceToDelete(null);
      setDeleteModalClosing(false);
      setDeleteModalAnimated(false);
    }, 220);
    return () => clearTimeout(t);
  }, [deleteModalClosing]);

  useEffect(() => {
    if (selectedClientId) {
      loadContracts(Number(selectedClientId));
    } else {
      setContracts([]);
      setSelectedContractId('');
    }
  }, [selectedClientId]);

  const [totalCount, setTotalCount] = useState(0);
  const [totalPagesServer, setTotalPagesServer] = useState(1);

  // loadInvoices function debounced with search query
  const loadInvoices = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get(`/invoices?${params.toString()}`);
      
      if (response.data && response.data.pagination) {
        setInvoices(response.data.invoices);
        setTotalCount(response.data.pagination.total);
        setTotalPagesServer(response.data.pagination.totalPages);
      } else if (Array.isArray(response.data)) {
        setInvoices(response.data);
        setTotalCount(response.data.length);
        setTotalPagesServer(Math.max(1, Math.ceil(response.data.length / PAGE_SIZE)));
      } else {
        setInvoices([]);
        setTotalCount(0);
        setTotalPagesServer(1);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
      setTotalCount(0);
      setTotalPagesServer(1);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [currentPage, searchQuery, filters]);

  // Execute search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 400); // Debounce qidiruv
    return () => clearTimeout(timer);
  }, [loadInvoices]);

  const socket = useSocket();

  // Socket.io: real-time invoice/task yangilanishlarni tinglash
  useEffect(() => {
    if (!socket) return;

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        const now = audioCtx.currentTime;

        // Pleasant "ding-ding" sound
        oscillator.frequency.setValueAtTime(523.25, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        oscillator.frequency.setValueAtTime(659.25, now + 0.15);
        gainNode.gain.setValueAtTime(0, now + 0.15);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.17);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
      } catch (e) {
        console.error('Audio play blocked:', e);
      }
    };

    const refresh = () => loadInvoices(true);
    
    const onTaskUpdated = (data: any) => { 
      console.log('Socket event (task) received in Invoices:', data);
      const action = data.deletedBy ? "o'chirdi" : data.createdBy ? "yaratdi" : "o'zgartirdi";
      const user = data.updatedBy || data.createdBy || data.deletedBy || 'Foydalanuvchi';
      const target = data?.task?.title ? `"${data.task.title}" taskini` : "Taskni";
      
      playNotificationSound();
      toast(`${user} ${target} ${action}`, { icon: '✏️' });
      refresh(); 
    };
    const onTaskStageUpdated = (data: any) => { 
      console.log('Socket event (taskStage) received in Invoices:', data);
      const stageName = data?.stage?.name || "Jarayon";
      const newStatus = data?.stage?.status || "yangilangan";
      const userName = data.updatedBy || "Foydalanuvchi";
      
      playNotificationSound();
      toast(`${userName} "${stageName}" bosqichini ${newStatus} holatiga o'tkazdi`, { icon: '🔄' });
      refresh(); 
    };
    const onInvoiceSaved = (data: any) => { 
      console.log('Socket event (invoice) received in Invoices:', data);
      toast(`Invoice saqlandi`, { icon: '💾' });
      refresh(); 
    };
    const onInvoiceDeleted = (data: any) => { 
      console.log('Socket event (invoice deleted) received in Invoices:', data);
      toast(`Invoice o'chirildi`, { icon: '🗑️' });
      refresh(); 
    };
    
    socket.on('task:created', onTaskUpdated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskUpdated);
    socket.on('task:stageUpdated', onTaskStageUpdated);
    socket.on('invoice:saved', onInvoiceSaved);
    socket.on('invoice:deleted', onInvoiceDeleted);

    return () => {
      socket.off('task:created', onTaskUpdated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskUpdated);
      socket.off('task:stageUpdated', onTaskStageUpdated);
      socket.off('invoice:saved', onInvoiceSaved);
      socket.off('invoice:deleted', onInvoiceDeleted);
    };
  }, [socket, loadInvoices]);

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients?selectList=true');
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

  const loadWorkers = async () => {
    try {
      if (user?.role === 'ADMIN') {
        const response = await apiClient.get('/users');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      } else {
        const response = await apiClient.get('/workers');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      setWorkers([]);
    }
  };

  const downloadInvoiceTemplate = useCallback(async (
    invoiceId: number,
    invoiceNumber: string,
    templateKey: string
  ) => {
    const templateLabel = templateKey;
    setDownloadingTemplate(`${invoiceId}-${templateKey}`);
    try {
      let endpoint = '';
      let fileName = '';
      const safe = (invoiceNumber || String(invoiceId)).replace(/[\\/:\*?"<>|]+/g, '_');

      if (templateKey === 'TIR') {
        endpoint = `/invoices/${invoiceId}/tir`;
        fileName = `TIR_${safe}.xlsx`;
      } else if (templateKey === 'SMR') {
        endpoint = `/invoices/${invoiceId}/cmr`;
        fileName = `SMR_${safe}.xlsx`;
      } else if (templateKey === 'Tashqi') {
        endpoint = `/invoices/${invoiceId}/fss?template=tashqi`;
        fileName = `TASHQI_${safe}.xlsx`;
      } else if (templateKey === 'ST-1') {
        endpoint = `/invoices/${invoiceId}/st1`;
        fileName = `ST1_${safe}.xlsx`;
      } else if (templateKey === 'InvoysPechatli') {
        endpoint = `/invoices/${invoiceId}/pdf`;
        fileName = `Invoys_${safe}.pdf`;
      } else if (templateKey === 'InvoysPechatsiz') {
        endpoint = `/invoices/${invoiceId}/pdf`;
        fileName = `Invoys_pechatsiz_${safe}.pdf`;
      } else if (templateKey === 'InvoysExcel') {
        endpoint = `/invoices/${invoiceId}/xlsx`;
        fileName = `Invoys_${safe}.xlsx`;
      } else if (templateKey === 'Deklaratsiya') {
        endpoint = `/invoices/${invoiceId}/commodity-ek`;
        fileName = `Deklaratsiya_${safe}.xlsx`;
      }

      if (!endpoint) return;

      const response = await apiClient.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Error downloading ${templateLabel}:`, error);
      alert(error?.response?.data?.error || error?.message || `${templateLabel} yuklab olishda xatolik yuz berdi`);
    } finally {
      setDownloadingTemplate(null);
      setOpenTemplateDropdownId(null);
    }
  }, []);


  const loadContracts = async (clientId: number) => {
    try {
      setLoadingContracts(true);
      const response = await apiClient.get(`/contracts/client/${clientId}?selectList=true`);
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
    if (!createTaskForm.branchId) {
      alert('Iltimos, filialni tanlang');
      return;
    }

    try {
      setCreatingTask(true);

      // Tanlangan shartnoma ma'lumotlarini olish (task faqat invoys saqlanganda yaratiladi)
      const contractResponse = await apiClient.get(`/contracts/${selectedContractId}`);
      const contract = contractResponse.data;

      const taskTitle = `Invoice - ${contract.contractNumber}`;
      const taskComments =
        createTaskForm.comments.trim() ||
        `Invoice yaratish uchun. Shartnoma: ${contract.contractNumber}`;

      setShowCreateModal(false);
      setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
      // Invoys sahifasiga o'tish — task yaratilmaydi; task faqat "Saqlash" bosilganda yaratiladi
      navigate(`/invoices/client/${selectedClientId}/contract/${selectedContractId}`, {
        state: {
          newInvoiceTaskForm: {
            branchId: createTaskForm.branchId,
            hasPsr: createTaskForm.hasPsr,
            driverPhone: createTaskForm.driverPhone.trim() || undefined,
            comments: taskComments,
            contractNumber: contract.contractNumber,
          },
          ...(duplicateInvoiceId ? { duplicateInvoiceId } : {}),
        },
      });
      setDuplicateInvoiceId(null);
    } catch (error: any) {
      console.error('Error loading contract:', error);
      alert(error.response?.data?.error || 'Shartnoma ma\'lumotlarini yuklashda xatolik');
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
      };
      setSelectedClientId(String(full.clientId));
      setSelectedContractId(full.contractId ? String(full.contractId) : '');
      setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
      setDuplicateInvoiceId(invoice.id);
      setShowCreateModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invoice ma\'lumotlarini yuklashda xatolik';
      alert(msg);
    } finally {
      setDuplicatingInvoiceId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const getStatusBadgeClass = (status: string | undefined): string => {
    if (!status) return 'bg-gray-100 text-gray-500 dark:bg-slate-800/50 dark:text-slate-400';
    const s = status.toUpperCase();
    if (s === 'BOSHLANMAGAN') return 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-transparent dark:border-slate-700';
    if (s === 'JARAYONDA') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-transparent dark:border-amber-800/50';
    if (s === 'TAYYOR') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50';
    if (s === 'TEKSHIRILGAN') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50';
    if (s === 'TOPSHIRILDI') return 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50';
    if (s === 'YAKUNLANDI') return 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50';
    return 'bg-gray-100 text-gray-600 dark:bg-slate-800/50 dark:text-slate-400 border border-transparent dark:border-slate-700';
  };

  /** Filial ustunidagi rang — Tasks kartochkalaridagi kabi (faqat filial katagida) */
  const FILIAL_CELL_COLORS = [
    'bg-indigo-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50',
    'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border border-transparent dark:border-violet-800/50',
  ];
  const getBranchCellClass = (branchName: string | undefined, branchId: number | undefined): string => {
    if (!branchName) return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-transparent dark:border-slate-700';
    if (branchName === 'Oltiariq') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-transparent dark:border-amber-800/50';
    if (branchName === 'Toshkent') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent dark:border-blue-800/50';
    if (branchName === 'Sirdaryo' || branchName?.includes('irdaryo')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-transparent dark:border-emerald-800/50';
    if (branchName === 'Surxondaryo' || branchName?.includes('Surxon')) return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border border-transparent dark:border-violet-800/50';
    const sorted = [...(branches || [])].sort((a, b) => a.id - b.id);
    const idx = branchId != null ? sorted.findIndex((b) => b.id === branchId) : -1;
    if (idx >= 0) return FILIAL_CELL_COLORS[idx % FILIAL_CELL_COLORS.length];
    return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-transparent dark:border-slate-700';
  };

  const totalPages = totalPagesServer;
  const paginatedInvoices = invoices;
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  useEffect(() => {
    setCurrentPage((prev) =>
      Math.min(prev, Math.max(1, totalPagesServer))
    );
  }, [totalPagesServer]);

  if (loading) {
    return <div className="p-6">Yuklanmoqda...</div>;
  }

  return (
    <div className="flex-1 flex flex-col sm:min-h-0 bg-transparent px-2 sm:px-0">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Icon icon="lucide:file-text" className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-200 tracking-tight flex items-center gap-3 flex-wrap">
            Invoice'lar
            <span className="hidden sm:inline-flex text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700/60 shadow-sm items-center">
              Barcha schyot-fakturalarni boshqarish
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* Qidiruv va filtrlash */}
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-2 p-2 sm:p-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm z-10 ${showFiltersPanel && !isMobile ? 'opacity-0 pointer-events-none' : ''}`}
            title="Qidirish va filtrlash"
          >
            <Icon icon="lucide:filter" className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Filtrlar</span>
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                {Object.values(filters).filter(Boolean).length + (searchQuery.trim() ? 1 : 0)}
              </span>
            )}
          </button>
          
          {showFiltersPanel && isMobile && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
              onClick={() => setShowFiltersPanel(false)}
            />
          )}

          {showFiltersPanel && (
            <div 
              ref={filtersPanelRef} 
              className={`${isMobile 
                ? 'fixed inset-x-0 bottom-0 h-[85vh] w-full rounded-t-3xl' 
                : 'absolute right-0 top-0 min-w-[500px] rounded-2xl'
              } bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-slate-700 p-5 z-[100] animate-slideIn`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Icon icon="lucide:filter" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Qidiruv va filtrlash</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Hamma maydonlar bo'yicha</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFiltersPanel(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700 rounded-full transition-colors"
                >
                  <Icon icon="lucide:x" className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                    <Icon icon="lucide:search" className="w-3.5 h-3.5 text-indigo-500" />
                    Asosiy qidiruv
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
                      className="w-full pl-10 pr-9 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                         <Icon icon="lucide:x" className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                      <Icon icon="lucide:building" className="w-3.5 h-3.5 text-indigo-500" />
                      Filial
                    </label>
                    <select
                      value={filters.branchId}
                      onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
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
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                      <Icon icon="lucide:users" className="w-3.5 h-3.5 text-indigo-500" />
                      Mijoz
                    </label>
                    <select
                      value={filters.clientId}
                      onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                    >
                      <option value="">Barcha mijozlar</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id.toString()}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                    <Icon icon="lucide:calendar-range" className="w-3.5 h-3.5 text-indigo-500" />
                    Sana oralig'i
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">Dan</p>
                      <DateInput
                        value={filters.startDate}
                        onChange={(value) => setFilters({ ...filters, startDate: value })}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">Gacha</p>
                      <DateInput
                        value={filters.endDate}
                        onChange={(value) => setFilters({ ...filters, endDate: value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ branchId: '', clientId: '', startDate: '', endDate: '' });
                      setSearchQuery('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-sm"
                  >
                    Filtrni tozalash
                  </button>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setShowFiltersPanel(false)}
                      className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none text-sm"
                    >
                      Natijalarni ko'rish
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setDuplicateInvoiceId(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98]"
            >
              <Icon icon="lucide:plus-circle" className="w-5 h-5" />
              <span className="hidden sm:inline font-semibold text-sm">Yangi Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Create Invoice Modal (yangi invoice yoki dublikat) */}
      {canEdit && showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
              setDuplicateInvoiceId(null);
              setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Yangi Invoice yaratish</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setDuplicateInvoiceId(null);
                }}
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
                      Bu mijoz uchun shartnomalar topilmadi. Iltimos, mijoz profiliga kirib shartnoma qo&apos;shing.
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

              {/* Filial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Icon icon="lucide:building" className="w-4 h-4 text-blue-600" />
                  Filial *
                </label>
                <div className="flex flex-wrap gap-2">
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() =>
                          setCreateTaskForm((f) => ({ ...f, branchId: branch.id.toString() }))
                        }
                        className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${createTaskForm.branchId === branch.id.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                          }`}
                      >
                        {branch.name}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 py-2">Filiallar yuklanmoqda...</div>
                  )}
                </div>
              </div>

              {/* PSR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
                  PSR *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreateTaskForm((f) => ({ ...f, hasPsr: true }))
                    }
                    className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${createTaskForm.hasPsr === true
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                  >
                    Bor
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateTaskForm((f) => ({ ...f, hasPsr: false }))
                    }
                    className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${createTaskForm.hasPsr === false
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                  >
                    Yo&apos;q
                  </button>
                </div>
              </div>

              {/* Sho'pir tel raqami */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Icon icon="lucide:phone" className="w-4 h-4 text-blue-600" />
                  Sho&apos;pir tel raqami
                </label>
                <input
                  type="tel"
                  value={createTaskForm.driverPhone}
                  onChange={(e) =>
                    setCreateTaskForm((f) => ({ ...f, driverPhone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                  placeholder="+998901234567"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Icon icon="lucide:message-square" className="w-4 h-4 text-blue-600" />
                  Comments
                </label>
                <textarea
                  value={createTaskForm.comments}
                  onChange={(e) =>
                    setCreateTaskForm((f) => ({ ...f, comments: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm resize-none"
                  rows={3}
                  placeholder="Izohlar..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateInvoice}
                  disabled={
                    !selectedClientId ||
                    !selectedContractId ||
                    !createTaskForm.branchId ||
                    loadingContracts ||
                    creatingTask
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {creatingTask ? 'Yaratilmoqda...' : 'Yaratish'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setDuplicateInvoiceId(null);
                    setSelectedClientId('');
                    setSelectedContractId('');
                    setContracts([]);
                    setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
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
      {invoices.length === 0 && !hasActiveFilters ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-16 text-center lg:py-24 ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Icon icon="lucide:file-text" className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Invoice'lar hozircha yo&apos;q</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Yangi invoice yaratish uchun yuqoridagi &quot;Yangi Invoice&quot; tugmasini bosing va jarayonni boshlang.</p>
        </div>
      ) : totalCount === 0 && hasActiveFilters ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-16 text-center ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-200/50">
            <Icon icon="lucide:search" className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Natija topilmadi</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Siz qidirayotgan qidiruv so&apos;rovi yoki filtrlarga mos keluvchi invoice topilmadi.</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          {paginatedInvoices.map((invoice) => {
            const hasErrors = (invoice.task?._count?.errors ?? 0) > 0;
            const branchName = invoice.task?.branch?.name ?? invoice.branch?.name ?? '-';
            const branchId = invoice.task?.branch?.id ?? invoice.branch?.id;
            const filialCellClass = getBranchCellClass(branchName, branchId);
            
            return (
              <div 
                key={invoice.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/invoices/task/${invoice.taskId}`);
                }}
                className={`cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${hasErrors ? 'border-l-4 border-l-red-500 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'} p-3 space-y-2`}
              >
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/invoices/task/${invoice.taskId}`, { state: { viewOnly: true } })}
                    className="text-blue-600 dark:text-blue-400 font-bold text-base hover:underline"
                  >
                    #{invoice.invoiceNumber}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskModalId(invoice.taskId)}
                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(invoice.task?.status)}`}
                  >
                    {invoice.task?.status ?? '—'}
                  </button>
                </div>

                <div className="text-xs space-y-2 pt-1">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-[10px] uppercase font-semibold">Mijoz</p>
                      <p className="font-bold text-gray-900 dark:text-slate-200 text-sm truncate">
                        {invoice.clientId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowClientModalId(invoice.clientId);
                              setShowContractModalId(null);
                            }}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left"
                          >
                            {invoice.client?.name || '-'}
                          </button>
                        ) : (
                          invoice.client?.name || '-'
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-[10px] uppercase font-semibold">Filial</p>
                      <span className={`inline-block w-20 text-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${filialCellClass}`}>
                        {branchName}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700/50 pt-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-semibold">Avto</p>
                        <p className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm tracking-widest">{invoice.additionalInfo?.vehicleNumber || '-'}</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/task/${invoice.taskId}`, { state: { viewOnly: true } })}
                        className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 border border-gray-100 dark:border-gray-600 active:scale-95 transition-transform"
                      >
                        <Icon icon="lucide:eye" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/task/${invoice.taskId}`)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 border border-blue-100/50 dark:border-blue-800 active:scale-95 transition-transform"
                      >
                        <Icon icon="lucide:pencil" className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDuplicateInvoice(invoice)}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 border border-emerald-100/50 dark:border-emerald-800 active:scale-95 transition-transform"
                        >
                          <Icon icon="lucide:copy" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-gray-700/50 overflow-visible ring-1 ring-black/5 dark:ring-white/5">
          <div className="flex-1 overflow-visible sm:overflow-auto bg-transparent">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100/80 dark:border-gray-700/80">
                  <th className="w-28 px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:hash" className="w-4 h-4 text-blue-500" />
                      №
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:user" className="w-4 h-4 text-emerald-500" />
                      Mijoz
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:map-pin" className="w-4 h-4 text-indigo-500" />
                      Filial
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:car" className="w-4 h-4 text-amber-500" />
                      Avtomobil
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:building-2" className="w-4 h-4 text-purple-500" />
                      Sotuvchi / Qabul qiluvchi
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:calendar" className="w-4 h-4 text-cyan-500" />
                      Sana
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="lucide:circle-dot" className="w-4 h-4 text-rose-500" />
                      Status
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors pr-8">
                    <span className="inline-flex items-center gap-1.5 justify-end w-full">
                      <Icon icon="lucide:sliders-horizontal" className="w-4 h-4 text-slate-500" />
                      Amallar
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60 dark:divide-gray-700/60 bg-white/40 dark:bg-gray-800/40">
                {paginatedInvoices.map((invoice) => {
                  const hasErrors = (invoice.task?._count?.errors ?? 0) > 0;
                  const branchId = invoice.task?.branch?.id ?? invoice.branch?.id;
                  const branchName = invoice.task?.branch?.name ?? invoice.branch?.name ?? undefined;
                  const filialCellClass = getBranchCellClass(branchName, branchId);
                  return (
                    <tr
                      key={invoice.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                        navigate(`/invoices/task/${invoice.taskId}`);
                      }}
                      className={`group transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${hasErrors ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <td className="w-28 px-4 py-2 whitespace-nowrap text-sm font-semibold">
                        <button
                          type="button"
                          onClick={() => navigate(`/invoices/task/${invoice.taskId}`, { state: { viewOnly: true } })}
                          className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline cursor-pointer text-left"
                        >
                          #{invoice.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {invoice.clientId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowClientModalId(invoice.clientId);
                              setShowContractModalId(null);
                            }}
                            className="text-left w-full hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline focus:outline-none focus:ring-0"
                          >
                            {invoice.client?.name || '-'}
                          </button>
                        ) : (
                          (invoice.client?.name || '-')
                        )}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center justify-center w-24 text-center px-1 py-1 rounded-md font-medium ${filialCellClass}`}>
                          {invoice.task?.branch?.name ?? invoice.branch?.name ?? '-'}
                        </span>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {invoice.additionalInfo?.vehicleNumber || '-'}
                      </td>
                      <td className="px-6 py-2 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName].filter(Boolean).join(' / ') || undefined}>
                        {invoice.clientId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowClientModalId(invoice.clientId);
                              setShowContractModalId(invoice.contractId || null);
                            }}
                            className="text-left w-full hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline focus:outline-none focus:ring-0 truncate block"
                          >
                            {[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </button>
                        ) : (
                          <span>
                            {[invoice.contract?.sellerName, invoice.contract?.buyerName, invoice.contract?.consigneeName]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          onClick={() => setShowTaskModalId(invoice.taskId)}
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-shadow ${getStatusBadgeClass(invoice.task?.status)}`}
                          title="Jarayonlar (task tafsilotlari)"
                        >
                          {invoice.task?.status ?? '—'}
                        </button>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/invoices/task/${invoice.taskId}`, { state: { viewOnly: true } })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 transition-all hover:shadow"
                            title="Invoysni ko'rish"
                          >
                            <Icon icon="lucide:eye" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/tasks/${invoice.taskId}/edit`)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition-all hover:shadow"
                            title="Taskni tahrirlash"
                          >
                            <Icon icon="lucide:clipboard-list" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/invoices/task/${invoice.taskId}`)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:text-blue-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm ring-1 ring-blue-200/60 dark:ring-slate-700 transition-all hover:shadow"
                            title="Tahrirlash"
                          >
                            <Icon icon="lucide:pencil" className="w-4 h-4" />
                          </button>

                          {/* Shablonlar dropdown */}
                          <div className="relative" ref={openTemplateDropdownId === invoice.id ? templateDropdownRef : undefined} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenTemplateDropdownId(openTemplateDropdownId === invoice.id ? null : invoice.id)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shadow-sm ring-1 transition-all hover:shadow ${openTemplateDropdownId === invoice.id ? 'text-violet-700 bg-violet-100 ring-violet-300 dark:bg-violet-900/50 dark:text-violet-300 dark:ring-violet-600' : 'text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-700 ring-violet-200/60 dark:ring-slate-700'}`}
                              title="Shablonlarni yuklab olish"
                            >
                              <Icon icon="lucide:download" className="w-4 h-4" />
                            </button>
                            {openTemplateDropdownId === invoice.id && (
                              <div className="absolute right-0 top-9 z-[200] min-w-[215px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 py-1.5">
                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700/60 mb-1">
                                  Shablonlar yuklab olish
                                </div>
                                {[
                                  { key: 'TIR', label: 'TIR', icon: 'lucide:truck', color: 'text-blue-600 dark:text-blue-400' },
                                  { key: 'SMR', label: 'SMR (CMR)', icon: 'lucide:file-text', color: 'text-cyan-600 dark:text-cyan-400' },
                                  { key: 'Tashqi', label: 'Tashqi (FSS)', icon: 'lucide:globe', color: 'text-emerald-600 dark:text-emerald-400' },
                                  { key: 'ST-1', label: 'ST-1', icon: 'lucide:award', color: 'text-amber-600 dark:text-amber-400' },
                                  { key: 'InvoysPechatli', label: 'Invoys (Pechatli)', icon: 'lucide:stamp', color: 'text-rose-600 dark:text-rose-400' },
                                  { key: 'InvoysPechatsiz', label: 'Invoys (Pechatsiz)', icon: 'lucide:file', color: 'text-pink-600 dark:text-pink-400' },
                                  { key: 'InvoysExcel', label: 'Invoys (Excel)', icon: 'lucide:table-2', color: 'text-green-600 dark:text-green-400' },
                                  { key: 'Deklaratsiya', label: 'Deklaratsiya', icon: 'lucide:scroll', color: 'text-purple-600 dark:text-purple-400' },
                                ].map((tmpl) => (
                                  <button
                                    key={tmpl.key}
                                    type="button"
                                    disabled={downloadingTemplate === `${invoice.id}-${tmpl.key}`}
                                    onClick={() => downloadInvoiceTemplate(invoice.id, invoice.invoiceNumber, tmpl.key)}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {downloadingTemplate === `${invoice.id}-${tmpl.key}` ? (
                                      <Icon icon="lucide:loader-2" className={`w-4 h-4 animate-spin ${tmpl.color}`} />
                                    ) : (
                                      <Icon icon={tmpl.icon} className={`w-4 h-4 ${tmpl.color}`} />
                                    )}
                                    <span className="font-medium">{tmpl.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDuplicateInvoice(invoice)}
                                disabled={duplicatingInvoiceId === invoice.id}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 shadow-sm ring-1 ring-emerald-200/60 dark:ring-slate-700 transition-all disabled:opacity-50 hover:shadow"
                                title="Dublikat"
                              >
                                <Icon icon="lucide:copy" className="w-4 h-4" />
                              </button>
                              {(() => {
                                const taskStatus = invoice.task?.status;
                                const isEarlyTask = taskStatus === 'BOSHLANMAGAN';
                                const invoysStageReady = invoice.task?.stages?.some(
                                  (s) => String(s.name).trim().toLowerCase() === 'invoys' && s.status === 'TAYYOR'
                                );
                                const canDelete = Boolean(isEarlyTask && !invoysStageReady);
                                if (!canDelete) return null;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInvoiceToDelete(invoice);
                                      setShowDeleteConfirmModal(true);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-slate-700 shadow-sm ring-1 ring-rose-200/60 dark:ring-slate-700 transition-all hover:shadow"
                                    title="O'chirish"
                                  >
                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                  </button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(totalPagesServer > 1 || totalCount > PAGE_SIZE) && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100/60 bg-white/50 backdrop-blur-sm">
              <p className="text-sm text-gray-600">
                {startItem}-{endItem} / {totalCount} invoice
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
                <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-sm">
                  {currentPage} / {totalPagesServer}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPagesServer, p + 1))}
                  disabled={currentPage >= totalPagesServer}
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

      {/* Xatolik qo'shish modali — Status BOSHLANMAGAN emas yoki Sertifikat olib chiqish TAYYOR bo'lganda tahrirlashdan oldin majburiy */}
      {showErrorModal && invoiceForErrorModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowErrorModal(false);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Xatolik qo&apos;shish (sorov)</h2>
              <button
                type="button"
                onClick={() => {
                  setShowErrorModal(false);
                  setInvoiceForErrorModal(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Status BOSHLANMAGAN emas yoki Sertifikat olib chiqish yakunlangan. Tahrirlashga o&apos;tish uchun avval xatolik (sorov) qo&apos;shing.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const amountValue = errorForm.amount.trim();
                  if (!/^\d{1,4}$/.test(amountValue)) {
                    alert('Summa faqat USD bo\'lishi va 4 xonagacha bo\'lishi kerak');
                    return;
                  }
                  const taskId = invoiceForErrorModal.taskId;
                  await apiClient.post(`/tasks/${taskId}/errors`, {
                    taskTitle: invoiceForErrorModal.task?.title ?? `#${invoiceForErrorModal.invoiceNumber}`,
                    workerId: parseInt(errorForm.workerId),
                    stageName: errorForm.stageName,
                    amount: parseFloat(amountValue),
                    comment: errorForm.comment || undefined,
                    date: new Date(errorForm.date),
                  });
                  setShowErrorModal(false);
                  setInvoiceForErrorModal(null);
                  setErrorForm({ workerId: '', stageName: '', amount: '', comment: '', date: new Date().toISOString().split('T')[0] });
                  navigate(`/invoices/task/${taskId}`);
                } catch (err: unknown) {
                  const e = err as { response?: { data?: { error?: string } } };
                  alert(e.response?.data?.error || 'Xatolik yuz berdi');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task nomi</label>
                <input
                  type="text"
                  value={invoiceForErrorModal.task?.title ?? `#${invoiceForErrorModal.invoiceNumber}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ishchi <span className="text-red-500">*</span></label>
                <select
                  required
                  value={errorForm.workerId}
                  onChange={(e) => setErrorForm({ ...errorForm, workerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ishchini tanlang</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id.toString()}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bosqich <span className="text-red-500">*</span></label>
                <select
                  required
                  value={errorForm.stageName}
                  onChange={(e) => setErrorForm({ ...errorForm, stageName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bosqichni tanlang</option>
                  <option value="Invoys">Invoys</option>
                  <option value="Zayavka">Zayavka</option>
                  <option value="TIR-SMR">TIR-SMR</option>
                  <option value="ST">ST</option>
                  <option value="Fito">Fito</option>
                  <option value="Deklaratsiya">Deklaratsiya</option>
                  <option value="Tekshirish">Tekshirish</option>
                  <option value="Topshirish">Topshirish</option>
                  <option value="Pochta">Pochta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summa (USD) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={errorForm.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d{0,4}$/.test(v)) setErrorForm({ ...errorForm, amount: v });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                <textarea
                  value={errorForm.comment}
                  onChange={(e) => setErrorForm({ ...errorForm, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Xato haqida qisqacha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sana <span className="text-red-500">*</span></label>
                <DateInput
                  required
                  value={errorForm.date}
                  onChange={(value) => setErrorForm({ ...errorForm, date: value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowErrorModal(false); setInvoiceForErrorModal(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Xatolik qo&apos;shish va tahrirlashga o&apos;tish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice o'chirish tasdiq modali */}
      {showDeleteConfirmModal && invoiceToDelete && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-200 ease-out ${deleteModalClosing || !deleteModalAnimated ? 'opacity-0' : 'opacity-100'
            }`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteModalClosing(true);
          }}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transition-all duration-200 ease-out ${deleteModalClosing ? 'opacity-0 scale-95' : deleteModalAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Invoysni o&apos;chirish</h2>
            <p className="text-gray-600 mb-6">
              Invoice №<strong>{invoiceToDelete.invoiceNumber}</strong> o&apos;chirilsinmi? Bu amalni qaytarib bo&apos;lmaydi.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteModalClosing(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!invoiceToDelete) return;
                  setDeletingInvoiceId(invoiceToDelete.id);
                  try {
                    await apiClient.delete(`/invoices/${invoiceToDelete.id}`);
                    loadInvoices();
                    setDeleteModalClosing(true);
                  } catch (err: unknown) {
                    const e = err as { response?: { data?: { error?: string } } };
                    alert(e.response?.data?.error || 'Invoice o\'chirishda xatolik');
                  } finally {
                    setDeletingInvoiceId(null);
                  }
                }}
                disabled={deletingInvoiceId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingInvoiceId === invoiceToDelete.id ? 'O\'chirilmoqda...' : 'Ha, o\'chirish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModalId && (
        <Tasks isModalMode={true} modalTaskId={showTaskModalId} onCloseModal={() => setShowTaskModalId(null)} />
      )}

      {showClientModalId && (
        <Clients isModalMode={true} modalClientId={showClientModalId} modalContractId={showContractModalId || undefined} onCloseModal={() => {
          setShowClientModalId(null);
          setShowContractModalId(null);
        }} />
      )}
    </div>
  );
};

export default Invoices;

