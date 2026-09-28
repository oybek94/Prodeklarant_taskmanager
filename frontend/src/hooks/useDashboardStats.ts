import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../lib/api';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardStats, ChartData, CompletedSummary, PremiumStats, DashboardTaskError } from '../types/dashboard';
import type { UserMedal } from '../types/medals';

/** Socket hodisalari ketma-ket kelganda (bitta amal bir nechta event chiqaradi) bitta yangilash */
const SOCKET_REFRESH_DEBOUNCE_MS = 1500;

const EMPTY_STATS: DashboardStats = {
  workerCompletionRanking: { weekly: [], monthly: [], yearly: [] },
  tasksByBranch: [],
};

const isAbort = (error: unknown) => {
  const name = (error as { name?: string } | null)?.name;
  return name === 'CanceledError' || name === 'AbortError';
};

export const useDashboardStats = (period: 'weekly' | 'monthly' | 'yearly') => {
  const { user } = useAuth();
  const socket = useSocket();
  const isAdmin = user?.role === 'ADMIN';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const [premiumStats, setPremiumStats] = useState<PremiumStats | null>(null);
  const [completedSummary, setCompletedSummary] = useState<CompletedSummary | null>(null);
  const [loadingCompletedSummary, setLoadingCompletedSummary] = useState(true);

  const [allMedals, setAllMedals] = useState<UserMedal[]>([]);
  const [unratedErrors, setUnratedErrors] = useState<DashboardTaskError[]>([]);
  const [pendingDeleteErrors, setPendingDeleteErrors] = useState<DashboardTaskError[]>([]);

  // Socket orqali yangilanadigan davr — effekt qayta obuna bo'lmasligi uchun ref
  const periodRef = useRef(period);
  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  const loadUnratedErrors = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await apiClient.get('/tasks/errors/unrated');
      setUnratedErrors(response.data);
    } catch (error) {
      console.error('Error loading unrated errors:', error);
    }
  }, [isAdmin]);

  const loadPendingDeleteErrors = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await apiClient.get('/tasks/errors/pending-delete');
      setPendingDeleteErrors(response.data);
    } catch (error) {
      console.error('Error loading pending delete errors:', error);
    }
  }, [isAdmin]);

  const loadMedals = useCallback(async () => {
    try {
      const response = await apiClient.get('/medals/all');
      setAllMedals(response.data);
    } catch (error) {
      console.error('Error loading medals:', error);
    }
  }, []);

  /** silent=true — fondagi yangilash: spinner ko'rsatilmaydi, eski ma'lumot turadi */
  const loadCompletedSummary = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingCompletedSummary(true);
      const response = await apiClient.get('/dashboard/completed-summary');
      setCompletedSummary(response.data);
    } catch (error) {
      console.error('Error loading completed summary:', error);
      if (!silent) setCompletedSummary(null);
    } finally {
      setLoadingCompletedSummary(false);
    }
  }, []);

  const loadStats = useCallback(async (silent = false, signal?: AbortSignal) => {
    try {
      if (!silent) setLoading(true);
      setStatsError(null);
      const [response, premiumResponse] = await Promise.all([
        apiClient.get('/dashboard/stats', { signal }),
        apiClient.get('/dashboard/premium-stats', { signal }).catch((error: unknown) => {
          if (isAbort(error)) throw error;
          return null;
        }),
      ]);

      if (premiumResponse?.data) {
        setPremiumStats(premiumResponse.data);
      }
      if (response.status >= 400 || response.data?.error) {
        setStatsError(response.data?.error || `Dashboard statistikasi yuklanmadi (status: ${response.status})`);
        setStats(EMPTY_STATS);
        return;
      }

      setStats({
        ...response.data,
        tasksByBranch: Array.isArray(response.data?.tasksByBranch) ? response.data.tasksByBranch : [],
      });
    } catch (error: unknown) {
      if (isAbort(error)) return;
      console.error('Error loading stats:', error);
      const err = error as { response?: { data?: { details?: string; error?: string } }; message?: string };
      setStatsError(
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err?.message ||
        'Dashboard statistikasi yuklanmadi'
      );
      if (!silent) setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChartData = useCallback(async (chartPeriod: typeof period, signal?: AbortSignal) => {
    try {
      const response = await apiClient.get('/dashboard/charts', { params: { period: chartPeriod }, signal });
      setChartData(response.data);
    } catch (error: unknown) {
      if (isAbort(error)) return;
      console.error('Error loading chart data:', error);
    }
  }, []);

  // Davrga bog'liq bo'lmagan ma'lumotlar — bir marta
  useEffect(() => {
    const controller = new AbortController();
    loadStats(false, controller.signal);
    loadCompletedSummary();
    loadMedals();
    return () => controller.abort();
  }, [loadStats, loadCompletedSummary, loadMedals]);

  // Grafik — davr o'zgarganda faqat u qayta yuklanadi
  useEffect(() => {
    const controller = new AbortController();
    loadChartData(period, controller.signal);
    return () => controller.abort();
  }, [period, loadChartData]);

  useEffect(() => {
    loadUnratedErrors();
    loadPendingDeleteErrors();
  }, [loadUnratedErrors, loadPendingDeleteErrors]);

  useEffect(() => {
    if (!socket) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const triggerUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        loadStats(true);
        loadChartData(periodRef.current);
        loadCompletedSummary(true);
      }, SOCKET_REFRESH_DEBOUNCE_MS);
    };

    const events = ['task:created', 'task:updated', 'task:deleted', 'task:stageUpdated', 'invoice:saved', 'invoice:deleted'];
    events.forEach((event) => socket.on(event, triggerUpdate));

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => socket.off(event, triggerUpdate));
    };
  }, [socket, loadStats, loadChartData, loadCompletedSummary]);

  useEffect(() => {
    if (!socket || !isAdmin) return;

    socket.on('user:bounty_awarded', loadUnratedErrors);
    socket.on('admin_new_error_report', loadUnratedErrors);

    return () => {
      socket.off('user:bounty_awarded', loadUnratedErrors);
      socket.off('admin_new_error_report', loadUnratedErrors);
    };
  }, [socket, isAdmin, loadUnratedErrors]);

  return {
    stats,
    statsError,
    chartData,
    loading,
    premiumStats,
    completedSummary,
    loadingCompletedSummary,
    allMedals,
    unratedErrors,
    loadUnratedErrors,
    pendingDeleteErrors,
    loadPendingDeleteErrors,
  };
};
