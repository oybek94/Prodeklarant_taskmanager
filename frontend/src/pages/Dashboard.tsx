import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../utils/useIsMobile';
import DashboardNotes from '../components/dashboard/DashboardNotes';
import { UnratedErrorsModal } from '../components/dashboard/UnratedErrorsModal';
import MedalsNominationPanel from '../components/medals/MedalsNominationPanel';
import { useDashboardStats } from '../hooks/useDashboardStats';

// Re-export for backward compatibility
import { getCsgoRank, RANK_GROUPS } from '../utils/csgoRanks';
export { getCsgoRank, RANK_GROUPS };

// Child Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardSummaryCards } from '../components/dashboard/DashboardSummaryCards';
import { DashboardActivityHeatmap } from '../components/dashboard/DashboardActivityHeatmap';
import { DashboardMainChart } from '../components/dashboard/DashboardMainChart';
import { DashboardBranchChart } from '../components/dashboard/DashboardBranchChart';
import { DashboardLeaderboard } from '../components/dashboard/DashboardLeaderboard';
import { DashboardYearlyGoal } from '../components/dashboard/DashboardYearlyGoal';
import { DashboardProcessTimes } from '../components/dashboard/DashboardProcessTimes';
import { DashboardTopClients } from '../components/dashboard/DashboardTopClients';
import { DashboardActiveTasks } from '../components/dashboard/DashboardActiveTasks';
import { Icon } from '@iconify/react';
import type { UserMedal } from '../types/medals';

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  
  const [showRanksModal, setShowRanksModal] = useState(false);
  const [showUnratedModal, setShowUnratedModal] = useState(false);
  const [showNominationsModal, setShowNominationsModal] = useState<false | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>(false);

  const handleCloseRanksModal = useCallback(() => setShowRanksModal(false), []);
  const handleCloseUnratedModal = useCallback(() => setShowUnratedModal(false), []);


  const {
    stats,
    statsError,
    chartData,
    loading,
    exchangeRate,
    premiumStats,
    completedSummary,
    loadingCompletedSummary,
    allMedals,
    myMedals,
    unratedErrors,
    loadUnratedErrors,
    pendingDeleteErrors,
    loadPendingDeleteErrors
  } = useDashboardStats(period);

  const handleRateSuccess = useCallback(() => { 
    loadUnratedErrors(); 
    setShowUnratedModal(false); 
  }, [loadUnratedErrors]);

  const medalsByUserId = useMemo(() => {
    const map = new Map<number, UserMedal[]>();
    for (const medal of allMedals) {
      const existing = map.get(medal.userId);
      if (existing) existing.push(medal);
      else map.set(medal.userId, [medal]);
    }
    return map;
  }, [allMedals]);

  return (
    <div className={`min-h-screen bg-slate-50/90 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-50/50 via-slate-50/80 to-white dark:bg-none dark:bg-gray-950 pb-12 pt-4 px-2 sm:px-6 lg:px-8 overflow-x-hidden ${isMobile ? 'pb-32' : ''}`}>
      <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 relative z-30">
            <DashboardHeader
              user={user}
              stats={stats}
              unratedErrors={unratedErrors}
              pendingDeleteErrors={pendingDeleteErrors}
              loadPendingDeleteErrors={loadPendingDeleteErrors}
              setShowUnratedModal={setShowUnratedModal}
              myMedals={myMedals}
              exchangeRate={exchangeRate}
              setShowRanksModal={setShowRanksModal}
            />
          </div>
          <div className="lg:col-span-1">
            <DashboardNotes />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <DashboardSummaryCards
            completedSummary={completedSummary}
            loadingCompletedSummary={loadingCompletedSummary}
          />
          <DashboardActivityHeatmap premiumStats={premiumStats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
          <div className="lg:col-span-2">
            <DashboardMainChart
              chartData={chartData}
              period={period}
              setPeriod={setPeriod}
            />
          </div>
          <div className="lg:col-span-1">
            <DashboardBranchChart
              stats={stats}
              loading={loading}
              statsError={statsError}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
          <DashboardYearlyGoal
            stats={stats}
            completedSummary={completedSummary}
            loadingCompletedSummary={loadingCompletedSummary}
          />
          <DashboardLeaderboard
            stats={stats}
            loading={loading}
            rankingPeriod={rankingPeriod}
            setRankingPeriod={setRankingPeriod}
            medalsByUserId={medalsByUserId}
          />
          <DashboardProcessTimes premiumStats={premiumStats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <DashboardTopClients premiumStats={premiumStats} />
          <DashboardActiveTasks premiumStats={premiumStats} />
        </div>

        {/* Ranks Modal Overlay */}
        {showRanksModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={handleCloseRanksModal}></div>

            <div className="relative z-10 w-full max-w-6xl h-[90vh] sm:h-[85vh] bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl flex flex-col border border-white/10"
              style={{
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98)), url('https://storage.googleapis.com/pod_public/1300/3142.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>

              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400">
                    <Icon icon="lucide:swords" className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">CS:GO Unvonlar Jadvali</h3>
                    <p className="text-xs text-slate-400 font-medium">Barcha darajalar va ularga yetish narxi (XP - Shaxsan Bajarilgan Jarayonlar soni)</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseRanksModal}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Icon icon="lucide:x" className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 gap-12">
                  {RANK_GROUPS.map((group, groupIdx) => (
                    <div key={group.name} className="relative">
                      {groupIdx !== 0 && (
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-6"></div>
                      )}

                      <div className="mb-6 flex flex-col items-center sm:items-start text-center sm:text-left">
                        <h4 className={`text-2xl font-black uppercase tracking-widest ${group.color.split(' ')[0]} drop-shadow-md`}>{group.name}</h4>
                        <p className="text-sm font-medium text-slate-400">{group.description}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {group.ranks.map((rank) => (
                          <div key={rank.id} className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border ${group.color.split(' ')[1]}/30 hover:bg-black/60 hover:-translate-y-2 transition-all duration-300 w-full group`}>
                            <img src={rank.image} alt={rank.title} className="w-20 sm:w-24 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all mb-4" />
                            <div className="flex flex-col items-center w-full mt-auto">
                              <span className="text-[11px] font-bold text-white text-center leading-tight min-h-[30px] flex items-center">{rank.title}</span>
                              <div className="w-full h-px bg-white/10 my-2"></div>
                              <span className="text-[12px] font-black tracking-widest text-emerald-400">XP {rank.xp.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <UnratedErrorsModal
          show={showUnratedModal}
          onClose={handleCloseUnratedModal}
          errors={unratedErrors}
          onRateSuccess={handleRateSuccess}
        />

        {showNominationsModal && (
          <MedalsNominationPanel 
            initialTab={showNominationsModal as any}
            onClose={() => {
              setShowNominationsModal(false);
              // Need to trigger reload here maybe through context or window event if not passed
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
