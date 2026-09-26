import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TransactionsHeader } from '../components/transactions/TransactionsHeader';
import { TransactionsFilterPanel } from '../components/transactions/TransactionsFilterPanel';
import { TransactionsStatsCards } from '../components/transactions/TransactionsStatsCards';
import { TransactionsTable } from '../components/transactions/TransactionsTable';
import { TransactionsMobileList } from '../components/transactions/TransactionsMobileList';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { useTransactionsList } from '../components/transactions/useTransactionsList';
import { buildTransactionPayload, EMPTY_FILTERS } from '../components/transactions/listParams';
import { shouldOpenEditFromRoute } from '../components/transactions/deepLink';
import { canEditTransaction, formatAmountInput, localIsoDate } from '../components/transactions/formHelpers';
import type { Client, MonthlyStats, Transaction, TransactionFilters, TransactionFormData, User } from '../components/transactions/types';

const PAGE_SIZE = 15;
const DEFAULT_CATEGORIES = ['Transport', 'Ofis', 'Boshqa', 'ST-1', 'FITO', 'AKT'];

function emptyForm(isAdmin: boolean, userId: number | null): TransactionFormData {
  return {
    type: isAdmin ? 'INCOME' : 'SALARY', amount: '', currency: 'UZS', exchangeRate: '', paymentMethod: 'CASH',
    comment: '', date: localIsoDate(), clientId: '', workerId: isAdmin || userId == null ? '' : String(userId),
    expenseCategory: '', virtualCardId: '',
  };
}

function errorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof data === 'string' ? data : 'Xatolik yuz berdi';
}

const Transactions = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const userId = user?.id ?? null;

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const list = useTransactionsList(filters, page, PAGE_SIZE);

  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);

  const [form, setForm] = useState<TransactionFormData>(() => emptyForm(isAdmin, userId));
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handledEditId = useRef<number | null>(null);
  const isNewRoute = location.pathname === '/transactions/new';
  const editMatch = location.pathname.match(/^\/transactions\/(\d+)\/edit$/);
  const editRouteId = editMatch ? Number(editMatch[1]) : null;

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await apiClient.get('/transactions/stats/monthly');
      setStats(data?.accounting ?? data ?? null);
    } catch {
      setStats(null);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
    apiClient.get('/clients?selectList=true').then(({ data }) => setClients(Array.isArray(data) ? data : [])).catch(() => setClients([]));
    apiClient.get('/workers?forDropdown=true')
      .then(({ data }) => setWorkers(Array.isArray(data) ? data.filter((u: { role?: string }) => u.role === 'DEKLARANT' || u.role === 'ADMIN' || u.role === 'MANAGER') : []))
      .catch(() => setWorkers([]));
  }, [isAdmin, loadStats]);

  const expenseCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    list.items.forEach((t) => { const c = t.expenseCategory?.trim(); if (c) set.add(c); });
    return [...set];
  }, [list.items]);

  const changeFilter = useCallback((key: keyof TransactionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);
  const resetFilters = useCallback(() => { setFilters(EMPTY_FILTERS); setPage(1); }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    setFormError(null);
    setForm(emptyForm(isAdmin, userId));
    if (isMobile) navigate('/transactions/new'); else setFormOpen(true);
  }, [isAdmin, userId, isMobile, navigate]);

  const openEdit = useCallback((t: Transaction) => {
    setEditing(t);
    setFormError(null);
    setForm({
      type: t.type, amount: formatAmountInput(String(t.amount)), currency: 'UZS', exchangeRate: '',
      paymentMethod: t.paymentMethod ?? '', comment: t.comment ?? '',
      date: localIsoDate(new Date(t.date)),
      clientId: t.client?.id ? String(t.client.id) : '', workerId: t.worker?.id ? String(t.worker.id) : '',
      expenseCategory: t.expenseCategory ?? '', virtualCardId: t.virtualCardId ? String(t.virtualCardId) : '',
    });
    if (isMobile) {
      handledEditId.current = t.id;
      navigate(`/transactions/${t.id}/edit`);
    } else {
      setFormOpen(true);
    }
  }, [isMobile, navigate]);

  // Mobil tahrirlash havolasi to'g'ridan ochilsa — bir marta (yopilganda qayta ochilmasin)
  useEffect(() => {
    if (editRouteId === null) { handledEditId.current = null; return; }
    if (!shouldOpenEditFromRoute({ isMobile, editRouteId, handledId: handledEditId.current })) return;
    const t = list.items.find((x) => x.id === editRouteId);
    if (!t) return;
    handledEditId.current = editRouteId;
    if (editing?.id !== editRouteId) openEdit(t);
  }, [isMobile, editRouteId, editing, list.items, openEdit]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    if (isMobile && (isNewRoute || editRouteId)) navigate('/transactions');
  }, [isMobile, isNewRoute, editRouteId, navigate]);

  const refresh = useCallback(() => { list.reload(); void loadStats(); }, [list, loadStats]);

  const submit = useCallback(async () => {
    const built = buildTransactionPayload(form, { isAdmin, userId });
    if (!built.ok) { setFormError(built.error); return; }
    setFormError(null);
    setSaving(true);
    try {
      const { data } = editing
        ? await apiClient.put(`/transactions/${editing.id}`, built.payload)
        : await apiClient.post('/transactions', built.payload);
      if (data?.workerPaymentWarning) toast.error(data.workerPaymentWarning, { duration: 8000 });
      else toast.success(editing ? 'Saqlandi' : "Qo'shildi");
      closeForm();
      refresh();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [form, isAdmin, userId, editing, closeForm, refresh]);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/transactions/${toDelete.id}`);
      toast.success("O'chirildi");
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }, [toDelete, refresh]);

  const canEdit = useCallback((t: Transaction) => canEditTransaction(t, isAdmin), [isAdmin]);
  const canDelete = useCallback((t: Transaction) => {
    if (isAdmin) return true;
    if (userId == null || t.type !== 'SALARY' || t.worker?.id !== userId || !t.createdAt) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(t.createdAt) >= startOfToday;
  }, [isAdmin, userId]);

  const formVisible = formOpen || (isMobile && (isNewRoute || (!!editRouteId && !!editing)));

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 pb-24 sm:px-6">
      <TransactionsHeader isAdmin={isAdmin} onNew={openNew} />
      {isAdmin && stats?.income && <TransactionsStatsCards stats={stats} />}
      <TransactionsFilterPanel filters={filters} onChange={changeFilter} onReset={resetFilters} isAdmin={isAdmin} workers={workers} clients={clients} />

      {isMobile ? (
        <TransactionsMobileList items={list.items} loading={list.loading} canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={setToDelete} />
      ) : (
        <TransactionsTable
          items={list.items} loading={list.loading} total={list.total} page={page} totalPages={list.totalPages} pageSize={PAGE_SIZE}
          canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={setToDelete} onPageChange={setPage}
        />
      )}
      {isMobile && list.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40">Oldingi</button>
          <span className="tabular-nums">{page} / {list.totalPages}</span>
          <button type="button" disabled={page >= list.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40">Keyingi</button>
        </div>
      )}

      <TransactionFormModal
        open={formVisible}
        fullScreen={isMobile}
        isEditing={!!editing}
        isAdmin={isAdmin}
        currentUserName={user?.name ?? ''}
        form={form}
        onFormChange={(patch) => { setFormError(null); setForm((prev) => ({ ...prev, ...patch })); }}
        clients={clients}
        workers={workers}
        expenseCategories={expenseCategories}
        saving={saving}
        error={formError}
        onSubmit={submit}
        onClose={closeForm}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Tranzaksiyani o'chirish"
        message="Bu yozuv butunlay o'chiriladi. Davom etasizmi?"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default Transactions;
