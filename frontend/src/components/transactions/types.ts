export interface Transaction {
  id: number;
  type: 'INCOME' | 'EXPENSE' | 'SALARY';
  amount: number;
  currency: string;
  paymentMethod?: 'CASH' | 'CARD';
  comment?: string;
  date: string;
  client?: { id: number; name: string };
  worker?: { id: number; name: string };
  expenseCategory?: string;
  virtualCardId?: number;
}

export interface Client {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
}

export interface MonthlyStats {
  currency?: string;
  income: { current: number; change: number };
  expense: { current: number; change: number };
  net: { current: number; change: number };
}

export interface WorkerStats {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
}

export interface PreviousYearDebt {
  totalEarned: number;
  totalPaid: number;
  balance: number;
}

export interface TransactionFilters {
  startDate: string;
  endDate: string;
  type: string;
  clientId: string;
  workerId: string;
  paymentMethod: string;
  search: string;
}

export interface TransactionFormData {
  type: 'INCOME' | 'EXPENSE' | 'SALARY';
  amount: string;
  currency: 'USD' | 'UZS';
  exchangeRate: string;
  paymentMethod: '' | 'CASH' | 'CARD';
  comment: string;
  date: string;
  clientId: string;
  workerId: string;
  expenseCategory: string;
  virtualCardId: string;
  isLegacyPayment: boolean;
}

export interface PreviousYearDebtFormData {
  workerId: string;
  totalEarned: string;
  totalPaid: string;
  year: string;
  comment: string;
}
