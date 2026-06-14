import React from 'react';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';

interface DashboardTopClientsProps {
  premiumStats: any;
}

export const DashboardTopClients: React.FC<DashboardTopClientsProps> = ({ premiumStats }) => {
  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-[540px] overflow-hidden group">
      {/* Premium Glow Effect */}
      <div className="absolute -left-20 -bottom-20 w-[30rem] h-[30rem] bg-gradient-to-tr from-yellow-400/10 via-amber-400/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-4 mb-4 relative z-10 shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 shrink-0">
          <Icon icon="lucide:crown" className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Top Mijozlar</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-1">Vazifalar soni bo'yicha</p>
        </div>
      </div>

      {!premiumStats ? (
        <div className="flex-1 flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
        </div>
      ) : (() => {
        const allClients = premiumStats.topClients || [];
        const clients = allClients.filter((c: any) => (c.count || 0) > 0);
        
        if (clients.length === 0) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
              <Icon icon="lucide:crown" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Ma'lumot yo'q</p>
            </div>
          );
        }

        const isDark = document.documentElement.classList.contains('dark');
        
        return (
          <div className="relative z-10 flex-1 w-full mt-2 flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-center min-h-[220px]">
              <Chart
                options={{
                  chart: { 
                    type: 'pie', 
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
                  labels: clients.map((c: any) => c.name),
                  colors: ['#eab308', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#9ca3af', '#f43f5e', '#14b8a6'],
                  dataLabels: {
                    enabled: true,
                    formatter: (val: any, opts: any) => {
                      const count = opts.w.config.series[opts.seriesIndex];
                      return `${count} ta`;
                    },
                    style: { 
                      fontSize: '12px', 
                      fontWeight: 800, 
                      colors: ['#fff'],
                      fontFamily: 'inherit'
                    },
                    dropShadow: { enabled: true, top: 1, left: 1, blur: 2, color: '#000', opacity: 0.5 }
                  },
                  stroke: { 
                    width: 3, 
                    colors: [isDark ? '#111827' : '#ffffff'] 
                  },
                  legend: {
                    show: false
                  },
                  plotOptions: {
                    pie: {
                      expandOnClick: true,
                      dataLabels: {
                        offset: -10,
                      }
                    }
                  },
                  tooltip: {
                    theme: isDark ? 'dark' : 'light',
                    style: {
                      fontSize: '12px',
                      fontFamily: 'inherit'
                    },
                    y: {
                      formatter: (val: any) => {
                        const total = clients.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
                        const percent = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return `${val} ta vazifa (${percent}%)`;
                      }
                    }
                  }
                }}
                series={clients.map((c: any) => c.count)}
                type="pie"
                height={300}
                width="100%"
              />
            </div>

            {/* Custom Top 5 Legend */}
            <div className="w-full flex flex-col gap-1.5 mt-2 pb-1">
              {clients.slice(0, 5).map((client: any, index: number) => {
                const colors = ['#eab308', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#9ca3af', '#f43f5e', '#14b8a6'];
                const color = colors[index % colors.length];
                const total = clients.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
                const percent = total > 0 ? ((client.count / total) * 100).toFixed(1) : 0;

                return (
                  <div key={index} className="flex items-center justify-between text-xs p-1.5 px-2.5 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/60 dark:border-white/5 transition-colors hover:bg-white/60 dark:hover:bg-gray-700/50 group/item cursor-default">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                      <span className="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[140px] sm:max-w-[200px] transition-colors group-hover/item:text-gray-900 dark:group-hover/item:text-white">
                        {client.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 dark:text-white">{client.count} ta</span>
                      <div className="w-10 text-right">
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded text-center inline-block min-w-full">
                          {percent}%
                        </span>
                      </div>
                    </div>
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
