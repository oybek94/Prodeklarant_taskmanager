import React from 'react';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';

interface DashboardActiveTasksProps {
  premiumStats: any;
}

export const DashboardActiveTasks: React.FC<DashboardActiveTasksProps> = ({ premiumStats }) => {
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
          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-1">Xizmatlar kesimida</p>
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
              <p className="font-bold text-sm">Jarayonda vazifalar yo'q</p>
            </div>
          );
        }

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
          <div className="relative z-10 flex flex-col flex-1 mt-2 w-full">
            <Chart
              options={{
                chart: { 
                  type: 'bar', 
                  stacked: true, 
                  toolbar: { show: false },
                  animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                  }
                },
                plotOptions: {
                  bar: {
                    horizontal: true,
                    borderRadius: 4,
                    columnWidth: '60%',
                    barHeight: '70%',
                    dataLabels: { 
                      total: { 
                        enabled: true, 
                        style: { 
                          fontSize: '12px', 
                          fontWeight: 900, 
                          fontFamily: 'inherit',
                          color: isDark ? '#fff' : '#111827' 
                        } 
                      } 
                    }
                  }
                },
                colors: [
                  '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6',
                  '#06b6d4', '#f43f5e', '#84cc16', '#d946ef', '#14b8a6'
                ],
                dataLabels: {
                  enabled: true,
                  style: { 
                    fontSize: '11px', 
                    fontFamily: 'inherit',
                    fontWeight: 800,
                    colors: ['#fff'] 
                  },
                  dropShadow: { enabled: true, top: 1, left: 1, blur: 1, color: '#000', opacity: 0.3 },
                  formatter: function (val: number) {
                    return val > 0 ? val : '';
                  }
                },
                stroke: { width: 1.5, colors: [isDark ? '#1f2937' : '#ffffff'] },
                xaxis: {
                  categories: categories,
                  labels: { 
                    style: { 
                      colors: isDark ? '#9ca3af' : '#4b5563', 
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      fontWeight: 600
                    } 
                  },
                  axisBorder: { show: false },
                  axisTicks: { show: false }
                },
                yaxis: {
                  labels: {
                    maxWidth: 120,
                    style: {
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      colors: isDark ? '#9ca3af' : '#4b5563'
                    }
                  }
                },
                grid: {
                  borderColor: isDark ? '#374151' : '#f3f4f6',
                  strokeDashArray: 4,
                  xaxis: { lines: { show: true } },
                  yaxis: { lines: { show: false } },
                  padding: { top: 0, right: 20, bottom: 0, left: 10 }
                },
                legend: {
                  position: 'bottom',
                  horizontalAlign: 'center',
                  labels: { colors: isDark ? '#d1d5db' : '#374151' },
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  markers: { strokeWidth: 0, offsetX: -2, offsetY: 1 },
                  itemMargin: { horizontal: 8, vertical: 4 }
                },
                tooltip: {
                  theme: isDark ? 'dark' : 'light',
                  style: {
                    fontSize: '12px',
                    fontFamily: 'inherit'
                  }
                }
              }}
              series={series}
              type="bar"
              height={400}
              width="100%"
            />
          </div>
        );
      })()}
    </div>
  );
};
