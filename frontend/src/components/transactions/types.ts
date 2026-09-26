export type TransactionType = 'INCOME' | 'EXPENSE' | 'SALARY';
export type PaymentMethod = 'CASH' | 'CARD';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number | string;
  currency: string;
  paymentMethod?: PaymentMethod | null;
  comment?: string | null;
  date: string;
  createdAt?: string;
  client?: { id: number; name: string } | null;
  worker?: { id: number; name: string } | null;
  expenseCategory?: string | null;
  virtualCardId?: number | null;
}

export interface Client { id: number; name: string }
export interface User { id: number; name: string }

export interface MonthlyStats {
  currency?: string;
  income: { current: number; change: number };
  expense: { current: number; change: number };
  net: { current: number; change: number };
}

export interface TransactionFilters {
  startDate: string;
  endDate: string;
  type: '' | TransactionType;
  clientId: string;
  workerId: string;
  paymentMethod: '' | PaymentMethod;
  search: string;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  currency: 'USD' | 'UZS';
  exchangeRate: string;
  paymentMethod: '' | PaymentMethod;
  comment: string;
  date: string;
  clientId: string;
  workerId: string;
  expenseCategory: string;
  virtualCardId: string;
}

export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  currency: 'USD' | 'UZS';
  paymentMethod?: PaymentMethod;
  comment: string;
  date: string;
  clientId?: number;
  workerId?: number;
  expenseCategory?: string;
  virtualCardId?: number;
}
