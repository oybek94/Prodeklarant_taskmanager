import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface CreateForm {
  title: string;
  clientId: string;
  branchId: string;
  comments: string;
  hasPsr: boolean;
  afterHoursPayer: 'CLIENT' | 'COMPANY';
  driverPhone: string;
}

interface Client { id: number; name: string }
interface Branch { id: number; name: string }

interface CreateTaskModalProps {
  show: boolean;
  form: CreateForm;
  setForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  clients: Client[];
  branches: Branch[];
  isMobile: boolean;
  isNewTaskRoute: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  show, form, setForm, clients, branches,
  isMobile, isNewTaskRoute, onClose, onSubmit,
}) => {
  const navigate = useNavigate();

  if (!show) return null;

  const handleClose = () => {
    if (isMobile && isNewTaskRoute) {
      navigate('/tasks');
    } else {
      onClose();
    }
  };

  const inputStyle = "w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm bg-white dark:bg-slate-800 dark:text-white dark:placeholder-gray-500";
  const selectStyle = "w-full px-3 py-2 pr-10 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none appearance-none bg-white dark:bg-slate-800 dark:text-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] text-sm";
  const btnActive = 'bg-blue-600 text-white border-blue-600';
  const btnInactive = 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-blue-500';

  return (
    <div
      className={isMobile && isNewTaskRoute
        ? 'fixed inset-0 bg-white dark:bg-slate-900 flex items-start justify-center z-50'
        : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm'}
      style={isMobile && isNewTaskRoute ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={isMobile && isNewTaskRoute
          ? 'bg-white dark:bg-slate-900 w-full h-full px-6 py-6 overflow-y-auto'
          : 'bg-white dark:bg-slate-900 rounded-lg shadow-2xl px-8 py-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto'}
        style={isMobile && isNewTaskRoute ? undefined : { animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Yangi task</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold leading-none">×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-3">
            {/* 1. Task name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
                Task name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                required className={inputStyle} placeholder="Type here" />
            </div>

            {/* 2. Mijoz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:user" className="w-4 h-4 text-blue-600" />
                Mijoz <span className="text-red-500">*</span>
              </label>
              <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required className={selectStyle}>
                <option value="">Tanlang...</option>
                {Array.isArray(clients) && clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* 3. Filial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:building" className="w-4 h-4 text-blue-600" />
                Filial <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(branches) && branches.length > 0 ? branches.map((branch) => (
                  <button key={branch.id} type="button"
                    onClick={() => setForm({ ...form, branchId: branch.id.toString() })}
                    className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${form.branchId === branch.id.toString() ? btnActive : btnInactive}`}>
                    {branch.name}
                  </button>
                )) : <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Filiallar yuklanmoqda...</div>}
              </div>
            </div>

            {/* 4. PSR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-600" />
                PSR <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, hasPsr: true })}
                  className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${form.hasPsr ? btnActive : btnInactive}`}>
                  Bor
                </button>
                <button type="button" onClick={() => setForm({ ...form, hasPsr: false })}
                  className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${!form.hasPsr ? btnActive : btnInactive}`}>
                  Yo'q
                </button>
              </div>
            </div>

            {/* 5. After Hours Payer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:handshake" className="w-4 h-4 text-blue-600" />
                Qo'shimcha to'lov kelishuvi
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, afterHoursPayer: 'CLIENT' })}
                  className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${form.afterHoursPayer === 'CLIENT' ? btnActive : btnInactive}`}>
                  Mijoz to'laydi
                </button>
                <button type="button" onClick={() => setForm({ ...form, afterHoursPayer: 'COMPANY' })}
                  className={`flex-1 px-3 py-2 border-2 rounded-lg font-medium transition-colors text-sm ${form.afterHoursPayer === 'COMPANY' ? btnActive : btnInactive}`}>
                  Men to'layman
                </button>
              </div>
            </div>

            {/* 6. Driver Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:phone" className="w-4 h-4 text-blue-600" />
                Sho'pir tel raqami
              </label>
              <input type="tel" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                className={inputStyle} placeholder="+998901234567" />
            </div>

            {/* 7. Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Icon icon="lucide:message-square" className="w-4 h-4 text-blue-600" />
                Comments
              </label>
              <textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors outline-none text-sm resize-none bg-white dark:bg-slate-800 dark:text-white dark:placeholder-gray-500"
                rows={4} placeholder="Type here" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
              Saqlash
            </button>
            <button type="button" onClick={() => onClose()}
              className="px-5 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm">
              Bekor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
