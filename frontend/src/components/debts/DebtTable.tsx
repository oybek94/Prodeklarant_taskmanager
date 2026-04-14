import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../../lib/api';
import toast from 'react-hot-toast';
import DebtPaymentModal from './DebtPaymentModal';
import DebtHistoryModal from './DebtHistoryModal';
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
            return `${new Intl.NumberFormat('uz-UZ').format(amount).replace(/,/g, ' ')} UZS`;
        }
        return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount).replace(/,/g, ' ');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('uz-UZ');
    };

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

    return (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Qarzlar Ro'yxati</h2>
                <div className="flex w-full md:w-auto">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full md:w-auto">
                        <button
                            onClick={() => { setFilters({ ...filters, status: '' }); setPage(1); }}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filters.status === '' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Barchasi
                        </button>
                        <button
                            onClick={() => { setFilters({ ...filters, status: 'active' }); setPage(1); }}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filters.status === 'active' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Qolganlar
                        </button>
                        <button
                            onClick={() => { setFilters({ ...filters, status: 'paid' }); setPage(1); }}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filters.status === 'paid' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            To'langan
                        </button>
                    </div>
                </div>
            </div>

            {isMobile ? (
                <div className="space-y-4">
                    {loading && debts.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">
                            <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                            Yuklanmoqda...
                        </div>
                    ) : debts.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">
                            <Icon icon="lucide:inbox" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            Qarzlar topilmadi
                        </div>
                    ) : (
                        debts.map((debt: any) => {
                            const payProgress = debt.amount > 0 ? Math.min(100, (debt.totalPaid / debt.amount) * 100) : 0;
                            const isPaid = debt.remaining <= 0;
                            const daysRemaining = getDaysRemaining(debt.dueDate);
                            const timeProgress = calculateTimeProgress(debt.date, debt.dueDate);

                            let timeColor = 'bg-blue-500';
                            let timeTextColor = 'text-blue-600';
                            if (daysRemaining !== null) {
                                if (daysRemaining < 0 && !isPaid) {
                                    timeColor = 'bg-rose-500';
                                    timeTextColor = 'text-rose-600';
                                } else if (daysRemaining <= 3 && !isPaid) {
                                    timeColor = 'bg-amber-500';
                                    timeTextColor = 'text-amber-600';
                                }
                            }

                            return (
                                <div key={debt.id} onClick={() => { setSelectedHistoryDebt(debt); setHistoryModalOpen(true); }} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4 cursor-pointer hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{debt.name}</h3>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(debt.date)} da ochilgan</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(debt.amount, debt.currency)}</p>
                                            <p className={`text-[10px] font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {isPaid ? "To'langan" : `${formatCurrency(debt.remaining, debt.currency)} qoldi`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {debt.dueDate && (
                                            <div>
                                                <div className="flex justify-between text-[10px] mb-1 font-bold uppercase tracking-wider">
                                                    <span className={timeTextColor}>Muddat: {isPaid ? "Yopilgan" : (daysRemaining! < 0 ? `${Math.abs(daysRemaining!)} kun o'tdi` : `${daysRemaining} kun qoldi`)}</span>
                                                    <span className="text-gray-400">{formatDate(debt.dueDate)}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-1.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : timeColor}`} style={{ width: `${isPaid ? 100 : timeProgress}%` }}></div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex justify-between text-[10px] mb-1 font-bold uppercase tracking-wider">
                                                <span className={isPaid ? "text-emerald-600" : "text-amber-600"}>To'lov holati</span>
                                                <span className="text-gray-400">{payProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div className={`h-1.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${payProgress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    {debt.comment && (
                                        <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg text-[11px] text-gray-600 dark:text-gray-400 italic">
                                            {debt.comment}
                                        </div>
                                    )}

                                    <div className="pt-2 flex gap-2">
                                        {!isPaid && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedDebt(debt); setPaymentModalOpen(true); }}
                                                className="flex-1 flex justify-center items-center gap-2 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
                                            >
                                                <Icon icon="lucide:check-circle-2" className="w-4 h-4" />
                                                To'lov qilish
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(debt.id); }}
                                            className={`flex justify-center items-center p-2 rounded-xl border border-rose-100 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all ${isPaid ? 'flex-1' : ''}`}
                                        >
                                            <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                            {isPaid && <span className="ml-2 text-xs font-bold">O'chirish</span>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-800">Shaxs/Korxona</th>
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-800">Muddat</th>
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-800">Jami qarz</th>
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-800">To'lov Holati</th>
                                <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-800 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && debts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Yuklanmoqda...
                                    </td>
                                </tr>
                            ) : debts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        <Icon icon="lucide:inbox" className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        Qarzlar topilmadi
                                    </td>
                                </tr>
                            ) : (
                                debts.map((debt: any) => {
                                    const payProgress = debt.amount > 0 ? Math.min(100, (debt.totalPaid / debt.amount) * 100) : 0;
                                    const isPaid = debt.remaining <= 0;

                                    const daysRemaining = getDaysRemaining(debt.dueDate);
                                    const timeProgress = calculateTimeProgress(debt.date, debt.dueDate);

                                    let timeColor = 'bg-blue-500';
                                    let timeTextColor = 'text-blue-600';
                                    if (daysRemaining !== null) {
                                        if (daysRemaining < 0 && !isPaid) {
                                            timeColor = 'bg-rose-500';
                                            timeTextColor = 'text-rose-600';
                                        } else if (daysRemaining <= 3 && !isPaid) {
                                            timeColor = 'bg-amber-500';
                                            timeTextColor = 'text-amber-600';
                                        }
                                    }

                                    return (
                                        <tr key={debt.id} onClick={() => { setSelectedHistoryDebt(debt); setHistoryModalOpen(true); }} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                                            <td className="p-3 border-b border-gray-100 dark:border-gray-800">
                                                <p className="font-semibold text-gray-800">{debt.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(debt.date)} da ochilgan</p>
                                            </td>

                                            <td className="p-3 border-b border-gray-50 w-48">
                                                {debt.dueDate ? (
                                                    <>
                                                        <div className="flex justify-between text-xs mb-1 font-medium">
                                                            <span className={timeTextColor}>
                                                                {isPaid ? "Yopilgan" : (daysRemaining! < 0 ? `${Math.abs(daysRemaining!)} kun o'tdi` : `${daysRemaining} kun qoldi`)}
                                                            </span>
                                                            <span className="text-gray-500">{formatDate(debt.dueDate)}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-0.5 dark:bg-gray-700 overflow-hidden">
                                                            <div
                                                                className={`h-0.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : timeColor}`}
                                                                style={{ width: `${isPaid ? 100 : timeProgress}%` }}
                                                            ></div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Muddat belgilanmagan</span>
                                                )}
                                            </td>

                                            <td className="p-3 border-b border-gray-100 dark:border-gray-800">
                                                <p className="font-bold text-gray-900">{formatCurrency(debt.amount, debt.currency)}</p>
                                                <p className="text-xs text-gray-500">{debt.comment}</p>
                                            </td>

                                            <td className="p-3 border-b border-gray-50 w-48">
                                                <div className="flex justify-between text-xs mb-1 font-medium">
                                                    <span className={isPaid ? "text-emerald-600" : "text-amber-600"}>
                                                        {isPaid ? "To'liq to'langan" : "Qoldiq: " + formatCurrency(debt.remaining, debt.currency)}
                                                    </span>
                                                    <span className="text-gray-500">{payProgress.toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-0.5 dark:bg-gray-700 overflow-hidden">
                                                    <div
                                                        className={`h-0.5 rounded-full transition-all duration-500 ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${payProgress}%` }}
                                                    ></div>
                                                </div>
                                            </td>

                                            <td className="p-3 border-b border-gray-50 text-right">
                                                <div className="flex justify-end gap-2 items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                    {!isPaid && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedDebt(debt); setPaymentModalOpen(true); }}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                                            title="To'lov qilish"
                                                        >
                                                            <Icon icon="lucide:check-circle-2" className="w-4 h-4" />
                                                            To'lov
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(debt.id); }}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <button 
                        disabled={page === 1} 
                        onClick={() => setPage((p: number) => p - 1)}
                        className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50 text-sm text-gray-600 hover:bg-gray-50"
                    >
                        Oldingi
                    </button>
                    <span className="text-sm font-medium text-gray-700">Sahifa {page} / {totalPages}</span>
                    <button 
                        disabled={page === totalPages} 
                        onClick={() => setPage((p: number) => p + 1)}
                        className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50 text-sm text-gray-600 hover:bg-gray-50"
                    >
                        Keyingi
                    </button>
                </div>
            )}

            {selectedDebt && (
                <DebtPaymentModal 
                    isOpen={paymentModalOpen} 
                    onClose={() => setPaymentModalOpen(false)}
                    debt={selectedDebt}
                    onSuccess={() => {
                        setPaymentModalOpen(false);
                        reloadData();
                    }}
                />
            )}

            {selectedHistoryDebt && (
                <DebtHistoryModal
                    isOpen={historyModalOpen}
                    onClose={() => setHistoryModalOpen(false)}
                    debt={selectedHistoryDebt}
                    onSuccess={() => {
                        setHistoryModalOpen(false);
                        reloadData();
                    }}
                />
            )}
        </div>
    );
};

export default DebtTable;
