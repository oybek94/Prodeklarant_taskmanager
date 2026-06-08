import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ModalShell from './ModalShell';
import apiClient from '../../../lib/api';

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

interface EditWorkerModalProps {
  workerDetail: any;
  workerId: number;
  branches: { id: number; name: string }[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function EditWorkerModal({ workerDetail, workerId, branches, onClose, onSuccess }: EditWorkerModalProps) {
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEKLARANT' as 'ADMIN' | 'MANAGER' | 'DEKLARANT',
    branchId: '',
    salary: '',
  });

  useEffect(() => {
    if (workerDetail) {
      setEditForm({
        name: workerDetail.name || '',
        email: workerDetail.email || '',
        password: '',
        role: (workerDetail.role || 'DEKLARANT') as 'ADMIN' | 'MANAGER' | 'DEKLARANT',
        branchId: workerDetail.branch?.id ? workerDetail.branch.id.toString() : '',
        salary: workerDetail.salary ? Number(workerDetail.salary).toString() : '',
      });
    }
  }, [workerDetail]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        salary: editForm.salary ? parseFloat(editForm.salary) : undefined,
      };
      if (editForm.role === 'MANAGER') {
        updateData.branchId = null;
      } else if (editForm.branchId) {
        updateData.branchId = parseInt(editForm.branchId);
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await apiClient.put(`/users/${workerId}`, updateData);
      onClose();
      await onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ishchini tahrirlash</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <Icon icon="lucide:x" className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <form onSubmit={handleUpdate} className="space-y-4">
        <FieldGroup label="Ism" required>
          <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ishchi ismi" />
        </FieldGroup>
        <FieldGroup label="Email" required>
          <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="email@example.com" />
        </FieldGroup>
        <FieldGroup label="Yangi parol">
          <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ixtiyoriy" />
        </FieldGroup>
        <FieldGroup label="Role" required>
          <select required value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
            <option value="DEKLARANT">Deklarant</option>
            <option value="MANAGER">Menejer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </FieldGroup>
        {editForm.role !== 'MANAGER' && (
          <FieldGroup label="Filial">
            <select value={editForm.branchId} onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
              <option value="">Barchasi</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FieldGroup>
        )}
        <FieldGroup label="Oylik maosh (UZS)">
          <input type="number" value={editForm.salary} onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ixtiyoriy" />
        </FieldGroup>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium">Bekor qilish</button>
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold">Saqlash</button>
        </div>
      </form>
    </ModalShell>
  );
}
