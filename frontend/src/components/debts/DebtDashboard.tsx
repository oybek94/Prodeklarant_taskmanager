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
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-sm text-gray-500 font-semibold tracking-wide">AKTIV QARZLAR (JAMI USD)</div>
                </div>
                <div className="text-2xl font-black text-gray-800 tracking-tight">
                    {formatCurrency(stats?.totalActiveDebtUsd || 0, 'USD')}
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Icon icon="lucide:check-circle" className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-sm text-gray-500 font-semibold tracking-wide">TO'LANGAN (JAMI USD)</div>
                </div>
                <div className="text-2xl font-black text-gray-800 tracking-tight">
                    {formatCurrency(stats?.totalPaidUsd || 0, 'USD')}
                </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-5 relative overflow-hidden ring-1 ring-black/5 group hover:bg-white/80 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Icon icon="lucide:users" className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-sm text-gray-500 font-semibold tracking-wide">QARZ REKORDLARI</div>
                </div>
                <div className="text-2xl font-black text-gray-800 tracking-tight">
                    {stats?.totalDebtsCount || 0} ta
                </div>
            </div>
        </div>
    );
};

export default DebtDashboard;
