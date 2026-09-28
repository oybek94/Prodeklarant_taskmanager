import React from 'react';
import { Icon } from '@iconify/react';
import { Doughnut } from 'react-chartjs-2';
import type { DashboardStats } from '../../types/dashboard';
import { TOOLTIP_STYLE, percentOf } from './chartSetup';

const BRANCH_COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'];

interface DashboardBranchChartProps {
  stats: DashboardStats | null;
  loading: boolean;
  statsError: string | null;
}

export const DashboardBranchChart: React.FC<DashboardBranchChartProps> = ({ stats, loading, statsError }) => {
  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-full min-h-[420px] overflow-hidden group">
      
      {/* Background Glow */}
      <div className="absolute -left-20 -bottom-20 w-[30rem] h-[30rem] bg-gradient-to-tr from-blue-400/10 via-indigo-400/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center shadow-inner shrink-0">
          <Icon icon="solar:pie-chart-2-bold-duotone" className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Filiallar ulushi</h2>
          <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mt-1">Bajarilgan ishlar</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      ) : (() => {
        const branches = stats?.tasksByBranch;

        const hasValidData = branches &&
          Array.isArray(branches) &&
          branches.length > 0 &&
          branches.some((b) => b && b.count > 0);

        if (statsError) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400 relative z-10">
              <Icon icon="solar:buildings-2-bold-duotone" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">{statsError}</p>
            </div>
          );
        }

        if (!hasValidData) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400 relative z-10">
              <Icon icon="solar:buildings-2-bold-duotone" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Filiallar bo'yicha ma'lumotlar topilmadi</p>
            </div>
          );
        }

        const validBranches = branches.filter((b) => b && b.branchName && b.count > 0);
        const labels = validBranches.map((b) => b.branchName);
        const series = validBranches.map((b) => b.count);
        const total = series.reduce((sum, n) => sum + n, 0);

        if (labels.length === 0 || series.length === 0 || total === 0) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400 relative z-10">
              <Icon icon="solar:buildings-2-bold-duotone" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Filiallar bo'yicha ma'lumotlar topilmadi</p>
            </div>
          );
        }

        return (
          <div className="relative z-10 flex flex-col flex-1 mt-2">
            <div className="flex justify-center shrink-0">
              <div className="relative w-[250px] h-[250px]">
                <Doughnut
                  data={{
                    labels,
                    datasets: [{
                      data: series,
                      backgroundColor: labels.map((_, idx) => BRANCH_COLORS[idx % BRANCH_COLORS.length]),
                      borderWidth: 0,
                      hoverOffset: 6,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                      legend: { display: false },
                      datalabels: { display: false },
                      tooltip: {
                        ...TOOLTIP_STYLE,
                        callbacks: {
                          label: (ctx) => ` ${ctx.label}: ${ctx.parsed} ta (${percentOf(ctx.parsed, total)}%)`,
                        },
                      },
                    },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-gray-400">Jami task</span>
                  <span className="text-[28px] font-black text-indigo-600 dark:text-indigo-400 leading-tight">{total.toLocaleString('uz-UZ')} ta</span>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap justify-center gap-2">
              {validBranches.map((branch, idx) => {
                const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
                return (
                  <div key={branch.branchId ?? branch.branchName} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-100/50 dark:border-gray-700/50 transition-all hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm hover:scale-105">
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }}></span>
                    <span className="text-[11px] font-bold tracking-wide text-gray-500 dark:text-gray-400">{branch.branchName}</span>
                    <span className="text-[12px] font-black text-gray-900 dark:text-white ml-0.5">{branch.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
