import React from 'react';
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

const getGreeting = (hour: number) => {
  if (hour < 10) return 'Xayrli tong';
  if (hour < 17) return 'Xayrli kun';
  return 'Xayrli kech';
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  unratedErrors,
  setShowUnratedModal,
  pendingDeleteErrors,
  loadPendingDeleteErrors = () => {}
}) => {
  const now = new Date();
  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const isNight = hour >= 17 || hour < 5;
  const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
  const weekdays = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${day} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`;

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
    <div className="relative h-full min-h-[456px] overflow-hidden rounded-[28px] bg-[#1E1B4B] text-white p-6 sm:p-8 flex flex-col gap-5">
      {/* Kun vaqti belgisi: kechasi oy, kunduzi quyosh */}
      <svg aria-hidden="true" viewBox="0 0 220 220" className="absolute -right-2 -top-2 w-[220px] h-[220px] pointer-events-none">
        {isNight ? (
          <>
            <circle cx="140" cy="86" r="52" fill="#FDE68A" />
            <circle cx="164" cy="70" r="46" fill="#1E1B4B" />
            <circle cx="52" cy="48" r="2.5" fill="#A5B4FC" />
            <circle cx="92" cy="126" r="2" fill="#A5B4FC" opacity="0.7" />
            <circle cx="188" cy="168" r="2.5" fill="#A5B4FC" />
            <circle cx="118" cy="30" r="1.8" fill="#A5B4FC" opacity="0.7" />
            <circle cx="30" cy="110" r="1.6" fill="#A5B4FC" opacity="0.6" />
          </>
        ) : (
          <>
            <circle cx="140" cy="86" r="40" fill="#FDE68A" />
            <g stroke="#FDE68A" strokeWidth="5" strokeLinecap="round" opacity="0.7">
              <path d="M140 24v12M140 136v12M78 86h12M190 86h12M96 42l8 8M176 122l8 8M184 42l-8 8M96 130l8-8" />
            </g>
          </>
        )}
      </svg>

      <div className="relative inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3.5 py-2 text-[13px] font-bold tracking-wide">
        <Icon icon="solar:calendar-date-bold-duotone" className="w-4 h-4 text-indigo-300" />
        {dateString}
      </div>

      <div className="relative mt-6">
        <div className="text-[22px] font-semibold leading-tight text-indigo-200">{greeting},</div>
        <h1 className="mt-1 break-words text-5xl xl:text-[64px] font-extrabold leading-none tracking-tight text-indigo-300">
          {user?.name?.split(' ')[0] || 'Foydalanuvchi'}
        </h1>
        <p className="mt-4 max-w-[340px] text-base font-medium leading-normal text-indigo-200">
          Bugungi ishlaringizda muvaffaqiyat tilaymiz!
        </p>
      </div>

      {(hasUnrated || hasPendingDelete) && (
        <div className="relative mt-auto flex flex-col gap-3">
          {hasUnrated && (
            <div className="flex items-center gap-3 rounded-[18px] border border-amber-300/35 bg-amber-300/15 py-3 pl-4 pr-3">
              <Icon icon="solar:danger-triangle-bold-duotone" className="w-6 h-6 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-amber-200">Baholanmagan xatolar</div>
                <div className="text-[13px] font-medium text-indigo-100">
                  Kutayotganlar soni: <strong className="text-white">{unratedErrors.length}</strong>
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
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-[18px] border border-red-300/35 bg-red-400/15 p-4">
              <div className="flex items-center gap-2">
                <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5 text-red-300" />
                <h3 className="text-sm font-bold text-red-200">O'chirish so'ralgan xatolar</h3>
              </div>
              {pendingDeleteErrors!.map(err => (
                <div key={err.id} className="flex flex-col gap-2 rounded-xl bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-red-100">
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
                      className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25"
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
