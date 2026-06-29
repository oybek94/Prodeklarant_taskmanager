import React from 'react';
import { Icon } from '@iconify/react';

interface DebtDashboardProps {
    stats: any;
    loading: boolean;
    onPayCertifier?: (type: 'ST1' | 'FITO', amount: number, branchId: number | null) => void;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (currency === 'UZS') {
        const formatted = new Intl.NumberFormat('en-US').format(amount).replace(/,/g, ' ').replace(/\./g, ',');
        return <>{formatted} <small className="text-sm opacity-75">sum</small></>;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
        .format(amount).replace(/,/g, ' ').replace(/\./g, ',');
};

const DebtDashboard: React.FC<DebtDashboardProps> = React.memo(({ stats, loading, onPayCertifier }) => {
    if (loading && !stats) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
            ))}
        </div>
    );

    const statCards = [
        {
            label: 'Aktiv Qarzlar',
            sublabel: 'Jami USD',
            value: formatCurrency(stats?.totalActiveDebtUsd || 0, 'USD'),
            icon: 'solar:graph-up-bold-duotone',
            accent: 'border-l-rose-500',
            iconBg: 'bg-rose-50 dark:bg-rose-900/20',
            iconColor: 'text-rose-500 dark:text-rose-400',
        },
        {
            label: "To'langan",
            sublabel: 'Jami USD',
            value: formatCurrency(stats?.totalPaidUsd || 0, 'USD'),
            icon: 'solar:check-circle-bold-duotone',
            accent: 'border-l-emerald-500',
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-500 dark:text-emerald-400',
        },
        {
            label: 'Qarz Rekordlari',
            sublabel: 'Umumiy soni',
            value: stats?.totalDebtsCount || 0,
            icon: 'solar:users-group-rounded-bold-duotone',
            accent: 'border-l-indigo-500',
            iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
            iconColor: 'text-indigo-500 dark:text-indigo-400',
        },
    ];

    return (
        <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map(({ label, sublabel, value, icon, accent, iconBg, iconColor }) => (
                    <div
                        key={label}
                        className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${accent} p-5 flex items-center gap-4`}
                    >
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            <Icon icon={icon} className={`w-5 h-5 ${iconColor}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {label}
                                <span className="normal-case ml-1 opacity-70">· {sublabel}</span>
                            </p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mt-0.5">
                                {value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Certifier debt panel */}
            {stats?.certifierDebt && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Icon icon="solar:document-text-bold-duotone" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                ST va FITO Qarzlar
                            </span>
                            <span className="ml-2 text-xs text-gray-400">
                                {stats.certifierDebt.branchName}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 dark:bg-gray-700">
                        {/* ST Qarz */}
                        <div className="bg-white dark:bg-gray-800 p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">ST Qarz</p>
                                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(stats.certifierDebt.remaining.st1, 'UZS')}
                                    </p>
                                </div>
                                <div className="text-right space-y-0.5">
                                    <p className="text-xs text-gray-400">
                                        Hisoblangan: <span className="text-gray-600 dark:text-gray-300 font-medium">
                                            {new Intl.NumberFormat('en-US').format(stats.certifierDebt.accrued.st1)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        To'langan: <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                            {new Intl.NumberFormat('en-US').format(stats.certifierDebt.paid.st1)}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {stats.certifierDebt.accrued.st1 > 0 && (
                                <div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-1.5 rounded-full bg-blue-500 transition-all duration-700"
                                            style={{ width: `${Math.min(100, (stats.certifierDebt.paid.st1 / stats.certifierDebt.accrued.st1) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                                        {((stats.certifierDebt.paid.st1 / stats.certifierDebt.accrued.st1) * 100).toFixed(0)}% to'langan
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => onPayCertifier && onPayCertifier('ST1', stats.certifierDebt.remaining.st1, stats.certifierDebt.branchId)}
                                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Icon icon="solar:card-bold-duotone" className="w-4 h-4" />
                                ST To'lov
                            </button>
                        </div>

                        {/* FITO Qarz */}
                        <div className="bg-white dark:bg-gray-800 p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">FITO Qarz</p>
                                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(stats.certifierDebt.remaining.fito, 'UZS')}
                                    </p>
                                </div>
                                <div className="text-right space-y-0.5">
                                    <p className="text-xs text-gray-400">
                                        Hisoblangan: <span className="text-gray-600 dark:text-gray-300 font-medium">
                                            {new Intl.NumberFormat('en-US').format(stats.certifierDebt.accrued.fito)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        To'langan: <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                            {new Intl.NumberFormat('en-US').format(stats.certifierDebt.paid.fito)}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {stats.certifierDebt.accrued.fito > 0 && (
                                <div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700"
                                            style={{ width: `${Math.min(100, (stats.certifierDebt.paid.fito / stats.certifierDebt.accrued.fito) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                                        {((stats.certifierDebt.paid.fito / stats.certifierDebt.accrued.fito) * 100).toFixed(0)}% to'langan
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => onPayCertifier && onPayCertifier('FITO', stats.certifierDebt.remaining.fito, stats.certifierDebt.branchId)}
                                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Icon icon="solar:card-bold-duotone" className="w-4 h-4" />
                                FITO To'lov
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default DebtDashboard;
