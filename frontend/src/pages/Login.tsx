import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from '@iconify/react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
    }
    return () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    };
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(email, password) as any;
      const role = user?.role;
      if (role === 'ADMIN') {
        navigate('/dashboard');
      } else if (role === 'SELLER') {
        navigate('/crm');
      } else {
        navigate('/tasks');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Login xatolik';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Chap: Brand paneli (desktop) ── */}
      <div className="hidden lg:flex w-[420px] xl:w-[460px] flex-shrink-0 flex-col justify-between bg-indigo-600 p-12 relative overflow-hidden">
        {/* Nuqta tarmog'i */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Pastki chap gradient yog'du */}
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500 rounded-full blur-3xl opacity-40 -translate-x-1/2 translate-y-1/2" />

        {/* Logo + nom */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
            <img src="/favicon.png" alt="ProDeklarant" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ProDeklarant</span>
        </div>

        {/* Asosiy matn */}
        <div className="relative space-y-4">
          <h2 className="text-3xl font-bold text-white leading-snug">
            Bojxona deklaratsiyasi<br />boshqaruv tizimi
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-xs">
            Tasklar, invoyslar, xodimlar va moliyaviy hisobotlarni bir platformada boshqaring.
          </p>

          <div className="pt-4 flex flex-col gap-2.5">
            {[
              { icon: 'lucide:layers', text: 'Jarayonlarni real-vaqtda kuzatish' },
              { icon: 'lucide:users', text: 'Ko\'p foydalanuvchili rollar tizimi' },
              { icon: 'lucide:bar-chart-2', text: 'KPI va moliyaviy hisobotlar' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-indigo-100 text-sm">
                <Icon icon={icon} className="w-4 h-4 flex-shrink-0 text-indigo-300" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-2 text-indigo-300 text-xs">
          <Icon icon="lucide:shield-check" className="w-3.5 h-3.5" />
          <span>Xavfsiz va ishonchli platforma</span>
        </div>
      </div>

      {/* ── O'ng: Forma paneli ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <img src="/favicon.png" alt="ProDeklarant" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">ProDeklarant</span>
          </div>

          {/* Sarlavha */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
              Tizimga kirish
            </h1>
            <p className="text-sm text-gray-500">Parolingizni kiriting davom etish uchun</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Yashirin email (mantiq moslik uchun saqlanadi) */}
            <div className="hidden">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Parol maydoni */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Parol
              </label>
              <div className="relative">
                <Icon
                  icon="lucide:lock"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Parolingizni kiriting"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Xato xabari */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Icon icon="lucide:alert-circle" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Kirish tugmasi */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  <span>Kutilmoqda...</span>
                </>
              ) : (
                <>
                  <span>Kirish</span>
                  <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} ProDeklarant
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
