import React, { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DateInput from '../../components/DateInput';
import TaskProcessModal from '../tasks/TaskProcessModal';
import Clients from '../../pages/Clients';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import type { Invoice, Client, Contract, Branch, Worker, CreateTaskForm } from './types';

interface InvoicesModalsManagerProps {
  canEdit: boolean;
  showCreateModal: boolean;
  setShowCreateModal: (val: boolean) => void;
  duplicateInvoiceId: number | null;
  setDuplicateInvoiceId: (val: number | null) => void;
  selectedClientId: string;
  setSelectedClientId: (val: string) => void;
  selectedContractId: string;
  setSelectedContractId: (val: string) => void;
  clients: Client[];
  contracts: Contract[];
  loadingContracts: boolean;
  branches: Branch[];
  createTaskForm: CreateTaskForm;
  setCreateTaskForm: React.Dispatch<React.SetStateAction<CreateTaskForm>>;
  creatingTask: boolean;
  handleCreateInvoice: () => void;
  setContracts: (val: Contract[]) => void;
  
  showErrorModal: boolean;
  setShowErrorModal: (val: boolean) => void;
  invoiceForErrorModal: Invoice | null;
  setInvoiceForErrorModal: (val: Invoice | null) => void;
  errorForm: any;
  setErrorForm: any;
  workers: Worker[];
  handleSubmitErrorForm: (e: React.FormEvent) => Promise<void>;

  showDeleteConfirmModal: boolean;
  setShowDeleteConfirmModal: (val: boolean) => void;
  invoiceToDelete: Invoice | null;
  setInvoiceToDelete: (val: Invoice | null) => void;
  deletingInvoiceId: number | null;
  handleDeleteInvoice: () => Promise<void>;

  showTaskModalId: number | null;
  setShowTaskModalId: (val: number | null) => void;

  showClientModalId: number | null;
  setShowClientModalId: (val: number | null) => void;
  showContractModalId: number | null;
  setShowContractModalId: (val: number | null) => void;
}

export const InvoicesModalsManager: React.FC<InvoicesModalsManagerProps> = ({
  canEdit,
  showCreateModal,
  setShowCreateModal,
  duplicateInvoiceId,
  setDuplicateInvoiceId,
  selectedClientId,
  setSelectedClientId,
  selectedContractId,
  setSelectedContractId,
  clients,
  contracts,
  loadingContracts,
  branches,
  createTaskForm,
  setCreateTaskForm,
  creatingTask,
  handleCreateInvoice,
  setContracts,
  showErrorModal,
  setShowErrorModal,
  invoiceForErrorModal,
  setInvoiceForErrorModal,
  errorForm,
  setErrorForm,
  workers,
  handleSubmitErrorForm,
  showDeleteConfirmModal,
  setShowDeleteConfirmModal,
  invoiceToDelete,
  setInvoiceToDelete,
  deletingInvoiceId,
  handleDeleteInvoice,
  showTaskModalId,
  setShowTaskModalId,
  showClientModalId,
  setShowClientModalId,
  showContractModalId,
  setShowContractModalId
}) => {
  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setDuplicateInvoiceId(null);
    setSelectedClientId('');
    setSelectedContractId('');
    setContracts([]);
    setCreateTaskForm({ branchId: '', hasPsr: false, driverPhone: '', comments: '' });
  }, [setShowCreateModal, setDuplicateInvoiceId, setSelectedClientId, setSelectedContractId, setContracts, setCreateTaskForm]);

  return (
    <>
      {/* Yangi invoys yaratish oynasi (yangi invoys yoki dublikat) */}
      <CreateInvoiceModal
        open={canEdit && showCreateModal}
        isDuplicate={duplicateInvoiceId !== null}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        selectedContractId={selectedContractId}
        setSelectedContractId={setSelectedContractId}
        clients={clients}
        contracts={contracts}
        loadingContracts={loadingContracts}
        branches={branches}
        createTaskForm={createTaskForm}
        setCreateTaskForm={setCreateTaskForm}
        creatingTask={creatingTask}
        onSubmit={handleCreateInvoice}
        onClose={closeCreateModal}
        onOpenClientProfile={setShowClientModalId}
      />

      {/* Xatolik qo'shish modali */}
      <AnimatePresence>
        {showErrorModal && invoiceForErrorModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowErrorModal(false);
            }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Xatolik qo&apos;shish (sorov)</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowErrorModal(false);
                    setInvoiceForErrorModal(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Status BOSHLANMAGAN emas yoki Sertifikat olib chiqish yakunlangan. Tahrirlashga o&apos;tish uchun avval xatolik (sorov) qo&apos;shing.
              </p>
              <form onSubmit={handleSubmitErrorForm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task nomi</label>
                  <input
                    type="text"
                    value={invoiceForErrorModal.task?.title ?? `#${invoiceForErrorModal.invoiceNumber}`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ishchi <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={errorForm.workerId}
                    onChange={(e) => setErrorForm({ ...errorForm, workerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ishchini tanlang</option>
                    <option value="CUSTOMER">Mijoz</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id.toString()}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bosqich <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={errorForm.stageName}
                    onChange={(e) => setErrorForm({ ...errorForm, stageName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summa (UZS) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={errorForm.amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d{0,15}$/.test(v)) setErrorForm({ ...errorForm, amount: v });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                  <textarea
                    value={errorForm.comment}
                    onChange={(e) => setErrorForm({ ...errorForm, comment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Xato haqida qisqacha"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sana <span className="text-red-500">*</span></label>
                  <DateInput
                    required
                    value={errorForm.date}
                    onChange={(value) => setErrorForm({ ...errorForm, date: value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowErrorModal(false); setInvoiceForErrorModal(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Xatolik qo&apos;shish va tahrirlashga o&apos;tish
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice o'chirish tasdiq modali */}
      <AnimatePresence>
        {showDeleteConfirmModal && invoiceToDelete && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) { setShowDeleteConfirmModal(false); setInvoiceToDelete(null); }
            }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Invoysni o&apos;chirish</h2>
              <p className="text-gray-600 mb-6">
                Invoice №<strong>{invoiceToDelete.invoiceNumber}</strong> o&apos;chirilsinmi? Bu amalni qaytarib bo&apos;lmaydi.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirmModal(false); setInvoiceToDelete(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleDeleteInvoice}
                  disabled={deletingInvoiceId !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingInvoiceId === invoiceToDelete.id ? 'O\'chirilmoqda...' : 'Ha, o\'chirish'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTaskModalId && (
        <TaskProcessModal taskId={showTaskModalId} onClose={() => setShowTaskModalId(null)} />
      )}

      {showClientModalId && (
        <Clients isModalMode={true} modalClientId={showClientModalId} modalContractId={showContractModalId || undefined} onCloseModal={() => {
          setShowClientModalId(null);
          setShowContractModalId(null);
        }} />
      )}
    </>
  );
};
