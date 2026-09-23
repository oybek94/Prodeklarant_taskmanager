import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
import type { UserMedal } from '../types/medals';

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const [showUnratedModal, setShowUnratedModal] = useState(false);
  const [showNominationsModal, setShowNominationsModal] = useState<false | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>(false);

  const handleCloseUnratedModal = useCallback(() => setShowUnratedModal(false), []);


  const {
    stats,
    statsError,
    chartData,
    loading,
    premiumStats,
    completedSummary,
    loadingCompletedSummary,
    allMedals,
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
              unratedErrors={unratedErrors}
              pendingDeleteErrors={pendingDeleteErrors}
              loadPendingDeleteErrors={loadPendingDeleteErrors}
              setShowUnratedModal={setShowUnratedModal}
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
