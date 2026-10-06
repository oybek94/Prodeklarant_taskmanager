import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { MEDAL_DETAILS, TIER_LABELS, type MedalType, type UserMedal } from '../../types/medals';
import apiClient from '../../lib/api';

interface TrophyRoomProps {
  userId?: number;
}

const TrophyRoom: React.FC<TrophyRoomProps> = ({ userId }) => {
  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBonus, setCurrentBonus] = useState(0);

  useEffect(() => {
    const fetchMedals = async () => {
      try {
        const medalsEndpoint = userId ? `/medals/user/${userId}/medals` : '/medals/my-medals';
        const bonusEndpoint = userId ? `/medals/user/${userId}/bonus` : '/medals/my-bonus';
        const [medalsRes, bonusRes] = await Promise.all([
          apiClient.get(medalsEndpoint),
          apiClient.get(bonusEndpoint)
        ]);
        setMedals(medalsRes.data);
        setCurrentBonus(bonusRes.data.totalBonus || 0);
      } catch (err) {
        console.error('Failed to fetch medals or bonus', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedals();
  }, [userId]);

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 dark:bg-slate-800 rounded-2xl" />;

  const medalKeys = Object.keys(MEDAL_DETAILS) as MedalType[];
  
  // Count earned medals per type
  const earnedCounts: Record<MedalType, number> = medals.reduce((acc, m) => {
    acc[m.medalType] = (acc[m.medalType] || 0) + 1;
    return acc;
  }, {} as Record<MedalType, number>);

  const COLS = 4;

  return (
    <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center">
          <Icon icon="solar:cup-star-bold-duotone" className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Medallar</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Yutuqlar va mukofotlar to'plami</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {medalKeys.map((key, index) => {
          const details = MEDAL_DETAILS[key];
          const count = earnedCounts[key] || 0;
          const isUnlocked = count > 0;
          const col = index % COLS;
          // Tooltip blokdan chiqib ketmasligi uchun chetki ustunlarda chetga tirab qo'yiladi
          const tooltipPos = col === 0 ? 'left-0' : col === COLS - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2';

          return (
            <div key={key} className="relative group flex justify-center hover:z-50">
              <button
                type="button"
                aria-label={`${details.name}${isUnlocked ? `, ${count} marta olingan` : ', hali olinmagan'}`}
                className={`relative flex flex-col items-center gap-1.5 w-full transition-opacity ${!isUnlocked ? 'grayscale opacity-50 hover:opacity-100 hover:grayscale-0' : ''}`}
              >
                <span className="relative">
                  <span className={`flex items-center justify-center w-14 h-14 rounded-full overflow-hidden border-[3px] ${isUnlocked
                    ? 'border-amber-400 bg-white dark:bg-slate-800'
                    : 'border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-800'}`}>
                    <img src={details.image} alt="" className="w-full h-full object-contain p-1" />
                  </span>
                  {count > 1 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white flex items-center justify-center text-[11px] font-extrabold border-2 border-white dark:border-slate-800">
                      {count}
                    </span>
                  )}
                </span>
                <span className="w-full text-[11px] leading-tight font-semibold text-center text-gray-600 dark:text-gray-300 line-clamp-2">{details.name}</span>
              </button>

              {/* Tooltip */}
              <div className={`absolute top-full mt-2 w-56 max-w-[calc(100vw-2rem)] p-3.5 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50 pointer-events-none shadow-2xl border border-gray-700 ${tooltipPos}`}>
                <div className={`font-extrabold text-[13px] uppercase tracking-wider mb-1 ${details.color}`}>{details.name}</div>
                <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300 inline-block mb-2 border border-gray-700">
                  {TIER_LABELS[details.tier]}
                </div>
                <p className="text-gray-300 mb-2.5 font-medium leading-relaxed">{details.description}</p>

                {!isUnlocked ? (
                  <div className="bg-gray-800/80 rounded-lg p-2.5 border border-gray-700/80">
                    <p className="text-amber-400 font-bold mb-1.5 flex items-center gap-1.5 text-[11px]">
                      <Icon icon="solar:lock-bold-duotone" className="w-3.5 h-3.5" /> Hali olinmagan
                    </p>
                    <p className="text-gray-400 text-[10px] mb-2 leading-tight">Ushbu medalni qo'lga kiritish orqali quyidagi mukofotlarga ega bo'lasiz:</p>
                    <div className="flex justify-between items-center gap-2 font-bold text-[11px]">
                      <span className="text-green-400">{(details.cashBonus || 0).toLocaleString('ru-RU')} UZS</span>
                      <span className="text-yellow-400">+{details.xpBonus || 0} XP</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center font-bold text-[11px] border-t border-gray-700 pt-2">
                    <span className="text-gray-400">Holat:</span>
                    <span className="text-green-400">Olingan ({count} marta)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
        <span className="text-[13px] font-semibold text-gray-600 dark:text-gray-300">Joriy oydagi bonuslar</span>
        <span className="text-[15px] font-extrabold tabular-nums text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
          {currentBonus.toLocaleString('ru-RU')} UZS
        </span>
      </div>
    </section>
  );
};

export default TrophyRoom;
