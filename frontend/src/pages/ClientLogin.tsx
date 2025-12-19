import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../contexts/ClientAuthContext';
import Logo from '../components/Logo';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useClientAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/client/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login xatosi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-blue-50 to-brand-light/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-brand-light/20">
          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" showText={true} />
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-brand-primary mb-2">
                Mijoz Portali
              </h2>
              <p className="text-brand-light font-medium">
                Loyihalaringizni kuzatib boring
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition"
                placeholder="email@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Parol
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary transition"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-primary text-white py-3.5 px-4 rounded-lg font-semibold hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Kirish...' : 'Kirish'}
            </button>
          </form>

          {/* Support Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Muammo bormi?{' '}
              <a href="tel:+998901234567" className="text-brand-secondary hover:text-brand-primary font-semibold transition">
                Qo'llab-quvvatlash xizmati
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 PRO DEKLARANT. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </div>
  );
}

