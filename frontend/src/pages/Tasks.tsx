import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../utils/useIsMobile';
import DateInput from '../components/DateInput';

interface Task {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  afterHoursPayer?: 'CLIENT' | 'COMPANY';
  afterHoursDeclaration?: boolean;
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

interface TaskError {
  id: number;
  stageName: string;
  workerId: number;
  amount: number;
  comment?: string;
  date: string;
  createdAt: string;
  createdById: number;
}

interface TaskDetail {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  afterHoursPayer?: 'CLIENT' | 'COMPANY';
  afterHoursDeclaration?: boolean;
  driverPhone?: string;
  qrToken?: string | null;
  createdAt: string;
  updatedAt?: string;
  client: { id: number; name: string; dealAmount?: number; dealAmountCurrency?: 'USD' | 'UZS'; dealAmount_currency?: 'USD' | 'UZS'; defaultAfterHoursPayer?: 'CLIENT' | 'COMPANY' | null };
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
  customsPaymentMultiplier?: number | null; // BXM multiplikator (Deklaratsiya)
  kpiLogs?: KpiLog[]; // KPI log'lar (jarayonlar bo'yicha pul ma'lumotlari)
  errors?: TaskError[];
  invoice?: {
    contractNumber?: string | null;
    contract?: { contractNumber: string; contractDate: string; emails?: string | null } | null;
  } | null;
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
  const archiveLimit = 20; // Arxivda har sahifada 20 ta task
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);
  const [taskVersions, setTaskVersions] = useState<TaskVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedStageForReminder, setSelectedStageForReminder] = useState<TaskStage | null>(null);
  const [showBXMModal, setShowBXMModal] = useState(false);
  const [bxmMultiplier, setBxmMultiplier] = useState<string>('1.5');
  const [currentBxmUsd, setCurrentBxmUsd] = useState<number>(34.4);
  const [currentBxmUzs, setCurrentBxmUzs] = useState<number>(412000);
  const [afterHoursDeclaration, setAfterHoursDeclaration] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [editingErrorId, setEditingErrorId] = useState<number | null>(null);
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
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [sendEmailForm, setSendEmailForm] = useState({
    subject: '',
    body: '',
    recipients: '',
    cc: '',
    bcc: '',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<{ id: number; name: string; role: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  // Helper function to clean phone number (remove spaces, keep + sign)
  const cleanPhoneNumber = (phone: string): string => {
    // Remove all spaces, keep + sign if present
    return phone.replace(/\s+/g, '');
  };

  // Helper function to generate Telegram message with task's branch info only
  const generateTelegramMessage = (task: TaskDetail): string => {
    const taskName = task.title;
    const branchName = task.branch.name;
    const baseUrl =
      import.meta.env.VITE_PUBLIC_BASE_URL ||
      import.meta.env.VITE_FRONTEND_URL ||
      window.location.origin;
    const documentsUrl = task.qrToken ? `${baseUrl}/q/${task.qrToken}` : null;
    
    // Branch information mapping
    const branchInfo: Record<string, { address: string; phones: string[] }> = {
      'Oltiariq': {
        address: 'https://yandex.ru/maps/-/CLWAuE5H',
        phones: ['+998939079017', '+998339077778', '+998947877475']
      },
      'Toshkent': {
        address: 'https://yandex.ru/maps/-/CLWAy4Y9',
        phones: ['+998976616121', '+998939079017', '+998339077778']
      }
    };
    
    // Get branch info (default to Oltiariq if branch not found)
    const branch = branchInfo[branchName] || branchInfo['Oltiariq'];
    
    const phoneLines = branch.phones.map((phone) => `📞 Tel: ${phone}`).join('\n');

    return `📄 *HUJJATINGIZ TAYYOR* ✅\n━━━━━━━━━━━━━━━━━━\n🆔 *Hujjat raqami:*\n${taskName}\n\n${phoneLines}\n📌 Xarita: ${branch.address}\n\n📎 *Elektron hujjatlar*\n👇 Yuklab olish / ko‘rish:\n🔗 ${documentsUrl || ''}\n\n🤝 Savollaringiz bo‘lsa — bemalol murojaat qiling!`;
  };

  // Handler function to open Telegram with formatted message
  // URL format: https://t.me/+PHONE?text=ENCODED_MESSAGE
  const handleTelegramClick = async () => {
    if (!selectedTask?.driverPhone) return;
    
    // Clean phone number: remove spaces only (keep + sign)
    const cleanedPhone = cleanPhoneNumber(selectedTask.driverPhone);
    let taskForMessage = selectedTask;

    if (!selectedTask.qrToken) {
      try {
        // Force QR token generation (sticker route generates qrToken if missing)
        await apiClient.get(`/sticker/${selectedTask.id}/image`, { responseType: 'blob' });
      } catch {
        // ignore
      }
      try {
        const response = await apiClient.get(`/tasks/${selectedTask.id}`);
        taskForMessage = response.data;
        setSelectedTask(response.data);
      } catch (error) {
        // If refresh fails, fallback to existing task data
      }
    }
    
    // Generate message
    const message = generateTelegramMessage(taskForMessage);
    
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

  const handleOpenSendEmailModal = () => {
    setSendEmailError(null);
    const contractEmails = selectedTask?.invoice?.contract?.emails?.trim() || '';
    const clientEmail = (selectedTask?.client as { email?: string })?.email?.trim() || '';
    const defaultRecipients = [clientEmail, contractEmails].filter(Boolean).join(', ');
    setSendEmailForm({
      subject: selectedTask?.title ?? '',
      body: 'КОМАНДА PRODEKLARANT | Ваш надёжный представитель на таможне',
      recipients: defaultRecipients,
      cc: 'arxiv.prodeklarant@mail.ru',
      bcc: '',
    });
    setShowSendEmailModal(true);
  };

  const parseEmailList = (s: string): string[] =>
    s
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);

  const sendTaskEmailErrorToMessage = (data: { errorCode?: string; error?: string } | undefined, fallback: string): string => {
    const code = data?.errorCode;
    const en = data?.error;
    const uz: Record<string, string> = {
      TASK_NOT_COMPLETED: "Email jonatib bo'lmadi. Faqat tugallangan ishlar (YAKUNLANDI) email orqali yuboriladi. Iltimos, ishni avval tugallang.",
      NO_VALID_RECIPIENTS: "Email jonatib bo'lmadi. Kamida bitta to'g'ri email manzil kiritilishi shart (yoki mijozda email bo'lishi kerak).",
      VALIDATION_FAILED: en || "Email jonatib bo'lmadi. Mavzu va kamida bitta qabul qiluvchi kerak.",
      INVALID_DOCUMENT_PATH: en ? `Hujjat fayli yo'li noto'g'ri. ${en}` : "Hujjat fayli yo'li noto'g'ri. Iltimos, administrator bilan bog'laning.",
      DOCUMENT_FILE_NOT_FOUND: en ? `Hujjat faylini o'qib bo'lmadi. ${en} Fayl serverda yo'q; iltimos, boshqa usul bilan yuboring.` : "Hujjat faylini o'qib bo'lmadi. Iltimos, boshqa usul bilan yuboring yoki administrator bilan bog'laning.",
      SEND_FAILED: en ? `Email yuborish xatosi. ${en}` : "Email jonatib yuborib bo'lmadi. Iltimos, keyinroq qayta urinib ko'ring yoki SMTP sozlamalarini (MAILRU_USER, MAILRU_PASSWORD) tekshiring.",
    };
    if (code && uz[code]) return uz[code];
    if (en && en.length > 0 && en.length < 200) return en;
    return fallback;
  };

  const handleSendTaskEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    const recipients = parseEmailList(sendEmailForm.recipients);
    if (!recipients.length) {
      setSendEmailError('At least one recipient is required');
      return;
    }
    if (!sendEmailForm.subject.trim()) {
      setSendEmailError('Subject is required');
      return;
    }
    setSendingEmail(true);
    setSendEmailError(null);
    try {
      const response = await apiClient.post('/send-task-email', {
        task_id: selectedTask.id,
        subject: sendEmailForm.subject.trim(),
        body: sendEmailForm.body.trim() || undefined,
        recipients,
        cc: parseEmailList(sendEmailForm.cc).length ? parseEmailList(sendEmailForm.cc) : undefined,
        bcc: parseEmailList(sendEmailForm.bcc).length ? parseEmailList(sendEmailForm.bcc) : undefined,
      });
      // API client does not throw on 4xx (validateStatus), so check explicitly
      if (response.status < 200 || response.status >= 300) {
        const msg = sendTaskEmailErrorToMessage(
          response.data,
          response.data?.error || `So'rov muvaffaqiyatsiz (${response.status}).`
        );
        setSendEmailError(msg);
        return;
      }
      setShowSendEmailModal(false);
      setShowTaskModal(false);
      setSelectedTask(null);
      await loadTasks();
      alert('Email sent successfully.');
    } catch (err: any) {
      const msg = sendTaskEmailErrorToMessage(
        err.response?.data,
        err.response?.data?.error || err.message || "Email jonatib yuborib bo'lmadi. Iltimos, keyinroq qayta urinib ko'ring."
      );
      setSendEmailError(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const [form, setForm] = useState({
    title: '',
    clientId: '',
    branchId: '',
    comments: '',
    hasPsr: false,
    afterHoursPayer: 'CLIENT' as 'CLIENT' | 'COMPANY',
    driverPhone: '',
  });
  const [editForm, setEditForm] = useState({
    title: '',
    clientId: '',
    branchId: '',
    comments: '',
    hasPsr: false,
    afterHoursPayer: 'CLIENT' as 'CLIENT' | 'COMPANY',
    driverPhone: '',
  });
  const [filters] = useState({
    status: '',
    clientId: '',
    branchId: '', // Added to fix TypeScript error
  });
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilters, setArchiveFilters] = useState({
    branchId: '',
    clientId: '',
    startDate: '',
    endDate: '',
    hasPsr: '',
  });
  const [showArchiveFilters, setShowArchiveFilters] = useState(false);

  const isArchiveRoute = location.pathname.startsWith('/tasks/archive');
  const isArchiveFiltersRoute = location.pathname === '/tasks/archive/filters';
  const isNewTaskRoute = location.pathname === '/tasks/new';
  const editTaskMatch = location.pathname.match(/^\/tasks\/(\d+)\/edit$/);
  const editTaskId = editTaskMatch ? Number(editTaskMatch[1]) : null;
  const showTaskForm = showForm || (isMobile && isNewTaskRoute);
  const showEditTaskForm = showEditModal || (isMobile && !!editTaskId);
  const showArchiveFiltersPanel = showArchiveFilters || (isMobile && isArchiveFiltersRoute);

  const downloadStickerPng = async (taskId: number) => {
    try {
      const response = await apiClient.get(`/sticker/${taskId}/image`, {
        responseType: 'blob',
      });
      
      // Blob'ni tekshirish - agar xatolik bo'lsa, JSON bo'lishi mumkin
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || errorData.message || 'Stiker yuklab olishda xatolik yuz berdi');
      }
      
      // Blob type'ni tekshirish va to'g'rilash
      const blobType = response.data.type || 'image/png';
      const blob = new Blob([response.data], { type: blobType });
      
      // PNG faylining to'g'riligini tekshirish
      if (!blobType.includes('image') && !blobType.includes('png')) {
        // Agar type to'g'ri bo'lmasa, uni PNG sifatida belgilash
        const correctedBlob = new Blob([response.data], { type: 'image/png' });
        const url = URL.createObjectURL(correctedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sticker-${taskId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sticker-${taskId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error: any) {
      console.error('Error downloading sticker:', error);
      let errorMessage = 'Stiker yuklab olishda xatolik yuz berdi';
      
      // Blob response'da xatolik bo'lsa, uni JSON sifatida parse qilish
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Parse qilish mumkin bo'lmasa, default xabar
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || errorMessage;
      }
      
      alert(errorMessage);
    }
  };

  // Page'ni 1 ga qaytarish, filterlar o'zgarganda
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  // Remove filters.branchId because it does not exist on filters; fix lint error
  }, [filters.status, filters.clientId, showArchive]);

  // Reset page when archive filters change
  useEffect(() => {
    if (showArchive && page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showArchive,
    archiveSearchQuery,
    archiveFilters.branchId,
    archiveFilters.clientId,
    archiveFilters.startDate,
    archiveFilters.endDate,
    archiveFilters.hasPsr,
  ]);

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
      setArchiveFilters({ branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '' });
    }
  }, [showArchive]);

  useEffect(() => {
    if (showArchive !== isArchiveRoute) {
      setShowArchive(isArchiveRoute);
    }
  }, [isArchiveRoute, showArchive]);

  useEffect(() => {
    if (isArchiveFiltersRoute && !showArchiveFilters) {
      setShowArchiveFilters(true);
    }
    if (!isArchiveFiltersRoute && showArchiveFilters && isMobile) {
      setShowArchiveFilters(false);
    }
  }, [isArchiveFiltersRoute, showArchiveFilters, isMobile]);

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
        if (showEditModal || editTaskId) {
          if (isMobile && editTaskId) {
            navigate(isArchiveRoute ? '/tasks/archive' : '/tasks');
          } else {
            setShowEditModal(false);
          }
        } else if (showTaskModal) {
          setShowTaskModal(false);
          setSelectedTask(null);
        } else if (showForm || isNewTaskRoute) {
          if (isMobile && isNewTaskRoute) {
            navigate('/tasks');
          } else {
            setShowForm(false);
          }
        } else if (showArchiveFilters || isArchiveFiltersRoute) {
          if (isMobile && isArchiveFiltersRoute) {
            navigate('/tasks/archive');
          } else {
            setShowArchiveFilters(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [
    showForm,
    showTaskModal,
    showEditModal,
    showArchiveFilters,
    editTaskId,
    isMobile,
    isArchiveRoute,
    isArchiveFiltersRoute,
    isNewTaskRoute,
    navigate,
  ]);

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

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (showArchive) {
        // Arxiv bo'limida faqat YAKUNLANDI statusidagi tasklar
        params.status = 'YAKUNLANDI';
        // Fetch all archive tasks for client-side pagination/filtering
      } else {
        // Barcha ishlar bo'limida YAKUNLANDI dan tashqari barcha tasklar (pagination yo'q, barchasi bir sahifada)
        if (filters.status) params.status = filters.status;
        params.page = '1';
        params.limit = '5000';
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
        setTotalPages(1);
        setTotalTasks(filteredTasks.length);
        
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

  const getPageNumbers = (current: number, total: number) => {
    const delta = 2;
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
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
      setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
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

  const loadTaskDetailForEdit = async (taskId: number) => {
    try {
      setLoadingTask(true);
      const response = await apiClient.get(`/tasks/${taskId}`);
      const taskData = { ...response.data };
      if (!taskData.stages || taskData.stages.length === 0) {
        taskData.stages = [];
      }
      setSelectedTask(taskData);
      setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
      setEditForm({
        title: taskData.title,
        clientId: taskData.client.id.toString(),
        branchId: taskData.branch.id.toString(),
        comments: taskData.comments || '',
        hasPsr: taskData.hasPsr || false,
        afterHoursPayer: taskData.afterHoursPayer || 'CLIENT',
        driverPhone: taskData.driverPhone || '',
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading task detail for edit:', error);
      alert('Task ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoadingTask(false);
    }
  };

  useEffect(() => {
    if (!isMobile || !editTaskId) return;
    if (selectedTask?.id === editTaskId && showEditModal) return;
    loadTaskDetailForEdit(editTaskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, editTaskId]);

  // Desktop: /tasks/:id/edit dan kelganda edit modali ochish (masalan Invoices dan "Taskni tahrirlash")
  useEffect(() => {
    if (isMobile || !editTaskId) return;
    if (selectedTask?.id === editTaskId && showEditModal) return;
    loadTaskDetailForEdit(editTaskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTaskId]);

  // Invoices sahifasidan status bosilganda: task tafsilotlari modali ochish
  const openTaskIdFromState = (location.state as { openTaskId?: number })?.openTaskId;
  useEffect(() => {
    if (openTaskIdFromState == null) return;
    let cancelled = false;
    loadTaskDetail(openTaskIdFromState).then(() => {
      if (!cancelled) navigate(location.pathname, { replace: true, state: {} });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTaskIdFromState]);

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
        if (selectedStageForReminder) {
          await updateStageToReady(selectedStageForReminder);
        }
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
        await updateStageToReady(selectedStageForReminder);
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
    const base = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border';
    const icon = 'w-4 h-4';

    if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return (
        <span className={`${base} border-red-200 bg-red-50 text-red-600`}>
          <Icon icon="lucide:file-text" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet') ||
        lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      return (
        <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-600`}>
          <Icon icon="lucide:file-spreadsheet" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('word') || lowerType.includes('document') ||
        lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
      return (
        <span className={`${base} border-blue-200 bg-blue-50 text-blue-600`}>
          <Icon icon="lucide:file-text" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('jpeg') || lowerType.includes('jpg') ||
        lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') ||
        lowerType.includes('png') || lowerName.endsWith('.png') ||
        lowerType.includes('image') || lowerType.includes('gif') || lowerType.includes('webp') ||
        lowerName.match(/\.(gif|webp|bmp|svg)$/i)) {
      return (
        <span className={`${base} border-amber-200 bg-amber-50 text-amber-600`}>
          <Icon icon="lucide:image" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('powerpoint') || lowerType.includes('presentation') ||
        lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
      return (
        <span className={`${base} border-orange-200 bg-orange-50 text-orange-600`}>
          <Icon icon="lucide:presentation" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('rar') || lowerName.endsWith('.rar') ||
        lowerType.includes('zip') || lowerName.endsWith('.zip')) {
      return (
        <span className={`${base} border-gray-200 bg-gray-50 text-gray-600`}>
          <Icon icon="lucide:archive" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('video') || lowerName.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
      return (
        <span className={`${base} border-rose-200 bg-rose-50 text-rose-600`}>
          <Icon icon="lucide:video" className={icon} />
        </span>
      );
    }
    if (lowerType.includes('audio') || lowerName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return (
        <span className={`${base} border-purple-200 bg-purple-50 text-purple-600`}>
          <Icon icon="lucide:music" className={icon} />
        </span>
      );
    }
    return (
      <span className={`${base} border-gray-200 bg-gray-50 text-gray-600`}>
        <Icon icon="lucide:file" className={icon} />
      </span>
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
        // Boshqa stage'lar uchun to'g'ridan-to'g'ri stage'ni yangilash
        setSelectedStageForReminder(stage);
        // If Deklaratsiya stage, show BXM multiplier modal
        if (stage.name === 'Deklaratsiya') {
          try {
            const bxmResponse = await apiClient.get('/bxm/current');
            const amountUsd = Number(bxmResponse.data.amountUsd ?? bxmResponse.data.amount ?? 34.4);
            const amountUzs = Number(bxmResponse.data.amountUzs ?? 412000);
            setCurrentBxmUsd(amountUsd);
            setCurrentBxmUzs(amountUzs);
            setBxmMultiplier('1.5');
            setAfterHoursDeclaration(false);
            setShowBXMModal(true);
          } catch (error) {
            console.error('Error loading BXM:', error);
            setCurrentBxmUsd(34.4);
            setCurrentBxmUzs(412000);
            setBxmMultiplier('1.5');
            setAfterHoursDeclaration(false);
            setShowBXMModal(true);
          }
        } else {
          await updateStageToReady(stage);
        }
      }
    } else {
      // If already completed, allow unchecking
      handleStageToggle(stage.id, stage.status);
    }
  };


  const updateStageToReady = async (
    stage: TaskStage,
    customsPaymentMultiplier?: number,
    skipValidation?: boolean,
    afterHoursDeclarationValue?: boolean
  ) => {
      // Debug logging removed (CSP violation)
    if (!stage || !selectedTask) {
        // Debug logging removed (CSP violation)
      return;
    }
    
    try {
      setUpdatingStage(stage.id);
      // Debug logging removed (CSP violation)
      const response = await apiClient.patch(`/tasks/${selectedTask.id}/stages/${stage.id}`, {
        status: 'TAYYOR',
        ...(customsPaymentMultiplier && { customsPaymentMultiplier }),
        ...(afterHoursDeclarationValue !== undefined && { afterHoursDeclaration: afterHoursDeclarationValue }),
        ...((customsPaymentMultiplier || afterHoursDeclarationValue) && { afterHoursPayer: selectedTask.afterHoursPayer || 'CLIENT' }),
        ...(skipValidation && { skipValidation: true }),
      });
      
      // Check if response status indicates an error (4xx or 5xx)
      if (response.status >= 400) {
        const errorMessage = response.data?.error || 'Xatolik yuz berdi';
        alert(errorMessage);
        setUpdatingStage(null);
        return;
      }
      
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
      setShowBXMModal(false);
      setAfterHoursDeclaration(false);
      setShowFileUploadModal(false);
      setFileUploadFile(null);
      setFileUploadName('');
      setFileUploadStageName('');
      setSelectedStageForReminder(null);
    } catch (error: any) {
      console.error('Error updating stage:', error);
      // Handle network errors, timeouts, etc.
      if (error.response) {
        // HTTP error response
        const errorMessage = error.response.data?.error || error.message || 'Xatolik yuz berdi';
        alert(errorMessage);
      } else if (error.request) {
        // Request made but no response
        alert('Serverga javob kelmadi. Iltimos, qayta urinib ko\'ring.');
      } else {
        // Something else happened
        alert(error.message || 'Xatolik yuz berdi');
      }
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
    
    // If multiplier > 1, show warning about additional payment
    if (multiplier > 1 && selectedTask) {
      const clientCurrency = getClientCurrency(selectedTask.client);
      let additionalPayment: number;
      let formattedAdditional: string;
      
      if (clientCurrency === 'USD') {
        // If client's contract is in USD, calculate in USD
        // Additional payment = (multiplier - 1) × BXM (only the excess over 1 BXM)
        additionalPayment = (multiplier - 1) * currentBxmUsd;
        formattedAdditional = new Intl.NumberFormat('uz-UZ', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(additionalPayment).replace(/,/g, ' ');
      } else {
        // If client's contract is in UZS, calculate in UZS
        // Additional payment = (multiplier - 1) × BXM (only the excess over 1 BXM)
        additionalPayment = (multiplier - 1) * currentBxmUzs;
        formattedAdditional = new Intl.NumberFormat('uz-UZ', {
          style: 'currency',
          currency: 'UZS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(additionalPayment).replace(/,/g, ' ');
      }
      
      const payerLabel = (selectedTask.afterHoursPayer || 'CLIENT') === 'CLIENT' ? 'mijoz' : 'kompaniya';
      const confirmMessage = `Deklaratsiya to'lovi BXMning 1 barobaridan oshib ketdi.\n\n` +
        `Qo'shimcha to'lov: ${formattedAdditional}\n\n` +
        `Bu summa ${payerLabel} hisobiga yoziladi.\n\n` +
        `Davom etasizmi?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    
    if (selectedStageForReminder) {
      await updateStageToReady(selectedStageForReminder, multiplier, false, afterHoursDeclaration);
    }
  };

  const handleAfterHoursDeclarationChange = async (checked: boolean) => {
    if (!selectedTask) return;
    const previous = afterHoursDeclaration;
    setAfterHoursDeclaration(checked);
    try {
      await apiClient.patch(`/tasks/${selectedTask.id}`, {
        afterHoursDeclaration: checked,
      });
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
    } catch (error: any) {
      setAfterHoursDeclaration(previous);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
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
        afterHoursPayer: editForm.afterHoursPayer,
        driverPhone: editForm.driverPhone || undefined,
      });
      if (isMobile && editTaskId) {
        navigate(isArchiveRoute ? '/tasks/archive' : '/tasks');
      } else {
        setShowEditModal(false);
      }
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
      const response = await apiClient.patch(`/tasks/${selectedTask.id}/stages/${stageId}`, {
        status: newStatus,
      });
      
      // Check if response status indicates an error (4xx or 5xx)
      if (response.status >= 400) {
        const errorMessage = response.data?.error || 'Xatolik yuz berdi';
        alert(errorMessage);
        setUpdatingStage(null);
        return;
      }
      
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      // Handle network errors, timeouts, etc.
      if (error.response) {
        // HTTP error response
        const errorMessage = error.response.data?.error || error.message || 'Xatolik yuz berdi';
        alert(errorMessage);
      } else if (error.request) {
        // Request made but no response
        alert('Serverga javob kelmadi. Iltimos, qayta urinib ko\'ring.');
      } else {
        // Something else happened
        alert(error.message || 'Xatolik yuz berdi');
      }
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
        afterHoursPayer: form.afterHoursPayer,
        driverPhone: form.driverPhone || undefined,
      });
      if (isMobile && isNewTaskRoute) {
        navigate('/tasks');
      } else {
        setShowForm(false);
      }
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      setForm({ 
        title: '', 
        clientId: '', 
        branchId: oltiariqBranch?.id.toString() || '', 
        comments: '', 
        hasPsr: false, 
        afterHoursPayer: 'CLIENT',
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

  const getClientCurrency = (client?: { dealAmount_currency?: 'USD' | 'UZS'; dealAmountCurrency?: 'USD' | 'UZS' }) =>
    client?.dealAmount_currency || client?.dealAmountCurrency || 'USD';

  const formatMoney = (amount: number, currency: 'USD' | 'UZS') => {
    const formatted = new Intl.NumberFormat('uz-UZ', {
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(amount).replace(/,/g, ' ');
    return currency === 'USD' ? `$ ${formatted}` : `UZS ${formatted}`;
  };

  const getPsrAmount = (task?: { hasPsr?: boolean; snapshotPsrPrice?: number | null }) =>
    task?.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;

  /** Ish vaqtidan tashqari qo'shimcha to'lov (backend bilan bir xil) */
  const AFTER_HOURS_EXTRA_USD = 8.5;
  const AFTER_HOURS_EXTRA_UZS = 103000;

  /**
   * Kelishuv summasi (ko'rsatish uchun): asosiy + PSR + (agar ish vaqtidan tashqari va mijoz to'lasa) qo'shimcha to'lov.
   * Mijoz valyutasiga qarab: USD bo'lsa 8.5, UZS bo'lsa 103000.
   */
  const getDealAmountDisplay = (
    task: TaskDetail | null | undefined,
    afterHoursDeclarationCurrent?: boolean
  ): number => {
    if (!task) return 0;
    const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
    const psr = getPsrAmount(task);
    const currency = getClientCurrency(task.client);
    const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
    const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
    const extra = showAfterHours && payer === 'CLIENT'
      ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS)
      : 0;
    return base + psr + extra;
  };

  /** Asosiy kelishuv (PSR siz), ish vaqtidan tashqari qo'shimcha bilan agar bo'lsa */
  const getDealAmountBaseDisplay = (
    task: TaskDetail | null | undefined,
    afterHoursDeclarationCurrent?: boolean
  ): number => {
    if (!task) return 0;
    const base = Number(task.snapshotDealAmount ?? task.client?.dealAmount ?? 0);
    const currency = getClientCurrency(task.client);
    const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
    const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
    const extra = showAfterHours && payer === 'CLIENT'
      ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS)
      : 0;
    return base + extra;
  };

  /**
   * Filial bo'yicha to'lovlar (ko'rsatish uchun): sertifikat + ishchi + PSR + bojxona
   * + (agar ish vaqtidan tashqari va "Men to'layman" bo'lsa) qo'shimcha to'lov.
   */
  const getBranchPaymentsDisplay = (
    task: TaskDetail | null | undefined,
    afterHoursDeclarationCurrent?: boolean
  ): number => {
    if (!task) return 0;
    const certificatePayment = Number(task.snapshotCertificatePayment || 0);
    const workerPrice = Number(task.snapshotWorkerPrice || 0);
    const psrPrice = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
    const customsPayment = Number(task.snapshotCustomsPayment || 0);
    const base = certificatePayment + workerPrice + psrPrice + customsPayment;
    const currency = getClientCurrency(task.client);
    const showAfterHours = afterHoursDeclarationCurrent ?? task.afterHoursDeclaration ?? false;
    const payer = String((task.client as any)?.defaultAfterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT').toUpperCase();
    const extra = showAfterHours && payer === 'COMPANY'
      ? (currency === 'USD' ? AFTER_HOURS_EXTRA_USD : AFTER_HOURS_EXTRA_UZS)
      : 0;
    return base + extra;
  };

  const canEditError = (error: TaskError) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const createdAt = new Date(error.createdAt).getTime();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    return error.createdById === user.id && Date.now() - createdAt <= twoDaysMs;
  };

  const formatBxmAmount = (multiplier: number) => {
    const currency = getClientCurrency(selectedTask?.client);
    const baseAmount = currency === 'USD' ? currentBxmUsd : currentBxmUzs;
    const amount = baseAmount * multiplier;
    return formatMoney(amount, currency);
  };

  /** Qavs ichidagi summani har doim so'mda (UZS) ko'rsatish uchun; hisob-kitoblar o'zgarmaydi */
  const formatBxmAmountInSum = (multiplier: number) => {
    const amount = currentBxmUzs * multiplier;
    return formatMoney(amount, 'UZS');
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

  // Calculate total duration for a task: Sum of all stages' durationMin
  const calculateTotalDuration = (task: Task): { text: string; color: string } => {
    if (!task.stages || task.stages.length === 0) return { text: '-', color: 'text-gray-500' };
    
    // Sum all durationMin from stages
    const totalMinutes = task.stages.reduce((sum, stage) => {
      return sum + (stage.durationMin || 0);
    }, 0);
    
    if (totalMinutes <= 0) return { text: '-', color: 'text-gray-500' };
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
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

  // Get BXM color based on multiplier value
  const getBXMColor = (multiplier: number | null | undefined): string => {
    if (!multiplier) return 'bg-gray-100 text-gray-800';
    
    const value = Number(multiplier);
    if (value === 1) return 'bg-green-100 text-green-800';
    if (value === 1.5) return 'bg-blue-100 text-blue-800';
    if (value === 2) return 'bg-yellow-100 text-yellow-800';
    if (value === 2.5) return 'bg-orange-100 text-orange-800';
    if (value === 3) return 'bg-red-100 text-red-800';
    if (value === 4) return 'bg-purple-100 text-purple-800';
    
    // Default for other values
    return 'bg-gray-100 text-gray-800';
  };

  const branchCardColors = [
    { card: 'from-blue-50 to-indigo-50 border-blue-200', header: 'from-blue-500 via-blue-600 to-indigo-700', thead: 'from-blue-600 to-indigo-700', row: 'hover:bg-blue-100', rowEven: 'bg-blue-50', rowOdd: 'bg-white', divide: 'divide-blue-100', border: 'border-blue-500', borderCell: 'border-blue-100', empty: 'bg-blue-50' },
    { card: 'from-emerald-50 to-teal-50 border-emerald-200', header: 'from-emerald-500 via-emerald-600 to-teal-700', thead: 'from-emerald-600 to-teal-700', row: 'hover:bg-emerald-100', rowEven: 'bg-emerald-50', rowOdd: 'bg-white', divide: 'divide-emerald-100', border: 'border-emerald-500', borderCell: 'border-emerald-100', empty: 'bg-emerald-50' },
    { card: 'from-violet-50 to-purple-50 border-violet-200', header: 'from-violet-500 via-violet-600 to-purple-700', thead: 'from-violet-600 to-purple-700', row: 'hover:bg-violet-100', rowEven: 'bg-violet-50', rowOdd: 'bg-white', divide: 'divide-violet-100', border: 'border-violet-500', borderCell: 'border-violet-100', empty: 'bg-violet-50' },
  ];

  const oltiariqTheme = { card: 'from-yellow-50 to-amber-50 border-yellow-200', header: 'from-yellow-500 via-yellow-600 to-amber-700', thead: 'from-yellow-600 to-amber-700', row: 'hover:bg-yellow-100', rowEven: 'bg-yellow-50', rowOdd: 'bg-white', divide: 'divide-yellow-100', border: 'border-yellow-500', borderCell: 'border-yellow-100', empty: 'bg-yellow-50' };
  const toshkentTheme = { card: 'from-indigo-50 to-blue-50 border-indigo-200', header: 'from-indigo-500 via-indigo-600 to-blue-700', thead: 'from-indigo-600 to-blue-700', row: 'hover:bg-indigo-100', rowEven: 'bg-indigo-50', rowOdd: 'bg-white', divide: 'divide-indigo-100', border: 'border-indigo-500', borderCell: 'border-indigo-100', empty: 'bg-indigo-50' };

  const renderTaskTable = (branchTasks: Task[], branchName: string, branchColorIndex: number = 0) => {
    const isArchive = branchName === 'Arxiv';
    const colors = isArchive
      ? { card: 'from-gray-50 to-slate-50 border-gray-200', header: 'from-gray-600 via-gray-700 to-gray-800', thead: 'from-gray-600 to-gray-700', row: 'hover:bg-gray-100', rowEven: 'bg-gray-50', rowOdd: 'bg-white', divide: 'divide-gray-100', border: 'border-gray-500', borderCell: 'border-gray-200', empty: 'bg-gray-50' }
      : branchName === 'Oltiariq'
        ? oltiariqTheme
        : branchName === 'Toshkent'
          ? toshkentTheme
          : branchCardColors[branchColorIndex % branchCardColors.length];
    return (
      <div className={`bg-gradient-to-br ${colors.card} rounded-lg shadow-xl overflow-hidden border-2`}>
        <div className={`px-4 py-2 relative overflow-hidden bg-gradient-to-r ${colors.header}`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
          <h2 className="text-base font-semibold text-white relative z-10">
            {isArchive ? 'Arxiv' : `${branchName} filiali`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={`bg-gradient-to-r ${colors.thead}`}>
              <tr>
                <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                  Task
                </th>
                <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                  Klient
                </th>
                {isArchive && (
                  <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                    Filial
                  </th>
                )}
                {isArchive && (
                  <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                    PSR
                  </th>
                )}
                {isArchive && (
                  <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                    BXM
                  </th>
                )}
                <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                  Start Date
                </th>
                {isArchive && (
                  <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                    Vaqt
                  </th>
                )}
                <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                  Status
                </th>
                <th className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-b ${colors.border}`}>
                  Comments
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${colors.divide}`}>
              {branchTasks.length === 0 ? (
                <tr>
                  <td colSpan={isArchive ? 9 : 5} className={`px-4 py-3 text-center text-sm text-gray-500 ${colors.empty}`}>
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
                      className={`${colors.row} transition-colors cursor-pointer ${
                        index % 2 === 0 ? colors.rowEven : colors.rowOdd
                      }`}
                    >
                      <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-b ${colors.borderCell}`}>
                        {task.title}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b ${colors.borderCell}`}>
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
                        <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b ${colors.borderCell}`}>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {task.branch.name}
                          </span>
                        </td>
                      )}
                      {isArchive && (
                        <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            task.hasPsr ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.hasPsr ? 'Bor' : 'Yo\'q'}
                          </span>
                        </td>
                      )}
                      {isArchive && (
                        <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBXMColor(task.customsPaymentMultiplier)}`}>
                            {task.customsPaymentMultiplier ? `${task.customsPaymentMultiplier} BXM` : '-'}
                          </span>
                        </td>
                      )}
                      <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                        {formatDate(task.createdAt)}
                      </td>
                      {isArchive && (
                        <td className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-b ${colors.borderCell}`}>
                          <div className="flex items-center gap-1.5">
                            <Icon icon="lucide:clock" className={`w-3.5 h-3.5 ${totalDuration.color}`} />
                            <span className={`font-medium ${totalDuration.color}`}>{totalDuration.text}</span>
                          </div>
                        </td>
                      )}
                      <td className={`px-3 py-2 whitespace-nowrap text-sm border-b ${colors.borderCell}`}>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color} shadow-sm`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-xs text-gray-700 border-b ${colors.borderCell} max-w-[200px] min-w-[150px]`}>
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

    // Client filter
    if (archiveFilters.clientId) {
      filtered = filtered.filter((task) =>
        task.client.id.toString() === archiveFilters.clientId
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

  // Separate tasks by branch - dynamically group by all branches
  const tasksByBranch = useMemo(() => {
    if (!Array.isArray(tasks) || !Array.isArray(branches)) {
      return new Map<string, Task[]>();
    }

    const grouped = new Map<string, Task[]>();
    
    // Initialize all branches with empty arrays
    branches.forEach(branch => {
      grouped.set(branch.name, []);
    });
    
    // Group tasks by branch name
    tasks.forEach(task => {
      const branchName = task.branch?.name;
      if (branchName && grouped.has(branchName)) {
        grouped.get(branchName)!.push(task);
      }
    });

    return grouped;
  }, [tasks, branches]);

  // Backward compatibility - keep for now
  const toshkentTasks = tasksByBranch.get('Toshkent') || [];
  const oltiariqTasks = tasksByBranch.get('Oltiariq') || [];
  const filteredArchiveTasks = getFilteredArchiveTasks();
  const archiveTotalTasks = filteredArchiveTasks.length;
  const archiveTotalPages = Math.max(1, Math.ceil(archiveTotalTasks / archiveLimit));
  const archivePageTasks = filteredArchiveTasks.slice((page - 1) * archiveLimit, page * archiveLimit);

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
              onClick={() => {
                if (isMobile) {
                  navigate('/tasks');
                } else {
                  navigate('/tasks');
                  setShowArchive(false);
                }
              }}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                !showArchive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Barcha ishlar
            </button>
            <button
              onClick={() => {
                if (isMobile) {
                  navigate('/tasks/archive');
                } else {
                  navigate('/tasks/archive');
                  setShowArchive(true);
                  setPage(1);
                }
              }}
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
                <Icon icon="lucide:download" className="w-4 h-4" />
              </button>
              {/* Search Icon - Minimalistic */}
              <button
                onClick={() => {
                  if (isMobile) {
                    navigate(showArchiveFilters ? '/tasks/archive' : '/tasks/archive/filters');
                  } else {
                    setShowArchiveFilters(!showArchiveFilters);
                  }
                }}
                className={`relative p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm hover:shadow z-10 ${
                  showArchiveFilters ? 'opacity-0 pointer-events-none' : ''
                }`}
                title="Qidirish va filtrlash"
              >
                <Icon icon="lucide:search" className="w-4 h-4" />
                {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.clientId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
              
              {/* Expandable Search and Filter Panel */}
              {showArchiveFiltersPanel && (
                <div
                  className={
                    isMobile && isArchiveFiltersRoute
                      ? 'fixed inset-0 bg-white z-50 p-4 overflow-y-auto'
                      : 'absolute right-0 top-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-20 min-w-[500px] animate-slideIn'
                  }
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Icon icon="lucide:filter" className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">Qidiruv va filtrlash</h3>
                    </div>
                    <button
                      onClick={() => {
                        if (isMobile && isArchiveFiltersRoute) {
                          navigate('/tasks/archive');
                        } else {
                          setShowArchiveFilters(false);
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Search */}
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
                            <Icon icon="lucide:x" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branch Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Icon icon="lucide:building" className="w-3.5 h-3.5 text-blue-600" />
                        Filial
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Icon icon="lucide:building" className="w-4 h-4 text-gray-400" />
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

                    {/* Client Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Icon icon="lucide:users" className="w-3.5 h-3.5 text-blue-600" />
                        Mijoz
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Icon icon="lucide:users" className="w-4 h-4 text-gray-400" />
                        </div>
                        <select
                          value={archiveFilters.clientId}
                          onChange={(e) => setArchiveFilters({ ...archiveFilters, clientId: e.target.value })}
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
                        >
                          <option value="">Barcha mijozlar</option>
                          {Array.isArray(clients) && clients.map((client) => (
                            <option key={client.id} value={client.id.toString()}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Icon icon="lucide:calendar-range" className="w-3.5 h-3.5 text-blue-600" />
                        Sana oralig'i
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <DateInput
                            value={archiveFilters.startDate}
                            onChange={(value) => setArchiveFilters({ ...archiveFilters, startDate: value })}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                            placeholder="Boshlanish"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <DateInput
                            value={archiveFilters.endDate}
                            onChange={(value) => setArchiveFilters({ ...archiveFilters, endDate: value })}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                            placeholder="Tugash"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PSR Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Icon icon="lucide:file-text" className="w-3.5 h-3.5 text-blue-600" />
                        PSR
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Icon icon="lucide:file-text" className="w-4 h-4 text-gray-400" />
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
                        <Icon icon="lucide:files" className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-medium text-gray-700">
                          {filteredArchiveTasks.length} ta natija
                        </span>
                        {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.clientId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                          <span className="text-gray-500">(filtrlangan)</span>
                        )}
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.clientId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                      <button
                        onClick={() => {
                          setArchiveSearchQuery('');
                          setArchiveFilters({ branchId: '', clientId: '', startDate: '', endDate: '', hasPsr: '' });
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
            </div>
          )}
          {!showArchive && (
            <button
              onClick={() => {
                if (isMobile) {
                  navigate('/tasks/new');
                } else {
                  setShowForm(true);
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col">
      {/* Modal for Add Task */}
      {showTaskForm && (
        <div 
          className={isMobile && isNewTaskRoute
            ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
            : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm'}
          style={isMobile && isNewTaskRoute ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (isMobile && isNewTaskRoute) {
                navigate('/tasks');
              } else {
                setShowForm(false);
              }
            }
          }}
        >
          <div 
            className={isMobile && isNewTaskRoute
              ? 'bg-white w-full h-full px-6 py-6 overflow-y-auto'
              : 'bg-white rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto'}
            style={isMobile && isNewTaskRoute ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Yangi task</h2>
              <button
                onClick={() => {
                  if (isMobile && isNewTaskRoute) {
                    navigate('/tasks');
                  } else {
                    setShowForm(false);
                  }
                }}
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
                    <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
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
                    <Icon icon="lucide:user" className="w-4 h-4 text-blue-600" />
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
                    <Icon icon="lucide:building" className="w-4 h-4 text-blue-600" />
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(branches) && branches.length > 0 ? (
                      branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, branchId: branch.id.toString() });
                          }}
                          className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                            form.branchId === branch.id.toString()
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

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
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

                {/* 5. Qo'shimcha to'lov kelishuvi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:handshake" className="w-4 h-4 text-blue-600" />
                    Qo'shimcha to'lov kelishuvi
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, afterHoursPayer: 'CLIENT' })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.afterHoursPayer === 'CLIENT'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Mijoz to'laydi
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, afterHoursPayer: 'COMPANY' })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.afterHoursPayer === 'COMPANY'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Men to'layman
                    </button>
                  </div>
                </div>

                {/* 6. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:phone" className="w-4 h-4 text-blue-600" />
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

                {/* 7. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:message-square" className="w-4 h-4 text-blue-600" />
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
                    setEditingErrorId(null);
                    setShowErrorModal(true);
                  }}
                  className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  title="Xato"
                >
                  <Icon icon="lucide:alert-circle" className="w-5 h-5" />
                </button>
                {/* Faqat task yaratgan ishchi o'zgartira oladi */}
                {selectedTask.createdBy && user && selectedTask.createdBy.id === user.id && (
                  <button
                    onClick={() => {
                      if (selectedTask) {
                        if (isMobile) {
                          navigate(`/tasks/${selectedTask.id}/edit`);
                        } else {
                          setEditForm({
                            title: selectedTask.title,
                            clientId: selectedTask.client.id.toString(),
                            branchId: selectedTask.branch.id.toString(),
                            comments: selectedTask.comments || '',
                            hasPsr: selectedTask.hasPsr || false,
                            afterHoursPayer: selectedTask.afterHoursPayer || 'CLIENT',
                            driverPhone: selectedTask.driverPhone || '',
                          });
                          setShowEditModal(true);
                        }
                      }
                    }}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="O'zgartirish"
                  >
                    <Icon icon="lucide:pencil" className="w-5 h-5" />
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
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="O'chirish"
                  >
                    <Icon icon="lucide:trash-2" className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => downloadStickerPng(selectedTask.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                >
                  <Icon icon="lucide:download" className="w-4 h-4" />
                  Stiker
                </button>
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
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Shartnoma (invoice qaysi shartnomaga asosan)</div>
                <div className="font-medium text-sm">
                  {selectedTask.invoice?.contract?.contractNumber
                    ? `№ ${selectedTask.invoice.contract.contractNumber}${selectedTask.invoice.contract.contractDate ? `, ${new Date(selectedTask.invoice.contract.contractDate).toLocaleDateString('uz-UZ')}` : ''}`
                    : selectedTask.invoice?.contractNumber
                      ? `№ ${selectedTask.invoice.contractNumber}`
                      : '—'}
                </div>
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
                <Icon icon="lucide:file-text" className="w-5 h-5 text-blue-600" />
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
                {user?.role === 'ADMIN' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Qo'shimcha to'lov kelishuvi:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      String((selectedTask.client as any)?.defaultAfterHoursPayer ?? selectedTask.afterHoursPayer ?? 'CLIENT').toUpperCase() === 'COMPANY'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {String((selectedTask.client as any)?.defaultAfterHoursPayer ?? selectedTask.afterHoursPayer ?? 'CLIENT').toUpperCase() === 'COMPANY' ? 'Men to\'layman' : 'Mijoz to\'laydi'}
                    </span>
                  </div>
                )}
                {selectedTask.afterHoursDeclaration && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Ish vaqtidan tashqari rasmiylashtiruv:</span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800">Ha</span>
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={afterHoursDeclaration}
                    onChange={(e) => handleAfterHoursDeclarationChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ish vaqtidan tashqari rasmiylashtiruv</span>
                </label>
                {selectedTask.driverPhone && (
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:phone" className="w-4 h-4 text-gray-500" />
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
                <button
                  type="button"
                  onClick={handleOpenSendEmailModal}
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                >
                  <Icon icon="lucide:mail" className="w-4 h-4" />
                  <span>Send Documents by Email</span>
                </button>
              </div>
            </div>

            {/* Foyda hisoboti - barcha foydalanuvchilar uchun */}
            {selectedTask.netProfit !== null && selectedTask.netProfit !== undefined && (
              <div className={`mb-6 p-4 border rounded-lg ${
                (() => {
                  const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                  const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                  const netProfitDisplay = dealAmount - branchPayments;
                  return netProfitDisplay >= 0;
                })()
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon={(() => {
                    const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                    const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                    const netProfitDisplay = dealAmount - branchPayments;
                    return netProfitDisplay >= 0 ? 'lucide:dollar-sign' : 'lucide:alert-circle';
                  })()} className={`w-5 h-5 ${(() => {
                    const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                    const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                    const netProfitDisplay = dealAmount - branchPayments;
                    return netProfitDisplay >= 0 ? 'text-green-600' : 'text-orange-600';
                  })()}`} />
                  <div className={`text-sm font-semibold ${(() => {
                    const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                    const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                    const netProfitDisplay = dealAmount - branchPayments;
                    return netProfitDisplay >= 0 ? 'text-green-800' : 'text-orange-800';
                  })()}`}>
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
                          {formatMoney(
                            getDealAmountDisplay(selectedTask, afterHoursDeclaration),
                            getClientCurrency(selectedTask.client)
                          )}
                          {selectedTask.hasPsr && (
                            <span className="text-xs text-gray-500 ml-1">
                              (asosiy: {formatMoney(
                                getDealAmountBaseDisplay(selectedTask, afterHoursDeclaration),
                                getClientCurrency(selectedTask.client)
                              )} + {formatMoney(getPsrAmount(selectedTask), getClientCurrency(selectedTask.client))})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Filial bo'yicha to'lovlar:</span>
                        <span className="text-sm font-medium text-red-600">
                          {formatMoney(getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration), getClientCurrency(selectedTask.client))}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                        <span className={`text-sm font-semibold ${(() => {
                          const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                          const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                          const netProfitDisplay = dealAmount - branchPayments;
                          return netProfitDisplay >= 0 ? 'text-green-800' : 'text-orange-800';
                        })()}`}>
                          Sof foyda:
                        </span>
                        <span className={`text-sm font-bold ${(() => {
                          const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                          const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                          const netProfitDisplay = dealAmount - branchPayments;
                          return netProfitDisplay >= 0 ? 'text-green-600' : 'text-orange-600';
                        })()}`}>
                          {(() => {
                            const currency = getClientCurrency(selectedTask.client);
                            const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                            const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                            const netProfitDisplay = dealAmount - branchPayments;
                            return formatMoney(netProfitDisplay, currency);
                          })()}
                        </span>
                      </div>
                      {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-800">
                            Admin ishlab topgan pul:
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {formatMoney(Number(selectedTask.adminEarnedAmount), getClientCurrency(selectedTask.client))}
                          </span>
                        </div>
                      )}
                      {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                        <div className="pt-2 border-t-2 border-gray-300 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-800">
                            Jami foyda:
                          </span>
                          <span className="text-lg font-bold text-purple-600">
                            {(() => {
                              const currency = getClientCurrency(selectedTask.client);
                              const dealAmount = getDealAmountDisplay(selectedTask, afterHoursDeclaration);
                              const branchPayments = getBranchPaymentsDisplay(selectedTask, afterHoursDeclaration);
                              const netProfitDisplay = dealAmount - branchPayments;
                              const totalProfitDisplay = netProfitDisplay + Number(selectedTask.adminEarnedAmount || 0);
                              return formatMoney(totalProfitDisplay, currency);
                            })()}
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
                                }).format(log.amount).replace(/,/g, ' ')}
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
                            }).format(totalAmount).replace(/,/g, ' ')}
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
                  <Icon icon="lucide:message-square" className="w-4 h-4 text-blue-600" />
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
                      onClick={() => {
                        if (!updatingStage) {
                          handleStageClick(stage);
                        }
                      }}
                      className={`flex items-center justify-between p-3 border ${borderColor} rounded-lg hover:bg-gray-50 transition ${bgColor} ${updatingStage === stage.id ? 'cursor-wait' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
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
                            <Icon icon="lucide:check" className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <label
                          className={`ml-3 text-sm font-medium flex-1 transition-all duration-300 ${
                            stage.status === 'TAYYOR'
                              ? 'line-through text-gray-400 opacity-60'
                              : 'text-gray-900'
                          }`}
                        >
                          {stage.name}
                        </label>
                      </div>
                      {stage.status === 'TAYYOR' && (() => {
                        const durationText = formatDuration(durationMinutes);
                        const deklarMultiplier =
                          stage.name === 'Deklaratsiya' && selectedTask?.customsPaymentMultiplier != null
                            ? Number(selectedTask.customsPaymentMultiplier)
                            : null;
                        
                        return (
                          <div className="text-xs text-gray-500 ml-4 flex items-center gap-2 flex-wrap">
                            {stage.assignedTo && (
                              <span className="font-medium text-gray-700">
                                ({stage.assignedTo.name})
                              </span>
                            )}
                            {deklarMultiplier != null && (
                              <span className="text-gray-700">
                                BXM {deklarMultiplier} barobari
                              </span>
                            )}
                            {durationText && <span>{durationText}</span>}
                            {durationText && evaluation && (
                              <i className={`fas ${evaluation.icon} ${evaluation.color}`} title={
                                evaluation.rating === 'alo' ? 'A\'lo' : 
                                evaluation.rating === 'ortacha' ? 'Ortacha' : 
                                'Yomon'
                              }></i>
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Hujjatlar</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Emailga ilova qilinadigan fayllar manashu yerdan olinadi.</p>
                </div>
                <div className="flex items-center gap-2">
                  {taskDocuments.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          if (!selectedTask?.id) {
                            throw new Error('Task topilmadi');
                          }

                          const response = await apiClient.get(`/documents/task/${selectedTask.id}/download-all`, {
                            responseType: 'blob',
                          });

                          // Agar backend JSON xatolik yuborsa, uni parse qilish
                          if (response.data?.type === 'application/json') {
                            const text = await response.data.text();
                            const errorData = JSON.parse(text);
                            throw new Error(errorData.error || errorData.message || 'Yuklab olishda xatolik');
                          }

                          const blobType = response.data?.type || 'application/zip';
                          const blob = new Blob([response.data], { type: blobType });
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
                          let message = error?.message || 'Yuklab olishda xatolik';
                          if (error?.response?.data instanceof Blob) {
                            try {
                              const text = await error.response.data.text();
                              const data = JSON.parse(text);
                              message = data.error || data.message || message;
                            } catch {
                              // ignore
                            }
                          }
                          alert(message);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                      title="Barcha hujjatlarni ZIP qilib yuklab olish"
                    >
                      <Icon icon="lucide:download" className="w-4 h-4" />
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
                      <Icon icon="lucide:plus" className="w-4 h-4" />
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
                <div className="space-y-1">
                  {taskDocuments.map((doc) => {
                    const isExpanded = expandedDocuments.has(doc.id);
                    const hasOCR = canShowOCR(doc.fileType, doc.name);
                    const extractedText = documentExtractedTexts.get(doc.id) || '';
                    const isLoadingText = loadingExtractedTexts.has(doc.id);
                    
                    return (
                      <div key={doc.id} className="space-y-1">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-shrink-0">
                              {getFileIcon(doc.fileType, doc.name)}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                              {doc.description && (
                                <div className="text-xs text-gray-500">{doc.description}</div>
                              )}
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt || doc.archivedAt).toLocaleDateString('uz-UZ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canPreview(doc.fileType) && (
                              <button
                                onClick={() => openPreview(doc.fileUrl, doc.fileType, doc.name)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                                title="Ko'rish"
                              >
                                <Icon icon="lucide:eye" className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => downloadDocument(doc.fileUrl)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="Yuklab olish"
                            >
                              <Icon icon="lucide:download" className="w-4 h-4" />
                            </button>
                            {(() => {
                              // Admin har doim o'chira oladi
                              const isAdmin = user?.role === 'ADMIN';
                              
                              // Faqat yuklagan foydalanuvchi o'chira oladi
                              const isOwner = doc.uploadedById === user?.id;
                              
                              // Agar admin yoki yuklagan foydalanuvchi bo'lmasa, hech narsa ko'rsatilmaydi
                              if (!isAdmin && !isOwner) {
                                return null;
                              }
                              
                              // Vaqtni hisoblash (2 kungacha o'chirish mumkin)
                              const uploadTime = new Date(doc.createdAt || doc.archivedAt);
                              const now = new Date();
                              const diffInMs = now.getTime() - uploadTime.getTime();
                              const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
                              
                              // Admin har doim o'chira oladi
                              if (isAdmin) {
                                return (
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="O'chirish (Admin)"
                                  >
                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                  </button>
                                );
                              }
                              
                              // Yuklagan foydalanuvchi uchun: 2 kungacha o'chira oladi
                              if (isOwner) {
                                if (diffInDays <= 2) {
                                  // 2 kungacha o'chirish mumkin
                                  return (
                                    <button
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                      title="O'chirish"
                                    >
                                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                    </button>
                                  );
                                } else {
                                  // 2 kundan ko'p vaqt o'tgan, o'chirish mumkin emas
                                  const daysPassed = Math.floor(diffInDays);
                                  return (
                                    <span 
                                      className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded"
                                      title="2 kundan keyin o'chirish mumkin emas"
                                    >
                                      O'chirish mumkin emas ({daysPassed} kun o'tdi)
                                    </span>
                                  );
                                }
                              }
                              
                              return null;
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
                                <Icon icon="lucide:copy" className="w-4 h-4" />
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
                    <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
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
                  <Icon icon={showVersions ? "lucide:chevron-up" : "lucide:chevron-down"} className="w-4 h-4" />
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
                    setAfterHoursDeclaration(false);
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
                      <option value="1">BXM 1 barobari ({formatBxmAmountInSum(1)})</option>
                      <option value="1.5">BXM 1.5 barobari ({formatBxmAmountInSum(1.5)})</option>
                      <option value="2.5">BXM 2.5 barobari ({formatBxmAmountInSum(2.5)})</option>
                      <option value="4">BXM 4 barobari ({formatBxmAmountInSum(4)})</option>
                    </select>
                  </div>
                  <label className="mb-4 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={afterHoursDeclaration}
                      onChange={(e) => setAfterHoursDeclaration(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Ish vaqtidan tashqari rasmiylashtiruv
                  </label>
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
                        setAfterHoursDeclaration(false);
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
                                if (selectedStageForReminder) {
                                  await updateStageToReady(selectedStageForReminder, undefined, true);
                                }
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
                              await updateStageToReady(selectedStageForReminder);
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


          </div>
        </div>
      )}

      {/* Send Documents by Email Modal */}
      {showSendEmailModal && selectedTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
          style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !sendingEmail) {
              setShowSendEmailModal(false);
              setSendEmailError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{ animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Documents by Email</h3>
            <form onSubmit={handleSendTaskEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sendEmailForm.subject}
                  onChange={(e) => setSendEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                <textarea
                  value={sendEmailForm.body}
                  onChange={(e) => setSendEmailForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="Message body"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sendEmailForm.recipients}
                  onChange={(e) => setSendEmailForm((f) => ({ ...f, recipients: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CC (optional)</label>
                <input
                  type="text"
                  value={sendEmailForm.cc}
                  onChange={(e) => setSendEmailForm((f) => ({ ...f, cc: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="cc@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ilova qilinadigan fayllar</label>
                <ul className="mt-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 list-disc list-inside">
                  {taskDocuments.length > 0 ? (
                    taskDocuments.map((doc: { id: number; name?: string }) => (
                      <li key={doc.id}>{doc.name || `Hujjat #${doc.id}`}</li>
                    ))
                  ) : (
                    <li className="list-none text-gray-500">Hujjatlar yo&apos;q</li>
                  )}
                </ul>
              </div>
              {sendEmailError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {sendEmailError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingEmail ? 'Sending...' : 'Send'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSendEmailModal(false);
                    setSendEmailError(null);
                  }}
                  disabled={sendingEmail}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Edit Task */}
      {showEditTaskForm && selectedTask && (
        <div 
          className={isMobile && editTaskId
            ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
            : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm'}
          style={isMobile && editTaskId ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (isMobile && editTaskId) {
                navigate(isArchiveRoute ? '/tasks/archive' : '/tasks');
              } else {
                setShowEditModal(false);
              }
            }
          }}
        >
          <div 
            className={isMobile && editTaskId
              ? 'bg-white w-full h-full px-6 py-6 overflow-y-auto'
              : 'bg-white rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto'}
            style={isMobile && editTaskId ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Taskni tahrirlash</h2>
              <button
                onClick={() => {
                  if (isMobile && editTaskId) {
                    navigate(isArchiveRoute ? '/tasks/archive' : '/tasks');
                  } else {
                    setShowEditModal(false);
                  }
                }}
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
                    <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
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
                    <Icon icon="lucide:user" className="w-4 h-4 text-blue-600" />
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
                    <Icon icon="lucide:building" className="w-4 h-4 text-blue-600" />
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(branches) && branches.length > 0 ? (
                      branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, branchId: branch.id.toString() });
                          }}
                          className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                            editForm.branchId === branch.id.toString()
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

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
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

                {/* 5. Qo'shimcha to'lov kelishuvi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:handshake" className="w-4 h-4 text-blue-600" />
                    Qo'shimcha to'lov kelishuvi
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, afterHoursPayer: 'CLIENT' })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.afterHoursPayer === 'CLIENT'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Mijoz to'laydi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, afterHoursPayer: 'COMPANY' })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.afterHoursPayer === 'COMPANY'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Men to'layman
                    </button>
                  </div>
                </div>

                {/* 6. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:phone" className="w-4 h-4 text-blue-600" />
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

                {/* 7. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Icon icon="lucide:message-square" className="w-4 h-4 text-blue-600" />
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
                            title="O&#39;chirish"
                          >
                            <Icon icon="lucide:x" className="w-3.5 h-3.5" />
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
              <h2 className="text-xl font-semibold text-gray-800">Xatolar</h2>
              <button
                onClick={() => {
                  setEditingErrorId(null);
                  setShowErrorModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {selectedTask.errors && selectedTask.errors.length > 0 ? (
              <div className="mb-4 space-y-2">
                {selectedTask.errors.map((error) => {
                  const workerName = workers.find((w) => w.id === error.workerId)?.name || `#${error.workerId}`;
                  return (
                    <div key={error.id} className="p-3 border rounded-lg bg-gray-50 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {error.stageName} — {formatMoney(Number(error.amount), 'USD')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Xato qildi: {workerName} • Sana: {new Date(error.date).toLocaleDateString('uz-UZ')}
                        </div>
                        {error.comment && (
                          <div className="text-xs text-gray-600 mt-2">{error.comment}</div>
                        )}
                      </div>
                      {canEditError(error) && (
                        <div className="ml-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingErrorId(error.id);
                              setErrorForm({
                                workerId: error.workerId.toString(),
                                stageName: error.stageName,
                                amount: String(error.amount),
                                comment: error.comment || '',
                                date: new Date(error.date).toISOString().split('T')[0],
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Tahrirlash"
                          >
                            <i className="fas fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Xatoni o\'chirishni xohlaysizmi?')) return;
                              try {
                                await apiClient.delete(`/tasks/${selectedTask.id}/errors/${error.id}`);
                                const response = await apiClient.get(`/tasks/${selectedTask.id}`);
                                setSelectedTask(response.data);
                                await loadTasks();
                              } catch (error: any) {
                                alert(error.response?.data?.error || 'Xatolik yuz berdi');
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="O'chirish"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mb-4 text-sm text-gray-500">Xatolar yo'q</div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const amountValue = errorForm.amount.trim();

                  if (!/^\d{1,4}$/.test(amountValue)) {
                    alert('Summa faqat USD bo\'lishi va 4 xonagacha bo\'lishi kerak');
                    return;
                  }

                  if (editingErrorId) {
                    await apiClient.patch(`/tasks/${selectedTask.id}/errors/${editingErrorId}`, {
                      workerId: parseInt(errorForm.workerId),
                      stageName: errorForm.stageName,
                      amount: parseFloat(amountValue),
                      comment: errorForm.comment,
                      date: new Date(errorForm.date),
                    });
                  } else {
                    await apiClient.post(`/tasks/${selectedTask.id}/errors`, {
                      taskTitle: selectedTask.title,
                      workerId: parseInt(errorForm.workerId),
                      stageName: errorForm.stageName,
                      amount: parseFloat(amountValue),
                      comment: errorForm.comment,
                      date: new Date(errorForm.date),
                    });
                  }
                  setShowErrorModal(false);
                  setEditingErrorId(null);
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
                  type="text"
                  inputMode="numeric"
                  required
                  value={errorForm.amount}
                  onChange={(e) => {
                    const nextValue = e.target.value;

                    if (nextValue === '') {
                      setErrorForm({ ...errorForm, amount: '' });
                      return;
                    }

                    if (/^\d{0,4}$/.test(nextValue)) {
                      setErrorForm({ ...errorForm, amount: nextValue });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
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
                <DateInput
                  required
                  value={errorForm.date}
                  onChange={(value) => setErrorForm({ ...errorForm, date: value })}
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

      {/* Tasklar jadvali - Mobil versiyada tepada */}
      <div className="order-1 md:order-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
        ) : showArchive ? (
          // Arxiv bo'limida barcha tasklar bitta jadvalda, har sahifada 20 ta (pagination)
          <div>
            {renderTaskTable(archivePageTasks, 'Arxiv')}
            {!loading && archiveTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600">
                  Jami <span className="font-semibold">{archiveTotalTasks}</span> ta task,{' '}
                  <span className="font-semibold">{page}</span>/{archiveTotalPages} sahifa
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <button
                    type="button"
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
                  {getPageNumbers(page, archiveTotalPages).map((p) => (
                    <button
                      key={`archive-page-${p}`}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(archiveTotalPages, p + 1))}
                    disabled={page === archiveTotalPages}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                      page === archiveTotalPages
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
        ) : (
          // Barcha ishlar bo'limida filiallarga bo'lingan
          isDeklarantWithBranch && userBranch ? (
            // DEKLARANT uchun faqat o'zining filiali to'liq kenglikda
            <div className="w-full">
              {renderTaskTable(userBranchTasks, userBranch.name)}
            </div>
          ) : (
            // ADMIN/MANAGER uchun barcha filiallar - dinamik
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-[30px]">
              {Array.isArray(branches) && branches.map((branch, index) => {
                const branchTasks = tasksByBranch.get(branch.name) || [];
                return (
                  <div key={branch.id}>
                    {renderTaskTable(branchTasks, branch.name, index)}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
      </div>

    </div>
  );
};

export default Tasks;
