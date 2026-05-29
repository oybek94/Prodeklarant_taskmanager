import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../../lib/api';
import toast from 'react-hot-toast';
import DebtPaymentModal from './DebtPaymentModal';
import DebtHistoryModal from './DebtHistoryModal';
import { formatDateTime } from '../../utils/dateFormatting';
import { useIsMobile } from '../../utils/useIsMobile';

const DebtTable = ({
    debts,
    loading,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    reloadData
}: any) => {
    const isMobile = useIsMobile();
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<any>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistoryDebt, setSelectedHistoryDebt] = useState<any>(null);

    const handleDelete = async (id: number) => {
        if (!confirm('Ushbu qarzni o\'chirmoqchimisiz?')) return;
        try {
            await apiClient.delete(`/debts/${id}`);
            toast.success('Qarz muvaffaqiyatli o\'chirildi');
            reloadData();
        } catch (error) {
            toast.error('Xatolik yuz berdi');
        }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        if (currency === 'UZS') {
            return `${new Intl.NumberFormat('en-US').format(amount).replace(/,/g, ' ').replace(/\./g, ',')} UZS`;
        }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
            .format(amount).replace(/,/g, ' ').replace(/\./g, ',');
    };

    const formatDate = (dateString: string) => formatDateTime(dateString);

    const getDaysRemaining = (dueDateString: string | null) => {
        if (!dueDateString) return null;
        const due = new Date(dueDateString);
        const today = new Date();
        const diffTime = due.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const calculateTimeProgress = (dateStr: string, dueDateStr: string | null) => {
        if (!dueDateStr) return 0;
        const start = new Date(dateStr).getTime();
        const due = new Date(dueDateStr).getTime();
        const now = new Date().getTime();
        const totalDuration = due - start;
        if (totalDuration <= 0) return 100;
        const elapsed = now - start;
        const percentage = (elapsed / totalDuration) * 100;
        return Math.max(0, Math.min(100, percentage));
    };

    const getUrgencyConfig = (daysRemaining: number | null, isPaid: boolean) => {
        if (isPaid) return {
            barColor: 'bg-emerald-500',
            badge: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', label: "To'langan" },
        };
        if (daysRemaining === null) return {
            barColor: 'bg-blue-400',
            badge: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: 'Aktiv' },
        };
        if (daysRemaining < 0) return {
            barColor: 'bg-rose-500',
            badge: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', label: `${Math.abs(daysRemaining)} kun o'tdi` },
        };
        if (daysRemaining <= 3) return {
            barColor: 'bg-amber-500',
            badge: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', label: `${daysRemaining} kun qoldi` },
        };
        return {
            barColor: 'bg-blue-500',
            badge: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: `${daysRemaining} kun qoldi` },
        };
    };

    const filterTabs = [
        { value: '', label: 'Barchasi', icon: 'lucide:list' },
        { value: 'active', label: 'Aktiv', icon: 'lucide:clock' },
        { value: 'paid', label: "To'langan", icon: 'lucide:check-circle-2' },
    ];

    const EmptyState = () => (
        <div className="py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon icon="lucide:inbox" className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Qarzlar topilmadi</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Bu filtr bo'yicha natija yo'q</p>
        </div>
    );

    const LoadingState = ({ colSpan }: { colSpan?: number }) => (
        <div className="py-12 text-center">
            <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm text-gray-400">Yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Qarzlar Ro'yxati
                </h2>

                {/* Filter tabs */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg gap-0.5">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => { setFilters({ ...filters, status: tab.value }); setPage(1); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                filters.status === tab.value
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon icon={tab.icon} className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile cards */}
            {isMobile ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading && debts.length === 0 ? (
                        <LoadingState />
                    ) : debts.length === 0 ? (
                        <EmptyState />
                    ) : (
                        debts.map((debt: any) => {
                            const payProgress = debt.amount > 0 ? Math.min(100, (debt.totalPaid / debt.amount) * 100) : 0;
                            const isPaid = debt.remaining <= 0;
                            const daysRemaining = getDaysRemaining(debt.dueDate);
                            const timeProgress = calculateTimeProgress(debt.date, debt.dueDate);
                            const { barColor, badge } = getUrgencyConfig(daysRemaining, isPaid);

                            return (
                                <div
                                    key={debt.id}
                                    onClick={() => { setSelectedHistoryDebt(debt); setHistoryModalOpen(true); }}
                                    className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{debt.name}</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(debt.date)}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(debt.amount, debt.currency)}</p>
                                            <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bars */}
                                    <div className="space-y-2">
                                        {debt.dueDate && (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                    <span>Muddat</span>
                                                    <span>{formatDate(debt.dueDate)}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-1.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : barColor}`}
                                                        style={{ width: `${isPaid ? 100 : timeProgress}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                <span>{isPaid ? "To'liq to'langan" : `Qoldiq: ${formatCurrency(debt.remaining, debt.currency)}`}</span>
                                                <span>{payProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                <div className={`h-1.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${payProgress}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    {debt.comment && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                            {debt.comment}
                                        </p>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        {!isPaid && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedDebt(debt); setPaymentModalOpen(true); }}
                                                className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <Icon icon="lucide:check-circle-2" className="w-3.5 h-3.5" />
                                                To'lov qilish
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(debt.id); }}
                                            className={`flex items-center justify-center gap-1.5 py-2 px-3 border border-rose-200 dark:border-rose-800/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-xs font-medium transition-colors ${isPaid ? 'flex-1' : ''}`}
                                        >
                                            <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                                            {isPaid && <span>O'chirish</span>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* Desktop table */
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Shaxs / Korxona
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-48">
                                    Muddat
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Jami qarz
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-52">
                                    To'lov holati
                                </th>
                                <th className="px-4 py-3 w-28" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && debts.length === 0 ? (
                                <tr>
                                    <td colSpan={5}><LoadingState /></td>
                                </tr>
                            ) : debts.length === 0 ? (
                                <tr>
                                    <td colSpan={5}><EmptyState /></td>
                                </tr>
                            ) : (
                                debts.map((debt: any) => {
                                    const payProgress = debt.amount > 0 ? Math.min(100, (debt.totalPaid / debt.amount) * 100) : 0;
                                    const isPaid = debt.remaining <= 0;
                                    const daysRemaining = getDaysRemaining(debt.dueDate);
                                    const timeProgress = calculateTimeProgress(debt.date, debt.dueDate);
                                    const { barColor, badge } = getUrgencyConfig(daysRemaining, isPaid);

                                    return (
                                        <tr
                                            key={debt.id}
                                            onClick={() => { setSelectedHistoryDebt(debt); setHistoryModalOpen(true); }}
                                            className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer"
                                        >
                                            {/* Name + date */}
                                            <td className="px-4 py-3.5">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{debt.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{formatDate(debt.date)}</p>
                                            </td>

                                            {/* Due date progress */}
                                            <td className="px-4 py-3.5">
                                                {debt.dueDate ? (
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                                                                {badge.label}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{formatDate(debt.dueDate)}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : barColor}`}
                                                                style={{ width: `${isPaid ? 100 : timeProgress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Muddat yo'q</span>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3.5 text-right">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(debt.amount, debt.currency)}
                                                </p>
                                                {debt.comment && (
                                                    <p className="text-xs text-gray-400 mt-0.5 text-left max-w-[160px] truncate">{debt.comment}</p>
                                                )}
                                            </td>

                                            {/* Payment progress */}
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className={isPaid ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                                                            {isPaid ? "To'liq to'langan" : `Qoldiq: ${formatCurrency(debt.remaining, debt.currency)}`}
                                                        </span>
                                                        <span className="text-gray-400">{payProgress.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${payProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isPaid && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedDebt(debt); setPaymentModalOpen(true); }}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg text-xs font-medium transition-colors"
                                                        >
                                                            <Icon icon="lucide:check-circle-2" className="w-3.5 h-3.5" />
                                                            To'lov
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(debt.id); }}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                        title="O'chirish"
                                                    >
                                                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400">
                        Sahifa {page} / {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p: number) => p - 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <Icon icon="lucide:chevron-left" className="w-3.5 h-3.5" />
                            Oldingi
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage((p: number) => p + 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            Keyingi
                            <Icon icon="lucide:chevron-right" className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {selectedDebt && (
                <DebtPaymentModal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    debt={selectedDebt}
                    onSuccess={() => { setPaymentModalOpen(false); reloadData(); }}
                />
            )}

            {selectedHistoryDebt && (
                <DebtHistoryModal
                    isOpen={historyModalOpen}
                    onClose={() => setHistoryModalOpen(false)}
                    debt={selectedHistoryDebt}
                    onSuccess={() => { setHistoryModalOpen(false); reloadData(); }}
                />
            )}
        </div>
    );
};

export default DebtTable;
