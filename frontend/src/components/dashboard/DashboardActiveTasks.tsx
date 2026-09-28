import React from 'react';
import { Icon } from '@iconify/react';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../contexts/ThemeContext';
import type { PremiumStats } from '../../types/dashboard';
import { ChartDataLabels, TOOLTIP_STYLE } from './chartSetup';

const STAGE_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#d946ef', '#14b8a6'];

interface DashboardActiveTasksProps {
  premiumStats: PremiumStats | null;
}

export const DashboardActiveTasks: React.FC<DashboardActiveTasksProps> = ({ premiumStats }) => {
  // Kontekstdan — mavzu almashtirilganda diagramma ranglari ham yangilanadi
  const isDark = useTheme().theme === 'dark';
  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-[540px] overflow-hidden group">
      {/* Premium Glow Effect */}
      <div className="absolute -right-20 -bottom-20 w-[30rem] h-[30rem] bg-gradient-to-bl from-fuchsia-400/10 via-pink-400/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-4 mb-4 relative z-10 shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-fuchsia-50 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/30 shrink-0">
          <Icon icon="solar:pulse-bold-duotone" className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-600 dark:text-fuchsia-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Kim qaysi ishni ko'proq bajaryapti</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-1">Bajarilgan bosqichlar · so'nggi 30 kun</p>
        </div>
      </div>

      {!premiumStats ? (
        <div className="flex-1 flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fuchsia-500"></div>
        </div>
      ) : (() => {
        const activeTasks = premiumStats.activeTasks || [];
        if (activeTasks.length === 0) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
              <Icon icon="solar:pulse-bold-duotone" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">So'nggi 30 kunda bajarilgan bosqich yo'q</p>
            </div>
          );
        }


        // Extract all unique stage names across top 3 of every worker
        const allUniqueStages = Array.from(new Set(activeTasks.flatMap((w) => w.stages?.map((s) => s.name) || [])));

        const datasets = allUniqueStages.map((stageName, idx) => ({
          label: stageName,
          data: activeTasks.map((w) => w.stages?.find((s) => s.name === stageName)?.count ?? 0),
          backgroundColor: STAGE_COLORS[idx % STAGE_COLORS.length],
          borderColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1.5,
          borderRadius: 4,
          barPercentage: 0.7,
        }));

        const categories = activeTasks.map((w) => w.name);
        const axisColor = isDark ? '#9ca3af' : '#4b5563';

        return (
          <div className="relative z-10 flex flex-col flex-1 mt-2 w-full">
            <div className="relative w-full h-[400px]">
              <Bar
                plugins={[ChartDataLabels]}
                data={{ labels: categories, datasets }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      stacked: true,
                      beginAtZero: true,
                      border: { display: false },
                      grid: { color: isDark ? '#374151' : '#f3f4f6' },
                      ticks: { color: axisColor, font: { family: 'inherit', size: 11, weight: 600 }, precision: 0 },
                    },
                    y: {
                      stacked: true,
                      border: { display: false },
                      grid: { display: false },
                      ticks: { color: axisColor, font: { family: 'inherit', size: 12, weight: 700 } },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: isDark ? '#d1d5db' : '#374151',
                        font: { family: 'inherit', size: 11, weight: 600 },
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 12,
                      },
                    },
                    datalabels: {
                      color: '#fff',
                      font: { family: 'inherit', size: 11, weight: 800 },
                      display: (ctx) => (Number(ctx.dataset.data[ctx.dataIndex]) || 0) > 0,
                    },
                    tooltip: { ...TOOLTIP_STYLE, mode: 'index', intersect: false },
                  },
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};
