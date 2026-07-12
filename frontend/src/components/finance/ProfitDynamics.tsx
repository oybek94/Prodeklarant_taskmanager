import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    type ChartOptions,
    type ScriptableContext,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface ProfitDynamicsProps {
    profitDynamics: { month: string; revenue: number; expenses: number }[];
    formatCurrency: (amount: number) => string;
}

const ProfitDynamics = React.memo(({ profitDynamics, formatCurrency }: ProfitDynamicsProps) => {

    const data = useMemo(() => ({
        labels: profitDynamics.map(p => p.month),
        datasets: [
            {
                label: 'Tushum',
                data: profitDynamics.map(p => p.revenue),
                borderColor: '#10b981',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Xarajat',
                data: profitDynamics.map(p => p.expenses),
                borderColor: '#f87171',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Sof Foyda',
                data: profitDynamics.map(p => p.revenue - p.expenses),
                borderColor: '#4f46e5',
                borderWidth: 4,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                backgroundColor: (ctx: ScriptableContext<'line'>) => {
                    const { ctx: c, chartArea } = ctx.chart;
                    if (!chartArea) return 'rgba(79,70,229,0.2)';
                    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    g.addColorStop(0, 'rgba(79,70,229,0.8)');
                    g.addColorStop(1, 'rgba(79,70,229,0)');
                    return g;
                },
            },
        ],
    }), [profitDynamics]);

    const options: ChartOptions<'line'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                titleColor: '#9ca3af',
                bodyColor: '#fff',
                callbacks: {
                    label: (item) => `${item.dataset.label}: ${formatCurrency(Number(item.parsed.y))}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: '#9ca3af', font: { size: 12 } },
            },
            y: {
                grid: { color: 'rgba(55,65,81,0.3)' },
                border: { display: false },
                ticks: {
                    color: '#9ca3af',
                    font: { size: 12 },
                    callback: (val) => `${(Number(val) / 1000000).toFixed(0)}M`,
                },
            },
        },
    }), [formatCurrency]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
                        <Icon icon="solar:chart-square-bold-duotone" className="w-5 h-5 text-indigo-500" />
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
                <Line data={data} options={options} />
            </div>
        </div>
    );
});

export default ProfitDynamics;
