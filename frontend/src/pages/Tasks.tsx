import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { StatsCardsSkeleton, TaskTableSkeleton, TaskDetailSkeleton } from '../components/tasks/Skeletons';
import TaskTable, { calculateTotalDuration } from '../components/tasks/TaskTable';
import ArchiveFiltersPanel from '../components/tasks/ArchiveFiltersPanel';
import type { ArchiveFiltersState, ReportColumnKey } from '../components/tasks/ArchiveFiltersPanel';
import { REPORT_COLUMNS } from '../components/tasks/ArchiveFiltersPanel';
import { useTaskModals } from '../components/tasks/useTaskModals';
import { useTaskActions } from '../components/tasks/useTaskActions';
import {
  handleTelegramClick as handleTelegramClickHelper,
  formatInvoiceExtractedText,
  getDealAmountDisplay, getDealAmountBaseDisplay, getBranchPaymentsDisplay,
  getPsrAmount, formatBxmAmount as formatBxmAmountHelper, formatBxmAmountInSum as formatBxmAmountInSumHelper,
} from '../components/tasks/taskBusinessHelpers';

import type {
  Task, TaskStage, KpiLog, TaskError, TaskDetail,
  TaskVersion, Client, Branch, TaskStats, TasksProps,
} from '../components/tasks/types';

const Tasks: React.FC<TasksProps> = ({ isModalMode = false, modalTaskId, onCloseModal }) => {
  const { downloadFile, getPreviewBlobUrl } = useFileHelpers();
  // Pagination state
  const limit = 50; // Har bir sahifada 50 ta task
  const archiveLimit = 20; // Arxivda har sahifada 20 ta task

  // === Modal state hook — barcha 30+ useState'lar shu hookda ===
  const {
    showForm, setShowForm,
    showTaskModal, setShowTaskModal,
    showEditModal, setShowEditModal,
    showBXMModal, setShowBXMModal,
    bxmMultiplier, setBxmMultiplier,
    currentBxmUsd, setCurrentBxmUsd,
    currentBxmUzs, setCurrentBxmUzs,
    afterHoursDeclaration, setAfterHoursDeclaration,
    selectedStageForReminder, setSelectedStageForReminder,
    showFileUploadModal, setShowFileUploadModal,
    fileUploadFile, setFileUploadFile,
    fileUploadName, setFileUploadName,
    fileUploadStageName, setFileUploadStageName,
    uploadingFile, setUploadingFile,
    uploadProgress, setUploadProgress,
    showDocumentUpload, setShowDocumentUpload,
    uploadFiles, setUploadFiles,
    documentNames, setDocumentNames,
    documentDescriptions, setDocumentDescriptions,
    showErrorModal, setShowErrorModal,
    editingErrorId, setEditingErrorId,
    errorForm, setErrorForm,
    showSendEmailModal, setShowSendEmailModal,
    sendEmailForm, setSendEmailForm,
    sendingEmail, setSendingEmail,
    sendEmailError, setSendEmailError,
    previewDocument, setPreviewDocument,
    showFinancialReport, setShowFinancialReport,
    showVersions, setShowVersions,
    updatingStage, setUpdatingStage,
  } = useTaskModals();
  const { user } = useAuth();
  const {
    tasks, loading, clients, branches, workers, stats,
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

  // Modal mode: Invoices sahifasidan status bosilganda avtomatik task detail yuklash
  useEffect(() => {
    if (isModalMode && modalTaskId) {
      loadTaskDetail(modalTaskId, {
        onLoaded: (taskData) => {
          setAfterHoursDeclaration(Boolean(taskData.afterHoursDeclaration));
          setShowTaskModal(true);
        }
      });
    }
  }, [isModalMode, modalTaskId]);

  // Modal mode: modal yopilganda parent komponentga xabar berish  
  const modalWasOpenRef = useRef(false);
  useEffect(() => {
    if (isModalMode && showTaskModal) {
      modalWasOpenRef.current = true;
    }
    if (isModalMode && !showTaskModal && modalWasOpenRef.current) {
      modalWasOpenRef.current = false;
      onCloseModal?.();
    }
  }, [isModalMode, showTaskModal]);

  // Modal mode: modal ochilguncha loading overlay sifatida render qilinadi
  // ESLATMA: Early return qilib bo'lmaydi - React hooks tartibi buziladi
  // Buning o'rniga asosiy JSX return'da shartli render qilamiz

  // === State deklaratsiyalar (useTaskActions hookdan OLDIN bo'lishi kerak) ===
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
    branchId: '',
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
  const [reportLoading, setReportLoading] = useState(false);

  const isArchiveRoute = location.pathname.startsWith('/tasks/archive');
  const isArchiveFiltersRoute = location.pathname === '/tasks/archive/filters';
  const isNewTaskRoute = location.pathname === '/tasks/new';
  const editTaskMatch = location.pathname.match(/^\/tasks\/(\d+)\/edit$/);
  const editTaskId = editTaskMatch ? Number(editTaskMatch[1]) : null;
  const showTaskForm = showForm || (isMobile && isNewTaskRoute);
  const showEditTaskForm = showEditModal || (isMobile && !!editTaskId);
  const showArchiveFiltersPanel = showArchiveFilters || (isMobile && isArchiveFiltersRoute);

  // === useTaskActions hook ===
  const taskActions = useTaskActions({
    modals: {
      showForm, setShowForm, showTaskModal, setShowTaskModal,
      showEditModal, setShowEditModal, showBXMModal, setShowBXMModal,
      bxmMultiplier, setBxmMultiplier, currentBxmUsd, setCurrentBxmUsd,
      currentBxmUzs, setCurrentBxmUzs, afterHoursDeclaration, setAfterHoursDeclaration,
      selectedStageForReminder, setSelectedStageForReminder,
      showFileUploadModal, setShowFileUploadModal,
      fileUploadFile, setFileUploadFile, fileUploadName, setFileUploadName,
      fileUploadStageName, setFileUploadStageName,
      uploadingFile, setUploadingFile, uploadProgress, setUploadProgress,
      showDocumentUpload, setShowDocumentUpload,
      uploadFiles, setUploadFiles, documentNames, setDocumentNames,
      documentDescriptions, setDocumentDescriptions,
      showErrorModal, setShowErrorModal, editingErrorId, setEditingErrorId,
      errorForm, setErrorForm,
      showSendEmailModal, setShowSendEmailModal,
      sendEmailForm, setSendEmailForm, sendingEmail, setSendingEmail,
      sendEmailError, setSendEmailError, previewDocument, setPreviewDocument,
      showFinancialReport, setShowFinancialReport,
      showVersions, setShowVersions, updatingStage, setUpdatingStage,
      resetFileUpload: () => { setShowFileUploadModal(false); setFileUploadFile(null); setFileUploadName(''); setFileUploadStageName(''); },
      resetDocumentUpload: () => { setUploadFiles([]); setDocumentNames([]); setDocumentDescriptions([]); setShowDocumentUpload(false); },
      resetBXMModal: () => { setShowBXMModal(false); setBxmMultiplier('1.5'); setCurrentBxmUsd(34.4); setCurrentBxmUzs(412000); setAfterHoursDeclaration(false); },
    },
    selectedTask, setSelectedTask,
    showArchive, filters: filters as any,
    loadTaskDetail, loadTaskDocuments, loadTasks,
    user: user as any, branches: branches as any, isMobile,
    isNewTaskRoute, isArchiveRoute, editTaskId, navigate,
  });
  const {
    handleStageClick, handleStageToggle, updateStageToReady,
    handleBXMEdit, handleBXMConfirm,
    handleFileUpload, handleDocumentUpload, handleFileSelect,
    openPreview, handleDeleteDocument, downloadDocument,
    downloadStickerPng, handleAfterHoursDeclarationChange,
    handleOpenSendEmailModal, handleSendTaskEmail,
    handleSubmit: handleSubmitAction, handleEditSubmit: handleEditSubmitAction,
  } = taskActions;

  const handleTelegramClick = async () => {
    if (!selectedTask) return;
    await handleTelegramClickHelper(selectedTask, setSelectedTask, branches);
  };

  const formatBxmAmount = (multiplier: number) =>
    formatBxmAmountHelper(multiplier, currentBxmUsd, currentBxmUzs, selectedTask?.client);

  const formatBxmAmountInSum = (multiplier: number) =>
    formatBxmAmountInSumHelper(multiplier, currentBxmUzs);



  // downloadStickerPng => useTaskActions hookdan keladi

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
    if (isModalMode) {
      loadClients();
      loadBranches();
      loadWorkers();
      return;
    }
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

  // handleFileUpload..formatInvoiceExtractedText => useTaskActions/taskBusinessHelpers





  // handleStageClick..formatBxmAmountInSum => useTaskActions hookdan
  const handleSubmit = async (e: React.FormEvent) => {
    const resetForm = () => {
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      setForm({ title: '', clientId: '', branchId: oltiariqBranch?.id.toString() || '', comments: '', hasPsr: false, afterHoursPayer: 'CLIENT', driverPhone: '' });
    };
    await handleSubmitAction(e, form, resetForm);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    await handleEditSubmitAction(e, editForm);
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
      toast.error('Eksport qilish uchun ma\'lumotlar yo\'q');
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

  // Export Archive Report — backenddan invoice ma'lumotlarini olib, tanlangan ustunlar bo'yicha Excel yaratish
  const exportArchiveReport = async (selectedColumns: Record<ReportColumnKey, boolean>) => {
    try {
      setReportLoading(true);

      // Joriy filtrlarni query parametrlariga aylantirish
      const params = new URLSearchParams();
      if (archiveFilters.branchId) params.append('branchId', archiveFilters.branchId);
      if (archiveFilters.clientId) params.append('clientId', archiveFilters.clientId);
      if (archiveFilters.startDate) params.append('startDate', archiveFilters.startDate);
      if (archiveFilters.endDate) params.append('endDate', archiveFilters.endDate);
      if (archiveFilters.hasPsr) params.append('hasPsr', archiveFilters.hasPsr);
      if (archiveSearchQuery.trim()) params.append('search', archiveSearchQuery.trim());

      const response = await apiClient.get(`/tasks/archive-report?${params.toString()}`);
      const reportData = response.data;

      if (!Array.isArray(reportData) || reportData.length === 0) {
        toast.error('Hisobot uchun ma\'lumot topilmadi (invoice mavjud taslar yo\'q)');
        return;
      }

      // Tanlangan ustunlar bo'yicha ma'lumotlarni tayyorlash
      let activeColumns = (Object.entries(selectedColumns) as [ReportColumnKey, boolean][])
        .filter(([, v]) => v)
        .map(([key]) => key);
        
      if (activeColumns.includes('invoiceDate')) {
        activeColumns = ['invoiceDate', ...activeColumns.filter(c => c !== 'invoiceDate')];
      }

      const excelData = reportData.map((row: any) => {
        const obj: Record<string, unknown> = {};
        for (const key of activeColumns) {
          const label = REPORT_COLUMNS[key];
          if (key === 'totalAmount') {
            obj[label] = row.totalAmount != null ? Number(row.totalAmount) : 0;
          } else if (key === 'invoiceDate') {
            obj[label] = row[key] ? formatDate(row[key]) : '';
          } else {
            obj[label] = row[key] || '';
          }
        }
        return obj;
      });

      // Excel yaratish
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hisobot');

      // Ustun kengliklarini o'rnatish
      const colWidths = activeColumns.map((key) => {
        if (key === 'productNames') return { wch: 50 };
        if (key === 'sellerName' || key === 'buyerName') return { wch: 30 };
        if (key === 'customsAddress' || key === 'deliveryTerms') return { wch: 25 };
        if (key === 'totalAmount') return { wch: 18 };
        return { wch: 20 };
      });
      ws['!cols'] = colWidths;

      // Fayl nomi
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `Arxiv_Hisobot_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Hisobot yuklab olindi (${reportData.length} ta yozuv)`);
    } catch (error: any) {
      console.error('Error generating archive report:', error);
      toast.error(error?.response?.data?.error || 'Hisobot yaratishda xatolik yuz berdi');
    } finally {
      setReportLoading(false);
    }
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
    <div className={isModalMode ? "" : "max-w-[1920px] mx-auto px-2 sm:px-4 space-y-6 sm:space-y-8 font-sans pb-24"}>
      {/* Modal mode: task detail yuklanguncha loading overlay */}
      {isModalMode && !showTaskModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseModal?.(); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
            <TaskDetailSkeleton />
          </div>
        </div>
      )}
      {!isModalMode && (
        <div className="contents">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Icon icon="lucide:layout-list" className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Vazifalar</h1>
          </div>
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => {
                if (isMobile) {
                  navigate('/tasks');
                } else {
                  navigate('/tasks');
                  setShowArchive(false);
                }
              }}
              className={`relative px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2.5 ${!showArchive
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                }`}
            >
              <Icon icon="lucide:list-todo" className={`w-4.5 h-4.5 transition-colors ${!showArchive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
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
              className={`relative px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center gap-2.5 ${showArchive
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                }`}
            >
              <Icon icon="lucide:archive" className={`w-4.5 h-4.5 transition-colors ${showArchive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
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
                className="relative p-2 bg-emerald-500 dark:bg-emerald-600/80 text-white rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-sm hover:shadow z-10"
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
                className={`relative p-2 bg-blue-500 dark:bg-slate-700 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-slate-600 transition-all shadow-sm hover:shadow z-10 ${showArchiveFilters ? 'opacity-0 pointer-events-none' : ''
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
                  onGenerateReport={exportArchiveReport}
                  reportLoading={reportLoading}
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
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Icon icon="lucide:plus-circle" className="w-5 h-5 flex-shrink-0" />
              Yangi vazifa
            </button>
          )}
      </div>
      </div>
      </div>
      )}

      {/* Statistika kartlari — faqat faol ishlar tabda */}
      {!isModalMode && !showArchive && (
        stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {([
            { label: 'Yillik', icon: 'lucide:calendar', data: stats.yearly, bgIcon: 'bg-indigo-100 dark:bg-indigo-900/30', textIcon: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Oylik', icon: 'lucide:calendar-days', data: stats.monthly, bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30', textIcon: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Haftalik', icon: 'lucide:calendar-range', data: stats.weekly, bgIcon: 'bg-amber-100 dark:bg-amber-900/30', textIcon: 'text-amber-600 dark:text-amber-400' },
            { label: 'Bugungi', icon: 'lucide:calendar-clock', data: stats.daily, bgIcon: 'bg-rose-100 dark:bg-rose-900/30', textIcon: 'text-rose-600 dark:text-rose-400' },
          ] as const).map(({ label, icon, data, bgIcon, textIcon }) => {
            const change = data.previous > 0
              ? Math.round(((data.current - data.previous) / data.previous) * 100)
              : data.current > 0 ? 100 : 0;
            const isPositive = change >= 0;
            return (
              <div
                key={label}
                className="relative overflow-hidden bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgIcon}`}>
                    <Icon icon={icon} className={`w-4.5 h-4.5 ${textIcon}`} />
                  </div>
                  {data.previous > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {isPositive ? '↑' : '↓'} {Math.abs(change)}%
                    </span>
                  )}
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{data.current}</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{label} vazifalar</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Oldingi: {data.previous}</div>
              </div>
            );
          })}
        </div>
        ) : (
          <StatsCardsSkeleton />
        )
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
                  toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
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
            <TaskTableSkeleton rows={6} />
          ) : showArchive ? (
            // Arxiv bo'limida barcha tasklar bitta jadvalda, har sahifada 20 ta (pagination)
            <div>
              <TaskTable tasks={archivePageTasks} branchName='Arxiv' onTaskClick={handleTaskClick} />
              {!loading && archiveTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Jami <span className="font-bold text-gray-900 dark:text-gray-100">{archiveTotalTasks}</span> ta task,{' '}
                    <span className="font-bold text-gray-900 dark:text-gray-100">{page}</span>/{archiveTotalPages} sahifa
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-1.5 ${page === 1
                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-500 dark:bg-slate-700 text-white hover:bg-indigo-600 dark:hover:bg-slate-600'
                        }`}
                    >
                      <Icon icon="lucide:chevron-left" className="w-4.5 h-4.5" />
                      Oldingi
                    </button>
                    {getPageNumbers(page, archiveTotalPages).map((p: number | string) => (
                      <button
                        key={`archive-page-${p}`}
                        type="button"
                        onClick={() => typeof p === 'number' && setPage(p)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${p === page
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(archiveTotalPages, p + 1))}
                      disabled={page === archiveTotalPages}
                      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-1.5 ${page === archiveTotalPages
                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-500 dark:bg-slate-700 text-white hover:bg-indigo-600 dark:hover:bg-slate-600'
                        }`}
                    >
                      Keyingi
                      <Icon icon="lucide:chevron-right" className="w-4.5 h-4.5" />
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
                {Array.isArray(branches) && 
                  [...branches]
                    .sort((a, b) => {
                      if (!isMobile) return 0; // Desktopda tartibni buzmaymiz
                      const tasksA = tasksByBranch.get(a.name)?.length || 0;
                      const tasksB = tasksByBranch.get(b.name)?.length || 0;
                      return tasksB - tasksA; // Ishi ko'pini tepaga chiqaramiz
                    })
                    .map((branch, index) => {
                      const branchTasks = tasksByBranch.get(branch.name) || [];
                      return (
                        <div key={branch.id}>
                          <TaskTable tasks={branchTasks} branchName={branch.name} branchColorIndex={index} onTaskClick={handleTaskClick} />
                        </div>
                      );
                    })
                }
              </div>
            )
          )}
        </div>
      </div>

    </div>
  );
};

export default Tasks;


