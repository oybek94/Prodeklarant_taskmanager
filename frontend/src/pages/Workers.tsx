import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../utils/useIsMobile';

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
}

const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
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
    role: 'DEKLARANT' as 'ADMIN' | 'MANAGER' | 'DEKLARANT',
    branchId: '',
    salary: '',
  });

  useEffect(() => {
    loadWorkers();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showForm) {
        if (isMobile && (isNewWorkerRoute || editWorkerId)) {
          navigate('/workers');
        } else {
          setShowForm(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm, isMobile, isNewWorkerRoute, editWorkerId, navigate]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      // Use /api/workers endpoint instead of /api/users
      const response = await apiClient.get('/workers');
      if (Array.isArray(response.data)) {
        // Filter to show only DEKLARANT and MANAGER roles (exclude ADMIN)
        setWorkers(response.data.filter((w: any) => w.role === 'DEKLARANT' || w.role === 'MANAGER'));
      } else {
        console.error('Invalid response format:', response.data);
        setWorkers([]);
      }
    } catch (error: any) {
      console.error('Error loading workers:', error);
      setWorkers([]);
      // Show error message to user if it's not a 403 (forbidden)
      if (error.response?.status !== 403) {
        console.warn('Failed to load workers:', error.response?.data || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      await loadWorkers();
    } catch (error: any) {
      console.error('Error saving worker:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Xatolik yuz berdi';
      const errorText = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      alert(errorText);
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setForm({
      name: worker.name,
      password: '',
      role: worker.role as 'ADMIN' | 'MANAGER' | 'DEKLARANT',
      branchId: worker.branch?.id ? worker.branch.id.toString() : '',
      salary: worker.salary ? Number(worker.salary).toString() : '',
    });
    setOpenMenuId(null);
    setShowForm(true);
  };

  useEffect(() => {
    if (!isMobile || !editWorkerId) return;
    const worker = workers.find((w) => w.id === editWorkerId);
    if (worker) {
      handleEdit(worker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, editWorkerId, workers]);

  const handleDelete = async (workerId: number) => {
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
  };

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Workers</h1>
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
            workers.map((worker) => {
              // Calculate experience from createdAt
              const getExperience = () => {
                if (!worker.createdAt) return '0 Years';
                const created = new Date(worker.createdAt);
                const now = new Date();
                const years = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365));
                return `${years} Years`;
              };

              // Get initials for avatar
              const getInitials = () => {
                const names = worker.name.split(' ');
                if (names.length >= 2) {
                  return (names[0][0] + names[1][0]).toUpperCase();
                }
                return worker.name.charAt(0).toUpperCase();
              };

              return (
                <div key={worker.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  {/* Header with avatar, name, role, and ellipsis */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials()}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{worker.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{worker.role}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === worker.id ? null : worker.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <Icon icon="lucide:more-vertical" className="w-5 h-5" />
                      </button>
                      {openMenuId === worker.id && (
                        <div 
                          className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              if (isMobile) {
                                navigate(`/workers/${worker.id}/edit`);
                              } else {
                                handleEdit(worker);
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Icon icon="lucide:pencil" className="w-4 h-4 text-blue-600" />
                            O'zgartirish
                          </button>
                          <button
                            onClick={() => handleDelete(worker.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Icon icon="lucide:trash-2" className="w-4 h-4" />
                            O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team and Experience */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Team</div>
                      <div className="text-sm font-medium text-gray-900">
                        {worker.branch?.name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Experience</div>
                      <div className="text-sm font-medium text-gray-900">
                        {getExperience()}
                      </div>
                    </div>
                  </div>

                  {/* Email and Phone */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Icon icon="lucide:mail" className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{worker.email}</span>
                    </div>
                    {worker.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Icon icon="lucide:phone" className="w-4 h-4 text-gray-400" />
                        <span>{worker.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => navigate(`/workers/${worker.id}`)}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    View Details
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Worker Modal */}
      {showWorkerForm && (
        <div 
          className={isMobile && (isNewWorkerRoute || editWorkerId)
            ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
            : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm'}
          style={isMobile && (isNewWorkerRoute || editWorkerId) ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (isMobile && (isNewWorkerRoute || editWorkerId)) {
                navigate('/workers');
              } else {
                setShowForm(false);
              }
            }
          }}
        >
          <div 
            className={isMobile && (isNewWorkerRoute || editWorkerId)
              ? 'bg-white w-full h-full p-6 overflow-y-auto'
              : 'bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4'}
            style={isMobile && (isNewWorkerRoute || editWorkerId) ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingWorker ? 'Ishchini tahrirlash' : 'Yangi ishchi qo\'shish'}
              </h2>
              <button
                onClick={() => {
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
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ism <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ishchi ismi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parol <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Parol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'MANAGER' | 'DEKLARANT', branchId: e.target.value === 'MANAGER' ? '' : form.branchId })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DEKLARANT">DEKLARANT</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {form.role !== 'MANAGER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={form.role !== ('MANAGER' as any)}
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Filialni tanlang</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oylik maosh
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
