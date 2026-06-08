import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

export interface Stats {
  period: string;
  totalKPI: number;
  completedStages: number;
  tasksAssigned: number;
  totalEarned: number;
  totalPaid: number;
  pending: number;
  legacyDebt: number;
  salaryCurrency: 'USD' | 'UZS';
  payments?: PaymentStat[];
}

export interface PaymentStat {
  id: number;
  earnedAmountUsd: number;
  paidAmountUsd: number;
  paidAmountUzs: number;
  paidCurrency: string;
  paymentDate: string;
  comment: string | null;
  isLegacyPayment: boolean;
}

export interface StageStat {
  stageName: string;
  participationCount: number;
  earnedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  percentage: number;
  tariffUsd?: number;
}

export interface StageStats {
  period: string;
  stageStats: StageStat[];
  totals: {
    totalParticipation: number;
    totalTasks?: number;
    totalEarned: number;
    totalReceived: number;
    totalPending: number;
  };
}

export interface WorkerDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  salary?: number | string;
  branchId?: number | null;
  branch?: { id: number; name: string };
}

export interface ProfileDataHookResult {
  stats: Stats | null;
  stageStats: StageStats | null;
  contributions: { date: string; count: number; level: number }[];
  errorStats: any;
  workerDetail: WorkerDetail | null;
  branches: { id: number; name: string }[];
  loading: boolean;
  stageStatsLoading: boolean;
  errorStatsLoading: boolean;
  reloadAll: () => Promise<void>;
  reloadWorkerDetail: () => Promise<void>;
  reloadStats: () => Promise<void>;
}

export function useProfileData(workerId: number | undefined, period: string, idParam: string | undefined): ProfileDataHookResult {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stageStats, setStageStats] = useState<StageStats | null>(null);
  const [contributions, setContributions] = useState<{ date: string; count: number; level: number }[]>([]);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [stageStatsLoading, setStageStatsLoading] = useState(true);
  const [errorStatsLoading, setErrorStatsLoading] = useState(true);

  // Load branches only once
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await apiClient.get('/branches');
        setBranches(response.data);
      } catch (error) {
        console.error('Error loading branches:', error);
      }
    };
    loadBranches();
  }, []);

  const loadWorkerDetail = async () => {
    if (!workerId || !idParam) return;
    try {
      const response = await apiClient.get(`/users/${workerId}`);
      setWorkerDetail(response.data);
    } catch (error) {
      console.error('Error loading worker detail:', error);
    }
  };

  const loadStats = async () => {
    if (!workerId) return;
    try {
      setLoading(true);
      const response = await apiClient.get(`/workers/${workerId}/stats`, { params: { period } });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStageStats = async () => {
    if (!workerId) return;
    try {
      setStageStatsLoading(true);
      const response = await apiClient.get(`/workers/${workerId}/stage-stats`, { params: { period } });
      setStageStats(response.data);
    } catch (error) {
      console.error('Error loading stage stats:', error);
    } finally {
      setStageStatsLoading(false);
    }
  };

  const loadContributions = async () => {
    if (!workerId) return;
    try {
      const response = await apiClient.get(`/workers/${workerId}/contributions`);
      setContributions(response.data);
    } catch (error) {
      console.error('Error loading contributions:', error);
    }
  };

  const loadErrorStats = async () => {
    if (!workerId) return;
    try {
      setErrorStatsLoading(true);
      const response = await apiClient.get(`/workers/${workerId}/error-stats`, { params: { period } });
      setErrorStats(response.data);
    } catch (error) {
      console.error('Error loading error stats:', error);
    } finally {
      setErrorStatsLoading(false);
    }
  };

  const reloadAll = async () => {
    await Promise.allSettled([
      loadStats(),
      loadStageStats(),
      loadContributions(),
      loadErrorStats(),
      loadWorkerDetail()
    ]);
  };

  useEffect(() => {
    if (workerId) {
      reloadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId, period, idParam]);

  return {
    stats,
    stageStats,
    contributions,
    errorStats,
    workerDetail,
    branches,
    loading,
    stageStatsLoading,
    errorStatsLoading,
    reloadAll,
    reloadWorkerDetail: loadWorkerDetail,
    reloadStats: loadStats
  };
}
