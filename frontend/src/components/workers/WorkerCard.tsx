import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../../components/CurrencyDisplay';

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

interface WorkerCardProps {
    worker: Worker;
    isOnline: boolean;
    openMenuId: number | null;
    isMobile: boolean;
    setOpenMenuId: (id: number | null) => void;
    handleEdit: (worker: Worker) => void;
    handleDelete: (id: number) => void;
}

const WorkerCard = React.memo(({
    worker,
    isOnline,
    openMenuId,
    isMobile,
    setOpenMenuId,
    handleEdit,
    handleDelete
}: WorkerCardProps) => {
    const navigate = useNavigate();

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

    const roleStyle = worker.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
        : worker.role === 'MANAGER' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
            : worker.role === 'SELLER' ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400'
                : 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-all duration-300 flex flex-col h-full">
            {/* Top: Avatar & Info */}
            <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm">
                        {getInitials()}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{worker.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{worker.branch?.name || 'N/A'}</p>
                </div>
            </div>

            {/* Middle: Role & Social/Contact Icons */}
            <div className="flex items-center justify-between mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${roleStyle}`}>
                    {worker.role}
                </span>
                <div className="flex items-center gap-1.5 relative">
                    {worker.email && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title={worker.email}>
                            <Icon icon="lucide:mail" className="w-3.5 h-3.5" />
                        </div>
                    )}
                    {worker.phone && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title={worker.phone}>
                            <Icon icon="lucide:phone" className="w-3.5 h-3.5" />
                        </div>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === worker.id ? null : worker.id);
                        }}
                        className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <Icon icon="lucide:more-horizontal" className="w-3.5 h-3.5" />
                    </button>

                    {openMenuId === worker.id && (
                        <div
                            className="absolute right-0 top-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1.5 min-w-[140px] z-20"
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
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                                <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                                O'zgartirish
                            </button>
                            <button
                                onClick={() => handleDelete(worker.id)}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                                <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                                O'chirish
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats / Numbers */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">Tajriba</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{getExperience()}</span>
            </div>

            {worker.currentDebt !== undefined && worker.currentDebt > 0 && (
                <div className="flex items-center justify-between mb-2 mt-1.5">
                    <span className="text-orange-400 dark:text-orange-500/80 text-xs font-medium">Joriy qarz</span>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        <CurrencyDisplay amount={worker.currentDebt} originalCurrency={worker.salaryCurrency || 'UZS'} forceOriginal={true} />
                    </span>
                </div>
            )}
            {worker.legacyDebt !== undefined && worker.legacyDebt > 0 && (
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-red-400 dark:text-red-500/80 text-xs font-medium">Eski qarz</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        <CurrencyDisplay amount={worker.legacyDebt} originalCurrency="USD" forceOriginal={true} />
                    </span>
                </div>
            )}

            {/* Spacer to push bottom section down */}
            <div className="mt-6 flex-grow"></div>

            {/* Bottom: Action Buttons */}
            <div className="flex gap-2 mt-auto pt-2">
                <button
                    onClick={() => navigate(`/workers/${worker.id}/report`)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700/50"
                    title="Hisobot"
                >
                    <Icon icon="lucide:bar-chart-2" className="w-4 h-4" />
                </button>
                <button
                    onClick={() => navigate(`/workers/${worker.id}`)}
                    className="flex-1 h-12 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full font-medium text-sm transition-colors shadow-[0_4px_14px_0_rgba(59,130,246,0.39)]"
                >
                    Batafsil
                </button>
            </div>
        </div>
    );
});

export default WorkerCard;
