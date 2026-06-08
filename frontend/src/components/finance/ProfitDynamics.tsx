import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProfitDynamicsProps {
    profitDynamics: { month: string; revenue: number; expenses: number }[];
    formatCurrency: (amount: number) => string;
}

const ProfitDynamics = React.memo(({ profitDynamics, formatCurrency }: ProfitDynamicsProps) => {

    const chartData = useMemo(() => {
        return profitDynamics.map(p => ({ ...p, profit: p.revenue - p.expenses }));
    }, [profitDynamics]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
                        <Icon icon="lucide:bar-chart-3" className="w-5 h-5 text-indigo-500" />
                        Foyda Dinamikasi
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Oylik kesimda tushum va xarajatlar tahlili</p>
                </div>

                <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Tushum
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div> Xarajat
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Sof Foyda
                    </div>
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="profitColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickMargin={12} axisLine={false} tickLine={false} />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                            axisLine={false}
                            tickLine={false}
                            width={60}
                        />
                        <Tooltip
                            formatter={(value: any, name: any) => [formatCurrency(Number(value)), name === 'profit' ? 'Sof Foyda' : name === 'revenue' ? 'Tushum' : 'Xarajat']}
                            labelStyle={{ color: '#9ca3af', marginBottom: '8px' }}
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '12px', padding: '12px' }}
                        />
                        <Area type="monotone" dataKey="revenue" stackId="2" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                        <Area type="monotone" dataKey="expenses" stackId="3" stroke="#f87171" strokeWidth={2} fillOpacity={0} />
                        <Area type="monotone" dataKey="profit" stackId="1" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#profitColor)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

export default ProfitDynamics;
