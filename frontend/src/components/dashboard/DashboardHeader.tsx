import React from 'react';
import { Icon } from '@iconify/react';

interface DashboardHeaderProps {
  user: any;
  unratedErrors: any[];
  setShowUnratedModal: (show: boolean) => void;
  pendingDeleteErrors?: any[];
  loadPendingDeleteErrors?: () => void;
}


export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  unratedErrors,
  setShowUnratedModal,
  pendingDeleteErrors,
  loadPendingDeleteErrors = () => {}
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

  return (
    <div className="relative h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-center transition-all duration-300">
      {/* Abstract blobs */}
      <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-[24rem] h-[24rem] rounded-full bg-gradient-to-tr from-blue-400/20 to-purple-400/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
      </div>

      {/* Thematic watermark — cargo/customs motif, echoes the blobs rather than filling the space with a widget */}
      <Icon
        icon="solar:box-minimalistic-bold-duotone"
        className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 w-56 h-56 text-indigo-950/[0.04] dark:text-white/[0.04] pointer-events-none z-0"
      />

      <div className="relative z-10 flex flex-col items-start gap-5 lg:max-w-xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-white/60 dark:border-white/10 shadow-sm text-xs font-bold text-gray-600 dark:text-gray-300 backdrop-blur-md tracking-wide">
          <Icon icon="solar:calendar-date-bold-duotone" className="w-4 h-4 text-indigo-500" />
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
                  <Icon icon="solar:danger-triangle-bold-duotone" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300">Baholanmagan xatolar!</h3>
                  <p className="text-xs text-orange-700/80 dark:text-orange-400/80 mt-0.5">
                    Kutayotgan xatolar soni: <strong className="text-orange-600 dark:text-orange-300 text-sm">{unratedErrors.length}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowUnratedModal(true)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Icon icon="solar:star-bold-duotone" className="w-3.5 h-3.5" /> Baholash
              </button>
            </div>
        )}

        {/* Pending Delete Errors Alert for Admin */}
        {user?.role === 'ADMIN' && pendingDeleteErrors && pendingDeleteErrors.length > 0 && (
            <div className="w-full max-w-md flex flex-col gap-2 bg-red-50/80 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40 rounded-2xl p-4 shadow-sm backdrop-blur-md max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300">O'chirish so'ralgan xatolar</h3>
              </div>
              {pendingDeleteErrors.map(err => (
                <div key={err.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-red-100 dark:border-red-800/30">
                  <div className="text-xs text-red-900 dark:text-red-200 mb-2 sm:mb-0">
                    <span className="font-bold">{err.task?.title}</span> bosqichida <span className="font-bold">{err.worker?.name || 'Mijoz'}</span>ning xatosi
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          await import('../../lib/api').then(m => m.default.post(`/tasks/${err.taskId}/errors/${err.id}/approve-delete`));
                          loadPendingDeleteErrors();
                        } catch (e) { console.error(e); }
                      }} 
                      className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded shadow transition-all text-xs">
                      Tasdiqlash
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          await import('../../lib/api').then(m => m.default.post(`/tasks/${err.taskId}/errors/${err.id}/reject-delete`));
                          loadPendingDeleteErrors();
                        } catch (e) { console.error(e); }
                      }}
                      className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded shadow transition-all text-xs">
                      Bekor qilish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

