import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsBlocksProps {
    topClientsByRevenue: { name: string; total: number }[];
    expensesByCategory: { name: string; sum: number }[];
    loading: boolean;
    formatCurrency: (amount: number) => string;
    expenseRatio: number;
    isRisk: boolean;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const AnalyticsBlocks = React.memo(({
    topClientsByRevenue,
    expensesByCategory,
    loading,
    formatCurrency,
    expenseRatio,
    isRisk
}: AnalyticsBlocksProps) => {

    const totalOp = useMemo(() => expensesByCategory.reduce((s, e) => s + e.sum, 0) || 1, [expensesByCategory]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* 2. Tushum analitikasi (Top 5 Mijoz) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                    <Icon icon="lucide:award" className="w-5 h-5 text-yellow-500" />
                    TOP 5 Mijozlar (Tushum bo'yicha)
                </h2>

                <div className="space-y-3 flex-grow">
                    {topClientsByRevenue.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                                    {idx + 1}
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{client.name}</span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(client.total)}</span>
                        </div>
                    ))}
                    {!loading && topClientsByRevenue.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full py-10 opacity-60">
                            <Icon icon="lucide:inbox" className="w-12 h-12 text-gray-400 mb-3" />
                            <p className="text-gray-500">Mijozlar tushumi mavjud emas</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Xarajatlar nazorati */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Icon icon="lucide:pie-chart" className="w-5 h-5 text-red-500" />
                        Xarajatlar nazorati
                    </h2>

                    {/* KPI Badge */}
                    <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm ${isRisk ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/50' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800/50'}`}>
                        <Icon icon={isRisk ? "lucide:alert-triangle" : "lucide:check-circle"} className="w-4 h-4" />
                        {expenseRatio.toFixed(1)}% Xarajat / Tushum
                    </div>
                </div>

                {/* Alert: If expense > 60% */}
                {isRisk && (
                    <div className="mb-6 p-4 md:p-5 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 flex gap-4 items-start shadow-sm animate-pulse-slight">
                        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg shrink-0">
                            <Icon icon="lucide:alert-octagon" className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">Xavf oralig'i!</h4>
                            <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed text-pretty">Xarajatlar tushumga nisbatan 60% dan oshib ketdi. Xarajatlarni optimallashtirish va moliya oqimini nazorat qilish tavsiya etiladi.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-6">
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expensesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="sum"
                                >
                                    {expensesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(val: any) => formatCurrency(Number(val))}
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        {expensesByCategory.map((exp, idx) => {
                            const pct = (exp.sum / totalOp) * 100;
                            return (
                                <div key={idx}>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                                            {exp.name}
                                        </span>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(exp.sum)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                        <div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                                    </div>
                                </div>
                            )
                        })}
                        {!loading && expensesByCategory.length === 0 && (
                            <p className="text-gray-500 text-center text-sm py-4">Xarajatlar kiritilmagan</p>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
});

export default AnalyticsBlocks;
