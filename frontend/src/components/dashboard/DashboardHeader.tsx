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

  const now = new Date();
  const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
  const weekdays = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${day} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`;

  const currentUserYearly = stats?.workerCompletionRanking?.yearly?.find((y: any) => y.userId === user?.id);
  const userXP = currentUserYearly ? currentUserYearly.completedStages : 0;
  const userRank = getCsgoRank(userXP);

  return (
    <div className="relative h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-center transition-all duration-300">
      {/* Abstract blobs */}
      <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-[24rem] h-[24rem] rounded-full bg-gradient-to-tr from-blue-400/20 to-purple-400/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Content */}
        <div className="col-span-1 lg:col-span-7 flex flex-col items-start gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-white/10 shadow-sm text-xs font-bold text-gray-600 dark:text-gray-300 backdrop-blur-md tracking-wide">
            <Icon icon="lucide:calendar-days" className="w-4 h-4 text-indigo-500" />
            {dateString}
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.1] mb-2">
              {greeting}, <br className="hidden sm:block lg:hidden" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
                {user?.name?.split(' ')[0] || 'Foydalanuvchi'}
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
              Bugungi ishlaringizda muvaffaqiyat tilaymiz!
            </p>
          </div>

          {/* Unrated Errors Alert for Admin */}
          {user?.role === 'ADMIN' && unratedErrors.length > 0 && (
            <div className="w-full max-w-md flex flex-col sm:flex-row sm:items-center justify-between bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200/60 dark:border-orange-800/40 rounded-2xl p-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 mb-3 sm:mb-0">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-800/50 flex flex-shrink-0 items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
                  <Icon icon="lucide:alert-triangle" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300">Baholanmagan xatolar!</h3>
                  <p className="text-xs text-orange-700/80 dark:text-orange-400/80 mt-0.5">
                    Kutayotgan xatolar soni: <strong className="text-orange-600 dark:text-orange-300 text-sm">{unratedErrors.length}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowUnratedModal(true)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Icon icon="lucide:star" className="w-3.5 h-3.5" /> Baholash
              </button>
            </div>
          )}
        </div>

        {/* Right Content */}
        <div className="col-span-1 lg:col-span-5 w-full flex flex-col gap-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rank Widget */}
            {stats && user && (
              <div 
                className="group flex flex-col justify-center p-5 bg-white/70 dark:bg-gray-800/60 rounded-[24px] border border-white/80 dark:border-white/10 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] backdrop-blur-xl hover:shadow-md transition-all cursor-pointer overflow-hidden relative"
                onClick={() => setShowRanksModal(true)}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 opacity-[0.03] dark:opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500 w-full flex items-center justify-center">
                  <img src={userRank.image} className="w-32 h-auto grayscale blur-[2px]" />
                </div>
                <div className="flex flex-col items-center text-center gap-3 relative z-10">
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <img src={userRank.image} alt={userRank.title} className="w-24 sm:w-28 h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-1">Joriy Unvon</p>
                    <p className="text-sm sm:text-base font-extrabold text-gray-800 dark:text-gray-100 leading-tight">{userRank.title}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Exchange Rate Widget */}
            {exchangeRate && (
              <div className="flex flex-col justify-center p-5 bg-white/70 dark:bg-gray-800/60 rounded-[24px] border border-white/80 dark:border-white/10 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] backdrop-blur-xl hover:shadow-md transition-all">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                    <Icon icon="lucide:arrow-right-left" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-1">Valyuta Kursi</p>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-base font-bold text-gray-800 dark:text-gray-200">1$</span>
                      <span className="text-sm text-gray-400">=</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatUzs(exchangeRate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Medals Row */}
          <div className="p-4 bg-white/50 dark:bg-gray-800/40 rounded-[24px] border border-white/60 dark:border-white/5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Icon icon="lucide:medal" className="w-4 h-4 text-yellow-500" />
                Mening Medallarim
              </span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white/60 dark:bg-gray-800/50 px-2 py-0.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50">{myMedals.length} ta</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {myMedals.length > 0 ? myMedals.map((medal) => {
                const details = MEDAL_DETAILS[medal.medalType as keyof typeof MEDAL_DETAILS];
                if (!details) return null;
                return (
                  <div key={medal.id} className="relative group cursor-pointer flex items-center justify-center" onClick={() => navigate('/profile')}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform ${details.bgClass} border-[2px] border-white dark:border-gray-700`}>
                      <img src={details.image} alt={details.name} className="w-full h-full object-contain p-1.5 drop-shadow-sm" />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center border border-gray-700">
                      <div className={`font-extrabold ${details.color} tracking-wider mb-1.5 text-sm uppercase`}>{details.name}</div>
                      <div className="text-gray-200 font-medium leading-tight mb-2">{details.description}</div>
                      <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase border-t border-gray-700 pt-2 mt-1 flex justify-between">
                        <span>{formatPeriod(medal.period)}</span>
                        <span className="text-emerald-400">+{medal.cashBonus / 1000}k UZS</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="relative group cursor-pointer" onClick={() => navigate('/profile')}>
                  <div className="w-10 h-10 rounded-full bg-gray-200/50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center opacity-70 transition-opacity hover:opacity-100">
                    <Icon icon="lucide:lock" className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 w-52 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-center border border-gray-700">
                    <div className="font-bold text-gray-300 mb-1">Medallar qulflangan</div>
                    <div className="text-gray-400 text-[10px]">A'lo darajadagi xizmatlaringiz uchun maxsus medallar shu yerda paydo bo'ladi.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

