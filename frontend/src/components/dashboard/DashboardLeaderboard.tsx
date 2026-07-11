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
            <div className="space-y-1.5 w-full pr-2 pb-2 overflow-y-auto custom-scrollbar">
              {ranking.map((w: any, index: number) => {
                const yearlyData = stats?.workerCompletionRanking?.yearly || [];
                const yearlyMatch = yearlyData.find((y: any) => y.userId === w.userId);
                const totalAllTime = yearlyMatch ? yearlyMatch.completedStages : 0;

                const rank = getCsgoRank(totalAllTime);
                const progressPct = rank.target ? Math.min(100, Math.max(0, (totalAllTime / rank.target) * 100)) : 100;

                const isMvp = w.errorCount === 0 && w.invoiceCount > 0;
                const posColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-200' : index === 2 ? 'text-amber-600' : 'text-slate-500';

                return (
                  <div key={w.name} className="relative group/row">
                    {/* CS:GO scoreboard row — angular cut */}
                    <div
                      className="relative overflow-hidden bg-slate-800/70 hover:bg-slate-700/70 transition-colors border-y border-slate-700/40"
                      style={{ clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)' }}
                    >
                      {/* Rank-colored diagonal accent */}
                      <div className={`absolute -left-6 inset-y-0 w-32 bg-gradient-to-r ${rank.color} opacity-[0.10] group-hover/row:opacity-25 -skew-x-[18deg] transition-opacity pointer-events-none`}></div>
                      {/* Left rank tick */}
                      <div className={`absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b ${rank.color} rounded-full`}></div>

                      <div className="relative z-20 flex items-center gap-1.5 pl-3 pr-3 py-2.5">
                        {/* Position slot */}
                        <div className="flex flex-col items-center w-5 shrink-0">
                          <span className={`text-[17px] font-black italic leading-none ${posColor} drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`}>{index + 1}</span>
                        </div>

                        {/* Rank badge */}
                        <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
                          <div className={`absolute inset-1 bg-gradient-to-br ${rank.color} opacity-25 blur-md rounded-full group-hover/row:opacity-40 transition-opacity`}></div>
                          <img src={rank.image} alt={rank.title} className="w-14 h-auto relative drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
                        </div>

                        {/* Player identity */}
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-[14px] text-white leading-none truncate">{w.name}</span>
                            {isMvp && (
                              <span className="flex items-center gap-0.5 text-amber-400 shrink-0" title="Xatosiz — MVP">
                                <Icon icon="solar:star-bold" className="w-3 h-3 drop-shadow-[0_0_5px_rgba(251,191,36,0.7)]" />
                              </span>
                            )}
                          </div>

                          {/* Medallar — ism ostida, chapga tekislangan */}
                          {(() => {
                            const userMedals = medalsByUserId.get(w.userId) ?? [];
                            if (userMedals.length === 0) return null;
                            return (
                              <div className="flex gap-0.5 items-center mb-1">
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

                          {/* K/D scoreboard stat */}
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="uppercase tracking-widest text-[8px] text-slate-500">K/D</span>
                            <span className={isMvp ? 'text-amber-400 font-black' : 'text-emerald-400 font-black'}>
                              {isMvp ? '∞' : (w.errorCount ? Math.round(w.invoiceCount / w.errorCount) : w.invoiceCount)}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-blue-400 tabular-nums">{w.invoiceCount || 0}</span>
                            <span className="text-slate-600 text-[8px]">ish</span>
                            <span className="text-red-500 tabular-nums">{w.errorCount || 0}</span>
                            <span className="text-slate-600 text-[8px]">xato</span>
                          </div>

                          {/* Slim rank progress */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1 flex-1 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/60">
                              <div
                                className={`h-full bg-gradient-to-r ${rank.color} transition-all duration-1000 ease-out relative`}
                                style={{ width: `${progressPct}%` }}
                              >
                                <div className="absolute inset-0 bg-white/25 w-1/2 blur-sm rotate-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
                              </div>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                              {rank.next ? `→ ${rank.target}` : 'MAX'}
                            </span>
                          </div>
                        </div>

                        {/* Score / XP */}
                        <div className="flex flex-col items-end pl-1 shrink-0">
                          {index === 0 && <span className="text-[8px] text-yellow-400 font-black uppercase tracking-widest bg-yellow-500/10 px-1.5 py-0.5 rounded-[3px] border border-yellow-500/30 leading-none mb-1">First Blood</span>}
                          {index === 1 && <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest bg-slate-500/10 px-1.5 py-0.5 rounded-[3px] border border-slate-400/30 leading-none mb-1">Silver</span>}
                          {index === 2 && <span className="text-[8px] text-amber-600 font-black uppercase tracking-widest bg-amber-700/10 px-1.5 py-0.5 rounded-[3px] border border-amber-700/30 leading-none mb-1">Bronze</span>}
                          <span className="font-black text-white text-[18px] leading-none tracking-tight italic tabular-nums">{w.completedStages}</span>
                          <span className="text-blue-400 font-black text-[8px] uppercase tracking-widest mt-0.5">XP</span>
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
