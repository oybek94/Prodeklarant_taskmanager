import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useIsMobile } from '../utils/useIsMobile';
import { usePresence } from '../hooks/usePresence';
import { Icon } from '@iconify/react';
import CurrencyDisplay from '../components/CurrencyDisplay';
import WorkerRow, { ROLE_META, WORKER_GRID_COLS } from '../components/workers/WorkerRow';
import WorkerFormModal from '../components/workers/WorkerFormModal';

interface Worker {
  id: number;
  name: string;
  email: string;
  role: string;
  position?: string;
  salary?: number;
  branch?: { id: number; name: string };
  createdAt?: string;
  phone?: string;
  currentDebt?: number;
  salaryCurrency?: 'USD' | 'UZS';
  active?: boolean;
}

const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const { onlineUsers } = usePresence();
  const [showForm, setShowForm] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isNewWorkerRoute = location.pathname === '/workers/new';
  const editMatch = location.pathname.match(/^\/workers\/(\d+)\/edit$/);
  const editWorkerId = editMatch ? Number(editMatch[1]) : null;
  const showWorkerForm = showForm || (isMobile && isNewWorkerRoute);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    password: '',
    role: 'DEKLARANT' as 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'SELLER',
    branchId: '',
    salary: '',
  });

  const loadWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/workers');
      if (Array.isArray(response.data)) {
        setWorkers(response.data.filter((w: any) => ['DEKLARANT', 'MANAGER', 'SELLER', 'ADMIN'].includes(w.role)));
      } else {
        console.error('Invalid response format:', response.data);
        setWorkers([]);
      }
    } catch (error: any) {
      console.error('Error loading workers:', error);
      setWorkers([]);
      if (error.response?.status !== 403) {
        console.warn('Failed to load workers:', error.response?.data || error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const response = await apiClient.get('/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
    loadBranches();
  }, [loadWorkers, loadBranches]);

  const handleCloseForm = useCallback(() => {
    if (isMobile && (isNewWorkerRoute || editWorkerId)) {
      navigate('/workers');
    } else {
      setShowForm(false);
    }
    setEditingWorker(null);
    setForm({
      name: '',
      password: '',
      role: 'DEKLARANT',
      branchId: '',
      salary: '',
    });
  }, [isMobile, isNewWorkerRoute, editWorkerId, navigate]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showForm) {
        handleCloseForm();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm, handleCloseForm]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWorker) {
        // Update existing worker
        const updateData: any = {
          name: form.name,
          password: form.password,
          role: form.role,
          salary: form.salary ? parseFloat(form.salary) : undefined,
        };
        if (form.branchId) {
          updateData.branchId = parseInt(form.branchId);
        } else if (form.role === 'MANAGER') {
          updateData.branchId = null;
        }
        await apiClient.put(`/users/${editingWorker.id}`, updateData);
      } else {
        // Create new worker
        await apiClient.post('/users', {
          name: form.name,
          password: form.password,
          role: form.role,
          branchId: form.branchId ? parseInt(form.branchId) : undefined,
          salary: form.salary ? parseFloat(form.salary) : undefined,
        });
      }
      handleCloseForm();
      await loadWorkers();
    } catch (error: any) {
      console.error('Error saving worker:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Xatolik yuz berdi';
      const errorText = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      alert(errorText);
    }
  }, [editingWorker, form, handleCloseForm, loadWorkers]);

  const handleEdit = useCallback((worker: Worker) => {
    setEditingWorker(worker);
    setForm({
      name: worker.name,
      password: '',
      role: worker.role as 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'SELLER',
      branchId: worker.branch?.id ? worker.branch.id.toString() : '',
      salary: worker.salary ? Number(worker.salary).toString() : '',
    });
    setShowForm(true);
  }, []);

  useEffect(() => {
    if (!isMobile || !editWorkerId) return;
    const worker = workers.find((w) => w.id === editWorkerId);
    if (worker) {
      handleEdit(worker);
    }
  }, [isMobile, editWorkerId, workers, handleEdit]);

  const handleDelete = useCallback(async (workerId: number) => {
    if (!confirm('Bu ishchini o\'chirishni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi.')) return;

    try {
      await apiClient.delete(`/users/${workerId}`);
      await loadWorkers();
    } catch (error: any) {
      console.error('Error deleting worker:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Xatolik yuz berdi';
      alert(errorMessage);
    }
  }, [loadWorkers]);

  const setWorkerActive = useCallback(async (worker: Worker, active: boolean) => {
    const question = active
      ? `${worker.name} arxivdan qaytarilsinmi? U tizimga qayta kira oladi.`
      : `${worker.name} arxivlansinmi? U ishdan chiqqan deb belgilanadi, tizimga kira olmaydi va asosiy ro'yxatda ko'rinmaydi. Ma'lumotlari saqlanadi.`;
    if (!confirm(question)) return;
    try {
      await apiClient.put(`/users/${worker.id}`, { active });
      await loadWorkers();
    } catch (error: any) {
      console.error('Error updating worker status:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Xatolik yuz berdi';
      alert(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  }, [loadWorkers]);

  const isOnline = (id: number) => onlineUsers.some((u) => u.id === id);
  const activeWorkers = workers.filter((w) => w.active !== false);
  const archivedWorkers = workers.filter((w) => w.active === false);
  const scopeWorkers = showArchived ? archivedWorkers : activeWorkers;
  const onlineCount = activeWorkers.filter((w) => isOnline(w.id)).length;
  const debtors = activeWorkers.filter((w) => (w.currentDebt ?? 0) > 0);
  const debtUzs = debtors.filter((w) => (w.salaryCurrency || 'UZS') === 'UZS').reduce((sum, w) => sum + (w.currentDebt ?? 0), 0);
  const debtUsd = debtors.filter((w) => w.salaryCurrency === 'USD').reduce((sum, w) => sum + (w.currentDebt ?? 0), 0);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleWorkers = scopeWorkers.filter(
    (w) =>
      (roleFilter === 'ALL' || w.role === roleFilter) &&
      (!normalizedQuery || `${w.name} ${w.branch?.name ?? ''}`.toLowerCase().includes(normalizedQuery))
  );

  const summaryItems: { label: string; node: React.ReactNode; tone: string }[] = [
    { label: 'Jami xodimlar', node: <>{activeWorkers.length}</>, tone: 'text-gray-900 dark:text-gray-100' },
    {
      label: 'Hozir onlayn',
      node: (
        <span className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          {onlineCount}
        </span>
      ),
      tone: 'text-emerald-800 dark:text-emerald-300',
    },
    { label: 'Qarzi borlar', node: <>{debtors.length}</>, tone: 'text-orange-800 dark:text-orange-300' },
    {
      label: 'Jami qarz',
      node: (
        <>
          <CurrencyDisplay amount={debtUzs} originalCurrency="UZS" forceOriginal={true} />
          {debtUsd > 0 && (
            <div className="text-base font-bold mt-0.5">
              <CurrencyDisplay amount={debtUsd} originalCurrency="USD" forceOriginal={true} />
            </div>
          )}
        </>
      ),
      tone: 'text-orange-800 dark:text-orange-300',
    },
  ];

  const roleTabs = [
    { id: 'ALL', label: 'Hammasi', count: scopeWorkers.length },
    ...Object.entries(ROLE_META).map(([id, meta]) => ({
      id,
      label: meta.label,
      count: scopeWorkers.filter((w) => w.role === id).length,
    })),
  ];

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${isMobile ? 'pb-32 px-4' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">Jamoa</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Xodimlar</h1>
        </div>
        <button
          onClick={() => {
            if (isMobile) {
              navigate('/workers/new');
            } else {
              setShowForm(true);
            }
          }}
          className="h-11 px-5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold hover:opacity-90 flex items-center gap-2"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5" />
          Yangi xodim
        </button>
      </div>

      {!loading && (
        <div className="flex flex-wrap bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="flex-1 basis-[220px] min-w-0 px-6 py-5 border-r border-b sm:border-b-0 border-gray-100 dark:border-slate-700/60 last:border-r-0"
            >
              <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{item.label}</div>
              <div className={`text-[26px] font-extrabold tracking-tight tabular-nums leading-tight ${item.tone}`}>{item.node}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex-1 min-w-[260px] max-w-sm h-11 px-3.5 flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
          <Icon icon="solar:magnifer-bold-duotone" className="w-[18px] h-[18px] text-gray-400 shrink-0" />
          <input
            type="text"
            aria-label="Qidiruv"
            placeholder="Ism yoki filial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-200"
          />
        </label>
        <div className="flex gap-1 p-1 rounded-xl bg-gray-200/70 dark:bg-slate-800" role="group" aria-label="Holat">
          {([
            { archived: false, label: 'Faol', count: activeWorkers.length },
            { archived: true, label: 'Arxiv', count: archivedWorkers.length },
          ] as const).map((tab) => (
            <button
              key={tab.label}
              onClick={() => { setShowArchived(tab.archived); setRoleFilter('ALL'); }}
              className={`h-9 px-4 rounded-[9px] text-[13px] font-bold transition-colors ${showArchived === tab.archived
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
              {tab.label} <span className="font-semibold opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-200/70 dark:bg-slate-800">
          {roleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`h-9 px-4 rounded-[9px] text-[13px] font-bold transition-colors ${roleFilter === tab.id
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
              {tab.label} <span className="font-semibold opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className={`grid ${WORKER_GRID_COLS} gap-4 px-6 py-3.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400`}>
              <div>Xodim</div>
              <div>Lavozim</div>
              <div>Filial</div>
              <div>Tajriba</div>
              <div className="text-right">Joriy qarz</div>
              <div />
            </div>

            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse h-[73px] border-b border-gray-100 dark:border-slate-700/60 bg-gray-50/60 dark:bg-slate-800/60" />
              ))
            ) : visibleWorkers.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <Icon icon="solar:users-group-rounded-bold-duotone" className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">{showArchived ? "Arxivda xodim yo'q" : "Ishchilar topilmadi"}</p>
              </div>
            ) : (
              visibleWorkers.map((worker) => (
                <WorkerRow
                  key={worker.id}
                  worker={worker}
                  isOnline={isOnline(worker.id)}
                  isMobile={isMobile}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleArchive={(w) => setWorkerActive(w, false)}
                  handleRestore={(w) => setWorkerActive(w, true)}
                />
              ))
            )}
          </div>
        </div>
        {!loading && scopeWorkers.length > 0 && (
          <div className="px-6 py-3.5 text-[13px] text-gray-500 dark:text-gray-400">
            {visibleWorkers.length} / {scopeWorkers.length} xodim ko'rsatilmoqda
          </div>
        )}
      </div>

      {/* Add/Edit Worker Modal */}
      <WorkerFormModal
        showForm={showForm}
        isMobile={isMobile}
        isNewWorkerRoute={isNewWorkerRoute}
        editWorkerId={editWorkerId}
        editingWorker={editingWorker}
        form={form}
        setForm={setForm}
        branches={branches}
        handleSubmit={handleSubmit}
        handleClose={handleCloseForm}
      />
    </div>
  );
};

export default Workers;
