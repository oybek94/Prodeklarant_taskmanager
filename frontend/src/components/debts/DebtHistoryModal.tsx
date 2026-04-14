import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../../lib/api';
import toast from 'react-hot-toast';

const DebtHistoryModal = ({ isOpen, onClose, debt, onSuccess }: any) => {
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [editForm, setEditForm] = useState({
        amount: '',
        currency: 'USD',
        paymentMethod: 'CASH',
        date: '',
        comment: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen || !debt) return null;

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('uz-UZ', options);
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency }).format(amount);
    };

    const handleEditClick = (payment: any) => {
        setEditingPayment(payment);
        setEditForm({
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod || 'CASH',
            date: new Date(payment.date).toISOString().split('T')[0],
            comment: payment.comment || ''
        });
    };

    const handleDeleteClick = async (paymentId: number) => {
        if (!confirm("Ushbu to'lovni o'chirmoqchimisiz? Kassadan ham bu yozuv o'chiriladi.")) return;
        try {
            await apiClient.delete(`/debts/payments/${paymentId}`);
            toast.success("Muvaffaqiyatli o'chirildi");
            onSuccess?.();
        } catch(err) {
            toast.error("Xatolik yuz berdi");
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await apiClient.put(`/debts/payments/${editingPayment.id}`, {
                ...editForm,
                amount: Number(editForm.amount)
            });
            toast.success("Muvaffaqiyatli yangilandi");
            setEditingPayment(null);
            onSuccess?.();
            onClose(); // Optional: Close modal so user sees updated table amounts
        } catch(err) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setIsSaving(false);
        }
    };

    // Sort payments by date descending if they exist
    const sortedPayments = debt.payments ? [...debt.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon icon="lucide:history" className="text-gray-500 w-5 h-5"/>
                            To'lovlar tarixi
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium">{debt.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors self-start">
                        <Icon icon="lucide:x" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto">
                    {sortedPayments.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                                <Icon icon="lucide:receipt" className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium text-sm">Ushbu qarzdorlik bo'yicha to'lovlar tarixi yo'q</p>
                        </div>
                    ) : (
                        <div className="space-y-4 relative">
                            {/* Timeline line */}
                            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-700"></div>

                            {sortedPayments.map((payment: any, index: number) => (
                                <div key={payment.id || index} className="relative pl-10 group">
                                    {/* Timeline dot */}
                                    <div className="absolute left-[11px] top-2.5 w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"></div>
                                    
                                    {editingPayment?.id === payment.id ? (
                                        <form onSubmit={handleUpdateSubmit} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm w-full">
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Summa</label>
                                                    <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-sm" required />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valyuta</label>
                                                    <select value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-sm">
                                                        <option value="USD">USD</option>
                                                        <option value="UZS">UZS</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Usul</label>
                                                    <select value={editForm.paymentMethod} onChange={e => setEditForm({...editForm, paymentMethod: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-sm">
                                                        <option value="CASH">Naqd</option>
                                                        <option value="CARD">Karta</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sana</label>
                                                    <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-sm" required />
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Izoh</label>
                                                <input type="text" value={editForm.comment} onChange={e => setEditForm({...editForm, comment: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2 py-1.5 text-sm" />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button type="button" onClick={() => setEditingPayment(null)} className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 rounded-lg">Bekor qilish</button>
                                                <button type="submit" disabled={isSaving} className="px-3 py-1.5 text-sm text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg disabled:opacity-50">Saqlash</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-base">
                                                        {formatCurrency(payment.amount, payment.currency)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                        <Icon icon="lucide:calendar" className="w-3 h-3" />
                                                        {formatDate(payment.date)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${payment.paymentMethod === 'CARD' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                                        {payment.paymentMethod === 'CARD' ? 'KARTA' : 'NAQD'}
                                                    </span>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -mr-1">
                                                        <button onClick={() => handleEditClick(payment)} className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors" title="Tahrirlash">
                                                            <Icon icon="lucide:edit-2" className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(payment.id)} className="p-1 text-gray-400 hover:text-rose-500 rounded transition-colors" title="O'chirish">
                                                            <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {payment.comment && (
                                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                                    {payment.comment}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full py-2.5 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors border-none"
                    >
                        Yopish
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DebtHistoryModal;
