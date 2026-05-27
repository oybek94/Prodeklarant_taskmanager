import React from 'react';
import { Icon } from '@iconify/react';

const DebtDashboard = ({ stats, loading, onPayCertifier }: { stats: any, loading: boolean, onPayCertifier?: (type: 'ST1' | 'FITO', amount: number, branchId: number | null) => void }) => {
    if (loading && !stats) return <div className="animate-pulse h-32 bg-white/50 rounded-2xl"></div>;
    
    const formatCurrency = (amount: number, currency: string = 'USD') => {
        if (currency === 'UZS') {
            const formatted = new Intl.NumberFormat('en-US').format(amount).replace(/,/g, ' ').replace(/\./g, ',');
            return <>{formatted} <small className="text-sm opacity-75">sum</small></>;
        }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount).replace(/,/g, ' ').replace(/\./g, ',');
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

            {stats?.certifierDebt && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 relative overflow-hidden flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-xs text-gray-500 font-semibold tracking-wider uppercase">
                            ST va FITO Qarzlar ({stats.certifierDebt.branchName})
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Icon icon="lucide:file-text" className="w-5 h-5" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ST Qarz</p>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {formatCurrency(stats.certifierDebt.remaining.st1, 'UZS')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Hisoblangan: {new Intl.NumberFormat('en-US').format(stats.certifierDebt.accrued.st1)}</p>
                                    <p className="text-xs text-gray-400">To'langan: {new Intl.NumberFormat('en-US').format(stats.certifierDebt.paid.st1)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onPayCertifier && onPayCertifier('ST1', stats.certifierDebt.remaining.st1, stats.certifierDebt.branchId)}
                                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                            >
                                <Icon icon="lucide:credit-card" className="w-4 h-4" />
                                ST To'lov
                            </button>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">FITO Qarz</p>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {formatCurrency(stats.certifierDebt.remaining.fito, 'UZS')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Hisoblangan: {new Intl.NumberFormat('en-US').format(stats.certifierDebt.accrued.fito)}</p>
                                    <p className="text-xs text-gray-400">To'langan: {new Intl.NumberFormat('en-US').format(stats.certifierDebt.paid.fito)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onPayCertifier && onPayCertifier('FITO', stats.certifierDebt.remaining.fito, stats.certifierDebt.branchId)}
                                className="w-full mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition font-medium flex items-center justify-center gap-2"
                            >
                                <Icon icon="lucide:credit-card" className="w-4 h-4" />
                                FITO To'lov
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtDashboard;
