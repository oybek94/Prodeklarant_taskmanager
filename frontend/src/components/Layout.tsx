import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
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

  const navItems = [
    ...(user?.role === 'ADMIN' ? [{ path: '/dashboard', label: 'Dashboard', icon: 'mdi:view-dashboard' }] : []),
    { path: '/tasks', label: 'Vazifalar', icon: 'mdi:clipboard-list' },
    { path: '/transactions', label: 'Tranzaksiyalar', icon: 'mdi:cash-multiple' },
    ...(user?.role === 'ADMIN' ? [{ path: '/invoices', label: 'Hisob-fakturalar', icon: 'mdi:file-document-multiple' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/clients', label: 'Mijozlar', icon: 'mdi:account-group' }] : []),
    { path: '/training', label: 'O\'qitish', icon: 'mdi:school' },
    ...(user?.role === 'ADMIN' ? [{ path: '/workers', label: 'Ishchilar', icon: 'mdi:account-hard-hat' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/settings', label: 'Sozlamalar', icon: 'mdi:cog' }] : []),
    { path: '/profile', label: 'Profil', icon: 'mdi:account' },
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
              <Icon icon="mdi:menu" className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Logo/Header with Toggle Button - Desktop ochiq */}
        {sidebarOpen && isDesktop && (
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Prodeklarant</h1>
              {user && (
                <p className="text-sm text-gray-500 mt-1">{user.name}</p>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Icon icon="mdi:close" className="w-5 h-5 text-gray-600" />
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
              <Icon icon="mdi:menu" className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Prodeklarant</h1>
          </div>
        )}

        {/* Mobile: Sidebar ochiq bo'lganda header */}
        {!isDesktop && sidebarOpen && (
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Prodeklarant</h1>
              {user && (
                <p className="text-sm text-gray-500 mt-1">{user.name}</p>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Icon icon="mdi:close" className="w-5 h-5 text-gray-600" />
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
            <Icon icon="mdi:logout" className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Chiqish</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile: Sidebar yopiq bo'lganda top padding qo'shish */}
        <main className={`flex-1 overflow-y-auto p-6 ${!isDesktop && !sidebarOpen ? 'pt-20' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
