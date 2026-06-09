import React from 'react';

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

interface WorkerFormModalProps {
    showForm: boolean;
    isMobile: boolean;
    isNewWorkerRoute: boolean;
    editWorkerId: number | null;
    editingWorker: Worker | null;
    form: any;
    setForm: (form: any) => void;
    branches: { id: number; name: string }[];
    handleSubmit: (e: React.FormEvent) => void;
    handleClose: () => void;
}

const WorkerFormModal = React.memo(({
    showForm,
    isMobile,
    isNewWorkerRoute,
    editWorkerId,
    editingWorker,
    form,
    setForm,
    branches,
    handleSubmit,
    handleClose
}: WorkerFormModalProps) => {

    const showWorkerForm = showForm || (isMobile && isNewWorkerRoute);
    if (!showWorkerForm) return null;

    return (
        <div
            className={isMobile && (isNewWorkerRoute || editWorkerId)
                ? 'fixed inset-0 bg-white flex items-start justify-center z-50'
                : 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm'}
            style={isMobile && (isNewWorkerRoute || editWorkerId) ? undefined : { animation: 'backdropFadeIn 0.3s ease-out' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
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
                        onClick={handleClose}
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
                            onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'SELLER', branchId: e.target.value === 'MANAGER' ? '' : form.branchId })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="DEKLARANT">DEKLARANT</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="SELLER">SOTUVCHI (SELLER)</option>
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
                            onClick={handleClose}
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
    );
});

export default WorkerFormModal;
