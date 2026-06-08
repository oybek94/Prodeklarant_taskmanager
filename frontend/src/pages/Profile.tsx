import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { Icon } from '@iconify/react';
import TrophyRoom from '../components/medals/TrophyRoom';

import { useProfileData } from '../hooks/useProfileData';
import KpiStats from '../components/profile/KpiStats';
import PaymentProgressRing from '../components/profile/PaymentProgressRing';
import StageStatisticsList from '../components/profile/StageStatisticsList';
import ActivityCalendar from '../components/profile/ActivityCalendar';

import EditWorkerModal from '../components/profile/modals/EditWorkerModal';
import EarningsModal from '../components/profile/modals/EarningsModal';
import ParticipationsModal from '../components/profile/modals/ParticipationsModal';
import PaymentsModal from '../components/profile/modals/PaymentsModal';
import ErrorsModal from '../components/profile/modals/ErrorsModal';

import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Bugun', icon: 'lucide:calendar' },
  { value: 'week', label: 'Hafta', icon: 'lucide:calendar-range' },
  { value: 'month', label: 'Oy', icon: 'lucide:calendar-days' },
  { value: 'year', label: 'Yil', icon: 'lucide:calendar-clock' },
  { value: 'all', label: 'Barchasi', icon: 'lucide:infinity' },
];

export default function Profile() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('all');

  const workerId = id ? parseInt(id) : user?.id;

  const {
    stats, stageStats, contributions, errorStats, workerDetail, branches,
    loading, stageStatsLoading, errorStatsLoading,
    reloadWorkerDetail, reloadStats
  } = useProfileData(workerId, period, id);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showParticipationsModal, setShowParticipationsModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showErrorsModal, setShowErrorsModal] = useState(false);

  const displayUser = id ? workerDetail : user;
  const isAdmin = user?.role === 'ADMIN';

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Menejer',
    DEKLARANT: 'Deklarant',
    CERTIFICATE_WORKER: 'Sertifikat xodimi',
    WORKER: 'Ishchi',
    OPERATOR: 'Operator',
    ACCOUNTANT: 'Buxgalter',
    OWNER: 'Egasi',
    SELLER: 'Sotuvchi',
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Xayrli tong';
    if (hour < 18) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalTasksCount = stageStats?.totals?.totalTasks ?? stageStats?.totals?.totalParticipation ?? 0;

  const handleDelete = async () => {
    if (!workerId) return;
    if (!window.confirm('Bu ishchini o\'chirishni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi.')) return;

    try {
      await apiClient.delete(`/users/${workerId}`);
      alert('Ishchi muvaffaqiyatli o\'chirildi');
      navigate('/workers');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleEditSuccess = async () => {
    await reloadWorkerDetail();
    if (id) {
      await reloadStats();
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Clean Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {getUserInitials(displayUser?.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {displayUser?.name || 'Foydalanuvchi'}!
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {roleLabels[displayUser?.role || ''] || displayUser?.role}
              </span>
              {workerDetail?.branch && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 mr-1" />
                    {workerDetail.branch.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center p-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  period === opt.value
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon icon={opt.icon} className="w-4 h-4" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
          {isAdmin && id && (
            <div className="flex gap-2">
              <button onClick={() => setShowEditModal(true)} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-colors shadow-sm">
                <Icon icon="lucide:pencil" className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-500 transition-colors shadow-sm">
                <Icon icon="lucide:trash-2" className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── KPI Stat Cards ─── */}
      <KpiStats
        stats={stats}
        loading={loading}
        stageStatsLoading={stageStatsLoading}
        totalTasksCount={totalTasksCount}
        errorStats={errorStats}
        errorStatsLoading={errorStatsLoading}
        onOpenParticipations={() => setShowParticipationsModal(true)}
        onOpenEarnings={() => setShowEarningsModal(true)}
        onOpenPayments={() => setShowPaymentsModal(true)}
        onOpenErrors={() => setShowErrorsModal(true)}
      />

      {/* ─── Middle Section (Payment Progress & Stage Chart) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PaymentProgressRing stats={stats} loading={loading} />
        
        <div className="lg:col-span-2">
          <TrophyRoom />
        </div>
      </div>

      {/* ─── Stage Statistics & Calendar ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StageStatisticsList
          stageStats={stageStats}
          loading={stageStatsLoading}
          onOpenParticipations={() => setShowParticipationsModal(true)}
        />
        <ActivityCalendar contributions={contributions} />
      </div>

      {/* ═══════════════════════  MODALS  ═══════════════════════ */}
      {showEditModal && workerDetail && workerId && (
        <EditWorkerModal
          workerDetail={workerDetail}
          workerId={workerId}
          branches={branches}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {showEarningsModal && workerId && (
        <EarningsModal workerId={workerId} period={period} onClose={() => setShowEarningsModal(false)} />
      )}

      {showParticipationsModal && workerId && (
        <ParticipationsModal workerId={workerId} period={period} onClose={() => setShowParticipationsModal(false)} />
      )}

      {showPaymentsModal && (
        <PaymentsModal payments={stats?.payments || []} onClose={() => setShowPaymentsModal(false)} />
      )}

      {showErrorsModal && (
        <ErrorsModal errorStats={errorStats} loading={errorStatsLoading} onClose={() => setShowErrorsModal(false)} />
      )}
    </div>
  );
}
