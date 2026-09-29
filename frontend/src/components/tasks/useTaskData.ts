import toast from 'react-hot-toast';
import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import type { Task, TaskDetail, TaskDocument, AiCheck, Client, Branch, TaskStats } from './types';

/**
 * Faol (yakunlanmagan) vazifalar bitta so'rovda to'liq yuklanadi — ular filiallar bo'yicha
 * guruhlanadi va sahifalanmaydi. Server YAKUNLANDI'larni o'zi chiqarib tashlaydi.
 */
const ACTIVE_FETCH_LIMIT = 1000;
/** Excel eksporti uchun arxivdan bir martada olinadigan maksimum (server chegarasi bilan bir xil) */
export const ARCHIVE_EXPORT_LIMIT = 2000;

/** Arxiv so'rovi: qidiruv, filtrlar va sahifalash serverda */
export interface ArchiveQuery {
  page: number;
  limit: number;
  search: string;
  branchId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  hasPsr: string;
}

export interface TaskListQuery {
  status: string;
  clientId: string;
  branchId: string;
  /** Faqat arxiv rejimida */
  archive?: ArchiveQuery;
}

/** GET /tasks query parametrlari */
export function buildTaskListParams(showArchive: boolean, query: TaskListQuery): Record<string, string> {
  const params: Record<string, string> = {};
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') params[key] = String(value);
  };
  if (showArchive) {
    const a = query.archive;
    params.status = 'YAKUNLANDI';
    set('page', a?.page ?? 1);
    set('limit', a?.limit ?? 20);
    set('search', a?.search.trim());
    set('branchId', a?.branchId);
    set('clientId', a?.clientId);
    set('startDate', a?.startDate);
    set('endDate', a?.endDate);
    set('hasPsr', a?.hasPsr);
  } else {
    if (query.status) params.status = query.status;
    else params.excludeCompleted = 'true';
    params.page = '1';
    params.limit = String(ACTIVE_FETCH_LIMIT);
    set('clientId', query.clientId);
    set('branchId', query.branchId);
  }
  return params;
}

/**
 * useTaskData — Tasks sahifasi uchun asosiy data-fetching hook.
 *
 * Barcha API chaqiruvlari, state boshqaruvi va data loading
 * logikasi shu hookda markazlashtirilgan.
 */
export function useTaskData(userRole?: string) {
  // === Core data states ===
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [workers, setWorkers] = useState<{ id: number; name: string; role: string }[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);

  // === Pagination ===
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  // === Selected task detail ===
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  // === Task documents ===
  const [taskDocuments, setTaskDocuments] = useState<TaskDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // === AI Checks ===
  const [aiChecks, setAiChecks] = useState<AiCheck[]>([]);
  const [loadingAiChecks, setLoadingAiChecks] = useState(false);

  // === Document expansion/OCR ===
  const [expandedDocuments, setExpandedDocuments] = useState<Set<number>>(new Set());
  const [documentExtractedTexts, setDocumentExtractedTexts] = useState<Map<number, string>>(new Map());
  const [loadingExtractedTexts, setLoadingExtractedTexts] = useState<Set<number>>(new Set());

  // === Socket ===
  const socket = useSocket();

  // ==========================================
  // Data loading functions
  // ==========================================

  const loadBranches = useCallback(async () => {
    try {
      const response = await apiClient.get('/branches');
      if (Array.isArray(response.data) && response.data.length > 0) {
        setBranches(response.data);
      } else {
        setBranches([
          { id: 1, name: 'Toshkent' },
          { id: 2, name: 'Oltiariq' },
        ]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([
        { id: 1, name: 'Toshkent' },
        { id: 2, name: 'Oltiariq' },
      ]);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await apiClient.get('/clients?selectList=true');
      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      if (userRole === 'ADMIN') {
        const response = await apiClient.get('/users');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      } else {
        const response = await apiClient.get('/workers?forDropdown=true');
        setWorkers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      setWorkers([]);
    }
  }, [userRole]);

  /**
   * Server-side task statistikasi — SQL COUNT so'rovlari bilan tez hisoblash.
   * Client-side calculateStats o'rniga backend /tasks/stats endpointini chaqiradi.
   * Bu pagination dan mustaqil va CPUni yuklamaydi.
   */
  const loadStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/tasks/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading task stats:', error);
      // Xatolik bo'lsa bo'sh stats qo'yamiz
      setStats({
        yearly: { current: 0, previous: 0 },
        monthly: { current: 0, previous: 0 },
        weekly: { current: 0, previous: 0 },
        daily: { current: 0, previous: 0 },
      });
    }
  }, []);

  // Oxirgi so'rov raqami — kechikib kelgan eski javob yangisini ustidan yozmasin
  const tasksRequestSeqRef = useRef(0);
  // Qaysi rejim (arxiv/faol) ro'yxati yuklangan; null — hali hech narsa yuklanmagan
  const loadedArchiveModeRef = useRef<boolean | null>(null);

  const loadTasks = useCallback(async (
    showArchive: boolean,
    query: TaskListQuery
  ) => {
    const seq = ++tasksRequestSeqRef.current;
    // Skeleton faqat rejim almashganda; fondagi yangilashda jadval joyida qoladi
    const isModeChange = loadedArchiveModeRef.current !== showArchive;
    try {
      if (isModeChange) setLoading(true);
      const response = await apiClient.get('/tasks', { params: buildTaskListParams(showArchive, query) });
      if (seq !== tasksRequestSeqRef.current) return;

      const tasksData: Task[] = Array.isArray(response.data?.tasks) ? response.data.tasks : [];
      const pagination = response.data?.pagination as { total: number; totalPages: number } | undefined;
      if (!showArchive && pagination && pagination.total > tasksData.length) {
        console.warn(`[Tasks] ${pagination.total} ta faol vazifadan ${tasksData.length} tasi ko'rsatilmoqda`);
      }
      setTasks(tasksData);
      setTotalPages(Math.max(1, pagination?.totalPages ?? 1));
      setTotalTasks(pagination?.total ?? tasksData.length);
      loadedArchiveModeRef.current = showArchive;
    } catch (error) {
      console.error('Error loading tasks:', error);
      // Fondagi yangilash xatosida ko'rinib turgan ro'yxat o'chirilmaydi
      if (seq === tasksRequestSeqRef.current && isModeChange) {
        setTasks([]);
        setTotalPages(1);
        setTotalTasks(0);
      }
    } finally {
      if (seq === tasksRequestSeqRef.current) setLoading(false);
    }
  }, []);

  const loadTaskDocuments = useCallback(async (taskId: number, silent = false) => {
    try {
      if (!silent) setLoadingDocuments(true);
      const response = await apiClient.get(`/documents/task/${taskId}`);
      setTaskDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading task documents:', error);
      setTaskDocuments([]);
    } finally {
      if (!silent) setLoadingDocuments(false);
    }
  }, []);

  const loadAiChecks = useCallback(async (taskId: number) => {
    try {
      setLoadingAiChecks(true);
      const response = await apiClient.get(`/tasks/${taskId}/ai-checks`);
      setAiChecks(Array.isArray(response.data?.checks) ? response.data.checks : []);
    } catch (error) {
      console.error('Error loading AI checks:', error);
      setAiChecks([]);
    } finally {
      setLoadingAiChecks(false);
    }
  }, []);

  /**
   * Task detail'ni yuklash (modalni ochish uchun).
   * Bosqichlar /tasks/:id javobida keladi — alohida /stages so'rovi kerak emas.
   * detailOnly — faqat vazifaning o'zi (socket yangilanishlari uchun): hujjatlar va AI tekshiruvlari
   * o'z eventlari bilan alohida yangilanadi.
   */
  const loadTaskDetail = useCallback(async (
    taskId: number,
    options?: {
      onLoaded?: (taskData: TaskDetail) => void;
      detailOnly?: boolean;
    }
  ) => {
    try {
      setLoadingTask(true);
      const response = await apiClient.get(`/tasks/${taskId}`);
      const taskData = { ...response.data };
      if (!taskData.stages || taskData.stages.length === 0) {
        taskData.stages = [];
      }
      setSelectedTask(taskData);
      options?.onLoaded?.(taskData);

      if (!options?.detailOnly) {
        Promise.all([
          loadTaskDocuments(taskId),
          loadAiChecks(taskId),
        ]).catch((error) => {
          console.error('Error loading task details:', error);
        });
      }
    } catch (error) {
      console.error('Error loading task detail:', error);
      toast.error("Task ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoadingTask(false);
    }
  }, [loadTaskDocuments, loadAiChecks]);

  const loadExtractedText = useCallback(async (documentId: number, taskId?: number) => {
    const actualTaskId = taskId;
    if (!actualTaskId) return;

    if (documentExtractedTexts.has(documentId)) return;

    try {
      setLoadingExtractedTexts((prev) => new Set(prev).add(documentId));
      const response = await apiClient.get(
        `/tasks/${actualTaskId}/documents/${documentId}/extracted-text`
      );
      const extractedText = response.data.extractedText || '';
      setDocumentExtractedTexts((prev) => {
        const newMap = new Map(prev);
        newMap.set(documentId, extractedText);
        return newMap;
      });
    } catch (error) {
      console.error('Error loading extracted text:', error);
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
  }, [documentExtractedTexts]);

  const toggleDocumentExpansion = useCallback(async (documentId: number, taskId?: number) => {
    const isExpanded = expandedDocuments.has(documentId);

    if (isExpanded) {
      setExpandedDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    } else {
      setExpandedDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.add(documentId);
        return newSet;
      });
      if (!documentExtractedTexts.has(documentId)) {
        await loadExtractedText(documentId, taskId);
      }
    }
  }, [expandedDocuments, documentExtractedTexts, loadExtractedText]);

  // ==========================================
  // Socket.io real-time updates
  // ==========================================
  // Ochiq vazifa kartochkasi — faqat o'zgargan qismi qayta yuklanadi.
  // Ro'yxat yangilanishi alohida: hooks/useTaskSocket.ts
  const selectedTaskId = selectedTask?.id;
  useEffect(() => {
    if (!socket || !selectedTaskId) return;

    const onTaskChanged = (data: { taskId?: number }) => {
      if (data.taskId === selectedTaskId) loadTaskDetail(selectedTaskId, { detailOnly: true });
    };
    const onDocumentsChanged = (data: { taskId: number }) => {
      if (data.taskId === selectedTaskId) loadTaskDocuments(selectedTaskId, true); // silent update
    };
    const onAiCheckCreated = (data: { taskId: number }) => {
      if (data.taskId === selectedTaskId) loadAiChecks(selectedTaskId);
    };

    socket.on('task:updated', onTaskChanged);
    socket.on('task:stageUpdated', onTaskChanged);
    socket.on('task:errorUpdated', onTaskChanged);
    socket.on('taskDocument:created', onDocumentsChanged);
    socket.on('taskDocument:deleted', onDocumentsChanged);
    socket.on('aiCheck:created', onAiCheckCreated);

    return () => {
      socket.off('task:updated', onTaskChanged);
      socket.off('task:stageUpdated', onTaskChanged);
      socket.off('task:errorUpdated', onTaskChanged);
      socket.off('taskDocument:created', onDocumentsChanged);
      socket.off('taskDocument:deleted', onDocumentsChanged);
      socket.off('aiCheck:created', onAiCheckCreated);
    };
  }, [socket, selectedTaskId, loadTaskDetail, loadTaskDocuments, loadAiChecks]);

  return {
    // State
    tasks,
    loading,
    clients,
    branches,
    workers,
    stats,
    page,
    setPage,
    totalPages,
    totalTasks,
    selectedTask,
    setSelectedTask,
    loadingTask,
    setLoadingTask,
    taskDocuments,
    setTaskDocuments,
    loadingDocuments,
    aiChecks,
    loadingAiChecks,
    expandedDocuments,
    documentExtractedTexts,
    loadingExtractedTexts,

    // Loaders
    loadTasks,
    loadClients,
    loadBranches,
    loadWorkers,
    loadTaskDetail,
    loadTaskDocuments,
    loadAiChecks,
    loadExtractedText,
    toggleDocumentExpansion,
    loadStats,
  };
}

