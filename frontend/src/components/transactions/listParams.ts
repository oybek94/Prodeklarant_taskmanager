import type { TransactionFilters, TransactionFormData, TransactionPayload } from './types';

export const EMPTY_FILTERS: TransactionFilters = {
  startDate: '', endDate: '', type: '', clientId: '', workerId: '', paymentMethod: '', search: '',
};

export function buildListParams(filters: TransactionFilters, page: number, pageSize: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  (Object.keys(filters) as (keyof TransactionFilters)[]).forEach((key) => {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  });
  return params;
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Object.values(filters).some((v) => v.trim() !== '');
}

export function buildTransactionPayload(
  form: TransactionFormData,
  ctx: { isAdmin: boolean; userId: number | null },
): { ok: true; payload: TransactionPayload } | { ok: false; error: string } {
  const amount = Number(form.amount.replace(/\s+/g, '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Summani kiriting' };

  const payload: TransactionPayload = {
    type: form.type,
    amount,
    currency: form.currency || 'UZS',
    comment: form.comment.trim(),
    date: form.date,
  };
  if (form.paymentMethod) payload.paymentMethod = form.paymentMethod;

  if (!ctx.isAdmin) {
    if (ctx.userId == null) return { ok: false, error: 'Foydalanuvchi aniqlanmadi' };
    return { ok: true, payload: { ...payload, type: 'SALARY', workerId: ctx.userId } };
  }

  if (form.type === 'INCOME') {
    if (!form.clientId) return { ok: false, error: 'Mijozni tanlang' };
    payload.clientId = Number(form.clientId);
  } else if (form.type === 'EXPENSE') {
    if (!form.expenseCategory.trim()) return { ok: false, error: 'Xarajat kategoriyasini tanlang' };
    payload.expenseCategory = form.expenseCategory.trim();
  } else {
    if (!form.workerId) return { ok: false, error: 'Ishchini tanlang' };
    payload.workerId = Number(form.workerId);
  }
  if (form.type !== 'INCOME' && form.virtualCardId) payload.virtualCardId = Number(form.virtualCardId);
  return { ok: true, payload };
}
