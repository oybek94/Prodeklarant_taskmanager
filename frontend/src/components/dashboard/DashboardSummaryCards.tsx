import React from 'react';
import { Icon } from '@iconify/react';
import { Line } from 'react-chartjs-2';
import type { CompletedSummary } from '../../types/dashboard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface DashboardSummaryCardsProps {
  completedSummary: CompletedSummary | null;
  loadingCompletedSummary: boolean;
}

const buildSparklineData = (labels: string[], data: number[], color: string) => ({
  labels,
  datasets: [
    {
      data,
      borderColor: color,
      backgroundColor: (context: any) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return 'transparent';
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '150, 150, 150';
        };
        const rgb = hexToRgb(color);
        gradient.addColorStop(0, `rgba(${rgb}, 0.35)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0.0)`);
        return gradient;
      },
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 0,
      fill: true,
    },
  ],
});

const sparklineOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 4, bottom: 0, left: 0, right: 0 }
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
    datalabels: { display: false },
  },
  scales: {
    x: { display: false },
    y: { display: false },
  },
  events: [],
};

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  completedSummary,
  loadingCompletedSummary,
}) => {
  const cards = [
    { key: 'today', title: 'BUGUN', suffix: 'kechagiga nisbatan', icon: 'lucide:calendar', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-100/60 dark:border-emerald-800/30', spark: '#10b981', showChart: true },
    { key: 'week', title: 'HAFTALIK', suffix: 'o‘tgan haftadan', icon: 'lucide:calendar-range', bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-100/60 dark:border-blue-800/30', spark: '#3b82f6', showChart: true },
    { key: 'month', title: 'OYLIK', suffix: 'o‘tgan oydan', icon: 'lucide:calendar-days', bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-100/60 dark:border-purple-800/30', spark: '#8b5cf6', showChart: true },
    { key: 'year', title: 'YILLIK', suffix: 'o‘tgan yildan', icon: 'lucide:calendar', bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-100/60 dark:border-orange-800/30', spark: '#f97316', showChart: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((item) => {
        const data = completedSummary?.[item.key as keyof CompletedSummary];
        const delta = data?.deltaPercent ?? null;
        const deltaLabel = loadingCompletedSummary
          ? '...'
          : delta === null || delta === undefined
            ? '0%'
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
        const sparkLabels = data?.series?.labels ?? [];
        const sparkData = data?.series?.data ?? [];

        return (
          <div
            key={item.key}
            className={`group relative ${item.bg} rounded-[20px] shadow-sm border ${item.border} hover:shadow-md dark:hover:shadow-white/5 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col pt-3`}
          >
            {/* Top highlight glare */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 dark:from-white/5 to-transparent pointer-events-none rounded-t-[20px]" />

            {/* Header -> Count -> Badge row */}
            <div className="relative z-10 px-4 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-gray-800/50 backdrop-blur-md flex items-center justify-center shadow-sm border border-white dark:border-gray-700/50 shrink-0">
                  <Icon icon={item.icon} className={`w-3.5 h-3.5 ${item.text}`} />
                </div>
                <div className="text-[10px] mt-0.5 font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase truncate">{item.title}</div>
              </div>

              <div className="flex items-end justify-between gap-1 mb-1 relative z-20">
                <div className={`text-3xl font-black tracking-tighter leading-none ${item.text} drop-shadow-sm truncate pr-1`}>
                  {loadingCompletedSummary ? '...' : data?.count ?? 0}
                </div>
                <div className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 mb-0.5 ${delta === null ? 'bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400' : delta >= 0 ? 'bg-emerald-100/60 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100/60 dark:bg-red-500/20 text-red-700 dark:text-red-400'} shadow-sm`}>
                  {delta !== null && delta !== undefined && !loadingCompletedSummary && (
                    <Icon icon={delta >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'} className="w-3 h-3" />
                  )}
                  <span>{deltaLabel}</span>
                </div>
              </div>
            </div>

            {/* Bottom Chart Spread */}
            <div className="absolute inset-x-0 bottom-0 h-[65px] opacity-80 pointer-events-none rounded-b-[20px]">
              {item.showChart && Array.isArray(sparkData) && sparkData.length > 0 ? (
                <div className="w-full h-full pb-0.5">
                  <Line
                    data={buildSparklineData(sparkLabels, sparkData, item.spark)}
                    options={{ ...sparklineOptions, maintainAspectRatio: false }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-0 mt-1">
                  <span className="text-[9px] font-bold text-gray-400/50 dark:text-gray-500/70 uppercase">0 Vazifa</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
