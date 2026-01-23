import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import MonetaryInput from '../components/MonetaryInput';
import DateInput from '../components/DateInput';
import { validateMonetaryFields, isValidMonetaryFields, type MonetaryValidationErrors } from '../utils/validation';

interface TaskStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  assignedToId?: number;
  assignedTo?: { id: number; name: string };
}

interface TaskError {
  id: number;
  stageName: string;
  amount: number;
  comment?: string;
  date: string;
  worker: { id: number; name: string };
  createdAt: string;
  createdById: number;
}

interface Task {
  id: number;
  title: string;
  status: string;
  comments?: string;
  createdAt: string;
  client: { id: number; name: string };
  branch: { id: number; name: string };
  stages: TaskStage[];
  errors: TaskError[];
}

interface User {
  id: number;
  name: string;
}

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStage, setUpdatingStage] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'stages' | 'errors'>('stages');
  const [showErrorForm, setShowErrorForm] = useState(false);
  const [editingErrorId, setEditingErrorId] = useState<number | null>(null);
  const [workers, setWorkers] = useState<User[]>([]);
  const [errorForm, setErrorForm] = useState({
    stageName: '',
    workerId: '',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (id) {
      loadTask();
      loadWorkers();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tasks/${id}`);
      setTask(response.data);
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const response = await apiClient.get('/users');
      setWorkers(response.data.filter((u: any) => u.role === 'DEKLARANT'));
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const handleStageToggle = async (stageId: number, currentStatus: string) => {
    try {
      setUpdatingStage(stageId);
      const newStatus = currentStatus === 'BOSHLANMAGAN' ? 'TAYYOR' : 'BOSHLANMAGAN';
      await apiClient.patch(`/tasks/${id}/stages/${stageId}`, { status: newStatus });
      await loadTask();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleAddError = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amountValue = errorForm.amount.trim();
      if (!/^\d{1,4}$/.test(amountValue)) {
        alert('Summa faqat USD bo\'lishi va 4 xonagacha bo\'lishi kerak');
        return;
      }
      if (editingErrorId) {
        await apiClient.patch(`/tasks/${id}/errors/${editingErrorId}`, {
          stageName: errorForm.stageName,
          workerId: parseInt(errorForm.workerId),
          amount: parseFloat(amountValue),
          comment: errorForm.comment,
          date: new Date(errorForm.date),
        });
      } else {
        await apiClient.post(`/tasks/${id}/errors`, {
          stageName: errorForm.stageName,
          workerId: parseInt(errorForm.workerId),
          amount: parseFloat(amountValue),
          comment: errorForm.comment,
          date: new Date(errorForm.date),
        });
      }
      setShowErrorForm(false);
      setEditingErrorId(null);
      setErrorForm({
        stageName: '',
        workerId: '',
        amount: '',
        comment: '',
        date: new Date().toISOString().split('T')[0],
      });
      await loadTask();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteError = async (errorId: number) => {
    if (!confirm('Xatoni o\'chirishni xohlaysizmi?')) return;
    try {
      await apiClient.delete(`/tasks/${id}/errors/${errorId}`);
      await loadTask();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const canEditError = (error: TaskError) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    const createdAt = new Date(error.createdAt).getTime();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    return error.createdById === user.id && Date.now() - createdAt <= twoDaysMs;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('uz-UZ');
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours} soat ${mins} daqiqa`;
    return `${mins} daqiqa`;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>;
  }

  if (!task) {
    return <div className="text-center py-8 text-gray-500">Task topilmadi</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/tasks')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Orqaga
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{task.title}</h1>
        </div>
            {task.status === 'TEKSHIRILGAN' && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await apiClient.get(`/sticker/${task.id}/image`, {
                        responseType: 'blob',
                      });
                      const blob = new Blob([response.data], { type: 'image/png' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `sticker-${task.id}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setTimeout(() => URL.revokeObjectURL(url), 100);
                    } catch (error: any) {
                      alert(error.response?.data?.error || 'Stiker yuklab olishda xatolik');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Stiker yuklab olish (PNG)
                </button>
              </div>
            )}
      </div>

      {/* Task Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Mijoz</div>
            <div className="font-medium">{task.client.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Filial</div>
            <div className="font-medium">{task.branch.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <div className="font-medium">{task.status}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Yaratilgan</div>
            <div className="font-medium">{formatDate(task.createdAt)}</div>
          </div>
        </div>
        {task.comments && (
          <div className="mt-4">
            <div className="text-sm text-gray-500">Izohlar</div>
            <div className="mt-1">{task.comments}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('stages')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'stages'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bosqichlar
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'errors'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Xatolar
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'stages' && (
            <div className="space-y-4">
              {task.stages.map((stage) => (
                <div
                  key={stage.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        {stage.assignedTo ? `Javobgar: ${stage.assignedTo.name}` : 'Javobgar belgilanmagan'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleStageToggle(stage.id, stage.status)}
                      disabled={updatingStage === stage.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        stage.status === 'TAYYOR'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {updatingStage === stage.id
                        ? 'Yuklanmoqda...'
                        : stage.status === 'TAYYOR'
                        ? 'Tayyor'
                        : 'Boshlanmagan'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Boshlangan</div>
                      <div className="font-medium">{formatDate(stage.startedAt)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Tugallangan</div>
                      <div className="font-medium">{formatDate(stage.completedAt)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Davomiyligi</div>
                      <div className="font-medium">{formatDuration(stage.durationMinutes)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'errors' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Xatolar ro'yxati</h3>
                <button
                  onClick={() => {
                    setEditingErrorId(null);
                    setErrorForm({
                      stageName: '',
                      workerId: '',
                      amount: '',
                      comment: '',
                      date: new Date().toISOString().split('T')[0],
                    });
                    setShowErrorForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  + Xato qo'shish
                </button>
              </div>

              {showErrorForm && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    {editingErrorId ? 'Xatoni tahrirlash' : 'Xato qo\'shish'}
                  </div>
                  <form onSubmit={handleAddError} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bosqich
                        </label>
                        <select
                          value={errorForm.stageName}
                          onChange={(e) => setErrorForm({ ...errorForm, stageName: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Tanlang...</option>
                          {task.stages.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ishchi
                        </label>
                        <select
                          value={errorForm.workerId}
                          onChange={(e) => setErrorForm({ ...errorForm, workerId: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Tanlang...</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Xato summasi
                        </label>
                        <input
                        type="text"
                        inputMode="numeric"
                          value={errorForm.amount}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          if (nextValue === '') {
                            setErrorForm({ ...errorForm, amount: '' });
                            return;
                          }
                          if (/^\d{0,4}$/.test(nextValue)) {
                            setErrorForm({ ...errorForm, amount: nextValue });
                          }
                        }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
                        <DateInput
                          value={errorForm.date}
                          onChange={(value) => setErrorForm({ ...errorForm, date: value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comment
                      </label>
                      <textarea
                        value={errorForm.comment}
                        onChange={(e) => setErrorForm({ ...errorForm, comment: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Saqlash
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowErrorForm(false)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                      >
                        Bekor
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2">
                {task.errors.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">Xatolar yo'q</div>
                ) : (
                  task.errors.map((error) => (
                    <div key={error.id} className="border rounded-lg p-4 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{error.stageName}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Ishchi: {error.worker.name} | Summa: {error.amount} USD | Sana:{' '}
                          {formatDate(error.date)}
                        </div>
                        {error.comment && (
                          <div className="text-sm text-gray-600 mt-2">{error.comment}</div>
                        )}
                      </div>
                      {canEditError(error) && (
                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setEditingErrorId(error.id);
                              setErrorForm({
                                stageName: error.stageName,
                                workerId: error.worker.id.toString(),
                                amount: String(error.amount),
                                comment: error.comment || '',
                                date: new Date(error.date).toISOString().split('T')[0],
                              });
                              setShowErrorForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Tahrirlash
                          </button>
                          <button
                            onClick={() => handleDeleteError(error.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;

