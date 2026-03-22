import toast from 'react-hot-toast';
import { useState, useCallback } from 'react';
import apiClient from '../../lib/api';
import type { Task, TaskDetail, TaskVersion, TaskDocument, AiCheck, Client, Branch, TaskStats } from './types';

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

  // === Task versions ===
  const [taskVersions, setTaskVersions] = useState<TaskVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // === Document expansion/OCR ===
  const [expandedDocuments, setExpandedDocuments] = useState<Set<number>>(new Set());
  const [documentExtractedTexts, setDocumentExtractedTexts] = useState<Map<number, string>>(new Map());
  const [loadingExtractedTexts, setLoadingExtractedTexts] = useState<Set<number>>(new Set());

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
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      if (userRole === 'ADMIN') {
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

  const loadTasks = useCallback(async (
    showArchive: boolean,
    filters: { status: string; clientId: string; branchId: string }
  ) => {
    try {
      setLoading(true);
      const params: any = {};
      if (showArchive) {
        params.status = 'YAKUNLANDI';
      } else {
        if (filters.status) params.status = filters.status;
        params.page = '1';
        params.limit = '5000';
      }
      if (filters.clientId) params.clientId = filters.clientId;
      if (filters.branchId) params.branchId = filters.branchId;

      const response = await apiClient.get('/tasks', { params });

      if (response.data.pagination) {
        const { tasks: tasksData } = response.data;
        let filteredTasks = tasksData;
        if (showArchive) {
          filteredTasks = tasksData.filter((task: Task) => task.status === 'YAKUNLANDI');
        } else {
          filteredTasks = tasksData.filter((task: Task) => task.status !== 'YAKUNLANDI');
        }
        setTasks(filteredTasks);
        setTotalPages(1);
        setTotalTasks(filteredTasks.length);
        if (!showArchive) loadStats();
      } else if (Array.isArray(response.data)) {
        let filteredTasks = response.data;
        if (showArchive) {
          filteredTasks = response.data.filter((task: Task) => task.status === 'YAKUNLANDI');
        } else {
          filteredTasks = response.data.filter((task: Task) => task.status !== 'YAKUNLANDI');
        }
        setTasks(filteredTasks);
        setTotalPages(1);
        setTotalTasks(filteredTasks.length);
        if (!showArchive) loadStats();
      } else {
        setTasks([]);
        setTotalPages(1);
        setTotalTasks(0);
        if (!showArchive) loadStats();
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
      setTotalPages(1);
      setTotalTasks(0);
      if (!showArchive) loadStats();
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const loadTaskStages = useCallback(async (taskId: number) => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}/stages`);
      setSelectedTask((prevTask) => {
        if (!prevTask || prevTask.id !== taskId) return prevTask;
        return { ...prevTask, stages: response.data };
      });
    } catch (error) {
      console.error('Error loading task stages:', error);
      setSelectedTask((prevTask) => {
        if (!prevTask || prevTask.id !== taskId) return prevTask;
        return { ...prevTask, stages: [] };
      });
    }
  }, []);

  const loadTaskVersions = useCallback(async (taskId: number) => {
    try {
      setLoadingVersions(true);
      const response = await apiClient.get(`/tasks/${taskId}/versions`);
      setTaskVersions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading task versions:', error);
      setTaskVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  const loadTaskDocuments = useCallback(async (taskId: number) => {
    try {
      setLoadingDocuments(true);
      const response = await apiClient.get(`/documents/task/${taskId}`);
      setTaskDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading task documents:', error);
      setTaskDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  const loadAiChecks = useCallback(async (taskId: number) => {
    try {
      setLoadingAiChecks(true);
      const response = await apiClient.get(`/tasks/${taskId}/ai-checks`);
      if (response.data.success && Array.isArray(response.data.checks)) {
        setAiChecks(response.data.checks);
      } else {
        setAiChecks([]);
      }
    } catch (error) {
      console.error('Error loading AI checks:', error);
      setAiChecks([]);
    } finally {
      setLoadingAiChecks(false);
    }
  }, []);

  /** Task detail'ni yuklash (modalni ochish uchun) */
  const loadTaskDetail = useCallback(async (
    taskId: number,
    callbacks?: {
      onLoaded?: (taskData: TaskDetail) => void;
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
      callbacks?.onLoaded?.(taskData);

      // Load parallel
      Promise.all([
        loadTaskStages(taskId),
        loadTaskVersions(taskId),
        loadTaskDocuments(taskId),
      ]).catch((error) => {
        console.error('Error loading task details:', error);
      });
    } catch (error) {
      console.error('Error loading task detail:', error);
      toast.error("Task ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoadingTask(false);
    }
  }, [loadTaskStages, loadTaskVersions, loadTaskDocuments]);

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
    taskVersions,
    setTaskVersions,
    loadingVersions,
    setLoadingVersions,
    expandedDocuments,
    documentExtractedTexts,
    loadingExtractedTexts,

    // Loaders
    loadTasks,
    loadClients,
    loadBranches,
    loadWorkers,
    loadTaskDetail,
    loadTaskStages,
    loadTaskVersions,
    loadTaskDocuments,
    loadAiChecks,
    loadExtractedText,
    toggleDocumentExpansion,
    loadStats,
  };
}

