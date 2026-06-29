import React from 'react';
import { Icon } from '@iconify/react';

interface DashboardProcessTimesProps {
  premiumStats: any;
}

export const DashboardProcessTimes: React.FC<DashboardProcessTimesProps> = ({ premiumStats }) => {
  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-[540px] overflow-hidden group">
      {/* Premium Glow Effect */}
      <div className="absolute -left-20 -bottom-20 w-[30rem] h-[30rem] bg-gradient-to-tr from-teal-400/10 via-emerald-400/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex items-center gap-4 mb-4 relative z-10 shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white dark:border-gray-700/50 bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 shrink-0">
          <Icon icon="solar:clock-circle-bold-duotone" className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Jarayonga sarflangan vaqt</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mt-1">O'rtacha ko'rsatkichlar</p>
        </div>
      </div>

      {!premiumStats ? (
        <div className="flex-1 flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : (() => {
        const processTimes = premiumStats?.processTimes || [];
        const averageTaskTotalMinutes = premiumStats?.averageTaskTotalMinutes || 0;

        if (!Array.isArray(processTimes) || processTimes.length === 0) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
              <Icon icon="solar:clock-circle-bold-duotone" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Vaqt ko'rsatkichlari yo'q</p>
            </div>
          );
        }

        const maxTime = Math.max(...processTimes.map((p: any) => p.averageMinutes), 1);

        return (
          <div className="relative z-10 flex flex-col flex-1 mt-1 overflow-hidden">
            {/* Umumiy O'rtacha Vaqt */}
            {averageTaskTotalMinutes > 0 && (
              <div className="mb-5 bg-teal-50/80 dark:bg-teal-900/20 backdrop-blur-md rounded-[20px] p-5 border border-teal-100 dark:border-teal-800/50 text-center shrink-0 shadow-sm relative overflow-hidden group/time">
                <div className="absolute inset-0 bg-white/20 w-full rotate-45 transform -translate-x-full group-hover/time:animate-[shimmer_2s_infinite]"></div>
                <p className="text-[10px] uppercase tracking-widest text-teal-600/80 dark:text-teal-400/80 font-black mb-2 relative z-10">Umumiy bitta ish uchun qirqimda</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none relative z-10">
                  {Math.floor(averageTaskTotalMinutes / 60)} soat {averageTaskTotalMinutes % 60} daqiqa
                </h3>
              </div>
            )}
            
            <div className="space-y-3 w-full overflow-y-auto pr-2 pb-2 custom-scrollbar">
              {processTimes.map((p: any) => {
                const widthPercent = Math.min((p.averageMinutes / maxTime) * 100, 100);
                const hours = Math.floor(p.averageMinutes / 60);
                const mins = p.averageMinutes % 60;
                const timeString = hours > 0 ? `${hours}s ${mins}daq` : `${mins} daqiqa`;
                
                return (
                  <div key={p.name} className="flex flex-col gap-2 px-4 py-3.5 rounded-2xl bg-white/40 dark:bg-gray-800/40 hover:bg-teal-50/60 dark:hover:bg-teal-900/30 transition-all border border-gray-100/50 dark:border-gray-700/50 hover:border-teal-100 dark:hover:border-teal-800/50 group/item">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] sm:text-[14px] text-gray-800 dark:text-gray-200 group-hover/item:text-teal-700 dark:group-hover/item:text-teal-300 transition-colors">
                        {p.name}
                      </span>
                      <span className="font-black text-teal-600 dark:text-teal-400 text-[12px] bg-white dark:bg-gray-900 shadow-sm px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-800/50">
                        {timeString}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200/60 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden shadow-inner mt-0.5">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full transition-all duration-1000 relative"
                        style={{ width: `${widthPercent}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 w-1/2 blur-sm rotate-12 transform -translate-x-full group-hover/item:animate-[shimmer_1.5s_infinite]"></div>
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
