import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Task {
  id: number;
  title: string;
  status: string;
  comments?: string;
  createdAt: string;
  client: { id: number; name: string };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
}

interface TaskStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  startedAt?: string;
  completedAt?: string;
  durationMin?: number;
  assignedTo?: { id: number; name: string };
}

interface TaskDetail {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  driverPhone?: string;
  createdAt: string;
  client: { id: number; name: string };
  branch: { id: number; name: string };
  stages: TaskStage[];
}

interface Client {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedStageForReminder, setSelectedStageForReminder] = useState<TaskStage | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    clientId: '',
    branchId: '',
    comments: '',
    hasPsr: false,
    driverPhone: '',
  });
  const [editForm, setEditForm] = useState({
    title: '',
    clientId: '',
    branchId: '',
    comments: '',
    hasPsr: false,
    driverPhone: '',
  });
  const [filters] = useState({
    status: '',
    clientId: '',
  });

  useEffect(() => {
    loadTasks();
    loadClients();
    loadBranches();
  }, []);

  // Set default values when branches are loaded
  useEffect(() => {
    if (branches.length > 0) {
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      if (oltiariqBranch && !form.branchId) {
        setForm((prev) => ({ ...prev, branchId: oltiariqBranch.id.toString() }));
      }
    }
  }, [branches.length]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showReminderModal) {
          setShowReminderModal(false);
          setSelectedStageForReminder(null);
        } else if (showEditModal) {
          setShowEditModal(false);
        } else if (showTaskModal) {
          setShowTaskModal(false);
          setSelectedTask(null);
        } else if (showForm) {
          setShowForm(false);
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm, showTaskModal, showEditModal, showReminderModal]);

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/tasks');
      const uniqueBranches = Array.from(
        new Map(
          response.data.map((task: Task) => [task.branch.id, task.branch])
        ).values()
      );
      setBranches(uniqueBranches.length > 0 ? uniqueBranches : [
        { id: 1, name: 'Toshkent' },
        { id: 2, name: 'Oltiariq' },
      ]);
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([
        { id: 1, name: 'Toshkent' },
        { id: 2, name: 'Oltiariq' },
      ]);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.clientId) params.clientId = filters.clientId;

      const response = await apiClient.get('/tasks', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetail = async (taskId: number) => {
    try {
      setLoadingTask(true);
      const response = await apiClient.get(`/tasks/${taskId}`);
      setSelectedTask(response.data);
      setShowTaskModal(true);
    } catch (error) {
      console.error('Error loading task detail:', error);
      alert('Task ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoadingTask(false);
    }
  };

  const getReminderMessage = (stageName: string): string => {
    const reminders: { [key: string]: string } = {
      'Invoys': 'ESLATMA!!!\n\nInvoys raqam va sana\nRastamojka joyi\nUsloviya postavi\nAvtomobil raqami\nMaxsulotlar mijoz bergan malumotlar bilan bir xilmi?',
      'Deklaratsiya': 'ESLATMA!!!\n\nAvtoraqam\nUsloviya postavki\nva boshqalarni tekshirdingizmi',
      'Fito': 'ESLATMA!!!\n\nJonatuvchi va sotib oluvchi\nAvtoraqam\nPechat va imzolarni TEKSHIRDINGIZMI?',
      'ST': 'ESLATMA!!!\n\nKorxona malumotlari\nSotib oluvchi mamlakat\nMaxsulotlar\nPechat va imzolar TO\'G\'RILIGINI TEKSHIRDINGIZMI?',
      'TIR-SMR': 'ESLATMA!!!\n\nAvtomobil raqami\nMaxsulotlar mijoz bergan malumotlar bir xilligi\nTIR-SMR raqamlari togri yozilganini TEKSHIRDINGIZMI?',
      'Tekshirish': 'ESLATMA!!!\n\nEng asosiy ishni qilyapsiz iltimos erinchoqlik qilmang va barcha ma\'lumotlarni yaxshilab kozdan kechiring.\n\nMijoz bergan malumotlarga biz tayyorlagan xujjatlar togri kelishini tekshirib chiqing!!!',
      'Topshirish': 'Markirovka togriligini\nPoddonlarga pechat bosilganligini tekshirdingizmi?',
    };
    return reminders[stageName] || 'ESLATMA!!!\n\nJarayonni bajarishdan oldin barcha ma\'lumotlarni tekshiring.';
  };

  const handleStageClick = (stage: TaskStage) => {
    if (!user) {
      alert('Login qiling');
      return;
    }
    if (stage.status === 'BOSHLANMAGAN') {
      // Show reminder modal
      setSelectedStageForReminder(stage);
      setShowReminderModal(true);
    } else {
      // If already completed, allow unchecking
      handleStageToggle(stage.id, stage.status);
    }
  };

  const handleConfirmStage = async (confirmed: boolean) => {
    if (!selectedStageForReminder || !selectedTask) return;
    
    setShowReminderModal(false);
    
    if (confirmed) {
      try {
        setUpdatingStage(selectedStageForReminder.id);
        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 300));
        await apiClient.patch(`/tasks/${selectedTask.id}/stages/${selectedStageForReminder.id}`, {
          status: 'TAYYOR',
        });
        await loadTaskDetail(selectedTask.id);
        await loadTasks();
      } catch (error: any) {
        console.error('Error updating stage:', error);
        alert(error.response?.data?.error || 'Xatolik yuz berdi');
      } finally {
        setUpdatingStage(null);
        setSelectedStageForReminder(null);
      }
    } else {
      setSelectedStageForReminder(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTask) return;
    
    // Validation
    if (!editForm.branchId) {
      alert('Filialni tanlang');
      return;
    }
    
    try {
      await apiClient.patch(`/tasks/${selectedTask.id}`, {
        title: editForm.title,
        clientId: parseInt(editForm.clientId),
        branchId: parseInt(editForm.branchId),
        comments: editForm.comments || undefined,
        hasPsr: editForm.hasPsr,
        driverPhone: editForm.driverPhone || undefined,
      });
      setShowEditModal(false);
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleStageToggle = async (stageId: number, currentStatus: string) => {
    if (!selectedTask || !user) {
      alert('Login qiling');
      return;
    }
    try {
      setUpdatingStage(stageId);
      const newStatus = currentStatus === 'BOSHLANMAGAN' ? 'TAYYOR' : 'BOSHLANMAGAN';
      await apiClient.patch(`/tasks/${selectedTask.id}/stages/${stageId}`, {
        status: newStatus,
      });
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
    } catch (error: any) {
      console.error('Error updating stage:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.branchId) {
      alert('Filialni tanlang');
      return;
    }
    
    try {
      await apiClient.post('/tasks', {
        title: form.title,
        clientId: parseInt(form.clientId),
        branchId: parseInt(form.branchId),
        comments: form.comments || undefined,
        hasPsr: form.hasPsr,
        driverPhone: form.driverPhone || undefined,
      });
      setShowForm(false);
      const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
      setForm({ 
        title: '', 
        clientId: '', 
        branchId: oltiariqBranch?.id.toString() || '', 
        comments: '', 
        hasPsr: false, 
        driverPhone: '' 
      });
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}; ${hours}:${minutes}`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours} soat ${mins} daqiqa`;
    return `${mins} daqiqa`;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'TAYYOR':
        return { label: 'Tugallandi', color: 'bg-green-100 text-green-800' };
      case 'JARAYONDA':
        return { label: 'Jarayonda', color: 'bg-yellow-100 text-yellow-800' };
      case 'BOSHLANMAGAN':
      default:
        return { label: 'Boshlanmagan', color: 'bg-red-100 text-red-800' };
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-yellow-200',
      'bg-pink-200',
      'bg-purple-200',
      'bg-blue-200',
      'bg-green-200',
      'bg-indigo-200',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderTaskTable = (branchTasks: Task[], branchName: string) => {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-purple-800 px-6 py-3">
          <h2 className="text-lg font-semibold text-white">{branchName} filiali</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-purple-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-purple-900">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-purple-900">
                  Klient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-purple-900">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-purple-900">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-purple-900">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branchTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400 bg-purple-50">
                    Ma'lumotlar yo'q
                  </td>
                </tr>
              ) : (
                branchTasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => loadTaskDetail(task.id)}
                      className={`hover:bg-purple-100 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-purple-50' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-b border-gray-200">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200">
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full ${getAvatarColor(
                              task.client.name
                            )} flex items-center justify-center text-xs font-semibold text-gray-700 mr-2`}
                          >
                            {getInitials(task.client.name)}
                          </div>
                          <span className="text-xs">{task.client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 border-b border-gray-200">
                        {formatDate(task.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-b border-gray-200">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 border-b border-gray-200 max-w-[200px] min-w-[150px]">
                        <div className="truncate" title={task.comments || undefined}>
                          {task.comments || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Separate tasks by branch
  const toshkentTasks = tasks.filter((task) => task.branch.name === 'Toshkent');
  const oltiariqTasks = tasks.filter((task) => task.branch.name === 'Oltiariq');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Task
        </button>
      </div>

      {/* Modal for Add Task */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Yangi task</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                {/* 1. Task name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Task name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none text-sm"
                    placeholder="Type here"
                  />
                </div>

                {/* 2. Mijoz */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mijoz <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    required
                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm"
                  >
                    <option value="">Tanlang...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filial - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const toshkentBranch = branches.find((b) => b.name === 'Toshkent');
                        if (toshkentBranch) setForm({ ...form, branchId: toshkentBranch.id.toString() });
                      }}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.branchId === branches.find((b) => b.name === 'Toshkent')?.id.toString()
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Toshkent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
                        if (oltiariqBranch) setForm({ ...form, branchId: oltiariqBranch.id.toString() });
                      }}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.branchId === branches.find((b) => b.name === 'Oltiariq')?.id.toString()
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Oltiariq
                    </button>
                  </div>
                </div>

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PSR <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasPsr: true })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.hasPsr === true
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasPsr: false })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.hasPsr === false
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Yo'q
                    </button>
                  </div>
                </div>

                {/* 5. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Sho'pir tel raqami
                  </label>
                  <input
                    type="tel"
                    value={form.driverPhone}
                    onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none text-sm"
                    placeholder="+998901234567"
                  />
                </div>

                {/* 6. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </label>
                  <textarea
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none text-sm resize-none"
                    rows={4}
                    placeholder="Type here"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Task Detail */}
      {showTaskModal && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskModal(false);
              setSelectedTask(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{selectedTask.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedTask) {
                      setEditForm({
                        title: selectedTask.title,
                        clientId: selectedTask.client.id.toString(),
                        branchId: selectedTask.branch.id.toString(),
                        comments: selectedTask.comments || '',
                        hasPsr: selectedTask.hasPsr || false,
                        driverPhone: selectedTask.driverPhone || '',
                      });
                      setShowEditModal(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  O'zgartirish
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Bu taskni o\'chirishni xohlaysizmi?')) {
                      try {
                        await apiClient.delete(`/tasks/${selectedTask.id}`);
                        setShowTaskModal(false);
                        setSelectedTask(null);
                        await loadTasks();
                      } catch (error: any) {
                        alert(error.response?.data?.error || 'Xatolik yuz berdi');
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  O'chirish
                </button>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Task Info */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Mijoz</div>
                <div className="font-medium">{selectedTask.client.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Filial</div>
                <div className="font-medium">{selectedTask.branch.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusInfo(selectedTask.status).color}`}>
                    {getStatusInfo(selectedTask.status).label}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Yaratilgan</div>
                <div className="font-medium text-sm">{formatDate(selectedTask.createdAt)}</div>
              </div>
            </div>

            {/* PSR Information */}
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-sm font-semibold text-purple-800">PSR Ma'lumotlari</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">PSR:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    selectedTask.hasPsr 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.hasPsr ? 'Bor' : 'Yo\'q'}
                  </span>
                </div>
                {selectedTask.driverPhone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-600">Sho'pir tel raqami:</span>
                    <span className="text-sm font-medium text-gray-800">{selectedTask.driverPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedTask.comments && (
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Izohlar
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedTask.comments}</p>
                </div>
              </div>
            )}

            {/* Stages - Checklist */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Jarayonlar</h3>
              <div className="space-y-2">
                {selectedTask.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition ${
                      stage.status === 'TAYYOR' ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div
                        onClick={() => !updatingStage && handleStageClick(stage)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                          stage.status === 'TAYYOR'
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 bg-white hover:border-green-400'
                        } ${updatingStage === stage.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          transition: stage.status === 'TAYYOR' 
                            ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                            : 'all 0.3s ease-in-out',
                          transform: stage.status === 'TAYYOR' ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: stage.status === 'TAYYOR' 
                            ? '0 4px 12px rgba(34, 197, 94, 0.4)' 
                            : 'none',
                          animation: stage.status === 'TAYYOR' && updatingStage !== stage.id
                            ? 'checkboxPulse 0.6s ease-out'
                            : 'none'
                        }}
                      >
                        {stage.status === 'TAYYOR' && (
                          <svg 
                            className="w-4 h-4 text-white" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={3} 
                              d="M5 13l4 4L19 7"
                              style={{
                                strokeDasharray: 20,
                                strokeDashoffset: 0,
                                animation: 'checkmarkDraw 0.5s ease-in-out forwards'
                              }}
                            />
                          </svg>
                        )}
                      </div>
                      <label
                        className={`ml-3 text-sm font-medium cursor-pointer flex-1 transition-all duration-300 ${
                          stage.status === 'TAYYOR'
                            ? 'line-through text-gray-400 opacity-60'
                            : 'text-gray-900'
                        }`}
                        onClick={() => !updatingStage && handleStageClick(stage)}
                      >
                        {stage.name}
                      </label>
                    </div>
                    {stage.status === 'TAYYOR' && (
                      <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                        {stage.assignedTo && (
                          <span className="font-medium text-gray-700">
                            ({stage.assignedTo.name})
                          </span>
                        )}{' '}
                        {stage.completedAt ? formatDate(stage.completedAt) : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reminder Modal */}
            {showReminderModal && selectedStageForReminder && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
                style={{
                  animation: 'backdropFadeIn 0.3s ease-out'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowReminderModal(false);
                    setSelectedStageForReminder(null);
                  }
                }}
              >
                <div 
                  className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
                  style={{
                    animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">ESLATMA!!!</h3>
                  <div className="mb-6 whitespace-pre-line text-sm text-gray-700">
                    {getReminderMessage(selectedStageForReminder.name)}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirmStage(true)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
                    >
                      Ha
                    </button>
                    <button
                      onClick={() => handleConfirmStage(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
                    >
                      Yo'q
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Edit Task */}
      {showEditModal && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            animation: 'backdropFadeIn 0.3s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
            style={{
              animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Taskni tahrirlash</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-3">
                {/* 1. Task name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Task name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none text-sm"
                    placeholder="Type here"
                  />
                </div>

                {/* 2. Mijoz */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mijoz <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.clientId}
                    onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                    required
                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm"
                  >
                    <option value="">Tanlang...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filial - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Filial <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const toshkentBranch = branches.find((b) => b.name === 'Toshkent');
                        if (toshkentBranch) setEditForm({ ...editForm, branchId: toshkentBranch.id.toString() });
                      }}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.branchId === branches.find((b) => b.name === 'Toshkent')?.id.toString()
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Toshkent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const oltiariqBranch = branches.find((b) => b.name === 'Oltiariq');
                        if (oltiariqBranch) setEditForm({ ...editForm, branchId: oltiariqBranch.id.toString() });
                      }}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.branchId === branches.find((b) => b.name === 'Oltiariq')?.id.toString()
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Oltiariq
                    </button>
                  </div>
                </div>

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PSR <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, hasPsr: true })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.hasPsr === true
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, hasPsr: false })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.hasPsr === false
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      Yo'q
                    </button>
                  </div>
                </div>

                {/* 5. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Sho'pir tel raqami
                  </label>
                  <input
                    type="tel"
                    value={editForm.driverPhone}
                    onChange={(e) => setEditForm({ ...editForm, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none text-sm"
                    placeholder="+998901234567"
                  />
                </div>

                {/* 6. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </label>
                  <textarea
                    value={editForm.comments}
                    onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-purple-500 transition-colors outline-none text-sm resize-none"
                    rows={4}
                    placeholder="Type here"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Oltiariq filiali */}
          <div>{renderTaskTable(oltiariqTasks, 'Oltiariq')}</div>

          {/* Toshkent filiali */}
          <div>{renderTaskTable(toshkentTasks, 'Toshkent')}</div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
