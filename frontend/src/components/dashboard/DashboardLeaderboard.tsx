import React from 'react';
import { Icon } from '@iconify/react';
import { getCsgoRank } from '../../utils/csgoRanks';
import type { UserMedal } from '../../types/medals';
import type { DashboardStats } from '../../types/dashboard';

type RankingPeriod = 'weekly' | 'monthly' | 'yearly';

interface DashboardLeaderboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  rankingPeriod: RankingPeriod;
  setRankingPeriod: (period: RankingPeriod) => void;
  medalsByUserId: Map<number, UserMedal[]>;
}

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: 'weekly', label: 'Hafta' },
  { value: 'monthly', label: 'Oy' },
  { value: 'yearly', label: 'Yil' },
];

/** 1–3 o'rin: oltin, kumush, bronza; qolganlari — jim kulrang */
const POSITION_COLORS = ['#FBBF24', '#CBD5F0', '#D08A4C'];
const DEFAULT_POSITION_COLOR = '#6E7899';

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({
  stats,
  loading,
  rankingPeriod,
  setRankingPeriod,
}) => {
  return (
    <div className="flex flex-col gap-5 h-[540px] rounded-[28px] border border-[#232B45] bg-[#0E1424] p-5 sm:p-6 text-[#F1F5FF] overflow-hidden">
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="m-0 text-2xl font-extrabold leading-tight tracking-tight">Peshqadamlar</h2>
          <span className="text-[13px] font-semibold text-[#8A94B2]">Xodimlar o'rtasidagi raqobat</span>
        </div>
        <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[#1B2440] px-2.5 text-xs font-bold text-[#B9C4E6]">
          <Icon icon="solar:cup-bold-duotone" className="h-3.5 w-3.5" aria-hidden="true" />
          Top 7
        </div>
      </div>

      <div className="flex shrink-0 gap-1 rounded-[14px] border border-[#232B45] bg-[#151C30] p-1" role="group" aria-label="Reyting davri">
        {PERIODS.map(({ value, label }) => {
          const active = rankingPeriod === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRankingPeriod(value)}
              aria-pressed={active}
              className={`h-9 flex-1 rounded-[10px] text-[13px] font-bold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FB0FF] ${
                active ? 'bg-[#2B4FD8] text-white' : 'text-[#9AA5C6] hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-500" />
        </div>
      ) : (() => {
        const rawRanking = stats?.workerCompletionRanking?.[rankingPeriod] || [];
        const ranking = rawRanking.filter((w) => w.completedStages > 0).slice(0, 7); // faqat natijasi yozilganlar

        if (ranking.length === 0) {
          return (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-[#8A94B2]">
              <Icon icon="solar:medal-star-bold-duotone" className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-bold">Reyting uchun ma'lumotlar topilmadi</p>
            </div>
          );
        }

        const yearlyData = stats?.workerCompletionRanking?.yearly || [];

        return (
          <ol className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-0 pr-1 custom-scrollbar">
            {ranking.map((w, index) => {
              // Unvon mavsum (1-maydan) XP si bo'yicha
              const seasonXp = yearlyData.find((y) => y.userId === w.userId)?.completedStages ?? 0;
              const rank = getCsgoRank(seasonXp);
              const progressPct = rank.target ? Math.min(100, Math.max(0, (seasonXp / rank.target) * 100)) : 100;
              const first = index === 0;
              const posColor = POSITION_COLORS[index] ?? DEFAULT_POSITION_COLOR;
              const errors = w.errorCount || 0;

              return (
                <li
                  key={w.userId}
                  className={`flex min-h-[60px] flex-1 items-center gap-3 rounded-[14px] border pl-3 pr-3.5 ${
                    first ? 'border-[#FBBF24]/40 bg-[#1B2440]' : 'border-[#232B45] bg-[#151C30]'
                  }`}
                >
                  <span className="w-5 text-center text-lg font-extrabold tabular-nums" style={{ color: posColor }}>
                    {index + 1}
                  </span>
                  <div
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-[#0E1424]"
                    style={{ backgroundColor: posColor }}
                    aria-hidden="true"
                  >
                    {initialsOf(w.name)}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-bold">{w.name}</span>
                      <span
                        title={rank.title}
                        className="shrink-0 whitespace-nowrap rounded-md bg-[#232B45] px-[7px] py-[3px] text-[10px] font-bold tracking-wide text-[#B9C4E6]"
                      >
                        {rank.short}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#232B45]"
                        role="progressbar"
                        aria-valuenow={Math.round(progressPct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${rank.title} darajasi`}
                      >
                        <div
                          className={`h-full rounded-full ${first ? 'bg-[#FBBF24]' : 'bg-[#5B8CFF]'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[11px] font-semibold text-[#8A94B2]">
                        {errors === 0 ? 'xatosiz' : `${errors} xato`}
                      </span>
                    </div>
                  </div>
                  <div className="flex min-w-[52px] flex-col items-end gap-px">
                    <span className="text-xl font-extrabold leading-none tracking-tight tabular-nums">{w.completedStages}</span>
                    <span className="text-[10px] font-bold tracking-[0.08em] text-[#8FB0FF]">XP</span>
                  </div>
                </li>
              );
            })}
          </ol>
        );
      })()}
    </div>
  );
};
