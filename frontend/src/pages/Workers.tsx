import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useIsMobile } from '../utils/useIsMobile';
import { usePresence } from '../hooks/usePresence';
import WorkerCard from '../components/workers/WorkerCard';
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
  legacyDebt?: number;
  salaryCurrency?: 'USD' | 'UZS';
}

const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const { onlineUsers } = usePresence();
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
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
        setWorkers(response.data.filter((w: any) => ['DEKLARANT', 'MANAGER', 'SELLER', 'ADMIN'].includes(w.role) && w.active !== false));
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
    setOpenMenuId(null);
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
      setOpenMenuId(null);
      await loadWorkers();
    } catch (error: any) {
      console.error('Error deleting worker:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Xatolik yuz berdi';
      alert(errorMessage);
    }
  }, [loadWorkers]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  return (
    <div className={isMobile ? 'pb-32 px-4' : ''}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Workers</h1>
        <button
          onClick={() => {
            if (isMobile) {
              navigate('/workers/new');
            } else {
              setShowForm(true);
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add New
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              Ishchilar topilmadi
            </div>
          ) : (
            workers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                isOnline={onlineUsers.some(u => u.id === worker.id)}
                openMenuId={openMenuId}
                isMobile={isMobile}
                setOpenMenuId={setOpenMenuId}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

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
