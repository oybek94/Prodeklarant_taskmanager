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
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col justify-between" style={{ height: '565px' }}>
      {/* Premium Glow Effect */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
          <Icon icon="lucide:target" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Yillik maqsad</h2>
          <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Joriy {new Date().getFullYear()} yil</p>
        </div>
      </div>

      {loadingCompletedSummary ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
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
                  fontWeight: 600,
                  color: '#9ca3af',
                  offsetY: -25,
                },
                value: {
                  show: true,
                  fontSize: '30px',
                  fontWeight: 800,
                  color: '#6366f1',
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
          <div className="relative z-10">
            <div className="flex justify-center mb-0" style={{ lineHeight: '28px' }}>
              <Chart
                options={gaugeOptions}
                series={gaugeOptions.series}
                type="radialBar"
                height={280}
              />
            </div>
            <div className="mt-6 space-y-4 pt-6 border-t border-gray-100/60 dark:border-white/10">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Maqsad:
                </span>
                <span className="text-base font-black text-gray-900 dark:text-white">{TARGET_TASKS.toLocaleString('uz-UZ')} ta</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Yakunlangan:
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{completed.toLocaleString('uz-UZ')} ta</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Qolgan:
                </span>
                <span className="text-base font-black text-orange-600 dark:text-orange-400">{remaining.toLocaleString('uz-UZ')} ta</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100/60 dark:border-white/10">
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden flex items-center">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-700 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-center mt-2.5">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                    <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 text-emerald-500" />
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
