import type { Transaction, TransactionType } from './types';

/** 1 250 000 — bo'shliq bilan, kasrsiz */
export function formatSom(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const TYPE_META: Record<TransactionType, { label: string; sign: '+' | '−'; tone: 'income' | 'expense' | 'salary' }> = {
  INCOME: { label: 'Kirim', sign: '+', tone: 'income' },
  EXPENSE: { label: 'Chiqim', sign: '−', tone: 'expense' },
  SALARY: { label: 'Ish haqi', sign: '−', tone: 'salary' },
};

export const TONE_CLASSES: Record<'income' | 'expense' | 'salary', { dot: string; amount: string }> = {
  income: { dot: 'bg-emerald-500', amount: 'text-emerald-600' },
  expense: { dot: 'bg-rose-500', amount: 'text-rose-600' },
  salary: { dot: 'bg-blue-500', amount: 'text-gray-900' },
};

export function counterpartyOf(t: Transaction): string {
  if (t.type === 'INCOME') return t.client?.name || '—';
  if (t.type === 'SALARY') return t.worker?.name || '—';
  return t.expenseCategory?.trim() || '—';
}

export const PAYMENT_LABEL: Record<'CASH' | 'CARD', string> = { CASH: 'Naqd', CARD: 'Karta' };
