import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePresence } from '../hooks/usePresence';
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
import ClientBonusDetailModal from '../components/profile/modals/ClientBonusDetailModal';

import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Bugun', icon: 'solar:calendar-bold-duotone' },
  { value: 'week', label: 'Hafta', icon: 'solar:calendar-minimalistic-bold-duotone' },
  { value: 'month', label: 'Oy', icon: 'solar:calendar-date-bold-duotone' },
  { value: 'year', label: 'Yil', icon: 'solar:calendar-date-bold-duotone' },
  { value: 'all', label: 'Barchasi', icon: 'solar:infinity-bold-duotone' },
];

export default function Profile() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('all');

  const workerId = id ? parseInt(id) : user?.id;

  const {
    stats, stageStats, contributions, errorStats, workerDetail, branches, clientBonuses,
    loading, stageStatsLoading, errorStatsLoading,
    reloadWorkerDetail, reloadStats
  } = useProfileData(workerId, period, id);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showParticipationsModal, setShowParticipationsModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showErrorsModal, setShowErrorsModal] = useState(false);
  const [selectedBonusId, setSelectedBonusId] = useState<number | null>(null);

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

  const { onlineUsers } = usePresence();
  const isWorkerOnline = workerId !== undefined && onlineUsers.some((u) => u.id === workerId);

  const handleArchive = async () => {
    if (!workerId) return;
    if (!window.confirm(`${displayUser?.name || 'Xodim'} arxivlansinmi? U ishdan chiqqan deb belgilanadi, tizimga kira olmaydi va asosiy ro'yxatda ko'rinmaydi. Ma'lumotlari saqlanadi.`)) return;

    try {
      await apiClient.put(`/users/${workerId}`, { active: false });
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

  const formatUzs = (n: number) => `${new Intl.NumberFormat('en-US').format(Math.round(n)).replace(/,/g, ' ')} so'm`;

  const outlineBtn =
    'h-11 px-4 flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {id && (
        <Link to="/workers" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <Icon icon="solar:alt-arrow-left-bold-duotone" className="w-4 h-4" />
          Xodimlar
        </Link>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-5 min-w-0">
          <span className="relative shrink-0 w-[76px] h-[76px]">
            <span className="w-[76px] h-[76px] rounded-[22px] flex items-center justify-center text-[26px] font-extrabold bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              {getUserInitials(displayUser?.name)}
            </span>
            {id && workerId && (
              <span
                title={isWorkerOnline ? 'Onlayn' : 'Oflayn'}
                className={`absolute -right-1 -bottom-1 w-5 h-5 rounded-full border-[3.5px] border-gray-100 dark:border-slate-900 ${isWorkerOnline ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              />
            )}
          </span>
          <div className="min-w-0 flex flex-col gap-2">
            {!id && <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">{getGreeting()}</div>}
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 truncate">
              {displayUser?.name || 'Foydalanuvchi'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-bold bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300">
                {roleLabels[displayUser?.role || ''] || displayUser?.role}
              </span>
              {workerDetail?.branch && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="solar:map-point-bold-duotone" className="w-4 h-4" />
                  {workerDetail.branch.name}
                </span>
              )}
              {displayUser?.email && <span className="truncate">{displayUser.email}</span>}
            </div>
          </div>
        </div>

        {isAdmin && id && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => setShowEditModal(true)} className={outlineBtn}>
              <Icon icon="solar:pen-bold-duotone" className="w-[18px] h-[18px]" />
              Tahrirlash
            </button>
            <button type="button" onClick={handleArchive} className={outlineBtn}>
              <Icon icon="solar:archive-down-bold-duotone" className="w-[18px] h-[18px]" />
              Arxivlash
            </button>
          </div>
        )}
      </div>

      {/* ─── Period ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">Ko'rsatkichlar davri</div>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-200/70 dark:bg-slate-800">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`h-9 px-[18px] rounded-[9px] text-[13px] font-bold transition-colors ${period === opt.value
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KPI strip ─── */}
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

      {/* ─── Main grid ─── */}
      <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start">
        <div className="flex-1 min-w-0 w-full space-y-6">
          <StageStatisticsList
            stageStats={stageStats}
            loading={stageStatsLoading}
            onOpenParticipations={() => setShowParticipationsModal(true)}
          />
          <ActivityCalendar contributions={contributions} />

          {clientBonuses && clientBonuses.bonuses.length > 0 && (
            <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-slate-700/60">
                <h2 className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Biriktirilgan mijozdan bonus</h2>
                <span className="inline-flex items-center h-[30px] px-3 rounded-full text-[13px] font-bold tabular-nums bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
                  Jami: {formatUzs(clientBonuses.totalBonusUzs)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <div>Sana</div>
                    <div>Mijoz</div>
                    <div>Vazifa</div>
                    <div className="text-right">Bonus</div>
                  </div>
                  {clientBonuses.bonuses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBonusId(b.id)}
                      title="Hisob-kitobni ko'rish"
                      className="w-full grid grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-center px-6 py-3.5 text-left text-sm border-b border-gray-100 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums">{new Date(b.createdAt).toLocaleDateString('en-US')}</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100 truncate">{b.clientName || '-'}</span>
                      <span className="text-gray-600 dark:text-gray-300 truncate">{b.taskTitle || '-'}</span>
                      <span className="text-right font-extrabold tabular-nums text-emerald-800 dark:text-emerald-300">{formatUzs(b.bonusUzs)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="w-full lg:w-[360px] shrink-0 space-y-6">
          <PaymentProgressRing stats={stats} loading={loading} onOpenPayments={() => setShowPaymentsModal(true)} />
          <TrophyRoom userId={workerId} />
        </div>
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

      {selectedBonusId !== null && workerId && (
        <ClientBonusDetailModal workerId={workerId} bonusId={selectedBonusId} onClose={() => setSelectedBonusId(null)} />
      )}

      {showErrorsModal && (
        <ErrorsModal errorStats={errorStats} loading={errorStatsLoading} onClose={() => setShowErrorsModal(false)} />
      )}
    </div>
  );
}
