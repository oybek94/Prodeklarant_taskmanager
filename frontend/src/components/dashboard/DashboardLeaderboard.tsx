import React from 'react';
import { Icon } from '@iconify/react';
import { getCsgoRank } from '../../utils/csgoRanks';
import { MEDAL_DETAILS, TIER_LABELS, type UserMedal } from '../../types/medals';
import type { DashboardStats } from '../../types/dashboard';

interface DashboardLeaderboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  rankingPeriod: 'weekly' | 'monthly' | 'yearly';
  setRankingPeriod: (period: 'weekly' | 'monthly' | 'yearly') => void;
  medalsByUserId: Map<number, UserMedal[]>;
}

export const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({
  stats,
  loading,
  rankingPeriod,
  setRankingPeriod,
  medalsByUserId,
}) => {
  return (
    <div className="relative bg-[#0B1120]/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-[1.5px] border-slate-700/50 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-[540px] overflow-hidden group ring-1 ring-white/5">
      {/* Premium Effect */}
      <div className="absolute -left-20 -bottom-20 w-[30rem] h-[30rem] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="flex flex-col gap-4 mb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Icon icon="solar:target-bold-duotone" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 relative z-10 animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase flex items-center gap-2 leading-tight">
              Peshqadamlar
              <span className="text-[9px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 tracking-widest leading-none">RANKED</span>
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Xodimlar o'rtasidagi raqobat</p>
          </div>
        </div>
        <div className="flex gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 backdrop-blur-md">
          <button
            onClick={() => setRankingPeriod('weekly')}
            className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${rankingPeriod === 'weekly'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            Hafta
          </button>
          <button
            onClick={() => setRankingPeriod('monthly')}
            className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${rankingPeriod === 'monthly'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            Oy
          </button>
          <button
            onClick={() => setRankingPeriod('yearly')}
            className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${rankingPeriod === 'yearly'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            Yil
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12 relative z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      ) : (() => {
        const rankingData = stats?.workerCompletionRanking;
        const rawRanking = rankingData?.[rankingPeriod] || [];
        const ranking = rawRanking.filter((w: any) => w.completedStages > 0).slice(0, 7); // Top 7 peshqadamlar, faqat natijasi yozilganlar

        if (!Array.isArray(ranking) || ranking.length === 0) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-500 relative z-10">
              <Icon icon="solar:medal-star-bold-duotone" className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Reyting uchun ma'lumotlar topilmadi</p>
            </div>
          );
        }

        return (
          <div className="relative z-10 flex flex-col flex-1 h-full mt-1 overflow-hidden">
            <div className="space-y-3 w-full pr-2 pb-2 overflow-y-auto custom-scrollbar">
              {ranking.map((w: any, index: number) => {
                const yearlyData = stats?.workerCompletionRanking?.yearly || [];
                const yearlyMatch = yearlyData.find((y: any) => y.userId === w.userId);
                const totalAllTime = yearlyMatch ? yearlyMatch.completedStages : 0;

                const rank = getCsgoRank(totalAllTime);
                const progressPct = rank.target ? Math.min(100, Math.max(0, (totalAllTime / rank.target) * 100)) : 100;

                return (
                  <div key={w.name} className="flex flex-col px-3 py-2.5 rounded-[16px] bg-slate-800/60 hover:bg-slate-700/80 transition-all border border-slate-700/50 hover:border-slate-600 relative group">
                    {/* Background Glow based on rank */}
                    <div className="absolute inset-0 overflow-hidden rounded-[16px] pointer-events-none">
                      <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br ${rank.color} rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity`}></div>
                    </div>

                    <div className="flex items-center justify-between mb-2.5 relative z-20">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${rank.color} shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-white/10 shrink-0 relative overflow-hidden`}>
                           <div className="absolute inset-0 bg-white/10 w-full rotate-45 transform -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                          <img src={rank.image} alt={rank.title} className="w-10 h-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-[14px] text-white leading-none">{w.name}</span>
                            <span className="text-[9px] uppercase font-black tracking-widest text-white/90 bg-black/40 px-1.5 py-0.5 rounded-[4px] border border-white/10 leading-none">{rank.short}</span>
                            {(() => {
                              const userMedals = medalsByUserId.get(w.userId) ?? [];
                              if (userMedals.length === 0) return null;
                              return (
                                <div className="flex gap-0.5 items-center ml-0.5">
                                  {userMedals.map((medal: any, medalIndex: number) => {
                                    const details = MEDAL_DETAILS[medal.medalType as keyof typeof MEDAL_DETAILS];
                                    if (!details) return null;
                                    return (
                                      <div key={medal.id || medalIndex} className="group/medal relative cursor-help flex items-center justify-center hover:z-[100]">
                                        <img src={details.image} alt={details.name} className="w-4 h-4 drop-shadow-md rounded-full" />
                                        <div className={`absolute ${index < 2 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-max max-w-[200px] p-2 bg-gray-900/95 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/medal:opacity-100 group-hover/medal:visible transition-all z-[100] pointer-events-none whitespace-normal text-center border border-gray-700 shadow-xl`}>
                                          <div className={`font-bold ${details.color}`}>{details.name}</div>
                                          <div className="text-gray-400 mt-0.5">{TIER_LABELS[details.tier]}</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center font-medium">
                            <span className="uppercase tracking-wide text-[9px] mr-1 opacity-80">INVOYS K/D:</span>
                            <span className="ml-0.5">
                              <span className="text-emerald-400 font-bold">
                                {w.errorCount === 0 && w.invoiceCount > 0 ? (
                                  <span className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)] uppercase tracking-wider font-black text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded-[4px] border border-amber-500/20 leading-none inline-block">MVP</span>
                                ) : (
                                  w.errorCount ? Math.round(w.invoiceCount / w.errorCount) : w.invoiceCount
                                )}
                              </span>
                              <span className="text-slate-400 ml-1">
                                (<span className="text-blue-400">{w.invoiceCount || 0}</span> ish / <span className="text-red-500">{w.errorCount || 0}</span> xato)
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end pl-2">
                        <span className="font-black text-white text-[16px] leading-none tracking-tight">{w.completedStages} <span className="text-blue-400 font-bold text-[10px] ml-0.5 tracking-normal">XP</span></span>
                        {index === 0 && <span className="text-[9px] text-yellow-400 font-black uppercase tracking-wider absolute -top-0 -right-0 bg-slate-900/80 px-2 rounded-bl-xl border-b border-l border-yellow-500/30">First Blood</span>}
                        {index === 1 && <span className="text-[9px] text-slate-300 font-black uppercase tracking-wider absolute -top-0 -right-0 bg-slate-900/80 px-2 rounded-bl-xl border-b border-l border-slate-500/30">Silver</span>}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative z-10 w-full mt-1">
                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">
                        <span>Total XP: {totalAllTime}</span>
                        <span>{rank.next ? `NEXT: ${rank.target}` : 'MAX LEVEL REACHED'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 shadow-inner rounded-full overflow-hidden border border-slate-700/80">
                        <div
                          className={`h-full bg-gradient-to-r ${rank.color} transition-all duration-1000 ease-out relative`}
                          style={{ width: `${progressPct}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-1/2 blur-sm rotate-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
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
