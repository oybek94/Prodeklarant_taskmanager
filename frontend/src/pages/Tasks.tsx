import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import PdfIcon from '../assets/icons/pdf-icon.svg?react';
import ExcelIcon from '../assets/icons/excel-icon.svg?react';
import WordIcon from '../assets/icons/word-icon.svg?react';
import JpgIcon from '../assets/icons/jpg-icon.svg?react';
import PngIcon from '../assets/icons/png-icon.svg?react';
import PptIcon from '../assets/icons/ppt-icon.svg?react';
import RarIcon from '../assets/icons/rar-icon.svg?react';
import ZipIcon from '../assets/icons/zip-icon.svg?react';

interface Task {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  driverPhone?: string;
  createdAt: string;
  client: { id: number; name: string };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
  stages?: Array<{ name: string; status: string; durationMin?: number | null; completedAt?: string | null }>;
}

interface TaskStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  startedAt?: string;
  completedAt?: string | null;
  durationMin?: number | null;
  assignedTo?: { id: number; name: string };
}

interface KpiLog {
  id: number;
  stageName: string;
  amount: number;
  userId: number;
  user: { id: number; name: string; email: string };
  createdAt: string;
}

interface TaskDetail {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  driverPhone?: string;
  createdAt: string;
  updatedAt?: string;
  client: { id: number; name: string; dealAmount?: number };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
  updatedBy?: { id: number; name: string; email: string };
  stages: TaskStage[];
  netProfit?: number | null; // Sof foyda (faqat ADMIN uchun)
  adminEarnedAmount?: number | null; // Admin ishlab topgan pul
  snapshotDealAmount?: number | null; // Task yaratilgan vaqtdagi kelishuv summasi
  snapshotCertificatePayment?: number | null; // Task yaratilgan vaqtdagi sertifikat to'lovi
  snapshotPsrPrice?: number | null; // Task yaratilgan vaqtdagi PSR narxi
  snapshotWorkerPrice?: number | null; // Task yaratilgan vaqtdagi ishchi narxi
  snapshotCustomsPayment?: number | null; // Task yaratilgan vaqtdagi bojxona to'lovi
  kpiLogs?: KpiLog[]; // KPI log'lar (jarayonlar bo'yicha pul ma'lumotlari)
}

interface TaskVersion {
  id: number;
  version: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr: boolean;
  driverPhone?: string;
  changes?: any;
  createdAt: string;
  changedByUser: { id: number; name: string; email: string };
}

interface Client {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface TaskStats {
  yearly: { current: number; previous: number };
  monthly: { current: number; previous: number };
  weekly: { current: number; previous: number };
  daily: { current: number; previous: number };
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const limit = 50; // Har bir sahifada 50 ta task
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);
  const [taskVersions, setTaskVersions] = useState<TaskVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedStageForReminder, setSelectedStageForReminder] = useState<TaskStage | null>(null);
  const [showBXMModal, setShowBXMModal] = useState(false);
  const [bxmMultiplier, setBxmMultiplier] = useState<string>('1.5');
  const [currentBXM, setCurrentBXM] = useState<number>(34.4);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorForm, setErrorForm] = useState({
    workerId: '',
    stageName: '',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [taskDocuments, setTaskDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [aiChecks, setAiChecks] = useState<any[]>([]);
  const [loadingAiChecks, setLoadingAiChecks] = useState(false);
  // OCR extracted text state
  const [expandedDocuments, setExpandedDocuments] = useState<Set<number>>(new Set());
  const [documentExtractedTexts, setDocumentExtractedTexts] = useState<Map<number, string>>(new Map());
  const [loadingExtractedTexts, setLoadingExtractedTexts] = useState<Set<number>>(new Set());
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [documentDescriptions, setDocumentDescriptions] = useState<string[]>([]);
  // Umumiy file upload modal state'lari (Invoice, ST, Fito uchun)
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUploadFile, setFileUploadFile] = useState<File | null>(null);
  const [fileUploadName, setFileUploadName] = useState<string>('');
  const [fileUploadStageName, setFileUploadStageName] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<{
    result: 'PASS' | 'FAIL';
    findings: Array<{
      field: string;
      invoice_value: any;
      st_value: any;
      severity: 'critical' | 'warning';
      explanation: string;
    }>;
  } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{ url: string; type: string; name: string } | null>(null);
  const [workers, setWorkers] = useState<{ id: number; name: string; role: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const { user } = useAuth();

  // Helper function to clean phone number (remove spaces, keep + sign)
  const cleanPhoneNumber = (phone: string): string => {
    // Remove all spaces, keep + sign if present
    return phone.replace(/\s+/g, '');
  };

  // Helper function to generate Telegram message with task's branch info only
  const generateTelegramMessage = (task: TaskDetail): string => {
    const taskName = task.title;
    const branchName = task.branch.name;
    
    // Branch information mapping
    const branchInfo: Record<string, { operator: string; address: string; phone: string }> = {
      'Oltiariq': {
        operator: 'Abdukamol',
        address: 'https://yandex.ru/maps/-/CLWAuE5H',
        phone: '+998339077778'
      },
      'Toshkent': {
        operator: 'Sardorbek',
        address: 'https://yandex.ru/maps/-/CLWAy4Y9',
        phone: '+998976626221'
      }
    };
    
    // Get branch info (default to Oltiariq if branch not found)
    const branch = branchInfo[branchName] || branchInfo['Oltiariq'];
    
    // Generate message with only the task's branch information
    return `📄 Sizning hujjatingiz tayyor!\nHujjat raqami: ${taskName}\n\n🏢 Filial:\n\n📍 ${branchName} filial:\n👤 Operator: ${branch.operator}\n📌 Manzil: ${branch.address}\n📞 Tel: ${branch.phone}\n\n🤝 Har qanday savol bo'lsa — bemalol murojaat qiling.`;
  };

  // Handler function to open Telegram with formatted message
  // URL format: https://t.me/+PHONE?text=ENCODED_MESSAGE
  const handleTelegramClick = () => {
    if (!selectedTask?.driverPhone) return;
    
    // Clean phone number: remove spaces only (keep + sign)
    const cleanedPhone = cleanPhoneNumber(selectedTask.driverPhone);
    
    // Generate message
    const message = generateTelegramMessage(selectedTask);
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // URL format: https://t.me/+PHONE?text=MESSAGE
    // Phone number should include + sign in the URL
    // Ensure phone starts with + sign
    const phoneWithPlus = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;
    const telegramUrl = `https://t.me/${phoneWithPlus}?text=${encodedMessage}`;
    
    console.log('Opening Telegram:', {
      original: selectedTask.driverPhone,
      cleaned: cleanedPhone,
      phoneWithPlus,
      telegramUrl: telegramUrl.substring(0, 200) + '...',
      messagePreview: message.substring(0, 100) + '...'
    });
    
    // Open Telegram web version (works better and opens desktop app if installed)
    window.open(telegramUrl, '_blank');
  };

  const [form, setForm] = useState({
    title: '',
    clientId: '',
    branchId: '',
    comments: '',
    hasPsr: false,
    driverPhone: '',
  });
  const [editForm, setEditForm] = useState({
    title: '',
    clientId: '',
    branchId: '',
    comments: '',
    hasPsr: false,
    driverPhone: '',
  });
  const [filters] = useState({
    status: '',
    clientId: '',
  });
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilters, setArchiveFilters] = useState({
    branchId: '',
    startDate: '',
    endDate: '',
    hasPsr: '',
  });
  const [showArchiveFilters, setShowArchiveFilters] = useState(false);

  // Page'ni 1 ga qaytarish, filterlar o'zgarganda
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.clientId, filters.branchId, showArchive]);

  useEffect(() => {
    loadTasks();
    loadClients();
    loadBranches();
    loadWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchive, page, filters.status, filters.clientId, filters.branchId]);

  // Clear archive filters when switching tabs
  useEffect(() => {
    if (!showArchive) {
      setArchiveSearchQuery('');
      setArchiveFilters({ branchId: '', startDate: '', endDate: '', hasPsr: '' });
    }
  }, [showArchive]);

  // Set default values when branches are loaded
  useEffect(() => {
    if (branches.length > 0) {
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      if (oltiariqBranch && !form.branchId) {
        setForm((prev) => ({ ...prev, branchId: oltiariqBranch.id.toString() }));
      }
    }
  }, [branches.length]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showReminderModal) {
          setShowReminderModal(false);
          setSelectedStageForReminder(null);
        } else if (showEditModal) {
          setShowEditModal(false);
        } else if (showTaskModal) {
          setShowTaskModal(false);
          setSelectedTask(null);
        } else if (showForm) {
          setShowForm(false);
        } else if (showArchiveFilters) {
          setShowArchiveFilters(false);
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm, showTaskModal, showEditModal, showReminderModal, showArchiveFilters]);

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/branches');
      if (Array.isArray(response.data) && response.data.length > 0) {
        setBranches(response.data);
      } else {
        // Fallback to default branches if API returns empty
        setBranches([
          { id: 1, name: 'Toshkent' },
          { id: 2, name: 'Oltiariq' },
        ]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      // Fallback to default branches on error
      setBranches([
        { id: 1, name: 'Toshkent' },
        { id: 2, name: 'Oltiariq' },
      ]);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };

  const loadWorkers = async () => {
    try {
      // Admin bo'lsa /users, aks holda /workers endpoint'ini ishlatamiz
      if (user?.role === 'ADMIN') {
        const response = await apiClient.get('/users');
        setWorkers(Array.isArray(response.data) 
          ? response.data.filter((u: any) => u.role === 'DEKLARANT' || u.role === 'ADMIN')
          : []);
      } else {
        const response = await apiClient.get('/workers');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      setWorkers([]);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (showArchive) {
        // Arxiv bo'limida faqat YAKUNLANDI statusidagi tasklar
        params.status = 'YAKUNLANDI';
      } else {
        // Barcha ishlar bo'limida YAKUNLANDI dan tashqari barcha tasklar
        if (filters.status) params.status = filters.status;
      }
      if (filters.clientId) params.clientId = filters.clientId;
      if (filters.branchId) params.branchId = filters.branchId;

      const response = await apiClient.get('/tasks', { params });
      
      // Backward compatibility: agar pagination bor bo'lsa
      if (response.data.pagination) {
        const { tasks: tasksData, pagination } = response.data;
        let filteredTasks = tasksData;
        
        // Agar arxiv bo'lsa, faqat YAKUNLANDI statusidagilarni ko'rsatish
        // Agar barcha ishlar bo'lsa, YAKUNLANDI dan tashqarilarini ko'rsatish
        if (showArchive) {
          filteredTasks = tasksData.filter((task: Task) => task.status === 'YAKUNLANDI');
        } else {
          filteredTasks = tasksData.filter((task: Task) => task.status !== 'YAKUNLANDI');
        }
        
        setTasks(filteredTasks);
        setTotalPages(pagination.totalPages);
        setTotalTasks(pagination.total);
        
        // Stats faqat barcha ishlar bo'limida hisoblanadi
        if (!showArchive) {
          calculateStats(tasksData);
        }
      } else if (Array.isArray(response.data)) {
        // Eski format - backward compatibility
        let filteredTasks = response.data;
        if (showArchive) {
          filteredTasks = response.data.filter((task: Task) => task.status === 'YAKUNLANDI');
        } else {
          filteredTasks = response.data.filter((task: Task) => task.status !== 'YAKUNLANDI');
        }
        setTasks(filteredTasks);
        setTotalPages(1);
        setTotalTasks(filteredTasks.length);
        
        if (!showArchive) {
          calculateStats(response.data);
        }
      } else {
        setTasks([]);
        setTotalPages(1);
        setTotalTasks(0);
        if (!showArchive) {
          calculateStats([]);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
      setTotalPages(1);
      setTotalTasks(0);
      if (!showArchive) {
        calculateStats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tasksData: Task[]) => {
    if (!Array.isArray(tasksData)) {
      setStats({ yearly: { current: 0, previous: 0 }, monthly: { current: 0, previous: 0 }, weekly: { current: 0, previous: 0 }, daily: { current: 0, previous: 0 } });
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Hafta boshini topish (Yakshanba)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Oldingi davrlar
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    const isInRange = (date: Date, start: Date, end: Date) => {
      return date >= start && date <= end;
    };

    const yearly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= yearStart;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastYearStart, lastYearEnd);
      }).length,
    };

    const monthly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= monthStart;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastMonthStart, lastMonthEnd);
      }).length,
    };

    const weekly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= weekStart;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastWeekStart, lastWeekEnd);
      }).length,
    };

    const daily = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= today;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= yesterday && taskDate < today;
      }).length,
    };

    setStats({ yearly, monthly, weekly, daily });
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number): { text: string; color: string; bgColor: string } => {
    const sign = change >= 0 ? '+' : '';
    const text = `${sign}${change.toFixed(1)}%`;
    if (change >= 0) {
      return { text, color: 'text-green-700', bgColor: 'bg-green-100' };
    } else {
      return { text, color: 'text-red-700', bgColor: 'bg-red-100' };
    }
  };

  const loadTaskStages = async (taskId: number) => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}/stages`);
      // selectedTask state'ni yangilash - functional update ishlatamiz
      setSelectedTask((prevTask) => {
        if (!prevTask || prevTask.id !== taskId) {
          return prevTask;
        }
        return {
          ...prevTask,
          stages: response.data,
        };
      });
    } catch (error) {
      console.error('Error loading task stages:', error);
      // Stages yuklanmasa ham, task ma'lumotlari ko'rsatiladi
      setSelectedTask((prevTask) => {
        if (!prevTask || prevTask.id !== taskId) {
          return prevTask;
        }
        return {
          ...prevTask,
          stages: [],
        };
      });
    }
  };

  const loadTaskDetail = async (taskId: number) => {
    try {
      setLoadingTask(true);
      const response = await apiClient.get(`/tasks/${taskId}`);
      const taskData = { ...response.data };
      
      // Stages'ni lazy load qilish uchun, avval stages'ni bo'sh qilamiz
      // Lekin agar backend'dan stages kelgan bo'lsa, ularni saqlab qolamiz
      // (backward compatibility uchun)
      if (!taskData.stages || taskData.stages.length === 0) {
        taskData.stages = [];
      } else {
        // Agar stages bor bo'lsa, ularni saqlab qolamiz (eski format)
        // Lekin lazy load ham qilamiz (yangilanish uchun)
      }
      
      setSelectedTask(taskData);
      setShowTaskModal(true);
      
      // Load stages lazily (parallel)
      Promise.all([
        loadTaskStages(taskId),
        loadTaskVersions(taskId),
        loadTaskDocuments(taskId),
        // loadAiChecks(taskId), // Temporarily disabled - AI results section hidden
      ]).catch((error) => {
        console.error('Error loading task details:', error);
      });
    } catch (error) {
      console.error('Error loading task detail:', error);
      alert('Task ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoadingTask(false);
    }
  };

  const loadAiChecks = async (taskId: number) => {
    try {
      setLoadingAiChecks(true);
      const response = await apiClient.get(`/tasks/${taskId}/ai-checks`);
      console.log('[AI Checks] Response:', response.data);
      if (response.data.success && Array.isArray(response.data.checks)) {
        console.log('[AI Checks] Found checks:', response.data.checks.length);
        setAiChecks(response.data.checks);
      } else {
        console.warn('[AI Checks] No checks found or invalid response format');
        setAiChecks([]);
      }
    } catch (error) {
      console.error('Error loading AI checks:', error);
      setAiChecks([]);
    } finally {
      setLoadingAiChecks(false);
    }
  };

  const loadTaskDocuments = async (taskId: number) => {
    try {
      setLoadingDocuments(true);
      // Avval task'ning statusini tekshiramiz
      const taskResponse = await apiClient.get(`/tasks/${taskId}`);
      const task = taskResponse.data;
      
      // Agar task yakunlangan bo'lsa, arxiv hujjatlarini yuklaymiz
      // Hujjatlar doim TaskDocument'dan olinadi, arxivga o'tgunga qadar
      const response = await apiClient.get(`/documents/task/${taskId}`);
      setTaskDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading task documents:', error);
      setTaskDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Load extracted text for a document
  const loadExtractedText = async (documentId: number) => {
    if (!selectedTask) return;
    
    // Check if already loaded
    if (documentExtractedTexts.has(documentId)) {
      return;
    }

    try {
      setLoadingExtractedTexts((prev) => new Set(prev).add(documentId));
      
      const response = await apiClient.get(
        `/tasks/${selectedTask.id}/documents/${documentId}/extracted-text`
      );
      
      const extractedText = response.data.extractedText || '';
      setDocumentExtractedTexts((prev) => {
        const newMap = new Map(prev);
        newMap.set(documentId, extractedText);
        return newMap;
      });
    } catch (error) {
      console.error('Error loading extracted text:', error);
      // Set empty text on error
      setDocumentExtractedTexts((prev) => {
        const newMap = new Map(prev);
        newMap.set(documentId, '');
        return newMap;
      });
    } finally {
      setLoadingExtractedTexts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Toggle document expansion
  const toggleDocumentExpansion = async (documentId: number) => {
    const isExpanded = expandedDocuments.has(documentId);
    
    if (isExpanded) {
      // Collapse
      setExpandedDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    } else {
      // Expand - load text if not already loaded
      setExpandedDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.add(documentId);
        return newSet;
      });
      
      if (!documentExtractedTexts.has(documentId)) {
        await loadExtractedText(documentId);
      }
    }
  };

  // Umumiy file upload handler (Invoice, ST, Fito uchun)
  const handleFileUpload = async () => {
    if (!selectedTask || !fileUploadFile || !fileUploadStageName) {
      alert('Faylni tanlang');
      return;
    }

    try {
      setUploadingFile(true);
      setAiCheckResult(null);
      
      const formData = new FormData();
      formData.append('file', fileUploadFile);
      formData.append('name', fileUploadName);
      
      // Document type'ni stage nomiga qarab aniqlaymiz
      // "Sertifikat olib chiqish" stage'i uchun fileUploadName'dan document type'ni aniqlaymiz
      let documentType = 'OTHER';
      if (fileUploadStageName === 'Invoys') {
        documentType = 'INVOICE';
      } else if (fileUploadStageName === 'Sertifikat olib chiqish') {
        // fileUploadName'dan aniqlaymiz: 'ST' yoki 'Fito'
        if (fileUploadName === 'ST') {
          documentType = 'ST';
        } else if (fileUploadName === 'Fito') {
          documentType = 'FITO';
        } else {
          // Default: ST
          documentType = 'ST';
        }
      } else if (fileUploadStageName === 'ST') {
        // Backward compatibility
        documentType = 'ST';
      } else if (fileUploadStageName === 'Fito' || fileUploadStageName === 'FITO') {
        // Backward compatibility
        documentType = 'FITO';
      }
      formData.append('documentType', documentType);

      const response = await apiClient.post(`/tasks/${selectedTask.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // AI tekshiruv natijasini ko'rsatish (faqat ST uchun)
      if ((fileUploadStageName === 'ST' || (fileUploadStageName === 'Sertifikat olib chiqish' && fileUploadName === 'ST')) && response.data.aiCheck) {
        setAiCheckResult(response.data.aiCheck);
      }

      // Fayl yuklangandan keyin stage'ni tayyor qilishga harakat qilamiz
      if (selectedStageForReminder) {
        setShowFileUploadModal(false);
        setFileUploadFile(null);
        setFileUploadName('');
        setFileUploadStageName('');
        // Fayl yuklangandan keyin stage'ni tayyor qilish
        await updateStageToReady();
      } else {
        setShowFileUploadModal(false);
        setFileUploadFile(null);
        setFileUploadName('');
        setFileUploadStageName('');
        await loadTaskDetail(selectedTask.id);
        await loadTaskDocuments(selectedTask.id);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const stageDisplayName = fileUploadStageName || 'Fayl';
      alert(error.response?.data?.error || `${stageDisplayName} yuklashda xatolik yuz berdi`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedTask || uploadFiles.length === 0) {
      alert('Kamida bitta faylni tanlang');
      return;
    }

    try {
      const formData = new FormData();
      
      // Barcha fayllarni qo'shamiz
      uploadFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      // Nomlar va tavsiflar
      formData.append('names', JSON.stringify(documentNames));
      formData.append('descriptions', JSON.stringify(documentDescriptions));

      // Hujjatlar doim TaskDocument'ga qo'shiladi, arxivga faqat /archive-task/:taskId endpoint orqali
      await apiClient.post(`/documents/task/${selectedTask.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Agar Pochta jarayoni uchun hujjatlar yuklanganda, jarayonni tayyor qilamiz
      if (selectedStageForReminder && selectedStageForReminder.name === 'Pochta' && selectedStageForReminder.status === 'BOSHLANMAGAN') {
        await updateStageToReady();
      }

      setUploadFiles([]);
      setDocumentNames([]);
      setDocumentDescriptions([]);
      setShowDocumentUpload(false);
      await loadTaskDocuments(selectedTask.id);
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      alert(error.response?.data?.error || 'Hujjat yuklashda xatolik');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    // Yangi fayllarni mavjud fayllarga qo'shamiz (o'chirmaymiz)
    setUploadFiles(prevFiles => [...prevFiles, ...newFiles]);
    // Hujjat nomi avtomatik fayl nomidan olinadi
    setDocumentNames(prevNames => [...prevNames, ...newFiles.map(f => f.name)]);
    setDocumentDescriptions(prevDescriptions => [...prevDescriptions, ...newFiles.map(() => '')]);
    
    // Input'ni tozalash, qayta bir xil faylni tanlash imkoniyati uchun
    e.target.value = '';
  };

  const openPreview = (fileUrl: string, fileType: string, fileName: string) => {
    // URL'ni to'g'ri qurish - baseURL'dan /api ni olib tashlaymiz
    const baseUrl = apiClient.defaults.baseURL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
    const serverBaseUrl = baseUrl.replace('/api', '') || (import.meta.env.PROD ? '' : 'http://localhost:3001');
    
    const urlParts = fileUrl.split('/');
    const fileNamePart = urlParts[urlParts.length - 1];
    const path = urlParts.slice(0, -1).join('/');
    
    // Fayl nomini encode qilamiz
    const encodedFileName = encodeURIComponent(decodeURIComponent(fileNamePart));
    const url = `${serverBaseUrl}${path}/${encodedFileName}`;
    setPreviewDocument({ url, type: fileType, name: fileName });
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Bu hujjatni o\'chirishni xohlaysizmi?')) {
      return;
    }

    try {
      await apiClient.delete(`/documents/${documentId}`);
      if (selectedTask) {
        await loadTaskDocuments(selectedTask.id);
      }
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert(error.response?.data?.error || 'Hujjatni o\'chirishda xatolik');
    }
  };

  const downloadDocument = (fileUrl: string) => {
    // URL'ni to'g'ri qurish - baseURL'dan /api ni olib tashlaymiz
    const baseUrl = apiClient.defaults.baseURL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
    const serverBaseUrl = baseUrl.replace('/api', '') || (import.meta.env.PROD ? '' : 'http://localhost:3001');
    
    // Fayl URL'i /uploads/documents/... ko'rinishida
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const path = urlParts.slice(0, -1).join('/');
    
    // Fayl nomini encode qilamiz
    const encodedFileName = encodeURIComponent(decodeURIComponent(fileName));
    const url = `${serverBaseUrl}${path}/${encodedFileName}`;
    
    window.open(url, '_blank');
  };

  const canPreview = (fileType: string) => {
    return fileType?.includes('image') || 
           fileType?.includes('pdf') || 
           fileType?.includes('video') ||
           fileType?.includes('audio');
  };

  // Check if document supports OCR (PDF or JPG)
  const canShowOCR = (fileType: string, fileName: string) => {
    const lowerType = (fileType || '').toLowerCase();
    const lowerName = (fileName || '').toLowerCase();
    return (
      lowerType.includes('pdf') ||
      lowerType.includes('jpeg') ||
      lowerType.includes('jpg') ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg')
    );
  };

  // Format invoice extracted text - convert product table to formatted view
  const formatInvoiceExtractedText = (text: string, documentType?: string): string => {
    if (!text || !documentType || documentType !== 'INVOICE') {
      return text;
    }

    const lines = text.split('\n');
    const formattedLines: string[] = [];
    let inProductTable = false;
    let headerLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      // Detect table header
      if (lowerLine.includes('№') && 
          (lowerLine.includes('код тн вэд') || lowerLine.includes('наименование товара'))) {
        inProductTable = true;
        headerLineIndex = i;
        // Skip header line
        continue;
      }

      // If we're in product table and see a row starting with number
      if (inProductTable && /^\d+\s/.test(line)) {
        // Try different splitting methods
        // First, try splitting by pipe (|) if it's a table format
        let parts: string[] = [];
        if (line.includes('|')) {
          parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
          // Remove first and last if they're empty (from |...| format)
          if (parts.length > 0 && parts[0] === '') parts.shift();
          if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        } else {
          // Split by multiple spaces or tabs
          parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
        }
        
        // Expected columns:
        // 0: № (tartib raqami)
        // 1: Код ТН ВЭД
        // 2: Наименование товара
        // 3: Вид упаковки
        // 4: Мест
        // 5: Брутто
        // 6: Нетто
        // 7: Цена за кг (skip this)
        // 8: Общая сумма
        
        if (parts.length >= 6) {
          const formattedProduct: string[] = [];
          
          // 1-ustun: № (index 0)
          if (parts[0] && /^\d+$/.test(parts[0].trim())) {
            formattedProduct.push(`№: ${parts[0].trim()}`);
          }
          
          // 2-ustun: Код ТН ВЭД (index 1)
          if (parts[1] && /^\d{10}$/.test(parts[1].trim())) {
            formattedProduct.push(`Код ТН ВЭД: ${parts[1].trim()}`);
          }
          
          // 3-ustun: Наименование товара (index 2)
          // May span multiple parts if product name is long
          let nameIndex = 2;
          let nameParts: string[] = [];
          while (nameIndex < parts.length) {
            const part = parts[nameIndex]?.trim() || '';
            // Stop if it looks like packaging (short text with dot) or a number
            if (part.match(/^[а-яё]+\.[а-яё]+$/) || /^\d+$/.test(part)) {
              break;
            }
            nameParts.push(parts[nameIndex]);
            nameIndex++;
          }
          if (nameParts.length > 0) {
            formattedProduct.push(`Наименование товара: ${nameParts.join(' ').trim()}`);
          }
          
          // 4-ustun: Вид упаковки (after product name)
          let packagingIndex = nameIndex;
          if (packagingIndex < parts.length) {
            const packaging = parts[packagingIndex].trim();
            if (packaging.match(/^[а-яё]+\.[а-яё]+$|^[а-яё]+$|^[a-z]+$/i) && 
                !/^\d+[,.]?\d*$/.test(packaging) && packaging.length < 20) {
              formattedProduct.push(`Вид упаковки: ${packaging}`);
              packagingIndex++;
            }
          }
          
          // Now find numbers starting from packagingIndex
          // 5-ustun: Мест (first number after packaging)
          // 6-ustun: Брутто (second number)
          // 7-ustun: Нетто (third number)
          // 8-ustun: Цена за кг (skip this - fourth number)
          // 9-ustun: Общая сумма (fifth number, may have spaces)
          
          const numbers: string[] = [];
          for (let j = packagingIndex; j < parts.length; j++) {
            const part = parts[j].trim();
            // Match numbers with optional spaces/commas
            const cleanedPart = part.replace(/\s/g, '');
            if (/^\d+$/.test(cleanedPart) || 
                /^\d+,\d+$/.test(cleanedPart) ||
                /^\d+\.\d+$/.test(cleanedPart) ||
                /^\d+\s+\d+,\d+$/.test(part)) {
              numbers.push(part);
            }
          }
          
          // 5-ustun: Мест (1st number)
          if (numbers.length >= 1) {
            formattedProduct.push(`Мест: ${numbers[0]}`);
          }
          
          // 6-ustun: Брутто (2nd number)
          if (numbers.length >= 2) {
            formattedProduct.push(`Брутто: ${numbers[1]}`);
          }
          
          // 7-ustun: Нетто (3rd number)
          if (numbers.length >= 3) {
            formattedProduct.push(`Нетто: ${numbers[2]}`);
          }
          
          // 8-ustun: Цена за кг - SKIP (4th number, index 3)
          
          // 9-ustun: Общая сумма (5th number, index 4, may have spaces like "13 232,80")
          if (numbers.length >= 5) {
            formattedProduct.push(`Общая сумма: ${numbers[4]}`);
          } else if (numbers.length === 4) {
            // If only 4 numbers, the last one might be Общая сумма (if it has spaces/commas)
            if (numbers[3].includes(' ') || numbers[3].includes(',')) {
              formattedProduct.push(`Общая сумма: ${numbers[3]}`);
            }
          }
          
          formattedLines.push(...formattedProduct);
          formattedLines.push(''); // Empty line between products
          continue;
        }
      }

      // Check if we should exit product table
      if (inProductTable) {
        if (lowerLine.includes('итого:') || lowerLine.includes('всего:')) {
          inProductTable = false;
          formattedLines.push(line);
          continue;
        }
        // Exit if empty line after table or new section
        if ((line.trim().length === 0 && i > headerLineIndex + 5) ||
            (/^[А-ЯЁ]/.test(line) && !lowerLine.includes('№'))) {
          inProductTable = false;
        }
      }

      // Keep non-table lines as is
      if (!inProductTable) {
        formattedLines.push(lines[i]);
      }
    }

    return formattedLines.join('\n');
  };

  const getFileIcon = (fileType: string, fileName?: string) => {
    const lowerType = fileType?.toLowerCase() || '';
    const lowerName = fileName?.toLowerCase() || '';
    
    // PDF
    if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return <PdfIcon className="w-10 h-10" />;
    }
    // Excel (xls, xlsx)
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || 
        lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      return <ExcelIcon className="w-10 h-10" />;
    }
    // Word (doc, docx)
    if (lowerType.includes('word') || lowerType.includes('document') ||
        lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
      return <WordIcon className="w-10 h-10" />;
    }
    // JPG/JPEG
    if (lowerType.includes('jpeg') || lowerType.includes('jpg') ||
        lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      return <JpgIcon className="w-10 h-10" />;
    }
    // PNG
    if (lowerType.includes('png') || lowerName.endsWith('.png')) {
      return <PngIcon className="w-10 h-10" />;
    }
    // PPT/PPTX
    if (lowerType.includes('powerpoint') || lowerType.includes('presentation') ||
        lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
      return <PptIcon className="w-10 h-10" />;
    }
    // RAR
    if (lowerType.includes('rar') || lowerName.endsWith('.rar')) {
      return <RarIcon className="w-10 h-10" />;
    }
    // ZIP
    if (lowerType.includes('zip') || lowerName.endsWith('.zip')) {
      return <ZipIcon className="w-10 h-10" />;
    }
    // Rasm (boshqa formatlar)
    if (lowerType.includes('image') || lowerType.includes('gif') || lowerType.includes('webp') ||
        lowerName.match(/\.(gif|webp|bmp|svg)$/i)) {
      return <JpgIcon className="w-10 h-10" />;
    }
    // Video
    if (lowerType.includes('video') || lowerName.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
      return (
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="20" rx="1.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5"/>
            <rect x="6" y="8" width="12" height="8" rx="1" fill="#EF4444"/>
            <polygon points="10,11 10,13 13,12" fill="white"/>
          </svg>
        </div>
      );
    }
    // Audio
    if (lowerType.includes('audio') || lowerName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return (
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="20" rx="1.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5"/>
            <path d="M8 10v4c0 1.1.9 2 2 2s2-.9 2-2v-4" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M14 8v8c0 1.1.9 2 2 2s2-.9 2-2V8" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="10" cy="10" r="1" fill="#9333EA"/>
            <circle cx="16" cy="12" r="1" fill="#9333EA"/>
          </svg>
        </div>
      );
    }
    // Boshqa fayllar (default)
    return (
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="20" rx="1.5" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5"/>
          <path d="M18 4v4h4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M18 4l4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <line x1="7" y1="11" x2="17" y2="11" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="14" x2="17" y2="14" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="17" x2="14" y2="17" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const loadTaskVersions = async (taskId: number) => {
    try {
      setLoadingVersions(true);
      const response = await apiClient.get(`/tasks/${taskId}/versions`);
      setTaskVersions(response.data);
    } catch (error) {
      console.error('Error loading task versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const getReminderMessage = (stageName: string): string => {
    const reminders: { [key: string]: string } = {
      'Invoys': 'ESLATMA!!!\n\nInvoys raqam va sana\nRastamojka joyi\nUsloviya postavi\nAvtomobil raqami\nMaxsulotlar mijoz bergan malumotlar bilan bir xilmi?',
      'Deklaratsiya': 'ESLATMA!!!\n\nAvtoraqam\nUsloviya postavki\nva boshqalarni tekshirdingizmi',
      'Sertifikat olib chiqish': 'ESLATMA!!!\n\nSertifikat (ST yoki Fito) hujjatlarini tekshiring.\n\nKorxona ma\'lumotlari\nSotib oluvchi mamlakat\nMaxsulotlar\nPechat va imzolar to\'g\'riligini tekshirdingizmi?',
      'Fito': 'ESLATMA!!!\n\nJonatuvchi va sotib oluvchi\nAvtoraqam\nPechat va imzolarni TEKSHIRDINGIZMI?',
      'ST': 'ESLATMA!!!\n\nKorxona malumotlari\nSotib oluvchi mamlakat\nMaxsulotlar\nPechat va imzolar TO\'G\'RILIGINI TEKSHIRDINGIZMI?',
      'TIR-SMR': 'ESLATMA!!!\n\nAvtomobil raqami\nMaxsulotlar mijoz bergan malumotlar bir xilligi\nTIR-SMR raqamlari togri yozilganini TEKSHIRDINGIZMI?',
      'Tekshirish': 'ESLATMA!!!\n\nEng asosiy ishni qilyapsiz iltimos erinchoqlik qilmang va barcha ma\'lumotlarni yaxshilab kozdan kechiring.\n\nMijoz bergan malumotlarga biz tayyorlagan xujjatlar togri kelishini tekshirib chiqing!!!',
      'Topshirish': 'Markirovka togriligini\nPoddonlarga pechat bosilganligini tekshirdingizmi?',
    };
    return reminders[stageName] || 'ESLATMA!!!\n\nJarayonni bajarishdan oldin barcha ma\'lumotlarni tekshiring.';
  };

  const handleStageClick = async (stage: TaskStage) => {
    if (!user) {
      alert('Login qiling');
      return;
    }
    if (stage.status === 'BOSHLANMAGAN') {
      // Pochta jarayoni uchun hujjat yuklash modalini ochamiz
      if (stage.name === 'Pochta') {
        setSelectedStageForReminder(stage);
        setShowDocumentUpload(true);
        setUploadFiles([]);
        setDocumentNames([]);
        setDocumentDescriptions([]);
      } else {
        // Boshqa stage'lar uchun oddiy reminder modal
        setSelectedStageForReminder(stage);
        setShowReminderModal(true);
      }
    } else {
      // If already completed, allow unchecking
      handleStageToggle(stage.id, stage.status);
    }
  };

  const handleConfirmStage = async (confirmed: boolean) => {
    if (!selectedStageForReminder || !selectedTask) return;
    
    setShowReminderModal(false);
    
    if (confirmed) {
      // If Deklaratsiya stage, show BXM multiplier modal
      if (selectedStageForReminder.name === 'Deklaratsiya') {
        try {
          const bxmResponse = await apiClient.get('/bxm/current');
          setCurrentBXM(Number(bxmResponse.data.amount));
          setBxmMultiplier('1.5');
          setShowBXMModal(true);
        } catch (error) {
          console.error('Error loading BXM:', error);
          setBxmMultiplier('1.5');
          setShowBXMModal(true);
        }
      } else {
        await updateStageToReady();
      }
    } else {
      setSelectedStageForReminder(null);
    }
  };

  const updateStageToReady = async (customsPaymentMultiplier?: number, skipValidation?: boolean) => {
      // Debug logging removed (CSP violation)
    if (!selectedStageForReminder || !selectedTask) {
        // Debug logging removed (CSP violation)
      return;
    }
    
    try {
      setUpdatingStage(selectedStageForReminder.id);
      // Small delay for animation
      await new Promise(resolve => setTimeout(resolve, 300));
      // Debug logging removed (CSP violation)
      await apiClient.patch(`/tasks/${selectedTask.id}/stages/${selectedStageForReminder.id}`, {
        status: 'TAYYOR',
        ...(customsPaymentMultiplier && { customsPaymentMultiplier }),
        ...(skipValidation && { skipValidation: true }),
      }).then((response) => {
        // Debug logging removed (CSP violation)
        return response;
      }).catch((error: any) => {
        // Debug logging removed (CSP violation)
        // Xatolik bo'lsa, foydalanuvchiga ko'rsatamiz
        const errorMessage = error.response?.data?.error || 'Xatolik yuz berdi';
        alert(errorMessage);
        throw error;
      });
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
      setShowBXMModal(false);
      setShowFileUploadModal(false);
      setFileUploadFile(null);
      setFileUploadName('');
      setFileUploadStageName('');
      setSelectedStageForReminder(null);
    } catch (error: any) {
      console.error('Error updating stage:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleBXMConfirm = async () => {
    const multiplier = parseFloat(bxmMultiplier);
    if (isNaN(multiplier) || multiplier < 0.5 || multiplier > 4) {
      alert('Multiplier 0.5 dan 4 gacha bo\'lishi kerak');
      return;
    }
    await updateStageToReady(multiplier);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTask) return;
    
    // Validation
    if (!editForm.branchId) {
      alert('Filialni tanlang');
      return;
    }
    
    try {
      await apiClient.patch(`/tasks/${selectedTask.id}`, {
        title: editForm.title,
        clientId: parseInt(editForm.clientId),
        branchId: parseInt(editForm.branchId),
        comments: editForm.comments || undefined,
        hasPsr: editForm.hasPsr,
        driverPhone: editForm.driverPhone || undefined,
      });
      setShowEditModal(false);
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleStageToggle = async (stageId: number, currentStatus: string) => {
    if (!selectedTask || !user) {
      alert('Login qiling');
      return;
    }
    try {
      setUpdatingStage(stageId);
      const newStatus = currentStatus === 'BOSHLANMAGAN' ? 'TAYYOR' : 'BOSHLANMAGAN';
      await apiClient.patch(`/tasks/${selectedTask.id}/stages/${stageId}`, {
        status: newStatus,
      });
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.branchId) {
      alert('Filialni tanlang');
      return;
    }
    
    try {
      await apiClient.post('/tasks', {
        title: form.title,
        clientId: parseInt(form.clientId),
        branchId: parseInt(form.branchId),
        comments: form.comments || undefined,
        hasPsr: form.hasPsr,
        driverPhone: form.driverPhone || undefined,
      });
      setShowForm(false);
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      setForm({ 
        title: '', 
        clientId: '', 
        branchId: oltiariqBranch?.id.toString() || '', 
        comments: '', 
        hasPsr: false, 
        driverPhone: '' 
      });
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}; ${hours}:${minutes}`;
  };

  // Jarayon uchun vaqtni hisoblash
  const calculateStageDuration = (stage: TaskStage, allStages: TaskStage[], taskCreatedAt: string): number | null => {
    if (!stage.completedAt) return null;

    const completedAt = new Date(stage.completedAt);
    let startTime: Date | null = null;

    switch (stage.name) {
      case 'Invoys':
        startTime = new Date(taskCreatedAt);
        break;
      case 'Zayavka':
        const invoysStage = allStages.find(s => s.name === 'Invoys' && s.status === 'TAYYOR');
        if (invoysStage?.completedAt) {
          startTime = new Date(invoysStage.completedAt);
        } else {
          startTime = new Date(taskCreatedAt);
        }
        break;
      case 'TIR-SMR':
        const invoysStage2 = allStages.find(s => s.name === 'Invoys' && s.status === 'TAYYOR');
        if (invoysStage2?.completedAt) {
          startTime = new Date(invoysStage2.completedAt);
        } else {
          startTime = new Date(taskCreatedAt);
        }
        break;
      case 'Sertifikat olib chiqish':
      case 'ST':
      case 'Fito':
      case 'FITO':
        const zayavkaStage = allStages.find(s => s.name === 'Zayavka' && s.status === 'TAYYOR');
        if (zayavkaStage?.completedAt) {
          startTime = new Date(zayavkaStage.completedAt);
        } else {
          startTime = new Date(taskCreatedAt);
        }
        break;
      case 'Deklaratsiya':
        const sertifikatStage = allStages.find(s => 
          (s.name === 'Sertifikat olib chiqish' || s.name === 'ST' || s.name === 'Fito' || s.name === 'FITO') 
          && s.status === 'TAYYOR'
        );
        if (sertifikatStage?.completedAt) {
          startTime = new Date(sertifikatStage.completedAt);
        } else {
          startTime = new Date(taskCreatedAt);
        }
        break;
      case 'Tekshirish':
        const deklaratsiyaStage = allStages.find(s => s.name === 'Deklaratsiya' && s.status === 'TAYYOR');
        if (deklaratsiyaStage?.completedAt) {
          startTime = new Date(deklaratsiyaStage.completedAt);
        } else {
          const sertifikatStage2 = allStages.find(s => 
            (s.name === 'Sertifikat olib chiqish' || s.name === 'ST' || s.name === 'Fito' || s.name === 'FITO') 
            && s.status === 'TAYYOR'
          );
          if (sertifikatStage2?.completedAt) {
            startTime = new Date(sertifikatStage2.completedAt);
          } else {
            startTime = new Date(taskCreatedAt);
          }
        }
        break;
      case 'Topshirish':
      case 'Xujjat_topshirish':
      case 'Xujjat topshirish':
        const deklaratsiyaStage2 = allStages.find(s => s.name === 'Deklaratsiya' && s.status === 'TAYYOR');
        if (deklaratsiyaStage2?.completedAt) {
          startTime = new Date(deklaratsiyaStage2.completedAt);
        } else {
          const sertifikatStage3 = allStages.find(s => 
            (s.name === 'Sertifikat olib chiqish' || s.name === 'ST' || s.name === 'Fito' || s.name === 'FITO') 
            && s.status === 'TAYYOR'
          );
          if (sertifikatStage3?.completedAt) {
            startTime = new Date(sertifikatStage3.completedAt);
          } else {
            startTime = new Date(taskCreatedAt);
          }
        }
        break;
      case 'Pochta':
        const deklaratsiyaStage3 = allStages.find(s => s.name === 'Deklaratsiya' && s.status === 'TAYYOR');
        if (deklaratsiyaStage3?.completedAt) {
          startTime = new Date(deklaratsiyaStage3.completedAt);
        } else {
          startTime = new Date(taskCreatedAt);
        }
        break;
      default:
        startTime = new Date(taskCreatedAt);
    }

    if (!startTime) return null;
    const diffMs = completedAt.getTime() - startTime.getTime();
    return Math.floor(diffMs / 60000); // daqiqalarda
  };

  // Vaqtni formatlash (soat, daqiqa)
  const formatDuration = (minutes: number | null): string => {
    if (minutes === null || minutes < 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} soat, ${mins} daqiqa`;
    } else if (hours > 0) {
      return `${hours} soat`;
    } else {
      return `${mins} daqiqa`;
    }
  };

  // Jarayon vaqtini baholash
  const evaluateStageTime = (stageName: string, minutes: number | null): { rating: 'alo' | 'ortacha' | 'yomon', color: string, icon: string } => {
    if (minutes === null || minutes < 0) {
      return { rating: 'yomon', color: 'text-red-500', icon: 'fa-hourglass-half' };
    }

    let threshold: { alo: number; ortacha: number };
    switch (stageName) {
      case 'Invoys':
        threshold = { alo: 10, ortacha: 20 };
        break;
      case 'Zayavka':
      case 'TIR-SMR':
        threshold = { alo: 15, ortacha: 20 };
        break;
      case 'Sertifikat olib chiqish':
      case 'ST':
      case 'Fito':
      case 'FITO':
        threshold = { alo: 30, ortacha: 60 };
        break;
      case 'Deklaratsiya':
        threshold = { alo: 20, ortacha: 30 };
        break;
      case 'Tekshirish':
        threshold = { alo: 5, ortacha: 10 };
        break;
      case 'Topshirish':
      case 'Xujjat_topshirish':
      case 'Xujjat topshirish':
        threshold = { alo: 30, ortacha: 60 };
        break;
      case 'Pochta':
        threshold = { alo: 60, ortacha: 120 };
        break;
      default:
        threshold = { alo: 30, ortacha: 60 };
    }

    if (minutes < threshold.alo) {
      return { rating: 'alo', color: 'text-green-500', icon: 'fa-fire' };
    } else if (minutes < threshold.ortacha) {
      return { rating: 'ortacha', color: 'text-yellow-500', icon: 'fa-circle-half-stroke' };
    } else {
      return { rating: 'yomon', color: 'text-red-500', icon: 'fa-clock' };
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDurationMinutes = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours} soat ${mins} daqiqa`;
    return `${mins} daqiqa`;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'BOSHLANMAGAN':
        return { label: 'Boshlanmagan', color: 'bg-red-100 text-red-800' };
      case 'JARAYONDA':
        return { label: 'Jarayonda', color: 'bg-yellow-100 text-yellow-800' };
      case 'TAYYOR':
        return { label: 'Xujjat tayyor', color: 'bg-blue-100 text-blue-800' };
      case 'TEKSHIRILGAN':
        return { label: 'Xujjat tekshirilgan', color: 'bg-purple-100 text-purple-800' };
      case 'TOPSHIRILDI':
        return { label: 'Xujjat topshirildi', color: 'bg-indigo-100 text-indigo-800' };
      case 'YAKUNLANDI':
        return { label: 'Yakunlandi', color: 'bg-green-100 text-green-800' };
      default:
        return { label: 'Noma\'lum', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-yellow-200',
      'bg-pink-200',
      'bg-blue-200',
      'bg-blue-200',
      'bg-green-200',
      'bg-indigo-200',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate total duration for a task: Topshirish tayyor bo'lgan vaqt - Task yaratilgan vaqt
  const calculateTotalDuration = (task: Task): { text: string; color: string } => {
    if (!task.stages || task.stages.length === 0) return { text: '-', color: 'text-gray-500' };
    
    // Find "Topshirish" stage
    const topshirishStage = task.stages.find((stage) => stage.name === 'Topshirish');
    
    // If Topshirish is not completed, return '-'
    if (!topshirishStage || topshirishStage.status !== 'TAYYOR' || !topshirishStage.completedAt) {
      return { text: '-', color: 'text-gray-500' };
    }
    
    // Calculate difference: Topshirish completedAt - Task createdAt
    const completedAt = new Date(topshirishStage.completedAt);
    const createdAt = new Date(task.createdAt);
    
    const diffMs = completedAt.getTime() - createdAt.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes <= 0) return { text: '-', color: 'text-gray-500' };
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    let text = '';
    if (hours > 0) {
      text = `${hours} soat ${minutes} daqiqa`;
    } else {
      text = `${minutes} daqiqa`;
    }
    
    // Determine color based on hours
    let color = 'text-gray-500';
    if (hours < 2) {
      color = 'text-green-600'; // Yashil - 2 soatdan kam
    } else if (hours >= 2 && hours <= 3) {
      color = 'text-yellow-600'; // Sariq - 2-3 soat oralig'ida
    } else {
      color = 'text-red-600'; // Qizil - 3 soatdan ko'p
    }
    
    return { text, color };
  };

  const renderTaskTable = (branchTasks: Task[], branchName: string) => {
    const isArchive = branchName === 'Arxiv';
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-xl overflow-hidden border-2 border-blue-200">
        <div className={`px-6 py-3 relative overflow-hidden ${isArchive ? 'bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800' : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700'}`}>
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12"></div>
          <h2 className="text-lg font-semibold text-white relative z-10">
            {isArchive ? 'Arxiv' : `${branchName} filiali`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={isArchive ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Klient
                </th>
                {isArchive && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                    Filial
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Start Date
                </th>
                {isArchive && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                    Vaqt
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {branchTasks.length === 0 ? (
                <tr>
                  <td colSpan={isArchive ? 7 : 5} className="px-6 py-4 text-center text-gray-500 bg-blue-50">
                    Ma'lumotlar yo'q
                  </td>
                </tr>
              ) : (
                branchTasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status);
                  const totalDuration = calculateTotalDuration(task);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => loadTaskDetail(task.id)}
                      className={`hover:bg-blue-100 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-b border-blue-100">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-b border-blue-100">
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full ${getAvatarColor(
                              task.client.name
                            )} flex items-center justify-center text-xs font-semibold text-gray-700 mr-2 shadow-sm`}
                          >
                            {getInitials(task.client.name)}
                          </div>
                          <span className="text-xs">{task.client.name}</span>
                        </div>
                      </td>
                      {isArchive && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-b border-blue-100">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {task.branch.name}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 border-b border-blue-100">
                        {formatDate(task.createdAt)}
                      </td>
                      {isArchive && (
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 border-b border-blue-100">
                          <div className="flex items-center gap-1.5">
                            <svg className={`w-3.5 h-3.5 ${totalDuration.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={`font-medium ${totalDuration.color}`}>{totalDuration.text}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-b border-blue-100">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color} shadow-sm`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 border-b border-blue-100 max-w-[200px] min-w-[150px]">
                        <div className="truncate" title={task.comments || undefined}>
                          {task.comments || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Filter archive tasks
  const getFilteredArchiveTasks = () => {
    if (!showArchive || !Array.isArray(tasks)) return [];
    
    let filtered = tasks;
    
    // Search filter
    if (archiveSearchQuery.trim()) {
      const query = archiveSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) => 
        task.title.toLowerCase().includes(query) ||
        task.client.name.toLowerCase().includes(query)
      );
    }
    
    // Branch filter
    if (archiveFilters.branchId) {
      filtered = filtered.filter((task) => 
        task.branch.id.toString() === archiveFilters.branchId
      );
    }
    
    // Date range filter
    if (archiveFilters.startDate) {
      const startDate = new Date(archiveFilters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.createdAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= startDate;
      });
    }
    
    if (archiveFilters.endDate) {
      const endDate = new Date(archiveFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate <= endDate;
      });
    }
    
    // PSR filter
    if (archiveFilters.hasPsr !== '') {
      const hasPsr = archiveFilters.hasPsr === 'true';
      filtered = filtered.filter((task) => {
        return task.hasPsr === hasPsr;
      });
    }
    
    return filtered;
  };

  // Export to Excel function
  const exportToExcel = () => {
    const tasksToExport = showArchive ? filteredArchiveTasks : (Array.isArray(tasks) ? tasks : []);
    
    if (tasksToExport.length === 0) {
      alert('Eksport qilish uchun ma\'lumotlar yo\'q');
      return;
    }

    // Prepare data for Excel
    const excelData = tasksToExport.map((task) => {
      const durationInfo = calculateTotalDuration(task);
      return {
        'Task nomi': task.title,
        'Mijoz': task.client.name,
        'Filial': task.branch.name,
        'Status': getStatusInfo(task.status).label,
        'PSR': task.hasPsr ? 'Bor' : 'Yo\'q',
        'Sho\'pir tel': task.driverPhone || '-',
        'Izohlar': task.comments || '-',
        'Yaratilgan sana': formatDate(task.createdAt),
        'Yaratgan': task.createdBy?.name || '-',
        'Umumiy vaqt': durationInfo.text,
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Task nomi
      { wch: 20 }, // Mijoz
      { wch: 15 }, // Filial
      { wch: 15 }, // Status
      { wch: 10 }, // PSR
      { wch: 15 }, // Sho'pir tel
      { wch: 30 }, // Izohlar
      { wch: 18 }, // Yaratilgan sana
      { wch: 15 }, // Yaratgan
      { wch: 15 }, // Umumiy vaqt
    ];
    ws['!cols'] = colWidths;

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = showArchive 
      ? `Arxiv_Tasks_${dateStr}.xlsx`
      : `Tasks_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  // Separate tasks by branch
  const toshkentTasks = Array.isArray(tasks) ? tasks.filter((task) => task.branch.name === 'Toshkent') : [];
  const oltiariqTasks = Array.isArray(tasks) ? tasks.filter((task) => task.branch.name === 'Oltiariq') : [];
  const filteredArchiveTasks = getFilteredArchiveTasks();

  // Check if user is DEKLARANT with a branch assigned
  const isDeklarantWithBranch = user?.role === 'DEKLARANT' && user?.branchId;
  const userBranch = isDeklarantWithBranch 
    ? branches.find((b) => b.id === user.branchId)
    : null;
  
  // Filter tasks for DEKLARANT - only show their branch
  const userBranchTasks = isDeklarantWithBranch && userBranch
    ? (Array.isArray(tasks) ? tasks.filter((task) => task.branch.id === user.branchId) : [])
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
          {/* Tab buttons */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setShowArchive(false)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                !showArchive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Barcha ishlar
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                showArchive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Arxiv
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showArchive && (
            <div className="flex items-center gap-2 relative">
              {/* Export to Excel Icon */}
              <button
                onClick={exportToExcel}
                className="relative p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm hover:shadow z-10"
                title="Excel formatida yuklab olish"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              {/* Search Icon - Minimalistic */}
              <button
                onClick={() => setShowArchiveFilters(!showArchiveFilters)}
                className={`relative p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm hover:shadow z-10 ${
                  showArchiveFilters ? 'opacity-0 pointer-events-none' : ''
                }`}
                title="Qidirish va filtrlash"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
              
              {/* Expandable Search and Filter Panel */}
              {showArchiveFilters && (
                <div className="absolute right-0 top-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-20 min-w-[500px] animate-slideIn">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">Qidiruv va filtrlash</h3>
                    </div>
                    <button
                      onClick={() => setShowArchiveFilters(false)}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Search */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Qidirish
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={archiveSearchQuery}
                          onChange={(e) => setArchiveSearchQuery(e.target.value)}
                          placeholder="Task nomi yoki mijoz nomi..."
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                          autoFocus
                        />
                        {archiveSearchQuery && (
                          <button
                            onClick={() => setArchiveSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branch Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Filial
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <select
                          value={archiveFilters.branchId}
                          onChange={(e) => setArchiveFilters({ ...archiveFilters, branchId: e.target.value })}
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
                        >
                          <option value="">Barcha filiallar</option>
                          {Array.isArray(branches) && branches.map((branch) => (
                            <option key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Sana oralig'i
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="date"
                            value={archiveFilters.startDate}
                            onChange={(e) => setArchiveFilters({ ...archiveFilters, startDate: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                            placeholder="Boshlanish"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="date"
                            value={archiveFilters.endDate}
                            onChange={(e) => setArchiveFilters({ ...archiveFilters, endDate: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                            placeholder="Tugash"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PSR Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PSR
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <select
                          value={archiveFilters.hasPsr}
                          onChange={(e) => setArchiveFilters({ ...archiveFilters, hasPsr: e.target.value })}
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
                        >
                          <option value="">Barcha</option>
                          <option value="true">PSR bor</option>
                          <option value="false">PSR yo'q</option>
                        </select>
                      </div>
                    </div>

                    {/* Results Count */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium text-gray-700">
                          {filteredArchiveTasks.length} ta natija
                        </span>
                        {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                          <span className="text-gray-500">(filtrlangan)</span>
                        )}
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                      <button
                        onClick={() => {
                          setArchiveSearchQuery('');
                          setArchiveFilters({ branchId: '', startDate: '', endDate: '', hasPsr: '' });
                        }}
                        className="w-full px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md border border-gray-300"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Filtrlarni tozalash
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {!showArchive && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards - faqat barcha ishlar bo'limida */}
      {!showArchive && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Bugungi ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.daily.current, stats.daily.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.daily.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Bugungi ishlar soni</div>
          </div>

          {/* Bu haftadagi ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.weekly.current, stats.weekly.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.weekly.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Bu haftadagi ishlar soni</div>
          </div>

          {/* Bu oydagi ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.monthly.current, stats.monthly.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.monthly.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Bu oydagi ishlar soni</div>
          </div>

          {/* Yillik ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.yearly.current, stats.yearly.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.yearly.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Yillik ishlar soni</div>
          </div>
        </div>
      )}

      {/* Modal for Add Task */}
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
            className="bg-white rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Yangi task</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                {/* 1. Task name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Task name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="Type here"
                  />
                </div>

                {/* 2. Mijoz */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mijoz <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    required
                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm"
                  >
                    <option value="">Tanlang...</option>
                    {Array.isArray(clients) && clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filial - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (branches.length === 0) {
                          console.warn('Branches not loaded yet');
                          return;
                        }
                        const toshkentBranch = branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'toshkent' || 
                          b.name === 'Toshkent'
                        );
                        if (toshkentBranch) {
                          setForm({ ...form, branchId: toshkentBranch.id.toString() });
                        } else {
                          console.error('Toshkent branch not found. Available branches:', branches);
                        }
                      }}
                      disabled={branches.length === 0}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.branchId === branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'toshkent' || 
                          b.name === 'Toshkent'
                        )?.id.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      Toshkent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (branches.length === 0) {
                          console.warn('Branches not loaded yet');
                          return;
                        }
                        const oltiariqBranch = branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'oltiariq' || 
                          b.name === 'Oltiariq'
                        );
                        if (oltiariqBranch) {
                          setForm({ ...form, branchId: oltiariqBranch.id.toString() });
                        } else {
                          console.error('Oltiariq branch not found. Available branches:', branches);
                        }
                      }}
                      disabled={branches.length === 0}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.branchId === branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'oltiariq' || 
                          b.name === 'Oltiariq'
                        )?.id.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      Oltiariq
                    </button>
                  </div>
                </div>

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PSR <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasPsr: true })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.hasPsr === true
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasPsr: false })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.hasPsr === false
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Yo'q
                    </button>
                  </div>
                </div>

                {/* 5. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Sho'pir tel raqami
                  </label>
                  <input
                    type="tel"
                    value={form.driverPhone}
                    onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="+998901234567"
                  />
                </div>

                {/* 6. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </label>
                  <textarea
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm resize-none"
                    rows={4}
                    placeholder="Type here"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Task Detail */}
      {showTaskModal && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskModal(false);
              setSelectedTask(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{selectedTask.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setErrorForm({
                      workerId: '',
                      stageName: '',
                      amount: '',
                      comment: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                    setShowErrorModal(true);
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Xato
                </button>
                {/* Faqat task yaratgan ishchi o'zgartira oladi */}
                {selectedTask.createdBy && user && selectedTask.createdBy.id === user.id && (
                  <button
                    onClick={() => {
                      if (selectedTask) {
                        setEditForm({
                          title: selectedTask.title,
                          clientId: selectedTask.client.id.toString(),
                          branchId: selectedTask.branch.id.toString(),
                          comments: selectedTask.comments || '',
                          hasPsr: selectedTask.hasPsr || false,
                          driverPhone: selectedTask.driverPhone || '',
                        });
                        setShowEditModal(true);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    O'zgartirish
                  </button>
                )}
                {/* Task o'chirish: faqat barcha jarayonlar BOSHLANMAGAN bo'lsa va task Jarayonda bo'lmasa */}
                {selectedTask.stages && 
                 selectedTask.status !== 'JARAYONDA' &&
                 selectedTask.stages.every((stage: any) => stage.status === 'BOSHLANMAGAN') && (
                  <button
                    onClick={async () => {
                      if (confirm('Bu taskni o\'chirishni xohlaysizmi?')) {
                        try {
                          await apiClient.delete(`/tasks/${selectedTask.id}`);
                          setShowTaskModal(false);
                          setSelectedTask(null);
                          await loadTasks();
                        } catch (error: any) {
                          alert(error.response?.data?.error || 'Xatolik yuz berdi');
                        }
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    O'chirish
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Task Info */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Mijoz</div>
                <div className="font-medium">{selectedTask.client.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Filial</div>
                <div className="font-medium">{selectedTask.branch.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusInfo(selectedTask.status).color}`}>
                    {getStatusInfo(selectedTask.status).label}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Yaratilgan</div>
                <div className="font-medium text-sm">{formatDate(selectedTask.createdAt)}</div>
                {selectedTask.createdBy && (
                  <div className="text-xs text-gray-400 mt-1">by {selectedTask.createdBy.name}</div>
                )}
              </div>
            </div>
            {selectedTask.updatedBy && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Oxirgi o'zgartirilgan:</span> {selectedTask.updatedAt ? formatDate(selectedTask.updatedAt) : ''} 
                    {selectedTask.updatedBy && <span className="ml-2">by {selectedTask.updatedBy.name}</span>}
                  </div>
                  {selectedTask.stages && selectedTask.stages.length > 0 && (() => {
                    const totalMinutes = selectedTask.stages
                      .filter(stage => stage.status === 'TAYYOR')
                      .reduce((total, stage) => {
                        const duration = calculateStageDuration(stage, selectedTask.stages || [], selectedTask.createdAt);
                        return total + (duration || 0);
                      }, 0);
                    const totalDuration = formatDuration(totalMinutes);
                    return totalDuration ? (
                      <div className="text-sm font-medium text-gray-700">
                        Umumiy vaqt: {totalDuration}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* PSR Information */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-sm font-semibold text-blue-800">PSR Ma'lumotlari</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">PSR:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    selectedTask.hasPsr 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.hasPsr ? 'Bor' : 'Yo\'q'}
                  </span>
                </div>
                {selectedTask.driverPhone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-600">Sho'pir tel raqami:</span>
                    <span className="text-sm font-medium text-gray-800">{selectedTask.driverPhone}</span>
                  </div>
                )}
                {selectedTask.driverPhone && (
                  <button
                    onClick={handleTelegramClick}
                    className="mt-3 w-full bg-[#0088cc] hover:bg-[#0077b5] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                  >
                    <span className="text-lg">📨</span>
                    <span>Telegram orqali xabar yuborish</span>
                  </button>
                )}
              </div>
            </div>

            {/* Foyda hisoboti - barcha foydalanuvchilar uchun */}
            {selectedTask.netProfit !== null && selectedTask.netProfit !== undefined && (
              <div className={`mb-6 p-4 border rounded-lg ${
                selectedTask.netProfit >= 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${selectedTask.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className={`text-sm font-semibold ${selectedTask.netProfit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                    Foyda hisoboti
                  </div>
                </div>
                <div className="space-y-2">
                  {/* Admin uchun to'liq ma'lumot */}
                  {user?.role === 'ADMIN' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Kelishuv summasi:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {new Intl.NumberFormat('uz-UZ', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(
                            (selectedTask.snapshotDealAmount ? Number(selectedTask.snapshotDealAmount) : Number(selectedTask.client.dealAmount || 0)) + (selectedTask.hasPsr ? 10 : 0)
                          )}
                          {selectedTask.hasPsr && (
                            <span className="text-xs text-gray-500 ml-1">
                              (asosiy: {new Intl.NumberFormat('uz-UZ', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                              }).format(selectedTask.snapshotDealAmount ? Number(selectedTask.snapshotDealAmount) : Number(selectedTask.client.dealAmount || 0))} + 10)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Filial bo'yicha to'lovlar:</span>
                        <span className="text-sm font-medium text-red-600">
                          {new Intl.NumberFormat('uz-UZ', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(
                            ((selectedTask.snapshotDealAmount ? Number(selectedTask.snapshotDealAmount) : Number(selectedTask.client.dealAmount || 0)) + (selectedTask.hasPsr ? 10 : 0)) - (selectedTask.netProfit || 0)
                          )}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                        <span className={`text-sm font-semibold ${selectedTask.netProfit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                          Sof foyda:
                        </span>
                        <span className={`text-sm font-bold ${selectedTask.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {new Intl.NumberFormat('uz-UZ', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(selectedTask.netProfit)}
                        </span>
                      </div>
                      {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-800">
                            Admin ishlab topgan pul:
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {new Intl.NumberFormat('uz-UZ', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                            }).format(selectedTask.adminEarnedAmount)}
                          </span>
                        </div>
                      )}
                      {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                        <div className="pt-2 border-t-2 border-gray-300 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-800">
                            Jami foyda:
                          </span>
                          <span className="text-lg font-bold text-purple-600">
                            {new Intl.NumberFormat('uz-UZ', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                            }).format((selectedTask.netProfit || 0) + (selectedTask.adminEarnedAmount || 0))}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Admin'dan boshqa foydalanuvchilar uchun jarayonlar bo'yicha pul ma'lumotlari */}
                  {user?.role !== 'ADMIN' && selectedTask.kpiLogs && selectedTask.kpiLogs.length > 0 && (() => {
                    // Faqat joriy foydalanuvchining shu taskdan ishlab topgan pullarini filter qilamiz
                    const userKpiLogs = selectedTask.kpiLogs.filter(log => log.userId === user?.id);
                    
                    if (userKpiLogs.length === 0) {
                      return (
                        <div className="text-sm text-gray-500 italic">
                          Siz bu taskdan hozircha pul ishlab topmadingiz
                        </div>
                      );
                    }
                    
                    const totalAmount = userKpiLogs.reduce((sum, log) => sum + Number(log.amount), 0);
                    
                    return (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Bu taskdan ishlab topilgan pul:</div>
                        <div className="space-y-1.5">
                          {userKpiLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {log.stageName}:
                              </span>
                              <span className="font-medium text-gray-800">
                                {new Intl.NumberFormat('uz-UZ', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 2,
                                }).format(log.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">
                            Jami pul:
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            {new Intl.NumberFormat('uz-UZ', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                            }).format(totalAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Agar KPI log'lar bo'lmasa */}
                  {user?.role !== 'ADMIN' && (!selectedTask.kpiLogs || selectedTask.kpiLogs.length === 0) && (
                    <div className="text-sm text-gray-500 italic">
                      Hozircha jarayonlar bo'yicha pul ma'lumotlari yo'q
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTask.comments && (
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Izohlar
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedTask.comments}</p>
                </div>
              </div>
            )}

            {/* Stages - Checklist */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Jarayonlar</h3>
              <div className="space-y-2">
                {selectedTask.stages && selectedTask.stages.length > 0 ? (
                  selectedTask.stages.map((stage) => {
                    // Vaqtni hisoblash va baholash
                    const durationMinutes = stage.status === 'TAYYOR' 
                      ? calculateStageDuration(stage, selectedTask.stages || [], selectedTask.createdAt)
                      : null;
                    const evaluation = stage.status === 'TAYYOR' 
                      ? evaluateStageTime(stage.name, durationMinutes)
                      : null;
                    
                    // Rangni aniqlash
                    let borderColor = 'border-gray-200';
                    let bgColor = '';
                    if (stage.status === 'TAYYOR' && evaluation) {
                      if (evaluation.rating === 'alo') {
                        borderColor = 'border-green-300';
                        bgColor = 'bg-green-50';
                      } else if (evaluation.rating === 'ortacha') {
                        borderColor = 'border-yellow-300';
                        bgColor = 'bg-yellow-50';
                      } else {
                        borderColor = 'border-red-300';
                        bgColor = 'bg-red-50';
                      }
                    } else if (stage.status === 'TAYYOR') {
                      bgColor = 'bg-gray-50';
                    }
                    
                    return (
                    <div
                      key={stage.id}
                      className={`flex items-center justify-between p-3 border ${borderColor} rounded-lg hover:bg-gray-50 transition ${bgColor}`}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          onClick={() => !updatingStage && handleStageClick(stage)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                            stage.status === 'TAYYOR'
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 bg-white hover:border-green-400'
                          } ${updatingStage === stage.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{
                            transition: stage.status === 'TAYYOR' 
                              ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                              : 'all 0.3s ease-in-out',
                            transform: stage.status === 'TAYYOR' ? 'scale(1.1)' : 'scale(1)',
                            boxShadow: stage.status === 'TAYYOR' 
                              ? '0 4px 12px rgba(34, 197, 94, 0.4)' 
                              : 'none',
                            animation: stage.status === 'TAYYOR' && updatingStage !== stage.id
                              ? 'checkboxPulse 0.6s ease-out'
                              : 'none'
                          }}
                        >
                          {stage.status === 'TAYYOR' && (
                            <svg 
                              className="w-4 h-4 text-white" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={3} 
                                d="M5 13l4 4L19 7"
                                style={{
                                  strokeDasharray: 20,
                                  strokeDashoffset: 0,
                                  animation: 'checkmarkDraw 0.5s ease-in-out forwards'
                                }}
                              />
                            </svg>
                          )}
                        </div>
                        <label
                          className={`ml-3 text-sm font-medium cursor-pointer flex-1 transition-all duration-300 ${
                            stage.status === 'TAYYOR'
                              ? 'line-through text-gray-400 opacity-60'
                              : 'text-gray-900'
                          }`}
                          onClick={() => !updatingStage && handleStageClick(stage)}
                        >
                          {stage.name}
                        </label>
                      </div>
                      {stage.status === 'TAYYOR' && (() => {
                        const durationText = formatDuration(durationMinutes);
                        
                        return (
                          <div className="text-xs text-gray-500 ml-4 flex items-center gap-2 flex-wrap">
                            {stage.assignedTo && (
                              <span className="font-medium text-gray-700">
                                ({stage.assignedTo.name})
                              </span>
                            )}
                            {durationText && evaluation && (
                              <>
                                <span>{durationText}</span>
                                <i className={`fas ${evaluation.icon} ${evaluation.color}`} title={
                                  evaluation.rating === 'alo' ? 'A\'lo' : 
                                  evaluation.rating === 'ortacha' ? 'Ortacha' : 
                                  'Yomon'
                                }></i>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    {loadingTask ? 'Jarayonlar yuklanmoqda...' : 'Jarayonlar topilmadi'}
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Hujjatlar</h3>
                <div className="flex items-center gap-2">
                  {taskDocuments.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const baseUrl = apiClient.defaults.baseURL || 'http://localhost:3001/api';
                          const serverBaseUrl = baseUrl.replace('/api', '');
                          const url = `${serverBaseUrl}/api/documents/task/${selectedTask?.id}/download-all`;
                          
                          // Token bilan so'rov yuborish
                          const accessToken = localStorage.getItem('accessToken');
                          const response = await fetch(url, {
                            headers: {
                              'Authorization': `Bearer ${accessToken}`,
                            },
                          });

                          if (!response.ok) {
                            throw new Error('Yuklab olishda xatolik');
                          }

                          // Blob olish va yuklab olish
                          const blob = await response.blob();
                          const downloadUrl = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = `${selectedTask?.title || 'task'}.zip`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(downloadUrl);
                        } catch (error: any) {
                          console.error('Error downloading ZIP:', error);
                          alert(error.message || 'Yuklab olishda xatolik');
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                      title="Barcha hujjatlarni ZIP qilib yuklab olish"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Barchasini yuklab olish
                    </button>
                  )}
                  {(selectedTask.status !== 'YAKUNLANDI' || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => {
                        setShowDocumentUpload(true);
                        setUploadFiles([]);
                        setDocumentNames([]);
                        setDocumentDescriptions([]);
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Hujjat qo'shish
                    </button>
                  )}
                </div>
              </div>
              {loadingDocuments ? (
                <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
              ) : !Array.isArray(taskDocuments) || taskDocuments.length === 0 ? (
                <div className="text-center py-4 text-gray-400">Hujjatlar yo'q</div>
              ) : (
                <div className="space-y-2">
                  {taskDocuments.map((doc) => {
                    const isExpanded = expandedDocuments.has(doc.id);
                    const hasOCR = canShowOCR(doc.fileType, doc.name);
                    const extractedText = documentExtractedTexts.get(doc.id) || '';
                    const isLoadingText = loadingExtractedTexts.has(doc.id);
                    
                    return (
                      <div key={doc.id} className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-shrink-0">
                              {getFileIcon(doc.fileType, doc.name)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{doc.name}</div>
                              {doc.description && (
                                <div className="text-sm text-gray-500">{doc.description}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt || doc.archivedAt).toLocaleDateString('uz-UZ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasOCR && (
                              <button
                                onClick={() => toggleDocumentExpansion(doc.id)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                title={isExpanded ? "Matnni yashirish" : "OCR matnini ko'rish"}
                              >
                                <svg 
                                  className="w-5 h-5" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                            {canPreview(doc.fileType) && (
                              <button
                                onClick={() => openPreview(doc.fileUrl, doc.fileType, doc.name)}
                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                title="Ko'rish"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => downloadDocument(doc.fileUrl)}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              title="Yuklab olish"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            {(() => {
                              const canDelete = () => {
                                // Admin har doim o'chira oladi
                                if (user?.role === 'ADMIN') return true;
                                
                                // Faqat yuklagan foydalanuvchi o'chira oladi
                                if (doc.uploadedById !== user?.id) return false;
                                
                                // 2 kundan keyin o'chira oladi
                                const uploadTime = new Date(doc.createdAt || doc.archivedAt);
                                const now = new Date();
                                const diffInMs = now.getTime() - uploadTime.getTime();
                                const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
                                
                                return diffInDays >= 2;
                              };
                              
                              return canDelete() ? (
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  title="O'chirish"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              ) : doc.uploadedById === user?.id ? (
                                <span className="text-xs text-gray-400" title="2 kundan keyin o'chirish mumkin">
                                  2 kun
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        {isExpanded && hasOCR && (
                          <div className="ml-4 mr-4 mb-2 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-700">OCR Natijasi (O'qilgan matn)</h4>
                              <button
                                onClick={() => {
                                  if (extractedText) {
                                    navigator.clipboard.writeText(extractedText);
                                    alert('Matn nusxalandi!');
                                  }
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                title="Nusxalash"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Nusxalash
                              </button>
                            </div>
                            {isLoadingText ? (
                              <div className="text-center py-8 text-gray-500">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <p className="mt-2 text-sm">Matn yuklanmoqda...</p>
                              </div>
                            ) : extractedText ? (
                              <pre className="text-xs text-gray-800 bg-gray-50 p-3 rounded border border-gray-200 max-h-96 overflow-y-auto whitespace-pre-wrap break-words font-mono">
                                {formatInvoiceExtractedText(extractedText, doc.documentType)}
                              </pre>
                            ) : (
                              <div className="text-center py-4 text-gray-400 text-sm">
                                OCR natijasi topilmadi. Hujjat hali qayta ishlanmagan yoki matn o'qilmagan.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Tekshiruv Natijalari Section - Temporarily hidden */}
            {false && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">AI Tekshiruv Natijalari</h3>
                  <button
                    onClick={() => {
                      if (selectedTask) {
                        loadAiChecks(selectedTask.id);
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    title="Yangilash"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Yangilash
                  </button>
                </div>
                {loadingAiChecks ? (
                  <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
                ) : !Array.isArray(aiChecks) || aiChecks.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <p className="mb-2">AI tekshiruv natijalari yo'q</p>
                    <p className="text-xs text-gray-500">
                      Invoice va ST hujjatlarini yuklaganingizdan keyin AI tekshiruvi avtomatik bajariladi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiChecks.map((check: any) => {
                      // Parse details if it's a JSON string
                      let details = check.details;
                      if (typeof details === 'string') {
                        try {
                          details = JSON.parse(details);
                        } catch (e) {
                          console.error('Error parsing AI check details:', e, 'Raw details:', details);
                          details = {};
                        }
                      }
                      
                      // Debug log
                      console.log('[AI Check] Processing check:', {
                        id: check.id,
                        checkType: check.checkType,
                        result: check.result,
                        details: details,
                        detailsType: typeof details,
                      });
                      
                      // Handle new format: {status: "OK"|"ERROR"|"XATO", errors: []}
                      // or legacy format: {findings: []}
                      const errors = details?.errors || [];
                      const status = details?.status || (check.result === 'PASS' ? 'OK' : 'ERROR');
                      const isPass = status === 'OK' || check.result === 'PASS';
                      
                      // For backward compatibility with old format
                      const legacyFindings = details?.findings || [];
                      
                      // Determine if there are errors (handle both new and legacy formats)
                      const hasErrors = 
                        status === 'ERROR' || 
                        status === 'XATO' || 
                        errors.length > 0 || 
                        (legacyFindings.length > 0 && !isPass);
                      
                      console.log('[AI Check] Parsed result:', {
                        status,
                        isPass,
                        hasErrors,
                        errorsCount: errors.length,
                        legacyFindingsCount: legacyFindings.length,
                      });
                      
                      return (
                        <div
                          key={check.id}
                          className={`p-4 rounded-lg border-2 ${
                            isPass
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-semibold ${
                                isPass ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {isPass ? '✓' : '✗'}
                              </span>
                              <div>
                                <div className={`font-semibold ${
                                  isPass ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {check.checkType === 'INVOICE_ST' ? 'Invoice-ST Tekshiruvi' : check.checkType}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(check.createdAt).toLocaleString('uz-UZ', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isPass
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {isPass ? 'TO\'G\'RI' : (status === 'XATO' ? 'XATO' : 'XATO')}
                            </span>
                          </div>
                          
                          {hasErrors ? (
                            <div className="mt-3 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Topilgan muammolar ({errors.length || legacyFindings.length}):
                              </div>
                              {/* New format: errors array */}
                              {errors.map((error: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded bg-red-100 border border-red-300"
                                >
                                  <div className="font-medium text-sm mb-2 text-red-700">
                                    🔴 {error.field || 'Noma\'lum maydon'}
                                  </div>
                                  {error.description && (
                                    <div className="text-sm text-gray-700 mb-2">
                                      {error.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-300">
                                    {error.invoice && (
                                      <div>
                                        <span className="font-medium">Invoice:</span>{' '}
                                        <span className="font-mono bg-gray-100 px-1 rounded">
                                          {error.invoice}
                                        </span>
                                      </div>
                                    )}
                                    {(error.st1 || error.st) && (
                                      <div>
                                        <span className="font-medium">ST:</span>{' '}
                                        <span className="font-mono bg-gray-100 px-1 rounded">
                                          {error.st1 || error.st}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {/* Legacy format: findings array (for backward compatibility) */}
                              {legacyFindings.length > 0 && errors.length === 0 && legacyFindings.map((finding: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded ${
                                    finding.severity === 'critical'
                                      ? 'bg-red-100 border border-red-300'
                                      : 'bg-yellow-100 border border-yellow-300'
                                  }`}
                                >
                                  <div className="font-medium text-sm mb-2">
                                    <span className={finding.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}>
                                      {finding.severity === 'critical' ? '🔴 Kritik:' : '⚠️ Ogohlantirish:'}
                                    </span>
                                    <span className="ml-1 font-semibold">{finding.field || 'Noma\'lum maydon'}</span>
                                  </div>
                                  {finding.explanation && (
                                    <div className="text-sm text-gray-700 mb-2">
                                      {finding.explanation}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-300">
                                    {finding.invoice_value !== undefined && finding.invoice_value !== null && (
                                      <div>
                                        <span className="font-medium">Invoice:</span>{' '}
                                        <span className="font-mono bg-gray-100 px-1 rounded">
                                          {typeof finding.invoice_value === 'object' 
                                            ? JSON.stringify(finding.invoice_value, null, 2)
                                            : String(finding.invoice_value)}
                                        </span>
                                      </div>
                                    )}
                                    {finding.st_value !== undefined && finding.st_value !== null && (
                                      <div>
                                        <span className="font-medium">ST:</span>{' '}
                                        <span className="font-mono bg-gray-100 px-1 rounded">
                                          {typeof finding.st_value === 'object'
                                            ? JSON.stringify(finding.st_value, null, 2)
                                            : String(finding.st_value)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={`text-sm mt-2 p-3 rounded ${
                              isPass 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {isPass 
                                ? '✅ Barcha ma\'lumotlar to\'g\'ri keladi. Xatolik topilmadi.'
                                : 'ℹ️ AI tekshiruvi bajarildi, lekin batafsil natijalar mavjud emas.'}
                            </div>
                          )}
                          
                          {/* Show raw details if available for debugging */}
                          {import.meta.env.MODE === 'development' && details && Object.keys(details).length > 0 && (
                            <details className="mt-3 text-xs">
                              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                Batafsil ma'lumot (debug)
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Versions Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Versiyalar</h3>
                <button
                  onClick={() => {
                    setShowVersions(!showVersions);
                    if (!showVersions && selectedTask) {
                      loadTaskVersions(selectedTask.id);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showVersions ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                  {showVersions ? 'Yashirish' : 'Ko\'rsatish'}
                </button>
              </div>
              {showVersions && (
                <div>
                  {loadingVersions ? (
                    <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
                  ) : taskVersions.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">Versiyalar yo'q</div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {taskVersions.map((version) => (
                        <div
                          key={version.id}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                                V{version.version}
                              </span>
                              <span className="text-sm font-medium text-gray-700">{version.title}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(version.createdAt)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-medium">O'zgartirgan:</span> {version.changedByUser.name}
                          </div>
                          {version.changes && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">O'zgarishlar:</span>
                                {version.changes.changeType === 'STAGE' && version.changes.stage ? (
                                  <div className="mt-1 bg-white p-2 rounded border border-blue-100">
                                    <div className="font-medium text-blue-700 mb-1">Jarayon o'zgarishi:</div>
                                    <div className="space-y-1">
                                      <div><span className="font-medium">Jarayon:</span> {version.changes.stage.name}</div>
                                      <div><span className="font-medium">Status:</span> {version.changes.stage.status === 'TAYYOR' ? 'Tugallandi' : 'Boshlanmagan'}</div>
                                      {version.changes.stage.assignedTo && (
                                        <div><span className="font-medium">Javobgar:</span> {version.changes.stage.assignedTo.name}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 space-y-1">
                                    {version.changes.title && (
                                      <div><span className="font-medium">Title:</span> {version.changes.title}</div>
                                    )}
                                    {version.changes.status && (
                                      <div><span className="font-medium">Status:</span> {version.changes.status}</div>
                                    )}
                                    {version.changes.comments && (
                                      <div><span className="font-medium">Comments:</span> {version.changes.comments}</div>
                                    )}
                                    {version.changes.hasPsr !== undefined && (
                                      <div><span className="font-medium">PSR:</span> {version.changes.hasPsr ? 'Bor' : 'Yo\'q'}</div>
                                    )}
                                    {version.changes.driverPhone && (
                                      <div><span className="font-medium">Driver Phone:</span> {version.changes.driverPhone}</div>
                                    )}
                                  </div>
                                )}
                                {version.changes.stages && Array.isArray(version.changes.stages) && (
                                  <div className="mt-2 pt-2 border-t border-blue-100">
                                    <div className="font-medium text-blue-700 mb-1">Barcha jarayonlar holati:</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {version.changes.stages.map((s: any, idx: number) => (
                                        <div key={idx} className="text-xs flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${
                                            s.status === 'TAYYOR' ? 'bg-green-500' : 'bg-gray-300'
                                          }`}></span>
                                          <span>{s.name}</span>
                                          {s.assignedTo && (
                                            <span className="text-gray-500">({s.assignedTo.name})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="mt-2 flex gap-2 text-xs">
                            <span className={`px-2 py-1 rounded ${getStatusInfo(version.status).color}`}>
                              {getStatusInfo(version.status).label}
                            </span>
                            {version.comments && (
                              <span className="text-gray-500 truncate" title={version.comments}>
                                {version.comments}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BXM Multiplier Modal */}
            {showBXMModal && selectedStageForReminder && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] backdrop-blur-sm"
                style={{
                  animation: 'backdropFadeIn 0.3s ease-out'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowBXMModal(false);
                    setSelectedStageForReminder(null);
                  }
                }}
              >
                <div 
                  className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
                  style={{
                    animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Deklaratsiya To'lovi</h3>
                  <div className="mb-4">
                    <select
                      value={bxmMultiplier}
                      onChange={(e) => setBxmMultiplier(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                    >
                      <option value="1">BXM 1 barobari (412 000 so'm)</option>
                      <option value="1.5">BXM 1.5 barobari (618 000 so'm)</option>
                      <option value="2.5">BXM 2.5 barobari (1 030 000 so'm)</option>
                      <option value="4">BXM 4 barobari (1 648 000 so'm)</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleBXMConfirm}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => {
                        setShowBXMModal(false);
                        setSelectedStageForReminder(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Umumiy file upload modali (Invoice, ST, Fito uchun) */}
            {showFileUploadModal && selectedTask && fileUploadStageName && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] backdrop-blur-sm"
                style={{
                  animation: 'fadeIn 0.2s ease-out'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget && !aiCheckResult) {
                    setShowFileUploadModal(false);
                    setFileUploadFile(null);
                    setFileUploadName('');
                    setFileUploadStageName('');
                    setAiCheckResult(null);
                  }
                }}
              >
                <div
                  className={`bg-white rounded-lg shadow-2xl p-6 w-full mx-4 ${
                    fileUploadStageName === 'ST' && aiCheckResult 
                      ? 'max-w-2xl max-h-[90vh] overflow-y-auto' 
                      : 'max-w-md'
                  }`}
                  style={{
                    animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {fileUploadStageName === 'Invoys' ? 'Invoice' : fileUploadStageName === 'Sertifikat olib chiqish' ? fileUploadName : fileUploadStageName} PDF/JPG yuklash
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {fileUploadStageName === 'Sertifikat olib chiqish' ? 'Sertifikat olib chiqish' : fileUploadStageName} stage'ini tayyor qilish uchun hujjat yuklanishi shart.
                    {(fileUploadStageName === 'ST' || (fileUploadStageName === 'Sertifikat olib chiqish' && fileUploadName === 'ST')) && <span> Yuklangandan keyin AI tekshiruvdan o'tkaziladi.</span>}
                  </p>
                  
                  {!aiCheckResult ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {fileUploadStageName === 'Sertifikat olib chiqish' ? 'Sertifikat turi' : 'Hujjat nomi'}
                        </label>
                        {fileUploadStageName === 'Sertifikat olib chiqish' ? (
                          <select
                            value={fileUploadName}
                            onChange={(e) => setFileUploadName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                          >
                            <option value="ST">ST</option>
                            <option value="Fito">Fito</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={fileUploadName}
                            onChange={(e) => setFileUploadName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                            placeholder={fileUploadStageName === 'Invoys' ? 'Invoice' : fileUploadStageName}
                          />
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          PDF yoki JPG fayl
                        </label>
                        <input
                          type="file"
                          accept=".pdf,application/pdf,.jpg,.jpeg,image/jpeg,image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Fayl nomi va MIME type'ni tekshiramiz
                              const fileName = file.name.toLowerCase();
                              const fileType = file.type.toLowerCase();
                              const validExtensions = ['.pdf', '.jpg', '.jpeg'];
                              const validMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/pjpeg'];
                              
                              const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
                              const hasValidMimeType = validMimeTypes.includes(fileType) || fileType === '';
                              
                              if (!hasValidExtension && !hasValidMimeType) {
                                alert('Faqat PDF va JPG fayllar qabul qilinadi');
                                e.target.value = ''; // Input'ni tozalaymiz
                                return;
                              }
                              
                              setFileUploadFile(file);
                              // Auto-fill file name if empty or default
                              const defaultName = fileUploadStageName === 'Invoys' 
                                ? 'Invoice' 
                                : fileUploadStageName === 'Sertifikat olib chiqish'
                                  ? fileUploadName || 'ST'
                                  : fileUploadStageName;
                              if (!fileUploadName || fileUploadName === fileUploadStageName || fileUploadName === defaultName) {
                                const nameWithoutExt = file.name.replace(/\.(pdf|jpg|jpeg)$/i, '');
                                setFileUploadName(nameWithoutExt);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {fileUploadFile && (
                          <p className="mt-2 text-sm text-gray-600">
                            Tanlangan: {fileUploadFile.name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                          <button
                            onClick={handleFileUpload}
                            disabled={!fileUploadFile || uploadingFile}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingFile ? 'Yuklanmoqda...' : 'Yuklash va tayyor qilish'}
                          </button>
                          <button
                            onClick={() => {
                              setShowFileUploadModal(false);
                              setFileUploadFile(null);
                              setFileUploadName('');
                              setFileUploadStageName('');
                              setSelectedStageForReminder(null);
                              setAiCheckResult(null);
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Bekor qilish
                          </button>
                        </div>
                        {selectedStageForReminder && (
                          <button
                            onClick={async () => {
                              try {
                                await updateStageToReady(undefined, true);
                                setShowFileUploadModal(false);
                                setFileUploadFile(null);
                                setFileUploadName('');
                                setFileUploadStageName('');
                              } catch (error) {
                                console.error('Error skipping validation:', error);
                              }
                            }}
                            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                          >
                            O'tkazib yuborish va tayyor qilish
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className={`mb-4 p-4 rounded-lg ${
                        aiCheckResult.result === 'PASS' 
                          ? 'bg-green-50 border-2 border-green-200' 
                          : 'bg-red-50 border-2 border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg font-semibold ${
                            aiCheckResult.result === 'PASS' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {aiCheckResult.result === 'PASS' ? '✓' : '✗'}
                          </span>
                          <h4 className={`text-lg font-semibold ${
                            aiCheckResult.result === 'PASS' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            AI Tekshiruv Natijasi: {aiCheckResult.result === 'PASS' ? 'TO\'G\'RI' : 'XATO'}
                          </h4>
                        </div>
                        {aiCheckResult.findings.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {aiCheckResult.findings.map((finding, idx) => (
                              <div 
                                key={idx}
                                className={`p-3 rounded ${
                                  finding.severity === 'critical' 
                                    ? 'bg-red-100 border border-red-300' 
                                    : 'bg-yellow-100 border border-yellow-300'
                                }`}
                              >
                                <div className="font-medium text-sm mb-1">
                                  {finding.severity === 'critical' ? '🔴 Kritik:' : '⚠️ Ogohlantirish:'} {finding.field}
                                </div>
                                <div className="text-xs text-gray-700">
                                  {finding.explanation}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Invoice: {JSON.stringify(finding.invoice_value)} | ST: {JSON.stringify(finding.st_value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {aiCheckResult.findings.length === 0 && (
                          <p className="text-sm text-green-700">
                            Barcha ma'lumotlar to'g'ri keladi. Xatolik topilmadi.
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            setShowFileUploadModal(false);
                            setFileUploadFile(null);
                            setFileUploadName('');
                            setFileUploadStageName('');
                            setAiCheckResult(null);
                            if (selectedStageForReminder) {
                              await updateStageToReady();
                            } else {
                              await loadTaskDetail(selectedTask.id);
                              await loadTaskDocuments(selectedTask.id);
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Yopish
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Reminder Modal */}
            {showReminderModal && selectedStageForReminder && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
                style={{
                  animation: 'backdropFadeIn 0.3s ease-out'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowReminderModal(false);
                    setSelectedStageForReminder(null);
                  }
                }}
              >
                <div 
                  className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
                  style={{
                    animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">ESLATMA!!!</h3>
                  <div className="mb-6 whitespace-pre-line text-sm text-gray-700">
                    {getReminderMessage(selectedStageForReminder.name)}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirmStage(true)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
                    >
                      Ha
                    </button>
                    <button
                      onClick={() => handleConfirmStage(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
                    >
                      Yo'q
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Edit Task */}
      {showEditModal && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Taskni tahrirlash</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-3">
                {/* 1. Task name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Task name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="Type here"
                  />
                </div>

                {/* 2. Mijoz */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mijoz <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.clientId}
                    onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                    required
                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm"
                  >
                    <option value="">Tanlang...</option>
                    {Array.isArray(clients) && clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filial - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (branches.length === 0) {
                          console.warn('Branches not loaded yet');
                          return;
                        }
                        const toshkentBranch = branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'toshkent' || 
                          b.name === 'Toshkent'
                        );
                        if (toshkentBranch) {
                          setEditForm({ ...editForm, branchId: toshkentBranch.id.toString() });
                        } else {
                          console.error('Toshkent branch not found. Available branches:', branches);
                        }
                      }}
                      disabled={branches.length === 0}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.branchId === branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'toshkent' || 
                          b.name === 'Toshkent'
                        )?.id.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      Toshkent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (branches.length === 0) {
                          console.warn('Branches not loaded yet');
                          return;
                        }
                        const oltiariqBranch = branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'oltiariq' || 
                          b.name === 'Oltiariq'
                        );
                        if (oltiariqBranch) {
                          setEditForm({ ...editForm, branchId: oltiariqBranch.id.toString() });
                        } else {
                          console.error('Oltiariq branch not found. Available branches:', branches);
                        }
                      }}
                      disabled={branches.length === 0}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.branchId === branches.find((b) => 
                          b.name?.toLowerCase().trim() === 'oltiariq' || 
                          b.name === 'Oltiariq'
                        )?.id.toString()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      Oltiariq
                    </button>
                  </div>
                </div>

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PSR <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, hasPsr: true })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.hasPsr === true
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, hasPsr: false })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.hasPsr === false
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Yo'q
                    </button>
                  </div>
                </div>

                {/* 5. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Sho'pir tel raqami
                  </label>
                  <input
                    type="tel"
                    value={editForm.driverPhone}
                    onChange={(e) => setEditForm({ ...editForm, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="+998901234567"
                  />
                </div>

                {/* 6. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </label>
                  <textarea
                    value={editForm.comments}
                    onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm resize-none"
                    rows={4}
                    placeholder="Type here"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentUpload && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDocumentUpload(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedStageForReminder && selectedStageForReminder.name === 'Pochta' 
                  ? 'Pochta jarayoni uchun hujjatlar yuklash' 
                  : 'Hujjat yuklash (bir nechta fayl)'}
              </h2>
              <button
                onClick={() => {
                  setShowDocumentUpload(false);
                  setUploadFiles([]);
                  setDocumentNames([]);
                  setDocumentDescriptions([]);
                  if (selectedStageForReminder && selectedStageForReminder.name === 'Pochta') {
                    setSelectedStageForReminder(null);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            {selectedStageForReminder && selectedStageForReminder.name === 'Pochta' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Eslatma:</strong> Pochta jarayonini tayyor qilish uchun hujjatlarni yuklang. 
                  Hujjatlar yuklangandan keyin Pochta jarayoni avtomatik tayyor bo'ladi.
                </p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Validation - fayllar mavjudligini tekshiramiz
                if (uploadFiles.length === 0) {
                  alert('Kamida bitta faylni tanlang');
                  return;
                }
                handleDocumentUpload();
              }}
              className="space-y-4"
              noValidate
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fayllar (bir nechta tanlash mumkin)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {uploadFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="relative flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <button
                            onClick={() => {
                              const newFiles = uploadFiles.filter((_, i) => i !== index);
                              const newNames = documentNames.filter((_, i) => i !== index);
                              const newDescriptions = documentDescriptions.filter((_, i) => i !== index);
                              setUploadFiles(newFiles);
                              setDocumentNames(newNames);
                              setDocumentDescriptions(newDescriptions);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 z-10"
                            title="O'chirish"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="flex-shrink-0 mb-2">
                            {getFileIcon(file.type || '', file.name)}
                          </div>
                          <div className="text-center w-full">
                            <p className="text-xs font-medium text-gray-700 truncate px-1" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Yuklash ({uploadFiles.length} fayl)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocumentUpload(false);
                    setUploadFiles([]);
                    setDocumentNames([]);
                    setDocumentDescriptions([]);
                  }}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] backdrop-blur-sm"
          onClick={() => setPreviewDocument(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{previewDocument.name}</h2>
              <button
                onClick={() => setPreviewDocument(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center items-center min-h-[400px]">
              {previewDocument.type?.includes('image') ? (
                <img 
                  src={previewDocument.url} 
                  alt={previewDocument.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : previewDocument.type?.includes('pdf') ? (
                <iframe
                  src={previewDocument.url}
                  className="w-full h-[70vh] border-0"
                  title={previewDocument.name}
                />
              ) : previewDocument.type?.includes('video') ? (
                <video
                  src={previewDocument.url}
                  controls
                  className="max-w-full max-h-[70vh]"
                >
                  Sizning brauzeringiz video elementini qo'llab-quvvatlamaydi.
                </video>
              ) : previewDocument.type?.includes('audio') ? (
                <audio
                  src={previewDocument.url}
                  controls
                  className="w-full"
                >
                  Sizning brauzeringiz audio elementini qo'llab-quvvatlamaydi.
                </audio>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="mb-4">Bu fayl turini dasturdan ko'rish mumkin emas.</p>
                  <a
                    href={previewDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Yuklab olish
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowErrorModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Xato qo'shish</h2>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiClient.post(`/tasks/${selectedTask.id}/errors`, {
                    taskTitle: selectedTask.title,
                    workerId: parseInt(errorForm.workerId),
                    stageName: errorForm.stageName,
                    amount: parseFloat(errorForm.amount),
                    comment: errorForm.comment,
                    date: new Date(errorForm.date),
                  });
                  setShowErrorModal(false);
                  setErrorForm({
                    workerId: '',
                    stageName: '',
                    amount: '',
                    comment: '',
                    date: new Date().toISOString().split('T')[0],
                  });
                  // Reload task to show updated data
                  if (selectedTask) {
                    const response = await apiClient.get(`/tasks/${selectedTask.id}`);
                    setSelectedTask(response.data);
                  }
                  await loadTasks();
                  alert('Xato muvaffaqiyatli qo\'shildi');
                } catch (error: any) {
                  alert(error.response?.data?.error || 'Xatolik yuz berdi');
                }
              }}
              className="space-y-4"
            >
              {/* Task nomi (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task nomi
                </label>
                <input
                  type="text"
                  value={selectedTask.title}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* Ishchi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ishchi <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={errorForm.workerId}
                  onChange={(e) => setErrorForm({ ...errorForm, workerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Ishchini tanlang</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id.toString()}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bosqich */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bosqich <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={errorForm.stageName}
                  onChange={(e) => setErrorForm({ ...errorForm, stageName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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

              {/* Summa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={errorForm.amount}
                  onChange={(e) => setErrorForm({ ...errorForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>

              {/* Tavsif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tavsif
                </label>
                <textarea
                  value={errorForm.comment}
                  onChange={(e) => setErrorForm({ ...errorForm, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Xato haqida batafsil ma'lumot"
                />
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={errorForm.date}
                  onChange={(e) => setErrorForm({ ...errorForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowErrorModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : showArchive ? (
        // Arxiv bo'limida barcha tasklar bitta jadvalda
        <div>
          {renderTaskTable(filteredArchiveTasks, 'Arxiv')}
        </div>
      ) : (
        // Barcha ishlar bo'limida filiallarga bo'lingan
        isDeklarantWithBranch && userBranch ? (
          // DEKLARANT uchun faqat o'zining filiali to'liq kenglikda
          <div className="w-full">
            {renderTaskTable(userBranchTasks, userBranch.name)}
          </div>
        ) : (
          // ADMIN/MANAGER uchun barcha filiallar
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Oltiariq filiali */}
            <div>{renderTaskTable(oltiariqTasks, 'Oltiariq')}</div>

            {/* Toshkent filiali */}
            <div>{renderTaskTable(toshkentTasks, 'Toshkent')}</div>
          </div>
        )
      )}

      {/* Pagination UI */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">
            Jami <span className="font-semibold">{totalTasks}</span> ta task,{' '}
            <span className="font-semibold">{page}</span>/{totalPages} sahifa
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Oldingi
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                page === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Keyingi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
