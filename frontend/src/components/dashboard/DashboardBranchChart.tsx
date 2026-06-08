import React from 'react';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';
import type { DashboardStats } from '../../types/dashboard';

interface DashboardBranchChartProps {
  stats: DashboardStats | null;
  loading: boolean;
  statsError: string | null;
}

export const DashboardBranchChart: React.FC<DashboardBranchChartProps> = ({ stats, loading, statsError }) => {
  return (
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 flex flex-col h-full relative overflow-hidden group" style={{ height: '515px' }}>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
          <Icon icon="lucide:pie-chart" className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Filiallar ulushi</h2>
          <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Bajarilgan ishlar</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      ) : (() => {
        const branches = stats?.tasksByBranch;

        const hasValidData = branches &&
          Array.isArray(branches) &&
          branches.length > 0 &&
          branches.some((b: any) => b && b.count > 0);

        if (statsError) {
          return (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="lucide:building" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{statsError}</p>
            </div>
          );
        }

        if (!hasValidData) {
          return (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="lucide:building" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Filiallar bo'yicha ma'lumotlar topilmadi</p>
            </div>
          );
        }

        const validBranches = branches.filter((b: any) => b && b.branchName && b.count > 0);
        const labels = validBranches.map((b: any) => b.branchName);
        const series = validBranches.map((b: any) => b.count);

        if (labels.length === 0 || series.length === 0 || series.every((s: number) => s === 0)) {
          return (
            <div className="text-center py-12 text-gray-400">
              <Icon icon="lucide:building" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Filiallar bo'yicha ma'lumotlar topilmadi</p>
            </div>
          );
        }

        return (
          <div className="relative z-10 flex flex-col flex-1">
            <div className="flex justify-center -mt-2">
              <Chart
                key={`branch-chart-${series.join('-')}-${labels.join('-')}`}
                options={{
                  chart: {
                    type: 'donut',
                    height: 280,
                    toolbar: { show: false },
                    animations: { speed: 600 }
                  },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: '72%',
                        labels: {
                          show: true,
                          name: { show: true, fontSize: '13px', fontWeight: 600, color: '#9ca3af', offsetY: -5 },
                          value: { show: true, fontSize: '30px', fontWeight: 800, color: '#6366f1', offsetY: 5 },
                          total: {
                            show: true,
                            showAlways: true,
                            label: 'Jami task',
                            color: '#9ca3af',
                            formatter: function (w: any) {
                              return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0).toLocaleString('uz-UZ') + ' ta';
                            }
                          }
                        }
                      }
                    }
                  },
                  labels: labels,
                  colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'],
                  legend: {
                    show: false, // Hidden standard legend, manual below
                  },
                  dataLabels: {
                    enabled: false, // Keeps chart clean
                  },
                  stroke: {
                    width: 0, // Seamless gradient-like cuts
                  },
                  tooltip: {
                    theme: 'dark',
                    y: {
                      formatter: function (value: number, opts: any) {
                        const total = opts.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return `${value} ta (${percent}%)`;
                      }
                    },
                  },
                }}
                series={series}
                type="donut"
                height={280}
              />
            </div>
            <div className="mt-auto pt-5 border-t border-gray-100/60 dark:border-white/10 flex flex-wrap justify-center gap-2.5">
              {validBranches.map((branch: any, idx: number) => {
                const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'];
                const color = colors[idx % colors.length];
                return (
                  <div key={branch.branchId ?? branch.branchName} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                    <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }}></span>
                    <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">{branch.branchName}</span>
                    <span className="text-[12px] font-black text-gray-900 dark:text-white ml-0.5">{branch.count} <span className="text-gray-400 font-normal ml-0.5 text-[10px]">ta</span></span>
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
