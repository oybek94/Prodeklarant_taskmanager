import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MEDAL_DETAILS, TIER_LABELS, type MedalType, type UserMedal } from '../../types/medals';
import apiClient from '../../lib/api';

const TrophyRoom: React.FC = () => {
  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBonus, setCurrentBonus] = useState(0);

  useEffect(() => {
    const fetchMedals = async () => {
      try {
        const [medalsRes, bonusRes] = await Promise.all([
          apiClient.get('/medals/my-medals'),
          apiClient.get('/medals/my-bonus')
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
  }, []);

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />;

  const medalKeys = Object.keys(MEDAL_DETAILS) as MedalType[];
  
  // Count earned medals per type
  const earnedCounts: Record<MedalType, number> = medals.reduce((acc, m) => {
    acc[m.medalType] = (acc[m.medalType] || 0) + 1;
    return acc;
  }, {} as Record<MedalType, number>);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
            <span className="text-2xl text-white">🏆</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mening medallarim</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Yutuqlar va mukofotlar to'plami</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <span className="text-xl">💰</span>
          <div>
            <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Joriy oydagi bonuslar</p>
            <p className="text-xl font-black text-green-700 dark:text-green-300">
              {currentBonus.toLocaleString('ru-RU')} UZS
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-8 sm:gap-10 justify-center pt-8 pb-4">
        {medalKeys.map((key) => {
          const details = MEDAL_DETAILS[key];
          const count = earnedCounts[key] || 0;
          const isUnlocked = count > 0;

          return (
            <div key={key} className="relative group cursor-pointer hover:z-50">
              <motion.div
                whileHover={{ scale: 1.15 }}
                className={`relative flex flex-col items-center transition-all duration-300 ${!isUnlocked ? 'grayscale opacity-50 hover:opacity-100 hover:grayscale-0' : ''}`}
              >
                <div className="relative">
                  {/* Background stack layers */}
                  {count > 2 && (
                    <div className="absolute top-0 left-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-500/20 bg-gray-200 dark:bg-gray-800 z-0 translate-x-2 -translate-y-2 opacity-60" />
                  )}
                  {count > 1 && (
                    <div className="absolute top-0 left-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-500/40 bg-gray-100 dark:bg-gray-800 z-0 translate-x-1 -translate-y-1 opacity-80" />
                  )}

                  {/* Main front layer */}
                  <div className={`relative z-10 flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-lg overflow-hidden border-4 ${isUnlocked ? 'border-amber-400/80 shadow-amber-500/40 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'}`}>
                    {isUnlocked && (
                      <div className={`absolute inset-0 opacity-40 blur-md ${details.bgClass}`} />
                    )}
                    <img src={details.image} alt={details.name} className="relative z-20 w-full h-full object-contain p-2 drop-shadow-md" />
                  </div>
                  
                  {/* Badge count */}
                  {count > 1 && (
                    <div className="absolute -top-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-black border-[3px] border-white dark:border-gray-900 z-30 shadow-md transform hover:scale-110 transition-transform cursor-default">
                      {count}
                    </div>
                  )}
                </div>

                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-4 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-2xl border border-gray-700">
                  <div className={`font-black text-sm uppercase tracking-wider mb-1 ${details.color}`}>{details.name}</div>
                  <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300 inline-block mb-2 border border-gray-700">
                    {TIER_LABELS[details.tier]}
                  </div>
                  <p className="text-gray-300 mb-3 font-medium leading-relaxed">{details.description}</p>
                  
                  {!isUnlocked ? (
                    <div className="bg-gray-800/80 rounded-lg p-2.5 border border-gray-700/80">
                      <p className="text-amber-400 font-bold mb-1.5 flex items-center gap-1.5 text-[11px]">
                        <span className="text-sm">🔒</span> Hali olinmagan
                      </p>
                      <p className="text-gray-400 text-[10px] mb-2 leading-tight">Ushbu medalni qo'lga kiritish orqali quyidagi mukofotlarga ega bo'lasiz:</p>
                      <div className="flex justify-between items-center font-bold text-[11px]">
                        <span className="text-green-400 flex items-center gap-1"><span>💰</span> {(details.cashBonus || 0).toLocaleString('ru-RU')} UZS</span>
                        <span className="text-yellow-400 flex items-center gap-1"><span>✨</span> +{details.xpBonus || 0} XP</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center font-bold text-[11px] border-t border-gray-700 pt-2 mt-1">
                      <span className="text-gray-400">Holat:</span>
                      <span className="text-green-400 flex items-center gap-1"><span>🏆</span> Olingan ({count} marta)</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrophyRoom;
