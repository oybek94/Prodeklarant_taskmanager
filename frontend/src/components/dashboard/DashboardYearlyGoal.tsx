import React from 'react';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';
import type { DashboardStats, CompletedSummary } from '../../types/dashboard';

interface DashboardYearlyGoalProps {
  stats: DashboardStats | null;
  completedSummary: CompletedSummary | null;
  loadingCompletedSummary: boolean;
}

export const DashboardYearlyGoal: React.FC<DashboardYearlyGoalProps> = ({
  stats,
  completedSummary,
  loadingCompletedSummary,
}) => {
  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-[540px] overflow-hidden group">
      {/* Premium Glow Effect */}
      <div className="absolute -right-20 -top-20 w-[30rem] h-[30rem] bg-gradient-to-bl from-blue-400/10 via-indigo-400/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-4 mb-4 relative z-10 shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 shrink-0">
          <Icon icon="lucide:target" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Yillik maqsad</h2>
          <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mt-1">Joriy {new Date().getFullYear()} yil</p>
        </div>
      </div>

      {loadingCompletedSummary ? (
        <div className="flex-1 flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (() => {
        const TARGET_TASKS = stats?.yearlyGoalTarget ?? 2000;
        const completed = completedSummary?.year?.count ?? 0;
        const percentage = Math.min((completed / TARGET_TASKS) * 100, 100);
        const remaining = Math.max(TARGET_TASKS - completed, 0);

        const gaugeOptions: any = {
          chart: {
            type: 'radialBar',
            height: 280,
            sparkline: { enabled: true },
          },
          series: [percentage],
          plotOptions: {
            radialBar: {
              startAngle: -90,
              endAngle: 90,
              track: {
                background: 'rgba(150, 150, 150, 0.15)',
                strokeWidth: '97%',
                margin: 5,
              },
              dataLabels: {
                name: {
                  show: true,
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  color: '#9ca3af',
                  offsetY: -20,
                },
                value: {
                  show: true,
                  fontSize: '32px',
                  fontFamily: 'inherit',
                  fontWeight: 900,
                  color: '#4f46e5',
                  offsetY: -5,
                  formatter: function (val: number) {
                    return Math.round((val / 100) * TARGET_TASKS).toString();
                  },
                },
              },
            },
          },
          fill: {
            type: 'gradient',
            gradient: {
              shade: 'light',
              type: 'horizontal',
              shadeIntensity: 0.5,
              gradientToColors: ['#3b82f6', '#8b5cf6'],
              inverseColors: true,
              opacityFrom: 1,
              opacityTo: 1,
              stops: [0, 100],
            },
          },
          stroke: {
            lineCap: 'round',
          },
          labels: ['Yakunlangan'],
        };

        return (
          <div className="relative z-10 flex flex-col flex-1 mt-2">
            <div className="flex justify-center shrink-0 mb-4" style={{ height: '180px' }}>
              <Chart
                options={gaugeOptions}
                series={gaugeOptions.series}
                type="radialBar"
                height={280}
              />
            </div>
            
            <div className="flex-1 flex flex-col justify-end gap-2.5 mt-auto">
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-700/50 hover:bg-white/60 dark:hover:bg-gray-700/50 transition-colors">
                <span className="text-[12px] font-bold tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-2.5 uppercase">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span> Maqsad
                </span>
                <span className="text-base font-black text-gray-900 dark:text-white">{TARGET_TASKS.toLocaleString('uz-UZ')}</span>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-700/50 hover:bg-white/60 dark:hover:bg-gray-700/50 transition-colors">
                <span className="text-[12px] font-bold tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-2.5 uppercase">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span> Yakunlangan
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{completed.toLocaleString('uz-UZ')}</span>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-700/50 hover:bg-white/60 dark:hover:bg-gray-700/50 transition-colors">
                <span className="text-[12px] font-bold tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-2.5 uppercase">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span> Qolgan
                </span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">{remaining.toLocaleString('uz-UZ')}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100/60 dark:border-gray-700/50">
                <div className="bg-gray-200/60 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden flex items-center shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000 rounded-full relative"
                    style={{ width: `${percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-1/2 blur-sm rotate-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <div className="text-center mt-3">
                  <span className="text-[11px] uppercase tracking-widest font-black text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <Icon icon="lucide:check-circle-2" className="w-4 h-4 text-emerald-500" />
                    {percentage.toFixed(1)}% bajarildi
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
