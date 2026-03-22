import toast from 'react-hot-toast';
import React from 'react';
import apiClient from '../../lib/api';
import DateInput from '../DateInput';
import { formatMoney } from './taskHelpers';
import type { TaskDetail, TaskError, TaskStage } from './types';

interface ErrorForm {
  workerId: string;
  stageName: string;
  amount: string;
  comment: string;
  date: string;
}

interface ErrorModalProps {
  show: boolean;
  selectedTask: TaskDetail | null;
  workers: { id: number; name: string; role: string }[];
  user: { id: number; role: string } | null | undefined;
  errorForm: ErrorForm;
  setErrorForm: React.Dispatch<React.SetStateAction<ErrorForm>>;
  editingErrorId: number | null;
  setEditingErrorId: (id: number | null) => void;
  onClose: () => void;
  onSuccess: () => void;
  setSelectedTask: (task: TaskDetail | null) => void;
}

const STAGES = ['Invoys', 'Zayavka', 'TIR-SMR', 'ST', 'Fito', 'Deklaratsiya', 'Tekshirish', 'Topshirish', 'Pochta'];

const canEditError = (error: TaskError, userId?: number, userRole?: string): boolean => {
  if (!userId) return false;
  if (userRole === 'ADMIN') return true;
  const createdAt = new Date(error.createdAt).getTime();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  return error.createdById === userId && Date.now() - createdAt <= twoDaysMs;
};

const ErrorModal: React.FC<ErrorModalProps> = ({
  show, selectedTask, workers, user, errorForm, setErrorForm,
  editingErrorId, setEditingErrorId, onClose, onSuccess, setSelectedTask,
}) => {
  if (!show || !selectedTask) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = errorForm.amount.trim();
    if (!/^\d{1,4}$/.test(amountValue)) {
      toast.error("Summa faqat USD bo'lishi va 4 xonagacha bo'lishi kerak");
      return;
    }
    try {
      if (editingErrorId) {
        await apiClient.patch(`/tasks/${selectedTask.id}/errors/${editingErrorId}`, {
          workerId: parseInt(errorForm.workerId),
          stageName: errorForm.stageName,
          amount: parseFloat(amountValue),
          comment: errorForm.comment,
          date: new Date(errorForm.date),
        });
      } else {
        await apiClient.post(`/tasks/${selectedTask.id}/errors`, {
          taskTitle: selectedTask.title,
          workerId: parseInt(errorForm.workerId),
          stageName: errorForm.stageName,
          amount: parseFloat(amountValue),
          comment: errorForm.comment,
          date: new Date(errorForm.date),
        });
      }
      onClose();
      setEditingErrorId(null);
      setErrorForm({ workerId: '', stageName: '', amount: '', comment: '', date: new Date().toISOString().split('T')[0] });
      const response = await apiClient.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(response.data);
      onSuccess();
      toast.success("Xato muvaffaqiyatli qo'shildi");
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Xatolar</h2>
          <button onClick={() => { setEditingErrorId(null); onClose(); }} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        </div>

        {/* Mavjud xatolar ro'yxati */}
        {selectedTask.errors && selectedTask.errors.length > 0 ? (
          <div className="mb-4 space-y-2">
            {selectedTask.errors.map((error) => {
              const workerName = workers.find((w) => w.id === error.workerId)?.name || `#${error.workerId}`;
              return (
                <div key={error.id} className="p-3 border rounded-lg bg-gray-50 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {error.stageName} — {formatMoney(Number(error.amount), 'USD')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Xato qildi: {workerName} • Sana: {new Date(error.date).toLocaleDateString('uz-UZ')}
                    </div>
                    {error.comment && <div className="text-xs text-gray-600 mt-2">{error.comment}</div>}
                  </div>
                  {canEditError(error, user?.id, user?.role) && (
                    <div className="ml-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingErrorId(error.id);
                          setErrorForm({
                            workerId: error.workerId.toString(),
                            stageName: error.stageName,
                            amount: String(error.amount),
                            comment: error.comment || '',
                            date: new Date(error.date).toISOString().split('T')[0],
                          });
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Tahrirlash"
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Xatoni o'chirishni xohlaysizmi?")) return;
                          try {
                            await apiClient.delete(`/tasks/${selectedTask.id}/errors/${error.id}`);
                            const response = await apiClient.get(`/tasks/${selectedTask.id}`);
                            setSelectedTask(response.data);
                            onSuccess();
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="O'chirish"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-4 text-sm text-gray-500">Xatolar yo'q</div>
        )}

        {/* Yangi xato qo'shish formi */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task nomi</label>
            <input type="text" value={selectedTask.title} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ishchi <span className="text-red-500">*</span></label>
            <select required value={errorForm.workerId} onChange={(e) => setErrorForm({ ...errorForm, workerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Ishchini tanlang</option>
              {workers.map((w) => <option key={w.id} value={w.id.toString()}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bosqich <span className="text-red-500">*</span></label>
            <select required value={errorForm.stageName} onChange={(e) => setErrorForm({ ...errorForm, stageName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Bosqichni tanlang</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summa <span className="text-red-500">*</span></label>
            <input type="text" inputMode="numeric" required value={errorForm.amount}
              onChange={(e) => { const v = e.target.value; if (v === '' || /^\d{0,4}$/.test(v)) setErrorForm({ ...errorForm, amount: v }); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
            <textarea value={errorForm.comment} onChange={(e) => setErrorForm({ ...errorForm, comment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3} placeholder="Xato haqida batafsil ma'lumot" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sana <span className="text-red-500">*</span></label>
            <DateInput required value={errorForm.date} onChange={(value) => setErrorForm({ ...errorForm, date: value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => onClose()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              Bekor qilish
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ErrorModal;
