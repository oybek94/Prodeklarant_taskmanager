import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, getNotificationDisplayMessage, requestNotificationPermission } from '../hooks/useNotifications';

/** Hozircha bildirishnomalar o‘chirilgan; keyin yoqish uchun true qiling */
const NOTIFICATIONS_ENABLED = false;

const Layout = () => {
  const { user, logout } = useAuth();
  const { notifications, confirmProcess, rejectProcess, refresh } = useNotifications();
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
      // Desktop'ga o'tganda ochiq, Mobile'ga o'tganda yopiq
      setSidebarOpen(desktop);
    };

    // Initial check
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
  const isSettingsPage = location.pathname.startsWith('/settings');

  const navItems = [
    ...(user?.role === 'ADMIN' ? [{ path: '/dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard' }] : []),
    { path: '/tasks', label: 'Vazifalar', icon: 'lucide:clipboard-list' },
    { path: '/invoices', label: 'Invoyslar', icon: 'lucide:file-text' },
    { path: '/transactions', label: 'Tranzaksiyalar', icon: 'lucide:receipt' },
    ...((user?.role === 'ADMIN' || user?.role === 'MANAGER') ? [{ path: '/clients', label: 'Mijozlar', icon: 'lucide:users' }] : []),
    { path: '/training', label: 'O\'qitish', icon: 'lucide:graduation-cap' },
    ...(user?.role === 'ADMIN' ? [{ path: '/workers', label: 'Ishchilar', icon: 'lucide:user-cog' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/settings', label: 'Sozlamalar', icon: 'lucide:settings' }] : []),
    { path: '/profile', label: 'Profil', icon: 'lucide:user' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : isDesktop ? 'w-12' : 'w-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden relative`}>
        {/* Desktop: Sidebar yopiq bo'lganda - Toggle button tepada */}
        {isDesktop && !sidebarOpen && (
          <div className="p-3 border-b border-gray-200 flex justify-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Icon icon="lucide:menu" className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Logo/Header with Toggle Button - Desktop ochiq */}
        {sidebarOpen && isDesktop && (
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <img src="/logo.png" alt="Prodeklarant" className="h-8 w-auto" />
              <h1 className="sr-only">Prodeklarant</h1>
              {user && (
                <p className="text-sm text-gray-500 mt-2">{user.name}</p>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Icon icon="lucide:x" className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Mobile: Toggle button yonida sahifa nomi - sidebar yopiq bo'lganda */}
        {!isDesktop && !sidebarOpen && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 p-4 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Icon icon="lucide:menu" className="w-5 h-5 text-gray-600" />
            </button>
            <img src="/logo.png" alt="Prodeklarant" className="h-6 w-auto" />
            <h1 className="sr-only">Prodeklarant</h1>
          </div>
        )}

        {/* Mobile: Sidebar ochiq bo'lganda header */}
        {!isDesktop && sidebarOpen && (
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <img src="/logo.png" alt="Prodeklarant" className="h-8 w-auto" />
              <h1 className="sr-only">Prodeklarant</h1>
              {user && (
                <p className="text-sm text-gray-500 mt-2">{user.name}</p>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Icon icon="lucide:x" className="w-5 h-5 text-gray-600" />
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
                    // Mobile'da navigation'dan keyin sidebar'ni yopish
                    if (!isDesktop) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} ${!sidebarOpen ? 'px-2' : 'px-4'} py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} ${!sidebarOpen ? 'px-2' : 'px-4'} py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors`}
            title={!sidebarOpen ? 'Chiqish' : ''}
          >
            <Icon icon="lucide:log-out" className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Chiqish</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header; bildirishnoma qo'ng'irog'i NOTIFICATIONS_ENABLED = true qilinganda ko'rinadi */}
        <header className="flex-shrink-0 flex items-center justify-end gap-2 px-4 py-2 bg-white border-b border-gray-200">
          {NOTIFICATIONS_ENABLED && (
            <div className="relative" ref={panelRef}>
              <button
                onClick={() => {
                  setNotificationPanelOpen(!notificationPanelOpen);
                  requestNotificationPermission();
                }}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Bildirishnomalar"
                title="Bildirishnomalar"
              >
                <Icon icon="lucide:bell" className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {notificationPanelOpen && (
                <div className="absolute right-0 mt-1 w-96 max-h-[28rem] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                  <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <Icon icon="lucide:bell-ring" className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-gray-800">Bildirishnomalar</span>
                    {notifications.length > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-400">
                      <Icon icon="lucide:bell-off" className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm font-medium">Bildirishnomalar yo'q</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-4 hover:bg-gray-50/80 transition-colors">
                          <div className="flex gap-3 mb-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <Icon icon="lucide:file-question" className="w-4 h-4 text-indigo-600" />
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed flex-1 min-w-0">{getNotificationDisplayMessage(n)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await confirmProcess(n.taskProcessId);
                                  if (notifications.length <= 1) setNotificationPanelOpen(false);
                                } catch (err: any) {
                                  alert(err.message || 'Xatolik');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Icon icon="lucide:check" className="w-4 h-4" />
                              Ha
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await rejectProcess(n.taskProcessId);
                                  if (notifications.length <= 1) setNotificationPanelOpen(false);
                                } catch (err: any) {
                                  alert(err.message || 'Xatolik');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Icon icon="lucide:x" className="w-4 h-4" />
                              Yo'q
                            </button>
                            {n.actionUrl && (
                              <button
                                onClick={() => {
                                  navigate(n.actionUrl!);
                                  setNotificationPanelOpen(false);
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Icon icon="lucide:external-link" className="w-4 h-4" />
                                Vazifaga
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </header>
        {/* Mobile: Sidebar yopiq bo'lganda top padding qo'shish */}
        <main
          className={`flex-1 ${isSettingsPage ? 'overflow-hidden' : 'overflow-y-auto'} p-6 ${!isDesktop && !sidebarOpen ? 'pt-20' : ''}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
