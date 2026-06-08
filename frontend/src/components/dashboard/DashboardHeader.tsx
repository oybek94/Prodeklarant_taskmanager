import React from 'react';
import { Icon } from '@iconify/react';
import { getCsgoRank } from '../../utils/csgoRanks';
import { MEDAL_DETAILS, TIER_LABELS, formatPeriod, type UserMedal } from '../../types/medals';
import type { DashboardStats } from '../../types/dashboard';

interface DashboardHeaderProps {
  user: any;
  stats: DashboardStats | null;
  unratedErrors: any[];
  setShowUnratedModal: (show: boolean) => void;
  myMedals: UserMedal[];
  navigate: (path: string) => void;
  exchangeRate: number | null;
  setShowRanksModal: (show: boolean) => void;
}

const formatUzs = (value: number) => value.toLocaleString('uz-UZ');

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  stats,
  unratedErrors,
  setShowUnratedModal,
  myMedals,
  navigate,
  exchangeRate,
  setShowRanksModal
}) => {
  const hour = new Date().getHours();
  let greeting = 'Xayrli kun';
  if (hour < 10) greeting = 'Xayrli tong';
  else if (hour < 17) greeting = 'Xayrli kun';
  else greeting = 'Xayrli kech';

  return (
    <div className="relative h-full bg-gradient-to-r from-indigo-50/80 via-white/80 to-purple-50/80 dark:from-indigo-950/40 dark:via-gray-900/60 dark:to-purple-950/40 backdrop-blur-3xl rounded-[24px] shadow-sm border border-white/60 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-center">
      {/* Abstract blobs */}
      <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none z-0">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl pointer-events-none"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1.5 flex flex-wrap items-center gap-2">
              {greeting},
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                {user?.name?.split(' ')[0] || 'Foydalanuvchi'}
              </span>
              {(() => {
                if (!stats || !user) return null;
                const currentUserYearly = stats?.workerCompletionRanking?.yearly?.find((y: any) => y.userId === user?.id);
                const userXP = currentUserYearly ? currentUserYearly.completedStages : 0;
                const userRank = getCsgoRank(userXP);
                return (
                  <div className="ml-4 flex items-start gap-1.5">
                    <div className="flex items-start gap-1.5 hover:scale-105 transition-transform cursor-pointer" title={userRank.title} onClick={() => setShowRanksModal(true)}>
                      <img src={userRank.image} alt={userRank.title} className="w-16 sm:w-20 h-auto drop-shadow-md" />
                      <span className="text-[10px] sm:text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pt-0.5 whitespace-nowrap hidden sm:block">
                        {userRank.title}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </h1>
            <p className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Icon icon="lucide:calendar-clock" className="w-4 h-4 opacity-70" />
              {(() => {
                const now = new Date();
                const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
                const weekdays = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
                const day = String(now.getDate()).padStart(2, '0');
                return `${day} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`;
              })()}
            </p>

            {/* Unrated Errors Alert for Admin */}
            {user?.role === 'ADMIN' && unratedErrors.length > 0 && (
              <div className="mt-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 sm:p-4 shadow-sm animate-pulse-slow">
                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-800/50 flex flex-shrink-0 items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
                    <i className="fas fa-exclamation-triangle text-xl sm:text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-orange-800 dark:text-orange-300">Baholanmagan xatolar mavjud!</h3>
                    <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-400 text-opacity-90 mt-0.5">
                      Sizda barcha filiallar bo'yicha jami <strong>{unratedErrors.length}</strong> ta xato kutmoqda. Ularni hoziroq baholang.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowUnratedModal(true)} className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                  <i className="fas fa-star text-orange-200"></i> Baholashni Boshlash
                </button>
              </div>
            )}

            {/* Achievements Showcase (Medals Cabinet) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 shadow-sm backdrop-blur-md self-start inline-flex min-h-[52px]">
              <span className="text-[10px] sm:text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mr-2 flex items-center gap-1.5">
                <i className="fas fa-medal text-yellow-500 opacity-80"></i> Mening medallarim:
              </span>

              {myMedals.length > 0 ? myMedals.map((medal) => {
                const details = MEDAL_DETAILS[medal.medalType as keyof typeof MEDAL_DETAILS];
                if (!details) return null;
                return (
                  <div key={medal.id} className="relative group cursor-pointer flex items-center justify-center" onClick={() => navigate('/profile')}>
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform ${details.bgClass} border-2 border-white dark:border-gray-700 overflow-hidden`}>
                      <img src={details.image} alt={details.name} className="w-full h-full object-contain p-1 drop-shadow-sm" />
                    </div>
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center border border-gray-700">
                      <div className={`font-extrabold ${details.color} tracking-wider mb-1.5 text-sm uppercase`}>{details.name}</div>
                      <div className="text-gray-200 font-medium leading-tight mb-2">{details.description}</div>
                      <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase border-t border-gray-700 pt-1.5 mt-1 flex justify-between">
                        <span>{formatPeriod(medal.period)}</span>
                        <span>+{medal.cashBonus / 1000}k UZS</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="relative group cursor-pointer flex items-center justify-center" onClick={() => navigate('/profile')}>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200/80 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 flex items-center justify-center opacity-60 transition-opacity hover:opacity-100">
                    <i className="fas fa-lock text-gray-400 dark:text-gray-500 text-xs shadow-inner"></i>
                  </div>
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-52 p-2.5 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center border border-gray-700">
                    <div className="font-bold text-gray-300 mb-1">Medallar Qulflangan</div>
                    <div className="text-gray-400 text-[10px]">A'lo darajadagi xizmatlaringiz uchun maxsus medallar shu yerda paydo bo'ladi. Ko'rish uchun bosing.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {exchangeRate && (
          <div className="flex items-center self-start lg:self-center bg-white/70 dark:bg-gray-800/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center mr-4 shadow-inner">
              <Icon icon="lucide:banknote" className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Valyuta kursi</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-gray-900 dark:text-white leading-none">1 <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">$</span></span>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500 mx-1">=</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{formatUzs(exchangeRate)} <span className="text-sm font-semibold">UZS</span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
