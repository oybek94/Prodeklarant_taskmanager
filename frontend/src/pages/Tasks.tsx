import { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface Task {
  id: number;
  title: string;
  status: string;
  comments?: string;
  createdAt: string;
  client: { id: number; name: string };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
  stages?: Array<{ name: string; status: string; durationMin?: number | null; completedAt?: string | null }>;
}

interface TaskStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  startedAt?: string;
  completedAt?: string | null;
  durationMin?: number | null;
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
  updatedAt?: string;
  client: { id: number; name: string; dealAmount?: number };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
  updatedBy?: { id: number; name: string; email: string };
  stages: TaskStage[];
  netProfit?: number | null; // Sof foyda (faqat ADMIN uchun)
  adminEarnedAmount?: number | null; // Admin ishlab topgan pul
  snapshotDealAmount?: number | null; // Task yaratilgan vaqtdagi kelishuv summasi
  snapshotCertificatePayment?: number | null; // Task yaratilgan vaqtdagi sertifikat to'lovi
  snapshotPsrPrice?: number | null; // Task yaratilgan vaqtdagi PSR narxi
  snapshotWorkerPrice?: number | null; // Task yaratilgan vaqtdagi ishchi narxi
  snapshotCustomsPayment?: number | null; // Task yaratilgan vaqtdagi bojxona to'lovi
}

interface TaskVersion {
  id: number;
  version: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr: boolean;
  driverPhone?: string;
  changes?: any;
  createdAt: string;
  changedByUser: { id: number; name: string; email: string };
}

interface Client {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface TaskStats {
  yearly: { current: number; previous: number };
  monthly: { current: number; previous: number };
  weekly: { current: number; previous: number };
  daily: { current: number; previous: number };
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
  const [taskVersions, setTaskVersions] = useState<TaskVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedStageForReminder, setSelectedStageForReminder] = useState<TaskStage | null>(null);
  const [showBXMModal, setShowBXMModal] = useState(false);
  const [bxmMultiplier, setBxmMultiplier] = useState<string>('0.5');
  const [currentBXM, setCurrentBXM] = useState<number>(34.4);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorForm, setErrorForm] = useState({
    workerId: '',
    stageName: '',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [workers, setWorkers] = useState<{ id: number; name: string; role: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
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
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilters, setArchiveFilters] = useState({
    branchId: '',
    startDate: '',
    endDate: '',
    hasPsr: '',
  });
  const [showArchiveFilters, setShowArchiveFilters] = useState(false);

  useEffect(() => {
    loadTasks();
    loadClients();
    loadBranches();
    loadWorkers();
  }, [showArchive]);

  // Clear archive filters when switching tabs
  useEffect(() => {
    if (!showArchive) {
      setArchiveSearchQuery('');
      setArchiveFilters({ branchId: '', startDate: '', endDate: '', hasPsr: '' });
    }
  }, [showArchive]);

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
        } else if (showArchiveFilters) {
          setShowArchiveFilters(false);
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showForm, showTaskModal, showEditModal, showReminderModal, showArchiveFilters]);

  const loadBranches = async () => {
    try {
      const response = await apiClient.get('/tasks');
      if (Array.isArray(response.data)) {
        const uniqueBranches = Array.from(
          new Map(
            response.data.map((task: Task) => [task.branch.id, task.branch])
          ).values()
        );
        setBranches(uniqueBranches.length > 0 ? uniqueBranches : [
          { id: 1, name: 'Toshkent' },
          { id: 2, name: 'Oltiariq' },
        ]);
      } else {
        setBranches([
          { id: 1, name: 'Toshkent' },
          { id: 2, name: 'Oltiariq' },
        ]);
      }
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
      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };

  const loadWorkers = async () => {
    try {
      const response = await apiClient.get('/users');
      setWorkers(response.data.filter((u: any) => u.role === 'DEKLARANT' || u.role === 'ADMIN'));
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (showArchive) {
        // Arxiv bo'limida faqat YAKUNLANDI statusidagi tasklar
        params.status = 'YAKUNLANDI';
      } else {
        // Barcha ishlar bo'limida YAKUNLANDI dan tashqari barcha tasklar
        if (filters.status) params.status = filters.status;
      }
      if (filters.clientId) params.clientId = filters.clientId;

      const response = await apiClient.get('/tasks', { params });
      if (Array.isArray(response.data)) {
        let filteredTasks = response.data;
        // Agar arxiv bo'lsa, faqat YAKUNLANDI statusidagilarni ko'rsatish
        // Agar barcha ishlar bo'lsa, YAKUNLANDI dan tashqarilarini ko'rsatish
        if (showArchive) {
          filteredTasks = response.data.filter((task: Task) => task.status === 'YAKUNLANDI');
        } else {
          filteredTasks = response.data.filter((task: Task) => task.status !== 'YAKUNLANDI');
        }
        setTasks(filteredTasks);
        // Stats faqat barcha ishlar bo'limida hisoblanadi
        if (!showArchive) {
          calculateStats(response.data);
        }
      } else {
        setTasks([]);
        if (!showArchive) {
          calculateStats([]);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
      if (!showArchive) {
        calculateStats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tasksData: Task[]) => {
    if (!Array.isArray(tasksData)) {
      setStats({ yearly: { current: 0, previous: 0 }, monthly: { current: 0, previous: 0 }, weekly: { current: 0, previous: 0 }, daily: { current: 0, previous: 0 } });
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Hafta boshini topish (Yakshanba)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Oldingi davrlar
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    const isInRange = (date: Date, start: Date, end: Date) => {
      return date >= start && date <= end;
    };

    const yearly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= yearStart;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastYearStart, lastYearEnd);
      }).length,
    };

    const monthly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= monthStart;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastMonthStart, lastMonthEnd);
      }).length,
    };

    const weekly = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= weekStart;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return isInRange(taskDate, lastWeekStart, lastWeekEnd);
      }).length,
    };

    const daily = {
      current: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= today;
      }).length,
      previous: tasksData.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= yesterday && taskDate < today;
      }).length,
    };

    setStats({ yearly, monthly, weekly, daily });
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number): { text: string; color: string; bgColor: string } => {
    const sign = change >= 0 ? '+' : '';
    const text = `${sign}${change.toFixed(1)}%`;
    if (change >= 0) {
      return { text, color: 'text-green-700', bgColor: 'bg-green-100' };
    } else {
      return { text, color: 'text-red-700', bgColor: 'bg-red-100' };
    }
  };

  const loadTaskDetail = async (taskId: number) => {
    try {
      setLoadingTask(true);
      const response = await apiClient.get(`/tasks/${taskId}`);
      setSelectedTask(response.data);
      setShowTaskModal(true);
      // Load versions
      await loadTaskVersions(taskId);
    } catch (error) {
      console.error('Error loading task detail:', error);
      alert('Task ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoadingTask(false);
    }
  };

  const loadTaskVersions = async (taskId: number) => {
    try {
      setLoadingVersions(true);
      const response = await apiClient.get(`/tasks/${taskId}/versions`);
      setTaskVersions(response.data);
    } catch (error) {
      console.error('Error loading task versions:', error);
    } finally {
      setLoadingVersions(false);
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
      // If Deklaratsiya stage, show BXM multiplier modal
      if (selectedStageForReminder.name === 'Deklaratsiya') {
        try {
          const bxmResponse = await apiClient.get('/bxm/current');
          setCurrentBXM(Number(bxmResponse.data.amount));
          setBxmMultiplier('0.5');
          setShowBXMModal(true);
        } catch (error) {
          console.error('Error loading BXM:', error);
          setShowBXMModal(true);
        }
      } else {
        await updateStageToReady();
      }
    } else {
      setSelectedStageForReminder(null);
    }
  };

  const updateStageToReady = async (customsPaymentMultiplier?: number) => {
    if (!selectedStageForReminder || !selectedTask) return;
    
    try {
      setUpdatingStage(selectedStageForReminder.id);
      // Small delay for animation
      await new Promise(resolve => setTimeout(resolve, 300));
      await apiClient.patch(`/tasks/${selectedTask.id}/stages/${selectedStageForReminder.id}`, {
        status: 'TAYYOR',
        ...(customsPaymentMultiplier && { customsPaymentMultiplier }),
      });
      await loadTaskDetail(selectedTask.id);
      await loadTasks();
      setShowBXMModal(false);
      setSelectedStageForReminder(null);
    } catch (error: any) {
      console.error('Error updating stage:', error);
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleBXMConfirm = async () => {
    const multiplier = parseFloat(bxmMultiplier);
    if (isNaN(multiplier) || multiplier < 0.5 || multiplier > 4) {
      alert('Multiplier 0.5 dan 4 gacha bo\'lishi kerak');
      return;
    }
    await updateStageToReady(multiplier);
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
      case 'BOSHLANMAGAN':
        return { label: 'Boshlanmagan', color: 'bg-red-100 text-red-800' };
      case 'JARAYONDA':
        return { label: 'Jarayonda', color: 'bg-yellow-100 text-yellow-800' };
      case 'TAYYOR':
        return { label: 'Xujjat tayyor', color: 'bg-blue-100 text-blue-800' };
      case 'TEKSHIRILGAN':
        return { label: 'Xujjat tekshirilgan', color: 'bg-purple-100 text-purple-800' };
      case 'TOPSHIRILDI':
        return { label: 'Xujjat topshirildi', color: 'bg-indigo-100 text-indigo-800' };
      case 'YAKUNLANDI':
        return { label: 'Yakunlandi', color: 'bg-green-100 text-green-800' };
      default:
        return { label: 'Noma\'lum', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-yellow-200',
      'bg-pink-200',
      'bg-blue-200',
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

  // Calculate total duration for a task: Topshirish tayyor bo'lgan vaqt - Task yaratilgan vaqt
  const calculateTotalDuration = (task: Task): { text: string; color: string } => {
    if (!task.stages || task.stages.length === 0) return { text: '-', color: 'text-gray-500' };
    
    // Find "Topshirish" stage
    const topshirishStage = task.stages.find((stage) => stage.name === 'Topshirish');
    
    // If Topshirish is not completed, return '-'
    if (!topshirishStage || topshirishStage.status !== 'TAYYOR' || !topshirishStage.completedAt) {
      return { text: '-', color: 'text-gray-500' };
    }
    
    // Calculate difference: Topshirish completedAt - Task createdAt
    const completedAt = new Date(topshirishStage.completedAt);
    const createdAt = new Date(task.createdAt);
    
    const diffMs = completedAt.getTime() - createdAt.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes <= 0) return { text: '-', color: 'text-gray-500' };
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    let text = '';
    if (hours > 0) {
      text = `${hours} soat ${minutes} daqiqa`;
    } else {
      text = `${minutes} daqiqa`;
    }
    
    // Determine color based on hours
    let color = 'text-gray-500';
    if (hours < 2) {
      color = 'text-green-600'; // Yashil - 2 soatdan kam
    } else if (hours >= 2 && hours <= 3) {
      color = 'text-yellow-600'; // Sariq - 2-3 soat oralig'ida
    } else {
      color = 'text-red-600'; // Qizil - 3 soatdan ko'p
    }
    
    return { text, color };
  };

  const renderTaskTable = (branchTasks: Task[], branchName: string) => {
    const isArchive = branchName === 'Arxiv';
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-xl overflow-hidden border-2 border-blue-200">
        <div className={`px-6 py-3 relative overflow-hidden ${isArchive ? 'bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800' : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700'}`}>
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12"></div>
          <h2 className="text-lg font-semibold text-white relative z-10">
            {isArchive ? 'Arxiv' : `${branchName} filiali`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={isArchive ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Klient
                </th>
                {isArchive && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                    Filial
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Start Date
                </th>
                {isArchive && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                    Vaqt
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-blue-500">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {branchTasks.length === 0 ? (
                <tr>
                  <td colSpan={isArchive ? 7 : 5} className="px-6 py-4 text-center text-gray-500 bg-blue-50">
                    Ma'lumotlar yo'q
                  </td>
                </tr>
              ) : (
                branchTasks.map((task, index) => {
                  const statusInfo = getStatusInfo(task.status);
                  const totalDuration = calculateTotalDuration(task);
                  return (
                    <tr
                      key={task.id}
                      onClick={() => loadTaskDetail(task.id)}
                      className={`hover:bg-blue-100 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-b border-blue-100">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-b border-blue-100">
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full ${getAvatarColor(
                              task.client.name
                            )} flex items-center justify-center text-xs font-semibold text-gray-700 mr-2 shadow-sm`}
                          >
                            {getInitials(task.client.name)}
                          </div>
                          <span className="text-xs">{task.client.name}</span>
                        </div>
                      </td>
                      {isArchive && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-b border-blue-100">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {task.branch.name}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 border-b border-blue-100">
                        {formatDate(task.createdAt)}
                      </td>
                      {isArchive && (
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 border-b border-blue-100">
                          <div className="flex items-center gap-1.5">
                            <svg className={`w-3.5 h-3.5 ${totalDuration.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={`font-medium ${totalDuration.color}`}>{totalDuration.text}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-b border-blue-100">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color} shadow-sm`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 border-b border-blue-100 max-w-[200px] min-w-[150px]">
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

  // Filter archive tasks
  const getFilteredArchiveTasks = () => {
    if (!showArchive || !Array.isArray(tasks)) return [];
    
    let filtered = tasks;
    
    // Search filter
    if (archiveSearchQuery.trim()) {
      const query = archiveSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) => 
        task.title.toLowerCase().includes(query) ||
        task.client.name.toLowerCase().includes(query)
      );
    }
    
    // Branch filter
    if (archiveFilters.branchId) {
      filtered = filtered.filter((task) => 
        task.branch.id.toString() === archiveFilters.branchId
      );
    }
    
    // Date range filter
    if (archiveFilters.startDate) {
      const startDate = new Date(archiveFilters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.createdAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= startDate;
      });
    }
    
    if (archiveFilters.endDate) {
      const endDate = new Date(archiveFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate <= endDate;
      });
    }
    
    // PSR filter
    if (archiveFilters.hasPsr !== '') {
      const hasPsr = archiveFilters.hasPsr === 'true';
      filtered = filtered.filter((task) => {
        return task.hasPsr === hasPsr;
      });
    }
    
    return filtered;
  };

  // Export to Excel function
  const exportToExcel = () => {
    const tasksToExport = showArchive ? filteredArchiveTasks : (Array.isArray(tasks) ? tasks : []);
    
    if (tasksToExport.length === 0) {
      alert('Eksport qilish uchun ma\'lumotlar yo\'q');
      return;
    }

    // Prepare data for Excel
    const excelData = tasksToExport.map((task) => {
      const durationInfo = calculateTotalDuration(task);
      return {
        'Task nomi': task.title,
        'Mijoz': task.client.name,
        'Filial': task.branch.name,
        'Status': getStatusInfo(task.status).label,
        'PSR': task.hasPsr ? 'Bor' : 'Yo\'q',
        'Sho\'pir tel': task.driverPhone || '-',
        'Izohlar': task.comments || '-',
        'Yaratilgan sana': formatDate(task.createdAt),
        'Yaratgan': task.createdBy?.name || '-',
        'Umumiy vaqt': durationInfo.text,
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Task nomi
      { wch: 20 }, // Mijoz
      { wch: 15 }, // Filial
      { wch: 15 }, // Status
      { wch: 10 }, // PSR
      { wch: 15 }, // Sho'pir tel
      { wch: 30 }, // Izohlar
      { wch: 18 }, // Yaratilgan sana
      { wch: 15 }, // Yaratgan
      { wch: 15 }, // Umumiy vaqt
    ];
    ws['!cols'] = colWidths;

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = showArchive 
      ? `Arxiv_Tasks_${dateStr}.xlsx`
      : `Tasks_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  // Separate tasks by branch
  const toshkentTasks = Array.isArray(tasks) ? tasks.filter((task) => task.branch.name === 'Toshkent') : [];
  const oltiariqTasks = Array.isArray(tasks) ? tasks.filter((task) => task.branch.name === 'Oltiariq') : [];
  const filteredArchiveTasks = getFilteredArchiveTasks();

  // Check if user is DEKLARANT with a branch assigned
  const isDeklarantWithBranch = user?.role === 'DEKLARANT' && user?.branchId;
  const userBranch = isDeklarantWithBranch 
    ? branches.find((b) => b.id === user.branchId)
    : null;
  
  // Filter tasks for DEKLARANT - only show their branch
  const userBranchTasks = isDeklarantWithBranch && userBranch
    ? (Array.isArray(tasks) ? tasks.filter((task) => task.branch.id === user.branchId) : [])
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
          {/* Tab buttons */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setShowArchive(false)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                !showArchive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Barcha ishlar
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                showArchive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Arxiv
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showArchive && (
            <div className="flex items-center gap-2 relative">
              {/* Export to Excel Icon */}
              <button
                onClick={exportToExcel}
                className="relative p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm hover:shadow z-10"
                title="Excel formatida yuklab olish"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              {/* Search Icon - Minimalistic */}
              <button
                onClick={() => setShowArchiveFilters(!showArchiveFilters)}
                className={`relative p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm hover:shadow z-10 ${
                  showArchiveFilters ? 'opacity-0 pointer-events-none' : ''
                }`}
                title="Qidirish va filtrlash"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
              
              {/* Expandable Search and Filter Panel */}
              {showArchiveFilters && (
                <div className="absolute right-0 top-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-20 min-w-[500px] animate-slideIn">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">Qidiruv va filtrlash</h3>
                    </div>
                    <button
                      onClick={() => setShowArchiveFilters(false)}
                      className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Search */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Qidirish
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={archiveSearchQuery}
                          onChange={(e) => setArchiveSearchQuery(e.target.value)}
                          placeholder="Task nomi yoki mijoz nomi..."
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                          autoFocus
                        />
                        {archiveSearchQuery && (
                          <button
                            onClick={() => setArchiveSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branch Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Filial
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <select
                          value={archiveFilters.branchId}
                          onChange={(e) => setArchiveFilters({ ...archiveFilters, branchId: e.target.value })}
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
                        >
                          <option value="">Barcha filiallar</option>
                          {Array.isArray(branches) && branches.map((branch) => (
                            <option key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Sana oralig'i
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="date"
                            value={archiveFilters.startDate}
                            onChange={(e) => setArchiveFilters({ ...archiveFilters, startDate: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                            placeholder="Boshlanish"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="date"
                            value={archiveFilters.endDate}
                            onChange={(e) => setArchiveFilters({ ...archiveFilters, endDate: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm shadow-sm hover:border-gray-300"
                            placeholder="Tugash"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PSR Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PSR
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <select
                          value={archiveFilters.hasPsr}
                          onChange={(e) => setArchiveFilters({ ...archiveFilters, hasPsr: e.target.value })}
                          className="w-full pl-10 pr-9 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-sm shadow-sm hover:border-gray-300 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px]"
                        >
                          <option value="">Barcha</option>
                          <option value="true">PSR bor</option>
                          <option value="false">PSR yo'q</option>
                        </select>
                      </div>
                    </div>

                    {/* Results Count */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium text-gray-700">
                          {filteredArchiveTasks.length} ta natija
                        </span>
                        {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                          <span className="text-gray-500">(filtrlangan)</span>
                        )}
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(archiveSearchQuery || archiveFilters.branchId || archiveFilters.startDate || archiveFilters.endDate || archiveFilters.hasPsr) && (
                      <button
                        onClick={() => {
                          setArchiveSearchQuery('');
                          setArchiveFilters({ branchId: '', startDate: '', endDate: '', hasPsr: '' });
                        }}
                        className="w-full px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md border border-gray-300"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Filtrlarni tozalash
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {!showArchive && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards - faqat barcha ishlar bo'limida */}
      {!showArchive && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Bugungi ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.daily.current, stats.daily.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.daily.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Bugungi ishlar soni</div>
          </div>

          {/* Bu haftadagi ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.weekly.current, stats.weekly.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.weekly.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Bu haftadagi ishlar soni</div>
          </div>

          {/* Bu oydagi ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.monthly.current, stats.monthly.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.monthly.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Bu oydagi ishlar soni</div>
          </div>

          {/* Yillik ishlar soni */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-lg shadow-xl p-5 relative border-2 border-blue-400 overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
            
            {(() => {
              const change = calculateChange(stats.yearly.current, stats.yearly.previous);
              const changeInfo = formatChange(change);
              return (
                <div className={`absolute top-3 right-3 ${changeInfo.bgColor} ${changeInfo.color} text-xs font-medium px-2 py-1 rounded shadow-md backdrop-blur-sm`}>
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    {changeInfo.text}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-lg border border-white border-opacity-30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-lg">{stats.yearly.current}</div>
            <div className="text-sm text-blue-100 relative z-10 font-medium">Yillik ishlar soni</div>
          </div>
        </div>
      )}

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
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Task name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="Type here"
                  />
                </div>

                {/* 2. Mijoz */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mijoz <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    required
                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm"
                  >
                    <option value="">Tanlang...</option>
                    {Array.isArray(clients) && clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filial - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Oltiariq
                    </button>
                  </div>
                </div>

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hasPsr: false })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        form.hasPsr === false
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Yo'q
                    </button>
                  </div>
                </div>

                {/* 5. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Sho'pir tel raqami
                  </label>
                  <input
                    type="tel"
                    value={form.driverPhone}
                    onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="+998901234567"
                  />
                </div>

                {/* 6. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </label>
                  <textarea
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm resize-none"
                    rows={4}
                    placeholder="Type here"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
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
                    setErrorForm({
                      workerId: '',
                      stageName: '',
                      amount: '',
                      comment: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                    setShowErrorModal(true);
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Xato
                </button>
                {(selectedTask.status !== 'YAKUNLANDI' || user?.role === 'ADMIN') && (
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
                )}
                {(selectedTask.status !== 'YAKUNLANDI' || user?.role === 'ADMIN') && (
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
                )}
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
                {selectedTask.createdBy && (
                  <div className="text-xs text-gray-400 mt-1">by {selectedTask.createdBy.name}</div>
                )}
              </div>
            </div>
            {selectedTask.updatedBy && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Oxirgi o'zgartirilgan:</span> {selectedTask.updatedAt ? formatDate(selectedTask.updatedAt) : ''} 
                  {selectedTask.updatedBy && <span className="ml-2">by {selectedTask.updatedBy.name}</span>}
                </div>
              </div>
            )}

            {/* PSR Information */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-sm font-semibold text-blue-800">PSR Ma'lumotlari</div>
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

            {/* Sof Foyda va Admin ishlab topgan pul (faqat ADMIN uchun) */}
            {user?.role === 'ADMIN' && selectedTask.netProfit !== null && selectedTask.netProfit !== undefined && (
              <div className={`mb-6 p-4 border rounded-lg ${
                selectedTask.netProfit >= 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${selectedTask.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className={`text-sm font-semibold ${selectedTask.netProfit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                    Foyda hisoboti
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Kelishuv summasi:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {new Intl.NumberFormat('uz-UZ', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                      }).format(
                        (selectedTask.snapshotDealAmount ? Number(selectedTask.snapshotDealAmount) : Number(selectedTask.client.dealAmount || 0)) + (selectedTask.hasPsr ? 10 : 0)
                      )}
                      {selectedTask.hasPsr && (
                        <span className="text-xs text-gray-500 ml-1">
                          (asosiy: {new Intl.NumberFormat('uz-UZ', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }).format(selectedTask.snapshotDealAmount ? Number(selectedTask.snapshotDealAmount) : Number(selectedTask.client.dealAmount || 0))} + 10)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Filial bo'yicha to'lovlar:</span>
                    <span className="text-sm font-medium text-red-600">
                      {new Intl.NumberFormat('uz-UZ', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                      }).format(
                        ((selectedTask.snapshotDealAmount ? Number(selectedTask.snapshotDealAmount) : Number(selectedTask.client.dealAmount || 0)) + (selectedTask.hasPsr ? 10 : 0)) - (selectedTask.netProfit || 0)
                      )}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className={`text-sm font-semibold ${selectedTask.netProfit >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                      Sof foyda:
                    </span>
                    <span className={`text-sm font-bold ${selectedTask.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {new Intl.NumberFormat('uz-UZ', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                      }).format(selectedTask.netProfit)}
                    </span>
                  </div>
                  {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-800">
                        Admin ishlab topgan pul:
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {new Intl.NumberFormat('uz-UZ', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        }).format(selectedTask.adminEarnedAmount)}
                      </span>
                    </div>
                  )}
                  {selectedTask.adminEarnedAmount !== null && selectedTask.adminEarnedAmount !== undefined && selectedTask.adminEarnedAmount > 0 && (
                    <div className="pt-2 border-t-2 border-gray-300 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">
                        Jami foyda:
                      </span>
                      <span className="text-lg font-bold text-purple-600">
                        {new Intl.NumberFormat('uz-UZ', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        }).format((selectedTask.netProfit || 0) + (selectedTask.adminEarnedAmount || 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* Versions Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Versiyalar</h3>
                <button
                  onClick={() => {
                    setShowVersions(!showVersions);
                    if (!showVersions && selectedTask) {
                      loadTaskVersions(selectedTask.id);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showVersions ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                  {showVersions ? 'Yashirish' : 'Ko\'rsatish'}
                </button>
              </div>
              {showVersions && (
                <div>
                  {loadingVersions ? (
                    <div className="text-center py-4 text-gray-500">Yuklanmoqda...</div>
                  ) : taskVersions.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">Versiyalar yo'q</div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {taskVersions.map((version) => (
                        <div
                          key={version.id}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                                V{version.version}
                              </span>
                              <span className="text-sm font-medium text-gray-700">{version.title}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(version.createdAt)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-medium">O'zgartirgan:</span> {version.changedByUser.name}
                          </div>
                          {version.changes && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">O'zgarishlar:</span>
                                {version.changes.changeType === 'STAGE' && version.changes.stage ? (
                                  <div className="mt-1 bg-white p-2 rounded border border-blue-100">
                                    <div className="font-medium text-blue-700 mb-1">Jarayon o'zgarishi:</div>
                                    <div className="space-y-1">
                                      <div><span className="font-medium">Jarayon:</span> {version.changes.stage.name}</div>
                                      <div><span className="font-medium">Status:</span> {version.changes.stage.status === 'TAYYOR' ? 'Tugallandi' : 'Boshlanmagan'}</div>
                                      {version.changes.stage.assignedTo && (
                                        <div><span className="font-medium">Javobgar:</span> {version.changes.stage.assignedTo.name}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 space-y-1">
                                    {version.changes.title && (
                                      <div><span className="font-medium">Title:</span> {version.changes.title}</div>
                                    )}
                                    {version.changes.status && (
                                      <div><span className="font-medium">Status:</span> {version.changes.status}</div>
                                    )}
                                    {version.changes.comments && (
                                      <div><span className="font-medium">Comments:</span> {version.changes.comments}</div>
                                    )}
                                    {version.changes.hasPsr !== undefined && (
                                      <div><span className="font-medium">PSR:</span> {version.changes.hasPsr ? 'Bor' : 'Yo\'q'}</div>
                                    )}
                                    {version.changes.driverPhone && (
                                      <div><span className="font-medium">Driver Phone:</span> {version.changes.driverPhone}</div>
                                    )}
                                  </div>
                                )}
                                {version.changes.stages && Array.isArray(version.changes.stages) && (
                                  <div className="mt-2 pt-2 border-t border-blue-100">
                                    <div className="font-medium text-blue-700 mb-1">Barcha jarayonlar holati:</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {version.changes.stages.map((s: any, idx: number) => (
                                        <div key={idx} className="text-xs flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${
                                            s.status === 'TAYYOR' ? 'bg-green-500' : 'bg-gray-300'
                                          }`}></span>
                                          <span>{s.name}</span>
                                          {s.assignedTo && (
                                            <span className="text-gray-500">({s.assignedTo.name})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="mt-2 flex gap-2 text-xs">
                            <span className={`px-2 py-1 rounded ${getStatusInfo(version.status).color}`}>
                              {getStatusInfo(version.status).label}
                            </span>
                            {version.comments && (
                              <span className="text-gray-500 truncate" title={version.comments}>
                                {version.comments}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BXM Multiplier Modal */}
            {showBXMModal && selectedStageForReminder && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] backdrop-blur-sm"
                style={{
                  animation: 'backdropFadeIn 0.3s ease-out'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowBXMModal(false);
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Deklaratsiya To'lovi</h3>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">
                      Joriy BXM: <span className="font-semibold text-blue-600">${currentBXM.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      BXMning 0.5 dan 4 barobarigacha tanlash mumkin
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      BXM Multiplier (0.5 - 4)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="4"
                      value={bxmMultiplier}
                      onChange={(e) => setBxmMultiplier(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none"
                      placeholder="1.0"
                    />
                    {bxmMultiplier && !isNaN(parseFloat(bxmMultiplier)) && (
                      <div className="mt-2 text-sm text-gray-600">
                        Deklaratsiya to'lovi: <span className="font-semibold text-green-600">
                          ${(currentBXM * parseFloat(bxmMultiplier)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleBXMConfirm}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => {
                        setShowBXMModal(false);
                        setSelectedStageForReminder(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Task name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="Type here"
                  />
                </div>

                {/* 2. Mijoz */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mijoz <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.clientId}
                    onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
                    required
                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm"
                  >
                    <option value="">Tanlang...</option>
                    {Array.isArray(clients) && clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filial - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Oltiariq
                    </button>
                  </div>
                </div>

                {/* 4. PSR - Button style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, hasPsr: false })}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${
                        editForm.hasPsr === false
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      Yo'q
                    </button>
                  </div>
                </div>

                {/* 5. Sho'pir telefon raqami */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Sho'pir tel raqami
                  </label>
                  <input
                    type="tel"
                    value={editForm.driverPhone}
                    onChange={(e) => setEditForm({ ...editForm, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm"
                    placeholder="+998901234567"
                  />
                </div>

                {/* 6. Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comments
                  </label>
                  <textarea
                    value={editForm.comments}
                    onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm resize-none"
                    rows={4}
                    placeholder="Type here"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
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

      {/* Error Modal */}
      {showErrorModal && selectedTask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowErrorModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Xato qo'shish</h2>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiClient.post(`/tasks/${selectedTask.id}/errors`, {
                    taskTitle: selectedTask.title,
                    workerId: parseInt(errorForm.workerId),
                    stageName: errorForm.stageName,
                    amount: parseFloat(errorForm.amount),
                    comment: errorForm.comment,
                    date: new Date(errorForm.date),
                  });
                  setShowErrorModal(false);
                  setErrorForm({
                    workerId: '',
                    stageName: '',
                    amount: '',
                    comment: '',
                    date: new Date().toISOString().split('T')[0],
                  });
                  // Reload task to show updated data
                  if (selectedTask) {
                    const response = await apiClient.get(`/tasks/${selectedTask.id}`);
                    setSelectedTask(response.data);
                  }
                  await loadTasks();
                  alert('Xato muvaffaqiyatli qo\'shildi');
                } catch (error: any) {
                  alert(error.response?.data?.error || 'Xatolik yuz berdi');
                }
              }}
              className="space-y-4"
            >
              {/* Task nomi (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task nomi
                </label>
                <input
                  type="text"
                  value={selectedTask.title}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* Ishchi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ishchi <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={errorForm.workerId}
                  onChange={(e) => setErrorForm({ ...errorForm, workerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Ishchini tanlang</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id.toString()}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bosqich */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bosqich <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={errorForm.stageName}
                  onChange={(e) => setErrorForm({ ...errorForm, stageName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Bosqichni tanlang</option>
                  <option value="Invoys">Invoys</option>
                  <option value="Zayavka">Zayavka</option>
                  <option value="TIR-SMR">TIR-SMR</option>
                  <option value="ST">ST</option>
                  <option value="Fito">Fito</option>
                  <option value="Deklaratsiya">Deklaratsiya</option>
                  <option value="Tekshirish">Tekshirish</option>
                  <option value="Topshirish">Topshirish</option>
                  <option value="Pochta">Pochta</option>
                </select>
              </div>

              {/* Summa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={errorForm.amount}
                  onChange={(e) => setErrorForm({ ...errorForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>

              {/* Tavsif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tavsif
                </label>
                <textarea
                  value={errorForm.comment}
                  onChange={(e) => setErrorForm({ ...errorForm, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Xato haqida batafsil ma'lumot"
                />
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={errorForm.date}
                  onChange={(e) => setErrorForm({ ...errorForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowErrorModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : showArchive ? (
        // Arxiv bo'limida barcha tasklar bitta jadvalda
        <div>
          {renderTaskTable(filteredArchiveTasks, 'Arxiv')}
        </div>
      ) : (
        // Barcha ishlar bo'limida filiallarga bo'lingan
        isDeklarantWithBranch && userBranch ? (
          // DEKLARANT uchun faqat o'zining filiali to'liq kenglikda
          <div className="w-full">
            {renderTaskTable(userBranchTasks, userBranch.name)}
          </div>
        ) : (
          // ADMIN/MANAGER uchun barcha filiallar
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Oltiariq filiali */}
            <div>{renderTaskTable(oltiariqTasks, 'Oltiariq')}</div>

            {/* Toshkent filiali */}
            <div>{renderTaskTable(toshkentTasks, 'Toshkent')}</div>
          </div>
        )
      )}
    </div>
  );
};

export default Tasks;
