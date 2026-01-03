import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    ...(user?.role === 'ADMIN' ? [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] : []),
    { path: '/tasks', label: 'Vazifalar', icon: '📋' },
    { path: '/transactions', label: 'Tranzaksiyalar', icon: '💰' },
    ...(user?.role === 'ADMIN' ? [{ path: '/finance', label: 'Moliya', icon: '💵' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/invoices', label: 'Hisob-fakturalar', icon: '🧾' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/clients', label: 'Mijozlar', icon: '👥' }] : []),
    { path: '/training', label: 'O\'qitish', icon: '📚' },
    ...(user?.role === 'ADMIN' ? [{ path: '/workers', label: 'Ishchilar', icon: '👷' }] : []),
    ...(user?.role === 'ADMIN' ? [{ path: '/settings', label: 'Sozlamalar', icon: '⚙️' }] : []),
    { path: '/profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Prodeklarant</h1>
          {user && (
            <p className="text-sm text-gray-500 mt-1">{user.name}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span>Chiqish</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
