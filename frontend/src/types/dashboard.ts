export interface WorkerRankingRow {
  userId: number;
  name: string;
  completedStages: number;
  invoiceCount: number;
  errorCount?: number;
}

/** GET /dashboard/stats — faqat dashboard ishlatadigan maydonlar */
export interface DashboardStats {
  workerCompletionRanking?: {
    weekly: WorkerRankingRow[];
    monthly: WorkerRankingRow[];
    yearly: WorkerRankingRow[];
  };
  tasksByBranch?: Array<{ branchId: number | null; branchName: string; count: number }>;
  yearlyGoalTarget?: number;
}

/** GET /dashboard/premium-stats */
export interface PremiumStats {
  /** Eng kattalari + ixtiyoriy "Boshqalar" (clientId: null) */
  topClients: Array<{ clientId: number | null; name: string; count: number }>;
  activeTasks: Array<{ name: string; total: number; stages: Array<{ name: string; count: number }> }>;
  githubActivity: Array<{ date: string; count: number }>;
  processTimes: Array<{ name: string; averageMinutes: number }>;
  averageTaskTotalMinutes: number;
}

/** Admin: baholanmagan / o'chirish so'ralgan xato */
export interface DashboardTaskError {
  id: number;
  taskId: number;
  task: { id: number; title: string };
  stageName: string;
  amount: number | string;
  date: string;
  comment: string | null;
  createdBy?: { name: string } | null;
  worker?: { name: string } | null;
}

export interface CompletedSummaryItem {
  count: number;
  deltaPercent: number | null;
  series: { labels: string[]; data: number[] };
}

export interface CompletedSummary {
  today: CompletedSummaryItem;
  week: CompletedSummaryItem;
  month: CompletedSummaryItem;
  year: CompletedSummaryItem;
}

export interface ChartData {
  period: string;
  dateRange?: {
    start: string;
    end: string;
    /** Toshkent kuni "YYYY-MM-DD" */
    startKey?: string;
    endKey?: string;
  };
  previousDateRange?: {
    start: string;
    end: string;
  };
  /** Kun bo'yicha yig'ilgan (YYYY-MM-DD, UTC) — yaratilgan vazifalar soni */
  tasksCompleted: Array<{ date: string; count: number }>;
  previousTasksCompleted?: Array<{ date: string; count: number }>;
}
