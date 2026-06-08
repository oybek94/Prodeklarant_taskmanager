export interface PaymentReminder {
  clientId: number;
  clientName: string;
  phone: string | null;
  creditType: string;
  creditLimit: number | null;
  dueReason: string;
  creditStartDate: string;
  currentDebt?: number;
  currency?: 'USD' | 'UZS';
}

export interface DashboardStats {
  newTasks: number;
  completedTasks: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  processStats: Array<{ status: string; count: number }>;
  workerActivity: Array<{ userId: number; name: string; totalKPI: number; completedStages: number }>;
  workerCompletionRanking?: {
    weekly: Array<{ userId: number; name: string; completedStages: number; invoiceCount: number; errorCount?: number }>;
    monthly: Array<{ userId: number; name: string; completedStages: number; invoiceCount: number; errorCount?: number }>;
    yearly: Array<{ userId: number; name: string; completedStages: number; invoiceCount: number; errorCount?: number }>;
  };

  financialStats: Array<{ type: string; total: number }>;
  paymentReminders?: PaymentReminder[];
  todayNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  weeklyNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  monthlyNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  yearlyNetProfit?: { usd: number; uzs: number; usdCount: number; uzsCount: number };
  tasksByBranch?: Array<{ branchId: number; branchName: string; count: number }>;
  certifierDebt?: {
    branchId: number;
    branchName: string;
    taskCount: number;
    rates: { st1Rate: number; fitoRate: number; aktRate: number };
    accrued: { st1: number; fito: number; akt: number; total: number };
    paid: { st1: number; fito: number; akt: number; total: number };
    remaining: { st1: number; fito: number; akt: number; total: number };
  } | null;
  workerDebts?: Array<{
    userId: number;
    name: string;
    totalEarnedUsd: number;
    totalPaidUsd: number;
    pendingUsd: number;
  }>;
  yearlyGoalTarget?: number;
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
  };
  previousDateRange?: {
    start: string;
    end: string;
  };
  tasksCompleted: Array<{ date: string }>;
  previousTasksCompleted?: Array<{ date: string }>;
  kpiByWorker: Array<{ userId: number; name: string; total: number }>;
  transactionsByType: Array<{ type: string; date: string; amount: number }>;
}

export interface Task {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  client: { name: string };
  branch: { name: string };
}
