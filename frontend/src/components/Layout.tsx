import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Icon } from '@iconify/react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, getNotifStyle, requestNotificationPermission } from '../hooks/useNotifications';
import type { AppNotification } from '../hooks/useNotifications';
import { usePresence, getPageLabel } from '../hooks/usePresence';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { GlobalRankUpWatcher } from './GlobalRankUpWatcher';
import apiClient from '../lib/api';
import BXMModal from './tasks/BxmModal';

// Vaqt formatini olish
const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'hozir';
  if (diffMin < 60) return `${diffMin} daq.`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} soat`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} kun`;
};

/**
 * Memoized notification bell + dropdown panel.
 * Calls useNotifications() internally so Layout does NOT re-render
 * when the notifications array reference changes every 60s.
 */
const NotificationBell = memo(({ onProcessConfirmWithBXM }: {
  onProcessConfirmWithBXM: (n: AppNotification, confirmFn: (processId: number, data?: any) => Promise<void>) => void;
}) => {
  const { notifications, unreadCount, confirmProcess, rejectProcess, markRead, markAllRead, dismissNotification } = useNotifications();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Bildirishnoma ruxsati so'rash
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Tashqarini bosganda panelni yopish
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotificationPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProcessConfirm = useCallback(async (n: AppNotification) => {
    const processId = (n.metadata as any)?.taskProcessId;
    const processType = (n.metadata as any)?.processType;
    if (!processId) return;

    if (processType === 'DECLARATION') {
      onProcessConfirmWithBXM(n, confirmProcess);
      return;
    }

    setActionLoadingId(n.id);
    try {
      await confirmProcess(processId, {});
      toast.success('Tayyor deb belgilandi!');
    } catch (err: any) {
      toast.error(err.message || 'Xatolik');
    } finally {
      setActionLoadingId(null);
    }
  }, [confirmProcess, onProcessConfirmWithBXM]);

  const handleProcessReject = useCallback(async (n: AppNotification) => {
    const processId = (n.metadata as any)?.taskProcessId;
    if (!processId) return;
    setActionLoadingId(n.id);
    try {
      await rejectProcess(processId);
      toast('Hali yo\'q deb belgilandi', { icon: '⏳' });
    } catch (err: any) {
      toast.error(err.message || 'Xatolik');
    } finally {
      setActionLoadingId(null);
    }
  }, [rejectProcess]);

  const handleNotificationClick = useCallback((n: AppNotification) => {
    if (n.actionUrl) {
      navigate(n.actionUrl);
      setNotificationPanelOpen(false);
    }
    markRead(n.id);
  }, [navigate, markRead]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Icon icon="lucide:bell" className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Bildirishnoma Panel */}
      {notificationPanelOpen && (
        <div className="absolute right-0 mt-1 w-80 sm:w-[26rem] max-h-[32rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bell-ring" className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Bildirishnomalar</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Barchasini o'qish
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Icon icon="lucide:bell-off" className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Bildirishnomalar yo'q</p>
                <p className="text-xs mt-1 text-gray-400">Yangi xabarlar shu yerda ko'rinadi</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => {
                const style = getNotifStyle(n.color);
                const isProcessReminder = n.type === 'PROCESS_REMINDER';
                const isEscalation = n.type === 'PROCESS_ESCALATED';
                return (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-gray-50 dark:border-gray-700/50 ${style.bg} ${style.darkBg} transition-colors`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleNotificationClick(n)}
                            className={`text-sm font-semibold ${style.text} ${style.darkText} hover:underline text-left truncate`}
                          >
                            {n.title}
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                              title="Yopish"
                            >
                              <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className={`text-xs mt-0.5 ${style.text} ${style.darkText} opacity-80`}>{n.message}</p>

                        {/* Process Reminder action tugmalari */}
                        {(isProcessReminder || isEscalation) && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleProcessConfirm(n)}
                              disabled={actionLoadingId === n.id}
                              className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {actionLoadingId === n.id
                                ? <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
                                : <Icon icon="lucide:check" className="w-3 h-3" />}
                              Tayyor
                            </button>
                            <button
                              onClick={() => handleProcessReject(n)}
                              disabled={actionLoadingId === n.id}
                              className="px-3 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <Icon icon="lucide:clock" className="w-3 h-3" />
                              Hali yo'q
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setNotificationPanelOpen(false);
                }}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Hammasini ko'rish ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const Layout = () => {
  const { user, logout } = useAuth();
  const { onlineUsers } = usePresence();
  const { theme, toggleTheme } = useTheme();

  // BXM Modal state
  const [showBXMModal, setShowBXMModal] = useState(false);
  const [bxmMultiplier, setBxmMultiplier] = useState('1.5');
  const [afterHoursDeclaration, setAfterHoursDeclaration] = useState(false);
  const [currentBxmUsd, setCurrentBxmUsd] = useState(34.4);
  const [currentBxmUzs, setCurrentBxmUzs] = useState(412000);
  const [pendingDeclarationNotif, setPendingDeclarationNotif] = useState<AppNotification | null>(null);
  const [pendingConfirmFn, setPendingConfirmFn] = useState<{ fn: (processId: number, data?: any) => Promise<void> } | null>(null);

  const formatBxmAmountInSum = (multiplier: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(multiplier * currentBxmUzs)).replace(/,/g, ' ').replace(/\./g, ',') + ' UZS';
  };

  const handleBXMConfirm = async () => {
    if (!pendingDeclarationNotif || !pendingConfirmFn) return;
    const processId = (pendingDeclarationNotif.metadata as any)?.taskProcessId;
    
    const multiplier = parseFloat(bxmMultiplier);
    const paymentAmount = multiplier * currentBxmUzs;

    if (multiplier > 1.0) {
      if (!confirm(`BXM ${multiplier} barobari tanlandi. Davom etasizmi?`)) return;
    }

    try {
      await pendingConfirmFn.fn(processId, { 
        declarationPaymentAmount: paymentAmount,
        afterHoursDeclaration,
        bxmMultiplier: multiplier
      });
      toast.success('Tayyor deb belgilandi!');
    } catch (err: any) {
      toast.error(err.message || 'Xatolik');
    } finally {
      setShowBXMModal(false);
      setPendingDeclarationNotif(null);
      setPendingConfirmFn(null);
    }
  };

  // Callback for NotificationBell when a DECLARATION process needs BXM modal
  const handleProcessConfirmWithBXM = useCallback(async (
    n: AppNotification,
    confirmFn: (processId: number, data?: any) => Promise<void>
  ) => {
    try {
      const bxmResponse = await apiClient.get('/bxm/current');
      setCurrentBxmUsd(Number(bxmResponse.data.amountUsd ?? bxmResponse.data.amount ?? 34.4));
      setCurrentBxmUzs(Number(bxmResponse.data.amountUzs ?? 412000));
    } catch (err) {
      // Fallback to default
      setCurrentBxmUsd(34.4);
      setCurrentBxmUzs(412000);
    }
    setBxmMultiplier('1.5');
    setAfterHoursDeclaration(false);
    setPendingDeclarationNotif(n);
    setPendingConfirmFn({ fn: confirmFn });
    setShowBXMModal(true);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1280;
    return true;
  });

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768;
    return true;
  });

  useEffect(() => {
    let prevWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      setIsDesktop(currentWidth >= 768);
      
      if (prevWidth >= 1280 && currentWidth < 1280) {
        setSidebarOpen(false);
      } else if (prevWidth < 1280 && currentWidth >= 1280) {
        setSidebarOpen(true);
      }
      prevWidth = currentWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isInvoicesPage = location.pathname === '/invoices';
  const isExamPage = location.pathname.startsWith('/exam');

  const rawNavItems = [
    // Asosiy
    ...(user?.role !== 'SELLER' ? [{ path: '/dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard', group: 'Asosiy' }] : []),
    
    // Ish jarayoni
    ...((user?.role !== 'SELLER') ? [{ path: '/tasks', label: 'Vazifalar', icon: 'lucide:clipboard-list', group: 'Ish jarayoni' }] : []),
    ...((user?.role !== 'SELLER') ? [{ path: '/invoices', label: 'Invoyslar', icon: 'lucide:file-text', group: 'Ish jarayoni' }] : []),

    // Savdo va CRM
    ...((user?.role === 'ADMIN' || user?.role === 'SELLER') ? [{ path: '/crm', label: 'CRM', icon: 'lucide:bar-chart-2', group: 'Savdo va CRM' }] : []),
    ...((user?.role === 'ADMIN' || user?.role === 'SELLER') ? [{ path: '/leads', label: 'Lidlar', icon: 'lucide:target', group: 'Savdo va CRM' }] : []),
    ...(user?.role !== 'SELLER' ? [{ path: '/clients', label: 'Mijozlar', icon: 'lucide:users', group: 'Savdo va CRM' }] : []),
    
    // Moliya
    ...((user?.role !== 'SELLER') ? [{ path: '/transactions', label: 'Tranzaksiyalar', icon: 'lucide:receipt', group: 'Moliya' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/debts', label: 'Qarzlar', icon: 'lucide:wallet', group: 'Moliya' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/finance', label: 'Moliya', icon: 'lucide:banknote', group: 'Moliya' }] : []),

    // Jamoa va O'quv
    ...(user?.role === 'ADMIN' ? [{ path: '/workers', label: 'Ishchilar', icon: 'lucide:user-cog', group: 'Jamoa va O\'quv' }] : []),
    { path: '/training', label: 'O\'qitish', icon: 'lucide:graduation-cap', group: 'Jamoa va O\'quv' },
    ...(user?.role === 'ADMIN' ? [{ path: '/training/manage', label: 'O\'qitish Boshqaruvi', icon: 'lucide:book-open-check', group: 'Jamoa va O\'quv' }] : []),

    // Tizim
    ...(user?.role === 'ADMIN' || user?.role === 'OWNER' ? [{ path: '/data-assistant', label: 'AI Tahlilchi', icon: 'lucide:bot', group: 'Tizim' }] : []),
    ...(user?.role !== 'SELLER' ? [{ path: '/settings', label: 'Sozlamalar', icon: 'lucide:settings', group: 'Tizim' }] : []),
    ...(user?.role !== 'SELLER' ? [{ path: '/faq', label: 'FAQ (Yordam)', icon: 'lucide:help-circle', group: 'Tizim' }] : []),
    { path: '/profile', label: 'Profil', icon: 'lucide:user', group: 'Tizim' },
  ];

  // Guruhlash
  const groupedNavItems = rawNavItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof rawNavItems>);



  return (
    <div className="flex h-screen h-[100dvh] bg-gray-50 dark:bg-gray-950 relative text-gray-900 dark:text-gray-100 md:p-3 p-0 gap-0 md:gap-3">
      {/* Sidebar */}
      {!isExamPage && (
        <div className={`${sidebarOpen ? 'w-64' : isDesktop ? 'w-20' : 'w-0'} bg-gradient-to-b from-brand-dark to-brand-blue dark:bg-gray-900 md:rounded-2xl flex flex-col transition-all duration-300 overflow-hidden relative z-20 flex-shrink-0 md:shadow-lg md:shadow-brand-dark/20 dark:shadow-none dark:border dark:border-gray-800/60`}>
          {/* Nuqta tarmog'i */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Pastki chap gradient yog'du */}
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 dark:bg-brand-blue/10 rounded-full blur-3xl opacity-50 dark:opacity-20 -translate-x-1/2 translate-y-1/3 pointer-events-none" />

          <div className={`${sidebarOpen ? 'p-6' : 'py-4'} border-b border-white/10 dark:border-gray-800 flex items-center justify-between relative z-10`}>
            {sidebarOpen && (
              <div className="block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/15 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center border border-white/20 dark:border-indigo-500/20">
                    <img src="/favicon.png" alt="ProDeklarant" className="w-5 h-5 object-contain" />
                  </div>
                  <span className="text-white dark:text-gray-100 font-semibold tracking-tight">ProDeklarant</span>
                </div>
                {user && <p className="text-xs text-indigo-200 dark:text-gray-400 mt-2 truncate">{user.name}</p>}
              </div>
            )}
            {(!sidebarOpen && isDesktop) && (
              <div className="w-full flex justify-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2.5 bg-white/10 hover:bg-white/20 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors flex-shrink-0 relative z-10"
                  title="Menuni ochish"
                >
                  <Icon icon="lucide:menu" className="w-5 h-5 text-white dark:text-gray-300" />
                </button>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 relative z-10"
                title="Menuni yopish"
              >
                <Icon icon={isDesktop ? "lucide:chevron-left" : "lucide:x"} className="w-5 h-5 text-white dark:text-gray-300" />
              </button>
            )}
          </div>



          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto ${sidebarOpen ? 'p-4 custom-scrollbar' : 'py-4 px-0 hide-scrollbar'} relative z-10`}>
            <div className="space-y-6">
              {Object.entries(groupedNavItems).map(([group, items]) => (
                <div key={group}>
                  {sidebarOpen && (
                    <p className="px-4 text-[11px] font-semibold text-indigo-200/70 dark:text-gray-500 uppercase tracking-wider mb-2">
                      {group}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.path}>
                        <button
                          onClick={() => {
                            navigate(item.path);
                            if (!isDesktop) setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2.5 rounded-xl transition-colors ${isActive(item.path)
                            ? 'bg-white/15 dark:bg-indigo-500/10 text-white dark:text-indigo-400 font-medium shadow-sm dark:shadow-none border border-white/5 dark:border-transparent'
                            : 'text-indigo-100 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-gray-800 hover:text-white dark:hover:text-gray-200'
                            }`}
                          title={!sidebarOpen ? item.label : ''}
                        >
                          <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                          {sidebarOpen && <span className="truncate text-sm">{item.label}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* Online foydalanuvchilar */}
          {sidebarOpen && onlineUsers.length > 0 && (
            <div className="px-4 pb-2 border-t border-white/10 dark:border-gray-800 pt-3 relative z-10">
              <p className="text-xs font-semibold text-indigo-200 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                Online ({onlineUsers.length})
              </p>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {onlineUsers.map(u => (
                  <li key={u.id} className="flex items-center gap-2 text-xs text-indigo-100 dark:text-gray-400 py-0.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                    <span className="truncate font-medium">{u.name}{u.id === user?.id ? ' (Siz)' : ''}</span>
                    {u.page && <span className="text-indigo-300 dark:text-gray-500 truncate">• {getPageLabel(u.page)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!sidebarOpen && onlineUsers.length > 0 && (
            <div className="flex flex-col items-center gap-1 py-2 border-t border-white/10 dark:border-gray-800 relative z-10" title={`${onlineUsers.length} ta foydalanuvchi online`}>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
              <span className="text-[10px] text-indigo-200 dark:text-gray-400">{onlineUsers.length}</span>
            </div>
          )}

          {/* Logout Button */}
          <div className="p-4 border-t border-white/10 dark:border-gray-800 relative z-10">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-indigo-100 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-gray-800 hover:text-white dark:hover:text-gray-200 transition-colors`}
              title={!sidebarOpen ? 'Chiqish' : ''}
            >
              <Icon icon="lucide:log-out" className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Chiqish</span>}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800 md:rounded-2xl md:shadow-sm md:border border-gray-200/60 dark:border-gray-700/60">
        {/* Main Content Area (Scrollable) */}
        <main className={`flex-1 ${!isDesktop ? 'overflow-y-auto' : (isInvoicesPage || isExamPage ? 'overflow-hidden flex flex-col' : 'overflow-y-auto')} flex flex-col`}>
          {/* Top Header */}
          {!isExamPage && (
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700/50">
              {!isDesktop && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Icon icon="lucide:menu" className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
                >
                  <Icon icon={theme === 'dark' ? "lucide:sun" : "lucide:moon"} className="w-5 h-5" />
                </button>

                {/* 🔔 Bildirishnoma Bell */}
                {user?.role !== 'SELLER' && (
                  <NotificationBell onProcessConfirmWithBXM={handleProcessConfirmWithBXM} />
                )}
              </div>
            </header>
          )}

          {/* Main Content Outlet */}
          <div className={`flex-1 ${isInvoicesPage || isExamPage ? 'overflow-hidden flex flex-col' : ''} ${isExamPage ? 'p-0' : 'px-4 pt-4 pb-32 md:p-6'}`}>
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalRankUpWatcher />
      
      <BXMModal
        show={showBXMModal}
        bxmMultiplier={bxmMultiplier}
        setBxmMultiplier={setBxmMultiplier}
        afterHoursDeclaration={afterHoursDeclaration}
        setAfterHoursDeclaration={setAfterHoursDeclaration}
        formatBxmAmountInSum={formatBxmAmountInSum}
        onConfirm={handleBXMConfirm}
        onClose={() => {
          setShowBXMModal(false);
          setPendingDeclarationNotif(null);
          setPendingConfirmFn(null);
        }}
      />
    </div>
  );
};

export default Layout;
