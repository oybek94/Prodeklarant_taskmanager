import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react';

const AddDebtModal = ({ isOpen, onClose, onSuccess }: any) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [persons, setPersons] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        apiClient.get('/debts/persons').then(res => setPersons(res.data)).catch(console.error);
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !amount) {
            toast.error('Barcha maydonlarni to\'ldiring');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/debts', {
                name: name.trim(),
                amount: parseFloat(amount),
                currency,
                date,
                dueDate: dueDate || null,
                comment
            });
            toast.success('Qarz qo\'shildi');
            
            setName('');
            setAmount('');
            setComment('');
            setDueDate('');
            
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:plus-circle" className="text-blue-500 w-5 h-5"/>
                        Yangi qarz
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icon icon="lucide:x" className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shaxs yoki Korxona nomi</label>
                        <input 
                            type="text"
                            list="persons-list"
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
                            placeholder="Ism kiriting yoki tanlang..."
                            required
                        />
                        <datalist id="persons-list">
                            {persons.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Summa</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valyuta</label>
                            <select 
                                value={currency} 
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
                            >
                                <option value="USD">USD</option>
                                <option value="UZS">UZS</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Olingan / Berilgan sana</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Qaytarilish muddati</label>
                            <input 
                                type="date" 
                                value={dueDate} 
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 px-4 py-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                        <textarea 
                            value={comment} 
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 px-4 py-2 h-20 resize-none"
                            placeholder="Qo'shimcha ma'lumotlar..."
                        ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                        >
                            Bekor qilish
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {loading ? <Icon icon="lucide:loader-2" className="animate-spin w-5 h-5" /> : 'Saqlash'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDebtModal;
