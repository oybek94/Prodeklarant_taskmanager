import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardStats, ChartData, Task, CompletedSummary } from '../types/dashboard';
import type { UserMedal } from '../types/medals';

export const useDashboardStats = (period: 'weekly' | 'monthly' | 'yearly') => {
  const { user } = useAuth();
  const socket = useSocket();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [premiumStats, setPremiumStats] = useState<any>(null);
  const [completedSummary, setCompletedSummary] = useState<CompletedSummary | null>(null);
  const [loadingCompletedSummary, setLoadingCompletedSummary] = useState(true);

  const [achievements, setAchievements] = useState<any[]>([]);
  const [allMedals, setAllMedals] = useState<UserMedal[]>([]);
  const [myMedals, setMyMedals] = useState<UserMedal[]>([]);
  const [unratedErrors, setUnratedErrors] = useState<any[]>([]);
  const [pendingDeleteErrors, setPendingDeleteErrors] = useState<any[]>([]);

  const loadUnratedErrors = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const response = await apiClient.get('/tasks/errors/unrated');
      setUnratedErrors(response.data);
    } catch (error) {
      console.error('Error loading unrated errors:', error);
    }
  };

  const loadPendingDeleteErrors = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const response = await apiClient.get('/tasks/errors/pending-delete');
      setPendingDeleteErrors(response.data);
    } catch (error) {
      console.error('Error loading pending delete errors:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await apiClient.get('/auth/me/achievements');
      setAchievements(response.data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadMedals = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        apiClient.get('/medals/all'),
        apiClient.get('/medals/my-medals')
      ]);
      setAllMedals(allRes.data);
      setMyMedals(myRes.data);
    } catch (error) {
      console.error('Error loading medals:', error);
    }
  };

  const loadCompletedSummary = async () => {
    try {
      setLoadingCompletedSummary(true);
      const response = await apiClient.get('/dashboard/completed-summary');
      setCompletedSummary(response.data);
    } catch (error) {
      console.error('Error loading completed summary:', error);
      setCompletedSummary(null);
    } finally {
      setLoadingCompletedSummary(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      setLoadingExchangeRate(true);
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const todayStr = todayUTC.toISOString().split('T')[0];

      try {
        const fetchResponse = await apiClient.post('/finance/exchange-rates/fetch');
        if (fetchResponse.data?.rate) {
          const rate = parseFloat(fetchResponse.data.rate);
          setExchangeRate(rate);
          return;
        }
      } catch (fetchError: any) {
        console.warn('[ExchangeRate] initial fetch failed, falling back:', fetchError?.message);
      }

      const response = await apiClient.get(`/finance/exchange-rates/for-date?date=${todayStr}`).catch((error) => {
        if (error.response?.status === 404) {
          return error.response;
        }
        throw error;
      });
      if (response?.data?.rate !== undefined && response?.data?.rate !== null) {
        const rate = parseFloat(response.data.rate);

        if (response.data.fallback) {
          try {
            const fetchResponse = await apiClient.post('/finance/exchange-rates/fetch');
            if (fetchResponse.data?.rate) {
              const newRate = parseFloat(fetchResponse.data.rate);
              setExchangeRate(newRate);
              return;
            }
          } catch (fetchError: any) {
            console.warn('[ExchangeRate] fallback fetch failed:', fetchError?.message);
          }
        }

        setExchangeRate(rate);
      } else {
        console.warn('[Dashboard] No rate in response:', response?.data);
      }
    } catch (error: any) {
      console.error('[Dashboard] Error loading exchange rate:', error);
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const loadStats = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setStatsError(null);
      const [response, premiumResponse] = await Promise.all([
        apiClient.get('/dashboard/stats', { signal }),
        apiClient.get('/dashboard/premium-stats', { signal }).catch(() => null)
      ]);

      if (premiumResponse && premiumResponse.data) {
        setPremiumStats(premiumResponse.data);
      }
      if (response.status >= 400 || response.data?.error) {
        const errorMessage = response.data?.error || `Dashboard statistikasi yuklanmadi (status: ${response.status})`;
        setStatsError(errorMessage);
        setStats({
          newTasks: 0,
          completedTasks: 0,
          tasksByStatus: [],
          processStats: [],
          workerActivity: [],
          financialStats: [],
          tasksByBranch: [],
          certifierDebt: null,
          workerDebts: [],
        });
        return;
      }

      const statsData = {
        ...response.data,
        tasksByBranch: Array.isArray(response.data?.tasksByBranch)
          ? response.data.tasksByBranch
          : [],
      };

      setStats(statsData);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') return;
      console.error('Error loading stats:', error);
      const errorMessage =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message ||
        'Dashboard statistikasi yuklanmadi';
      setStatsError(errorMessage);
      setStats({
        newTasks: 0,
        completedTasks: 0,
        tasksByStatus: [],
        processStats: [],
        workerActivity: [],
        financialStats: [],
        tasksByBranch: [],
        certifierDebt: null,
        workerDebts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (signal?: AbortSignal) => {
    try {
      const params: any = { period };
      const response = await apiClient.get('/dashboard/charts', { params, signal });
      setChartData(response.data);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') return;
      console.error('Error loading chart data:', error);
    }
  };

  const loadRecentTasks = async (signal?: AbortSignal) => {
    try {
      const response = await apiClient.get('/tasks?status=JARAYONDA', { signal });
      setTasks(response.data.slice(0, 5));
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') return;
      console.error('Error loading tasks:', error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadStats(controller.signal);
    loadChartData(controller.signal);
    loadRecentTasks(controller.signal);
    loadExchangeRate();
    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    loadCompletedSummary();
    loadAchievements();
    loadMedals();
    if (user?.role === 'ADMIN') {
      loadUnratedErrors();
      loadPendingDeleteErrors();
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const triggerUpdate = () => {
      loadStats();
      loadChartData();
      loadCompletedSummary();
      loadRecentTasks();
    };

    socket.on('task:created', triggerUpdate);
    socket.on('task:updated', triggerUpdate);
    socket.on('task:deleted', triggerUpdate);
    socket.on('task:stageUpdated', triggerUpdate);
    socket.on('invoice:saved', triggerUpdate);
    socket.on('invoice:deleted', triggerUpdate);

    return () => {
      socket.off('task:created', triggerUpdate);
      socket.off('task:updated', triggerUpdate);
      socket.off('task:deleted', triggerUpdate);
      socket.off('task:stageUpdated', triggerUpdate);
      socket.off('invoice:saved', triggerUpdate);
      socket.off('invoice:deleted', triggerUpdate);
    };
  }, [socket, period, user]); // added user because triggerUpdate might use it

  useEffect(() => {
    if (!socket) return;

    const handleBounty = (data: any) => {
      loadAchievements();
      loadUnratedErrors();
    };

    const handleQuality = (data: any) => {
      loadAchievements();
    };

    const handleAdminError = (data: any) => {
      if (user?.role === 'ADMIN') loadUnratedErrors();
    };

    socket.on('user:bounty_awarded', handleBounty);
    socket.on('user:quality_award', handleQuality);
    socket.on('admin_new_error_report', handleAdminError);

    return () => {
      socket.off('user:bounty_awarded', handleBounty);
      socket.off('user:quality_award', handleQuality);
      socket.off('admin_new_error_report', handleAdminError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user]);

  return {
    stats,
    statsError,
    chartData,
    tasks,
    loading,
    exchangeRate,
    loadingExchangeRate,
    premiumStats,
    completedSummary,
    loadingCompletedSummary,
    achievements,
    allMedals,
    myMedals,
    unratedErrors,
    loadUnratedErrors,
    pendingDeleteErrors,
    loadPendingDeleteErrors
  };
};
