import React from 'react';
import { Icon } from '@iconify/react';

const DebtDashboard = ({ stats, loading }: { stats: any, loading: boolean }) => {
    if (loading && !stats) return <div className="animate-pulse h-32 bg-white/50 rounded-2xl"></div>;
    
    const formatCurrency = (amount: number, currency: string = 'USD') => {
        if (currency === 'UZS') {
            const formatted = new Intl.NumberFormat('uz-UZ').format(amount).replace(/,/g, ' ');
            return <>{formatted} <small className="text-sm opacity-75">sum</small></>;
        }
        return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount).replace(/,/g, ' ');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Aktiv Qarzlar (Jami USD)</div>
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
                <div className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    {formatCurrency(stats?.totalActiveDebtUsd || 0, 'USD')}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-500 font-semibold tracking-wider uppercase">To'langan (Jami USD)</div>
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Icon icon="lucide:check-circle" className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
                <div className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    {formatCurrency(stats?.totalPaidUsd || 0, 'USD')}
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Qarz Rekordlari</div>
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Icon icon="lucide:users" className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
                <div className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    {stats?.totalDebtsCount || 0}
                </div>
            </div>
        </div>
    );
};

export default DebtDashboard;
