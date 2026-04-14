import React, { useState } from 'react';
import apiClient from '../../lib/api';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react';

const DebtPaymentModal = ({ isOpen, onClose, debt, onSuccess }: any) => {
    const [amount, setAmount] = useState(debt?.remaining || '');
    const [currency, setCurrency] = useState(debt?.currency || 'USD');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [transactionType, setTransactionType] = useState('INCOME'); // default assumption
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen && debt) {
            setAmount(debt.remaining || '');
            setCurrency(debt.currency || 'USD');
            setPaymentMethod('CASH');
            setTransactionType('INCOME');
            setDate(new Date().toISOString().split('T')[0]);
            setComment('');
        }
    }, [isOpen, debt]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) {
            toast.error('Summani kiriting');
            return;
        }

        if (parseFloat(amount) > debt.remaining) {
            toast.error('To\'lov summasi qoldiqdan oshmasligi kerak');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post(`/debts/${debt.id}/payments`, {
                amount: parseFloat(amount),
                currency,
                paymentMethod,
                transactionType,
                date,
                comment
            });
            toast.success('To\'lov muvaffaqiyatli saqlandi');
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'To\'lov saqlashda xatolik');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !debt) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon icon="lucide:check-circle-2" className="text-gray-500 w-5 h-5"/>
                        Qarzni to'lash
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <Icon icon="lucide:x" className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 rounded-xl mb-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">{debt.name}</p>
                        <div className="flex justify-between items-end">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('uz-UZ').format(debt.remaining)} <span className="text-lg text-gray-500 font-medium">{debt.currency}</span></p>
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Qoldiq summa</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">To'lov summasi</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white px-3 py-2 text-sm transition-shadow font-medium"
                                placeholder="0.00"
                                max={debt.remaining}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valyuta</label>
                            <select 
                                value={currency} 
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white px-3 py-2 text-sm transition-shadow"
                            >
                                <option value="USD">USD</option>
                                <option value="UZS">UZS</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
                            <select 
                                value={paymentMethod} 
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white px-3 py-2 text-sm transition-shadow"
                            >
                                <option value="CASH">Naqd</option>
                                <option value="CARD">Karta</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white px-3 py-2 text-sm transition-shadow"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kassa yo'nalishi (Tranzaksiya)</label>
                        <select 
                            value={transactionType} 
                            onChange={(e) => setTransactionType(e.target.value)}
                            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white px-3 py-2 text-sm transition-shadow"
                        >
                            <option value="INCOME">Kirim (Kassaga pul kiradi)</option>
                            <option value="EXPENSE">Chiqim (Kassadan pul chiqadi)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                        <input 
                            type="text"
                            value={comment} 
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white px-3 py-2 text-sm transition-shadow"
                            placeholder="Qo'shimcha ma'lumotlar..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors border-none"
                        >
                            Bekor qilish
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-4 py-2 flex items-center justify-center text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg shadow-sm disabled:opacity-50 transition-colors gap-2"
                        >
                            {loading ? <Icon icon="lucide:loader-2" className="animate-spin w-4 h-4" /> : 'To\'lovni saqlash'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DebtPaymentModal;
