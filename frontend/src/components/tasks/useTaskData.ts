import { useState, useCallback } from 'react';
import apiClient from '../../lib/api';
import type { Task, TaskDetail, TaskVersion, Client, Branch, TaskStats } from './types';

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
  const [taskDocuments, setTaskDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // === AI Checks ===
  const [aiChecks, setAiChecks] = useState<any[]>([]);
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

  const calculateStats = useCallback((tasksData: Task[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Previous periods
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(weekStart.getDate() - 1);
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
        return isInRange(taskDate, yearStart, now);
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastYearStart, lastYearEnd);
      }).length,
    };

    const monthly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, monthStart, now);
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastMonthStart, lastMonthEnd);
      }).length,
    };

    const weekly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, weekStart, now);
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastWeekStart, lastWeekEnd);
      }).length,
    };

    const daily = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, today, now);
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, yesterday, yesterday);
      }).length,
    };

    setStats({ yearly, monthly, weekly, daily });
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
        if (!showArchive) calculateStats(tasksData);
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
        if (!showArchive) calculateStats(response.data);
      } else {
        setTasks([]);
        setTotalPages(1);
        setTotalTasks(0);
        if (!showArchive) calculateStats([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
      setTotalPages(1);
      setTotalTasks(0);
      if (!showArchive) calculateStats([]);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

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
      const taskResponse = await apiClient.get(`/tasks/${taskId}`);
      const task = taskResponse.data;
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
      alert("Task ma'lumotlarini yuklashda xatolik");
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
    calculateStats,
  };
}

