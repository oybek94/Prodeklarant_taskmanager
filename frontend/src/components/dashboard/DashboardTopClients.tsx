import React from 'react';
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';

interface DashboardTopClientsProps {
  premiumStats: any;
}

export const DashboardTopClients: React.FC<DashboardTopClientsProps> = ({ premiumStats }) => {
  return (
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col h-full" style={{ height: '515px' }}>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
      <div className="flex flex-col gap-4 mb-6 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
            <Icon icon="lucide:crown" className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Top Mijozlar</h2>
            <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-0.5">Vazifalar soni bo'yicha</p>
          </div>
        </div>
      </div>

      {!premiumStats ? (
        <div className="flex items-center justify-center py-12 relative z-10 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        </div>
      ) : (() => {
        const allClients = premiumStats.topClients || [];
        const clients = allClients.filter((c: any) => (c.count || 0) > 0);
        if (clients.length === 0) return <div className="text-center py-12 text-gray-400">Ma'lumot yo'q</div>;

        const isDark = document.documentElement.classList.contains('dark');
        return (
          <div className="relative z-10 flex-1 w-full mt-2 flex flex-col">
            <Chart
              options={{
                chart: { type: 'pie', toolbar: { show: false } },
                labels: clients.map((c: any) => c.name),
                colors: ['#eab308', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#9ca3af'],
                dataLabels: {
                  enabled: true,
                  formatter: (val: any, opts: any) => {
                    const count = opts.w.config.series[opts.seriesIndex];
                    return `${count} ta`;
                  },
                  style: { fontSize: '11px', fontWeight: 800, colors: ['#fff'] },
                  dropShadow: { enabled: true, top: 1, left: 1, blur: 2, color: '#000', opacity: 0.5 }
                },
                stroke: { width: 2, colors: [isDark ? '#1f2937' : '#ffffff'] },
                legend: {
                  position: 'bottom',
                  horizontalAlign: 'center',
                  labels: { colors: isDark ? '#9ca3af' : '#4b5563' },
                  fontSize: '12px',
                  fontWeight: 600,
                  markers: { strokeWidth: 0 }
                },
                plotOptions: {
                  pie: {
                    expandOnClick: true,
                  }
                },
                tooltip: {
                  theme: 'dark',
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
              height={350}
            />
          </div>
        );
      })()}
    </div>
  );
};
