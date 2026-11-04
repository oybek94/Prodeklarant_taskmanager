import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api';
import type { DashboardTaskError } from '../../types/dashboard';

interface DashboardHeaderProps {
  user: { name: string; role: string } | null;
  unratedErrors: DashboardTaskError[];
  setShowUnratedModal: (show: boolean) => void;
  pendingDeleteErrors?: DashboardTaskError[];
  loadPendingDeleteErrors?: () => void;
}

type DayPhase = 'tong' | 'kun' | 'kech' | 'tun';

interface PhaseTheme {
  gradient: string;
  ink: string;
  sub: string;
  name: string;
  pillBg: string;
  accent: string;
  track: string;
  greeting: string;
  message: string;
  alertWrap: string;
  alertTitle: string;
  alertText: string;
  alertIcon: string;
}

const PHASE_ORDER: DayPhase[] = ['tong', 'kun', 'kech', 'tun'];

// Chegaralar oldingidek: 10 va 17 soat; tun 21:00 dan 05:00 gacha
const getPhase = (hour: number): DayPhase => {
  if (hour >= 5 && hour < 10) return 'tong';
  if (hour >= 10 && hour < 17) return 'kun';
  if (hour >= 17 && hour < 21) return 'kech';
  return 'tun';
};

const LIGHT_ALERT = {
  alertWrap: 'border-amber-500/60 bg-amber-100',
  alertTitle: '#6B4A00',
  alertText: '#6B4A00',
  alertIcon: '#9A6B00',
};
const DARK_ALERT = {
  alertWrap: 'border-amber-300/35 bg-amber-300/15',
  alertTitle: '#FDE68A',
  alertText: '#E0E7FF',
  alertIcon: '#FCD34D',
};

const THEMES: Record<DayPhase, PhaseTheme> = {
  tong: {
    gradient: 'linear-gradient(170deg, #FFE9D2 0%, #FFD2AC 100%)',
    ink: '#3D2210', sub: '#6A4226', name: '#A33A08',
    pillBg: 'rgba(255,255,255,0.6)', accent: '#3D2210', track: 'rgba(61,34,16,0.15)',
    greeting: 'Xayrli tong',
    message: "Kun rejasi tayyor. Muddati yaqin ishlardan boshlang!",
    ...LIGHT_ALERT,
  },
  kun: {
    gradient: 'linear-gradient(170deg, #E6F5FF 0%, #BADFFF 100%)',
    ink: '#0A2F52', sub: '#27506F', name: '#0B5CAD',
    pillBg: 'rgba(255,255,255,0.65)', accent: '#0B5CAD', track: 'rgba(10,47,82,0.14)',
    greeting: 'Xayrli kun',
    message: 'Bugungi ishlaringizda muvaffaqiyat tilaymiz!',
    ...LIGHT_ALERT,
  },
  kech: {
    gradient: 'linear-gradient(170deg, #2B2468 0%, #9B4577 100%)',
    ink: '#FFF1F5', sub: '#FFD9E6', name: '#FFC2D4',
    pillBg: 'rgba(255,255,255,0.14)', accent: '#FFC2D4', track: 'rgba(255,255,255,0.2)',
    greeting: 'Xayrli kech',
    message: "Kun yakuniga oz qoldi. Ochiq qolgan ishlarni tekshiring.",
    ...DARK_ALERT,
  },
  tun: {
    gradient: 'linear-gradient(170deg, #1E1B4B 0%, #100E2E 100%)',
    ink: '#E0E7FF', sub: '#C7D2FE', name: '#A5B4FC',
    pillBg: 'rgba(255,255,255,0.1)', accent: '#A5B4FC', track: 'rgba(255,255,255,0.16)',
    greeting: 'Xayrli kech',
    message: "Dam olish vaqti. Ertangi rejani bir ko'zdan kechiring.",
    ...DARK_ALERT,
  },
};

const WORK_START = 9;
const WORK_END = 18;
const FADE = { transition: 'opacity 0.9s ease' } as const;
const COLOR_FADE = { transition: 'color 0.6s ease' } as const;

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  unratedErrors,
  setShowUnratedModal,
  pendingDeleteErrors,
  loadPendingDeleteErrors = () => {}
}) => {
  const now = useNow();
  const hour = now.getHours();
  const phase = getPhase(hour);
  const theme = THEMES[phase];
  const isLight = phase === 'tong' || phase === 'kun';
  const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
  const weekdays = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${day} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`;
  const timeString = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Ish kuni progressi (09:00–18:00)
  const hourFraction = hour + now.getMinutes() / 60;
  const workProgress = Math.min(1, Math.max(0, (hourFraction - WORK_START) / (WORK_END - WORK_START)));
  const workPercent = Math.round(workProgress * 100);
  const workLabel =
    hourFraction < WORK_START ? 'Ish kuni 09:00 da boshlanadi'
    : hourFraction >= WORK_END ? 'Ish kuni yakunlandi'
    : `Ish kuni ${workPercent}% o'tdi`;

  // O'chirish so'rovini tasdiqlash / rad etish. Oldin xato jimgina console'ga ketardi
  const resolveDeleteRequest = async (err: DashboardTaskError, action: 'approve-delete' | 'reject-delete') => {
    try {
      await apiClient.post(`/tasks/${err.taskId}/errors/${err.id}/${action}`);
      loadPendingDeleteErrors();
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Amalni bajarib bo'lmadi");
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const hasUnrated = isAdmin && unratedErrors.length > 0;
  const hasPendingDelete = isAdmin && !!pendingDeleteErrors && pendingDeleteErrors.length > 0;

  return (
    <div
      className="relative h-full min-h-[456px] overflow-hidden rounded-[28px] p-6 sm:p-8 flex flex-col gap-5"
      style={{ color: theme.ink }}
    >
      {/* Fon qatlamlari: davr almashganda yumshoq o'tadi */}
      {PHASE_ORDER.map(p => (
        <div
          key={p}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: THEMES[p].gradient, opacity: p === phase ? 1 : 0, ...FADE }}
        />
      ))}

      {/* Kun vaqti belgisi: tong/kun/kech quyosh, tun oy */}
      <svg aria-hidden="true" viewBox="0 0 220 220" className="absolute -right-2 -top-2 w-[220px] h-[220px] pointer-events-none">
        <defs>
          <mask id="dashMoonMask">
            <rect width="220" height="220" fill="white" />
            <circle cx="166" cy="70" r="46" fill="black" />
          </mask>
        </defs>
        <g style={{ opacity: phase === 'tong' ? 1 : 0, ...FADE }}>
          <g stroke="#F58A2E" strokeWidth="5" strokeLinecap="round" opacity="0.7">
            <path d="M140 66v-12M96 84l8 8M184 84l-8 8M78 128h12M190 128h12" />
          </g>
          <circle cx="140" cy="128" r="40" fill="#FF9F4A" />
        </g>
        <g style={{ opacity: phase === 'kun' ? 1 : 0, ...FADE }}>
          <g stroke="#F5B50F" strokeWidth="5" strokeLinecap="round" opacity="0.75">
            <path d="M140 24v12M140 136v12M78 86h12M190 86h12M96 42l8 8M176 122l8 8M184 42l-8 8M96 130l8-8" />
          </g>
          <circle cx="140" cy="86" r="40" fill="#FDC93B" />
        </g>
        <g style={{ opacity: phase === 'kech' ? 1 : 0, ...FADE }}>
          <circle cx="140" cy="116" r="62" fill="#FFB38A" opacity="0.25" />
          <circle cx="140" cy="116" r="44" fill="#FF8F6B" />
          <circle cx="40" cy="52" r="2" fill="#FFD6E3" opacity="0.8" />
          <circle cx="86" cy="24" r="1.6" fill="#FFD6E3" opacity="0.6" />
        </g>
        <g style={{ opacity: phase === 'tun' ? 1 : 0, ...FADE }}>
          <circle cx="140" cy="86" r="52" fill="#FDE68A" mask="url(#dashMoonMask)" />
          <circle cx="52" cy="48" r="2.5" fill="#A5B4FC" />
          <circle cx="92" cy="126" r="2" fill="#A5B4FC" opacity="0.7" />
          <circle cx="188" cy="168" r="2.5" fill="#A5B4FC" />
          <circle cx="118" cy="30" r="1.8" fill="#A5B4FC" opacity="0.7" />
          <circle cx="30" cy="110" r="1.6" fill="#A5B4FC" opacity="0.6" />
        </g>
      </svg>

      <div
        className="relative inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-[13px] font-bold tracking-wide"
        style={{ background: theme.pillBg, color: theme.ink, transition: 'background 0.6s ease, color 0.6s ease' }}
      >
        <Icon icon="solar:calendar-date-bold-duotone" className="w-4 h-4" />
        <span>{dateString}</span>
        <span aria-hidden="true" className="opacity-50">·</span>
        <span className="tabular-nums">{timeString}</span>
      </div>

      <div className="relative mt-6">
        <div className="text-[22px] font-semibold leading-tight" style={{ color: theme.sub, ...COLOR_FADE }}>{theme.greeting},</div>
        <h1 className="mt-1 break-words text-5xl xl:text-[64px] font-extrabold leading-none tracking-tight" style={{ color: theme.name, ...COLOR_FADE }}>
          {user?.name?.split(' ')[0] || 'Foydalanuvchi'}
        </h1>
        <p className="mt-4 max-w-[340px] text-base font-medium leading-normal" style={{ color: theme.sub, ...COLOR_FADE }}>
          {theme.message}
        </p>
      </div>

      {/* Ish kuni progressi */}
      <div className="relative">
        <div className="flex justify-between text-xs font-semibold" style={{ color: theme.sub, ...COLOR_FADE }}>
          <span>{workLabel}</span>
          <span className="tabular-nums">09:00 – 18:00</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full"
          style={{ background: theme.track }}
          role="progressbar"
          aria-label="Ish kuni progressi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={workPercent}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${workPercent}%`, background: theme.accent, transition: 'width 0.6s ease, background 0.6s ease' }}
          />
        </div>
      </div>

      {(hasUnrated || hasPendingDelete) && (
        <div className="relative mt-auto flex flex-col gap-3">
          {hasUnrated && (
            <div className={`flex items-center gap-3 rounded-[18px] border py-3 pl-4 pr-3 ${theme.alertWrap}`}>
              <Icon icon="solar:danger-triangle-bold-duotone" className="w-6 h-6 shrink-0" style={{ color: theme.alertIcon }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold" style={{ color: theme.alertTitle }}>Baholanmagan xatolar</div>
                <div className="text-[13px] font-medium" style={{ color: theme.alertText }}>
                  Kutayotganlar soni: <strong>{unratedErrors.length}</strong>
                </div>
              </div>
              <button
                onClick={() => setShowUnratedModal(true)}
                className="min-h-[44px] shrink-0 rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-[#1E1B4B] transition-colors hover:bg-amber-300"
              >
                Baholash
              </button>
            </div>
          )}

          {hasPendingDelete && (
            <div className={`flex max-h-48 flex-col gap-2 overflow-y-auto rounded-[18px] border p-4 ${isLight ? 'border-red-400/60 bg-red-100' : 'border-red-300/35 bg-red-400/15'}`}>
              <div className="flex items-center gap-2">
                <Icon icon="solar:trash-bin-trash-bold-duotone" className={`w-5 h-5 ${isLight ? 'text-red-700' : 'text-red-300'}`} />
                <h3 className={`text-sm font-bold ${isLight ? 'text-red-900' : 'text-red-200'}`}>O'chirish so'ralgan xatolar</h3>
              </div>
              {pendingDeleteErrors!.map(err => (
                <div key={err.id} className={`flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between ${isLight ? 'bg-white/60' : 'bg-black/20'}`}>
                  <div className={`text-xs ${isLight ? 'text-red-900' : 'text-red-100'}`}>
                    <span className="font-bold">{err.task?.title}</span> bosqichida <span className="font-bold">{err.worker?.name || 'Mijoz'}</span>ning xatosi
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveDeleteRequest(err, 'approve-delete')}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-600"
                    >
                      Tasdiqlash
                    </button>
                    <button
                      onClick={() => resolveDeleteRequest(err, 'reject-delete')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${isLight ? 'bg-red-900/10 text-red-900 hover:bg-red-900/20' : 'bg-white/15 text-white hover:bg-white/25'}`}
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
