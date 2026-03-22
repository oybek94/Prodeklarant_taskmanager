import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '@iconify/react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
      {/* Background Decorative Elements - Bright & Vibrant */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-pulse"></div>
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Card Container - White Glassmorphism */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[40px] p-10 sm:p-12 relative overflow-hidden group">

          {/* Top Decorative Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200/50 mb-6 transform group-hover:scale-110 transition-transform duration-500 border border-slate-100">
              <img src="/favicon.png" alt="ProDeklarant Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
              ProDeklarant
            </h1>
            <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase opacity-70">
              Xush kelibsiz!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Hidden Email Input (Maintained for logic compatibility) */}
            <div className="hidden">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Tizim Paroli
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Icon icon="lucide:lock" className="h-5 w-5 text-slate-300 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-100 text-slate-900 px-6 py-4 pl-14 rounded-2xl focus:outline-none focus:ring-0 focus:border-indigo-500 transition-all placeholder-slate-300 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-indigo-500 transition-colors focus:outline-none"
                >
                  <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="h-5 w-5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-sm animate-shake">
                <Icon icon="lucide:alert-circle" className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center py-5 px-6 rounded-2xl text-base font-black text-white bg-slate-900 hover:bg-slate-800 focus:outline-none shadow-xl shadow-slate-200 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                  <span>Kutilmoqda...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Kirish</span>
                  <Icon icon="lucide:arrow-right" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Powered by ProDeklarant Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

