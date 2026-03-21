import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, getNotificationDisplayMessage, requestNotificationPermission } from '../hooks/useNotifications';
import { usePresence, getPageLabel } from '../hooks/usePresence';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

/** Hozircha bildirishnomalar o‘chirilgan; keyin yoqish uchun true qiling */
const NOTIFICATIONS_ENABLED = true;

const Layout = () => {
  const { user, logout } = useAuth();
  const { notifications, confirmProcess, rejectProcess } = useNotifications();
  const { onlineUsers } = usePresence();
  const { theme, toggleTheme } = useTheme();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED) return;
    if (notifications.length > 0) {
      setNotificationPanelOpen(true);
    }
  }, [notifications.length]);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifications.length > 0) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotificationPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifications.length]);

  const navigate = useNavigate();
  const location = useLocation();

  // Desktop: default ochiq, Mobile: default yopiq
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint
    }
    return true;
  });

  // Window size'ni kuzatish
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Window resize'da sidebar holatini yangilash
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };

    handleResize();
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

  const navItems = [
    ...(user?.role === 'ADMIN' ? [{ path: '/dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard' }] : []),
    ...((user?.role !== 'SELLER') ? [
      { path: '/tasks', label: 'Vazifalar', icon: 'lucide:clipboard-list' },
      { path: '/invoices', label: 'Invoyslar', icon: 'lucide:file-text' },
      { path: '/transactions', label: 'Tranzaksiyalar', icon: 'lucide:receipt' },
    ] : []),
    ...((user?.role === 'ADMIN' || user?.role === 'MANAGER') ? [{ path: '/clients', label: 'Mijozlar', icon: 'lucide:users' }] : []),
    ...((user?.role === 'ADMIN' || user?.role === 'SELLER') ? [{ path: '/leads', label: 'Lidlar', icon: 'lucide:target' }] : []),
    ...((user?.role === 'ADMIN' || user?.role === 'SELLER') ? [{ path: '/crm', label: 'CRM', icon: 'lucide:bar-chart-2' }] : []),
    { path: '/training', label: 'O\'qitish', icon: 'lucide:graduation-cap' },
    ...(user?.role === 'ADMIN' ? [{ path: '/training/manage', label: 'O\'qitish Boshqaruvi', icon: 'lucide:book-open-check' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/workers', label: 'Ishchilar', icon: 'lucide:user-cog' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/settings', label: 'Sozlamalar', icon: 'lucide:settings' }] : []),
    { path: '/profile', label: 'Profil', icon: 'lucide:user' },
  ];

  return (
    <div className="flex h-screen h-[100dvh] bg-gray-50 dark:bg-gray-900 relative text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      {!isExamPage && (
        <div className={`${sidebarOpen ? 'w-64' : isDesktop ? 'w-12' : 'w-0'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 overflow-hidden relative`}>
          {/* Desktop/Mobile Header in Sidebar */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className={`${sidebarOpen ? 'block' : 'hidden'}`}>
              <img src="/logo.png" alt="Prodeklarant" className="h-8 w-auto" />
              {user && <p className="text-sm text-gray-500 mt-2">{user.name}</p>}
            </div>
            {(sidebarOpen || !isDesktop) && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex-shrink-0"
              >
                <Icon icon={sidebarOpen ? "lucide:x" : "lucide:menu"} className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>

          {!isDesktop && !sidebarOpen && (
            <div className="p-3 border-b border-gray-200 flex justify-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Icon icon="lucide:menu" className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      if (!isDesktop) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} ${!sidebarOpen ? 'px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    title={!sidebarOpen ? item.label : ''}
                  >
                    <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Online foydalanuvchilar */}
          {sidebarOpen && onlineUsers.length > 0 && (
            <div className="px-4 pb-2 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online ({onlineUsers.length})
              </p>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {onlineUsers.map(u => (
                  <li key={u.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-0.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                    <span className="truncate font-medium">{u.name}{u.id === user?.id ? ' (Siz)' : ''}</span>
                    {u.page && <span className="text-gray-400 dark:text-gray-500 truncate">• {getPageLabel(u.page)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!sidebarOpen && onlineUsers.length > 0 && (
            <div className="flex flex-col items-center gap-1 py-2 border-t border-gray-200 dark:border-gray-700" title={`${onlineUsers.length} ta foydalanuvchi online`}>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-gray-400">{onlineUsers.length}</span>
            </div>
          )}

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} ${!sidebarOpen ? 'px-2' : 'px-4'} py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
              title={!sidebarOpen ? 'Chiqish' : ''}
            >
              <Icon icon="lucide:log-out" className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Chiqish</span>}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Mobile/Desktop Header (Redundant on Exam Page) */}
        {!isExamPage && (
          <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
              {NOTIFICATIONS_ENABLED && (
                <div className="relative" ref={panelRef}>
                  <button
                    onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                    className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Icon icon="lucide:bell" className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </button>
                  {notificationPanelOpen && (
                    <div className="absolute right-0 mt-1 w-80 sm:w-96 max-h-[28rem] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                      <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
                        <Icon icon="lucide:bell-ring" className="w-5 h-5 text-indigo-600" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Bildirishnomalar</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.length === 0 ? (
                          <div className="p-12 text-center text-gray-400">
                            <Icon icon="lucide:bell-off" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium">Bildirishnomalar yo'q</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">{getNotificationDisplayMessage(n)}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => confirmProcess(n.taskProcessId)}
                                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Tasdiqlash
                                </button>
                                <button
                                  onClick={() => rejectProcess(n.taskProcessId)}
                                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                  Rad etish
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        {/* Main Content Outlet */}
        <main className={`flex-1 ${isInvoicesPage || isExamPage ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto'} ${isExamPage ? 'p-0' : 'p-4 md:p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
