import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import { useTaskData } from '../components/tasks/useTaskData';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../utils/useIsMobile';
import DateInput from '../components/DateInput';
import { useFileHelpers } from '../components/tasks/useFileHelpers';
import {
  formatDate, formatFileSize, formatDuration, formatMoney, getClientCurrency,
  getStatusInfo, getFileIcon, canPreview, canShowOCR,
  getAvatarColor, getInitials, calculateStageDuration, evaluateStageTime,
} from '../components/tasks/taskHelpers';
import PreviewModal from '../components/tasks/PreviewModal';
import ErrorModal from '../components/tasks/ErrorModal';
import SendEmailModal from '../components/tasks/SendEmailModal';
import EditTaskModal from '../components/tasks/EditTaskModal';
import DocumentUploadModal from '../components/tasks/DocumentUploadModal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import BXMModal from '../components/tasks/BxmModal';
import FileUploadModal from '../components/tasks/FileUploadModal';
import TaskDetailPanel from '../components/tasks/TaskDetailPanel';
import TaskTable, { calculateTotalDuration } from '../components/tasks/TaskTable';
import ArchiveFiltersPanel from '../components/tasks/ArchiveFiltersPanel';
import type { ArchiveFiltersState } from '../components/tasks/ArchiveFiltersPanel';

import type {
  Task, TaskStage, KpiLog, TaskError, TaskDetail,
  TaskVersion, Client, Branch, TaskStats, TasksProps,
} from '../components/tasks/types';

const Tasks: React.FC<TasksProps> = ({ isModalMode = false, modalTaskId, onCloseModal }) => {
  const { downloadFile, getPreviewBlobUrl } = useFileHelpers();
  const [showForm, setShowForm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Pagination state
  const limit = 50; // Har bir sahifada 50 ta task
  const archiveLimit = 20; // Arxivda har sahifada 20 ta task
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedStageForReminder, setSelectedStageForReminder] = useState<TaskStage | null>(null);
  const [showBXMModal, setShowBXMModal] = useState(false);
  const [showFinancialReport, setShowFinancialReport] = useState(false);
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
  // OCR extracted text state
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
  const [uploadProgress, setUploadProgress] = useState(0);
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
  const { user } = useAuth();
  const {
    tasks, loading, clients, branches, workers,
    page, setPage, totalPages, totalTasks,
    selectedTask, setSelectedTask, loadingTask, setLoadingTask,
    taskDocuments, setTaskDocuments, loadingDocuments,
    aiChecks, loadingAiChecks, taskVersions, setTaskVersions, loadingVersions, setLoadingVersions,
    expandedDocuments, documentExtractedTexts, loadingExtractedTexts,
    loadTasks, loadClients, loadBranches, loadWorkers,
    loadTaskDetail, loadTaskStages, loadTaskVersions, loadTaskDocuments,
    loadAiChecks, loadExtractedText, toggleDocumentExpansion
  } = useTaskData(user?.role);
  const socket = useSocket();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  const handleTaskClick = (taskId: number) => {
    loadTaskDetail(taskId, {
      onLoaded: (taskData) => {
        setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
        setShowTaskModal(true);
      }
    });
  };

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
      // Barcha hujjatlar muvaffaqiyatli yuborilgach Pochta jarayonini avtomatik Tayyor qilamiz
      const pochtStage = selectedTask.stages?.find((s: TaskStage) => s.name === 'Pochta');
      if (pochtStage && pochtStage.status === 'BOSHLANMAGAN') {
        try {
          await apiClient.patch(`/tasks/${selectedTask.id}/stages/${pochtStage.id}`, { status: 'TAYYOR' });
          await loadTaskDetail(selectedTask.id);
        } catch (_) {
          // Pochta yangilash xatosi bo'lsa ham email yuborildi, modalni yopamiz
        }
      }
      setShowSendEmailModal(false);
      setShowTaskModal(false);
      setSelectedTask(null);
      await loadTasks(showArchive, filters as any);
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
    if (isModalMode) return;
    loadTasks(showArchive, filters as any);
    loadClients();
    loadBranches();
    loadWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchive, page, filters.status, filters.clientId, filters.branchId, isModalMode]);

  // Socket.io: real-time task yangilanishlarni tinglash
  useEffect(() => {
    if (!socket || isModalMode) return;
    const refresh = () => loadTasks(showArchive, filters as any);
    const onTaskCreated = (data: { createdBy: string }) => {
      toast(`${data.createdBy} yangi task yaratdi`, { icon: '📋' });
      refresh();
    };
    const onTaskUpdated = (data: { updatedBy: string }) => {
      toast(`${data.updatedBy} taskni yangiladi`, { icon: '✏️' });
      refresh();
    };
    const onTaskDeleted = (data: { deletedBy: string }) => {
      toast(`${data.deletedBy} taskni o'chirdi`, { icon: '🗑️' });
      refresh();
    };
    const onStageUpdated = (data: { updatedBy: string }) => {
      toast(`${data.updatedBy} jarayonni yangiladi`, { icon: '🔄' });
      refresh();
    };
    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:stageUpdated', onStageUpdated);
    return () => {
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:stageUpdated', onStageUpdated);
    };
  }, [socket, showArchive, filters, isModalMode]);

  useEffect(() => {
    if (isModalMode && modalTaskId) {
      loadTaskDetail(modalTaskId);
    }
  }, [isModalMode, modalTaskId]);

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
          if (isModalMode) {
            onCloseModal?.();
          } else {
            setShowTaskModal(false);
            setSelectedTask(null);
          }
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

  const handleFileUpload = async () => {
    if (!selectedTask || !fileUploadFile || !fileUploadStageName) {
      alert('Faylni tanlang');
      return;
    }

    try {
      setUploadingFile(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', fileUploadFile);
      formData.append('name', fileUploadName);

      // Document type'ni stage nomiga qarab aniqlaymiz
      let documentType = 'OTHER';
      if (fileUploadStageName === 'Invoys') {
        documentType = 'INVOICE';
      } else if (fileUploadStageName === 'Sertifikat olib chiqish') {
        if (fileUploadName === 'ST') {
          documentType = 'ST';
        } else if (fileUploadName === 'Fito') {
          documentType = 'FITO';
        } else {
          documentType = 'ST';
        }
      } else if (fileUploadStageName === 'ST') {
        documentType = 'ST';
      } else if (fileUploadStageName === 'Fito' || fileUploadStageName === 'FITO') {
        documentType = 'FITO';
      }
      formData.append('documentType', documentType);

      await apiClient.post(`/tasks/${selectedTask.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      // Fayl yuklangandan keyin modal'ni yopish va stage'ni tayyor qilish
      setShowFileUploadModal(false);
      setFileUploadFile(null);
      setFileUploadName('');
      setFileUploadStageName('');

      if (selectedStageForReminder) {
        await updateStageToReady(selectedStageForReminder);
      } else {
        await loadTaskDetail(selectedTask.id);
        await loadTaskDocuments(selectedTask.id);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const stageDisplayName = fileUploadStageName || 'Fayl';
      alert(error.response?.data?.error || `${stageDisplayName} yuklashda xatolik yuz berdi`);
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedTask || uploadFiles.length === 0) {
      alert('Kamida bitta faylni tanlang');
      return;
    }

    try {
      setUploadingFile(true);
      setUploadProgress(0);
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
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
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
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
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

  const openPreview = async (fileUrl: string, fileType: string, fileName: string) => {
    const blobUrl = await getPreviewBlobUrl(fileUrl);
    if (blobUrl) {
      setPreviewDocument({ url: blobUrl, type: fileType, name: fileName });
    } else {
      alert('Faylni ko\'rishda xatolik yuz berdi');
    }
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

  const downloadDocument = async (fileUrl: string, originalName?: string) => {
    await downloadFile(fileUrl, originalName);
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





  const handleStageClick = async (stage: TaskStage) => {
    if (!user) {
      alert('Login qiling');
      return;
    }
    if (stage.status === 'BOSHLANMAGAN') {
      // Pochta bosilganda modal ochilmasin — boshqa bosqichlar kabi to'g'ridan-to'g'ri Tayyor qilamiz
      setSelectedStageForReminder(stage);
      if (stage.name === 'Pochta') {
        await updateStageToReady(stage);
      } else if (stage.name === 'Deklaratsiya') {
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
    } else {
      // If already completed, allow unchecking
      handleStageToggle(stage.id, stage.status);
    }
  };

  const handleBXMEdit = async (stage: TaskStage) => {
    try {
      const bxmResponse = await apiClient.get('/bxm/current');
      const amountUsd = Number(bxmResponse.data.amountUsd ?? bxmResponse.data.amount ?? 34.4);
      const amountUzs = Number(bxmResponse.data.amountUzs ?? 412000);
      setCurrentBxmUsd(amountUsd);
      setCurrentBxmUzs(amountUzs);
    } catch {
      setCurrentBxmUsd(34.4);
      setCurrentBxmUzs(412000);
    }
    const current = selectedTask?.customsPaymentMultiplier;
    setBxmMultiplier(current != null ? String(current) : '1.5');
    setAfterHoursDeclaration(Boolean(selectedTask?.afterHoursDeclaration));
    setSelectedStageForReminder(stage);
    setShowBXMModal(true);
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
      await loadTasks(showArchive, filters as any);
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
      await loadTasks(showArchive, filters as any);
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
      await loadTasks(showArchive, filters as any);
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
      await loadTasks(showArchive, filters as any);
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
      await loadTasks(showArchive, filters as any);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
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




  // Calculate total duration for a task: Sum of all stages' durationMin

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

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return (
    <div className={isModalMode ? "" : "max-w-[1920px] mx-auto px-2 sm:px-4 space-y-6 sm:space-y-8 font-sans pb-10"}>
      {!isModalMode && (
        <div className="contents">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Icon icon="lucide:layout-list" className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">Vazifalar</h1>
          </div>
          {/* Tab buttons */}
          <div className="flex gap-1.5 bg-gray-100/80 backdrop-blur-md p-1.5 rounded-xl border border-gray-200/50 shadow-inner">
            <button
              onClick={() => {
                if (isMobile) {
                  navigate('/tasks');
                } else {
                  navigate('/tasks');
                  setShowArchive(false);
                }
              }}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${!showArchive
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-900/5 scale-100'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50 scale-95 hover:scale-100'
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
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${showArchive
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-900/5 scale-100'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50 scale-95 hover:scale-100'
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
                className={`relative p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm hover:shadow z-10 ${showArchiveFilters ? 'opacity-0 pointer-events-none' : ''
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
                <ArchiveFiltersPanel
                  isMobile={isMobile}
                  isArchiveFiltersRoute={isArchiveFiltersRoute}
                  onClose={() => {
                    if (isMobile && isArchiveFiltersRoute) {
                      navigate('/tasks/archive');
                    } else {
                      setShowArchiveFilters(false);
                    }
                  }}
                  archiveSearchQuery={archiveSearchQuery}
                  setArchiveSearchQuery={setArchiveSearchQuery}
                  archiveFilters={archiveFilters as unknown as ArchiveFiltersState}
                  setArchiveFilters={setArchiveFilters as any}
                  branches={branches}
                  clients={clients}
                  filteredArchiveTasksLength={filteredArchiveTasks.length}
                />
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
      </div>
      )}

      <div className="flex flex-col">
        <CreateTaskModal
          show={showTaskForm}
          form={form}
          setForm={setForm}
          clients={clients}
          branches={branches}
          isMobile={isMobile}
          isNewTaskRoute={isNewTaskRoute}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />



        {/* Modal for Task Detail */}

        {/* Modal for Task Detail */}
        {showTaskModal && selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            showFinancialReport={showFinancialReport}
            setShowFinancialReport={setShowFinancialReport}
            afterHoursDeclaration={afterHoursDeclaration}
            taskDocuments={taskDocuments}
            taskVersions={taskVersions}
            showVersions={showVersions}
            setShowVersions={setShowVersions}
            loadingVersions={loadingVersions}
            loadingDocuments={loadingDocuments}
            loadingTask={loadingTask}
            workers={workers}
            user={user}
            isMobile={isMobile}
            isModalMode={isModalMode}
            aiChecks={aiChecks}
            loadingAiChecks={loadingAiChecks}
            expandedDocuments={expandedDocuments}
            documentExtractedTexts={documentExtractedTexts}
            loadingExtractedTexts={loadingExtractedTexts}
            updatingStage={updatingStage}
            onClose={() => {
              if (isModalMode) {
                onCloseModal?.();
              } else {
                setShowTaskModal(false);
                setSelectedTask(null);
                setShowFinancialReport(false);
              }
            }}
            onEdit={() => {
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
            onOpenErrorModal={() => {
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
            onOpenDocumentUpload={() => {
              setShowDocumentUpload(true);
              setUploadFiles([]);
              setDocumentNames([]);
              setDocumentDescriptions([]);
            }}
            onDeleteTask={async () => {
              if (confirm('Bu taskni o\'chirishni xohlaysizmi?')) {
                try {
                  await apiClient.delete(`/tasks/${selectedTask.id}`);
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  await loadTasks(showArchive, filters as any);
                } catch (error: any) {
                  alert(error.response?.data?.error || 'Xatolik yuz berdi');
                }
              }
            }}
            onStageClick={handleStageClick}
            onDeleteDocument={handleDeleteDocument}
            onDownloadDocument={downloadDocument}
            onDownloadSticker={downloadStickerPng}
            onOpenSendEmail={handleOpenSendEmailModal}
            onTelegramClick={handleTelegramClick}
            onAfterHoursChange={handleAfterHoursDeclarationChange}
            onBXMEdit={handleBXMEdit}
            onOpenPreview={openPreview}
            onLoadVersions={loadTaskVersions}
            onLoadAiChecks={loadAiChecks}
            onRefreshTasks={() => loadTasks(showArchive, filters as any)}
            formatInvoiceExtractedText={formatInvoiceExtractedText}
            formatBxmAmountInSum={formatBxmAmountInSum}
          />
        )}

              <BXMModal
                show={showBXMModal && !!selectedStageForReminder}
                bxmMultiplier={bxmMultiplier}
                setBxmMultiplier={setBxmMultiplier}
                afterHoursDeclaration={afterHoursDeclaration}
                setAfterHoursDeclaration={setAfterHoursDeclaration}
                formatBxmAmountInSum={formatBxmAmountInSum}
                onConfirm={handleBXMConfirm}
                onClose={() => {
                  setShowBXMModal(false);
                  setAfterHoursDeclaration(false);
                  setSelectedStageForReminder(null);
                }}
              />

              {/* Umumiy file upload modali (Invoice, ST, Fito uchun) */}
              <FileUploadModal
                show={showFileUploadModal && !!selectedTask}
                stageName={fileUploadStageName}
                fileName={fileUploadName}
                file={fileUploadFile}
                uploading={uploadingFile}
                uploadProgress={uploadProgress}
                selectedStageForReminder={selectedStageForReminder}
                onFileNameChange={setFileUploadName}
                onFileChange={setFileUploadFile}
                onUpload={handleFileUpload}
                onSkipValidation={async () => {
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
                onClose={() => {
                  setShowFileUploadModal(false);
                  setFileUploadFile(null);
                  setFileUploadName('');
                  setFileUploadStageName('');
                  setSelectedStageForReminder(null);
                }}
              />

        <SendEmailModal
          show={showSendEmailModal}
          selectedTask={selectedTask}
          sendEmailForm={sendEmailForm}
          setSendEmailForm={setSendEmailForm}
          sendingEmail={sendingEmail}
          sendEmailError={sendEmailError}
          setSendEmailError={setSendEmailError}
          taskDocuments={taskDocuments}
          onClose={() => setShowSendEmailModal(false)}
          onSubmit={handleSendTaskEmail}
        />

        <EditTaskModal
          show={showEditTaskForm && !!selectedTask}
          editForm={editForm}
          setEditForm={setEditForm}
          clients={clients}
          branches={branches}
          isMobile={isMobile}
          editTaskId={editTaskId}
          isArchiveRoute={isArchiveRoute}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
        />

        <DocumentUploadModal
          show={showDocumentUpload && !!selectedTask}
          uploadFiles={uploadFiles}
          setUploadFiles={setUploadFiles}
          documentNames={documentNames}
          setDocumentNames={setDocumentNames}
          documentDescriptions={documentDescriptions}
          setDocumentDescriptions={setDocumentDescriptions}
          selectedStageForReminder={selectedStageForReminder}
          setSelectedStageForReminder={setSelectedStageForReminder}
          onClose={() => setShowDocumentUpload(false)}
          onFileSelect={handleFileSelect}
          onUpload={handleDocumentUpload}
          uploading={uploadingFile}
          uploadProgress={uploadProgress}
        />



        <PreviewModal
          previewDocument={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />

        <ErrorModal
          show={showErrorModal}
          selectedTask={selectedTask}
          workers={workers}
          user={user}
          errorForm={errorForm}
          setErrorForm={setErrorForm}
          editingErrorId={editingErrorId}
          setEditingErrorId={setEditingErrorId}
          onClose={() => { setEditingErrorId(null); setShowErrorModal(false); }}
          onSuccess={() => loadTasks(showArchive, filters as any)}
          setSelectedTask={setSelectedTask}
        />

        {/* Tasklar jadvali - Mobil versiyada tepada */}
        <div className="order-1 md:order-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
          ) : showArchive ? (
            // Arxiv bo'limida barcha tasklar bitta jadvalda, har sahifada 20 ta (pagination)
            <div>
              <TaskTable tasks={archivePageTasks} branchName='Arxiv' onTaskClick={handleTaskClick} />
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
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                      Oldingi
                    </button>
                    {getPageNumbers(page, archiveTotalPages).map((p: number | string) => (
                      <button
                        key={`archive-page-${p}`}
                        type="button"
                        onClick={() => typeof p === 'number' && setPage(p)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${p === page
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
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${page === archiveTotalPages
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
                <TaskTable tasks={userBranchTasks} branchName={userBranch.name} onTaskClick={handleTaskClick} />
              </div>
            ) : (
              // ADMIN/MANAGER uchun barcha filiallar - dinamik
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-[30px]">
                {Array.isArray(branches) && branches.map((branch, index) => {
                  const branchTasks = tasksByBranch.get(branch.name) || [];
                  return (
                    <div key={branch.id}>
                      <TaskTable tasks={branchTasks} branchName={branch.name} branchColorIndex={index} onTaskClick={handleTaskClick} />
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


