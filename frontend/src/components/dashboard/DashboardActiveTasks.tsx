import React from 'react';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';

interface DashboardActiveTasksProps {
  premiumStats: any;
}

export const DashboardActiveTasks: React.FC<DashboardActiveTasksProps> = ({ premiumStats }) => {
  return (
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col h-full" style={{ height: '515px' }}>
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-fuchsia-50 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/30">
          <Icon icon="lucide:activity" className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Kim qaysi ishni ko'proq bajaryapti</h2>
          <p className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-0.5">Xizmatlar kesimida</p>
        </div>
      </div>

      {!premiumStats ? (
        <div className="flex items-center justify-center py-12 h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div></div>
      ) : (() => {
        const activeTasks = premiumStats.activeTasks || [];
        if (activeTasks.length === 0) return <div className="text-center py-12 text-gray-400">Jarayonda vazifalar yo'q</div>;

        const isDark = document.documentElement.classList.contains('dark');

        // Extract all unique stage names across top 3 of every worker
        const allUniqueStages = Array.from(new Set(activeTasks.flatMap((w: any) => w.stages?.map((s: any) => s.name) || [])));

        const series = allUniqueStages.map((stageName) => ({
          name: stageName as string,
          data: activeTasks.map((w: any) => {
            const stageObj = w.stages?.find((s: any) => s.name === stageName);
            return stageObj ? stageObj.count : 0;
          })
        }));

        const categories = activeTasks.map((w: any) => w.name);

        return (
          <div className="relative z-10 flex flex-col flex-1 mt-2">
            <Chart
              options={{
                chart: { type: 'bar', stacked: true, toolbar: { show: false } },
                plotOptions: {
                  bar: {
                    horizontal: true,
                    borderRadius: 2,
                    dataLabels: { total: { enabled: true, style: { fontSize: '11px', fontWeight: 800, color: isDark ? '#fff' : '#000' } } }
                  }
                },
                colors: [
                  '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6',
                  '#06b6d4', '#f43f5e', '#84cc16', '#d946ef', '#14b8a6'
                ], // Extended colors just in case
                dataLabels: {
                  enabled: true,
                  style: { fontSize: '10px', colors: ['#fff'] },
                  formatter: function (val: number) {
                    return val > 0 ? val : '';
                  }
                },
                stroke: { width: 1, colors: [isDark ? '#1f2937' : '#fff'] },
                xaxis: {
                  categories: categories,
                  labels: { style: { colors: isDark ? '#9ca3af' : '#4b5563', fontSize: '11px' } },
                  axisBorder: { show: false },
                  axisTicks: { show: false }
                },
                yaxis: {
                  labels: {
                    maxWidth: 100,
                    style: {
                      fontSize: '11px',
                      fontWeight: 600,
                      colors: isDark ? '#9ca3af' : '#4b5563'
                    }
                  }
                },
                grid: {
                  borderColor: isDark ? '#374151' : '#f3f4f6',
                  strokeDashArray: 4,
                  xaxis: { lines: { show: true } },
                  yaxis: { lines: { show: false } }
                },
                legend: {
                  position: 'bottom',
                  labels: { colors: isDark ? '#d1d5db' : '#374151' },
                  markers: { strokeWidth: 0 }
                },
                tooltip: {
                  theme: 'dark'
                }
              }}
              series={series}
              type="bar"
              height={350}
            />
          </div>
        );
      })()}
    </div>
  );
};
