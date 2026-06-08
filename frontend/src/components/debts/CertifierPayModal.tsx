import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import apiClient from '../../lib/api';
import DateInput from '../DateInput';

const CertifierPayModal = React.memo(({ 
    isOpen, 
    onClose, 
    onSuccess, 
    type, 
    remainingAmount,
    branchId 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSuccess: () => void; 
    type: 'ST1' | 'FITO' | null;
    remainingAmount: number;
    branchId: number | null;
}) => {
    const [amount, setAmount] = useState<string>(remainingAmount.toString());
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Update amount if remainingAmount changes
    React.useEffect(() => {
        if (isOpen) {
            setAmount(remainingAmount.toString());
        }
    }, [isOpen, remainingAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            
            // Format number without spaces
            const cleanAmount = amount.replace(/\s+/g, '');

            await apiClient.post('/transactions', {
                type: 'EXPENSE',
                amount: Number(cleanAmount),
                currency: 'UZS',
                paymentMethod: 'CASH',
                date: new Date(date).toISOString(),
                expenseCategory: type, // This will be ST1 or FITO
                comment: `${type} qarzi uchun to'lov`,
                branchId: branchId
            });

            onSuccess();
        } catch (error) {
            console.error('To\'lov qilishda xato:', error);
            alert('Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
        {isOpen && type && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <motion.div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {type} To'lov Qilish
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Icon icon="lucide:x" className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Summa (UZS)
                        </label>
                        <input
                            type="text"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all"
                            placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Qolgan qarz: {new Intl.NumberFormat('en-US').format(remainingAmount).replace(/,/g, ' ').replace(/\./g, ',')} UZS
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sana
                        </label>
                        <DateInput
                            required
                            value={date}
                            onChange={(val) => setDate(val)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                        >
                            Bekor qilish
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />}
                            To'lash
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
        )}
        </AnimatePresence>
    );
});

export default CertifierPayModal;
