import React from 'react';
import { Icon } from '@iconify/react';

interface DashboardProcessTimesProps {
  premiumStats: any;
}

export const DashboardProcessTimes: React.FC<DashboardProcessTimesProps> = ({ premiumStats }) => {
  return (
    <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[20px] p-6 shadow-sm border border-white/50 dark:border-gray-700/50 relative overflow-hidden group flex flex-col h-full" style={{ height: '565px' }}>
      {/* Premium Glow Effect */}
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex flex-col gap-4 mb-6 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30">
            <Icon icon="lucide:clock" className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Jarayonga sarflangan vaqt</h2>
            <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-0.5">O'rtacha ko'rsatkichlar</p>
          </div>
        </div>
      </div>

      {!premiumStats ? (
        <div className="flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400"></div>
        </div>
      ) : (() => {
        const processTimes = premiumStats?.processTimes || [];
        const averageTaskTotalMinutes = premiumStats?.averageTaskTotalMinutes || 0;

        if (!Array.isArray(processTimes) || processTimes.length === 0) {
          return (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
              <Icon icon="lucide:clock" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Vaqt ko'rsatkichlari yo'q</p>
            </div>
          );
        }

        const maxTime = Math.max(...processTimes.map((p: any) => p.averageMinutes), 1);

        return (
          <div className="relative z-10 flex flex-col flex-1 h-full overflow-hidden">
            {/* Umumiy O'rtacha Vaqt */}
            {averageTaskTotalMinutes > 0 && (
              <div className="mb-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 border border-teal-100 dark:border-teal-800/50 text-center shrink-0">
                <p className="text-[11px] uppercase tracking-widest text-teal-600 dark:text-teal-400 font-bold mb-1">Umumiy bitta ish uchun qirqimda</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  {Math.floor(averageTaskTotalMinutes / 60)} soat {averageTaskTotalMinutes % 60} daqiqa
                </h3>
              </div>
            )}
            
            <div className="space-y-3 w-full overflow-y-auto pr-1 pb-2 custom-scrollbar">
              {processTimes.map((p: any) => {
                const widthPercent = Math.min((p.averageMinutes / maxTime) * 100, 100);
                const hours = Math.floor(p.averageMinutes / 60);
                const mins = p.averageMinutes % 60;
                const timeString = hours > 0 ? `${hours}s ${mins}daq` : `${mins} daqiqa`;
                
                return (
                  <div key={p.name} className="flex flex-col gap-1.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-700/40 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors border border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[13px] text-gray-800 dark:text-gray-200">
                        {p.name}
                      </span>
                      <span className="font-black text-teal-600 dark:text-teal-400 text-[12px] bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/50">
                        {timeString}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${widthPercent}%` }}
                      />
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
