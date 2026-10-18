import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { apiErrorMessage } from '../lib/portalApi';
import { StageSegments } from '../components/StageTrack';

export default function Login() {
  const { status, login } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authenticated') return <Navigate to={location.state?.from ?? '/'} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Telefon raqamni to\'liq kiriting (masalan, +998 90 123 45 67)');
      return;
    }
    if (password.length < 4) {
      setError('Parolni kiriting');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(phone.trim(), password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Kirib bo\'lmadi. Qayta urinib ko\'ring.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section className="flex flex-col gap-8 rounded-b-[28px] bg-p-hero px-6 pb-8 pt-12 text-white lg:w-1/2 lg:justify-between lg:gap-12 lg:rounded-none lg:p-16">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-white text-p-hero lg:size-10">
            <Icon icon="solar:delivery-bold-duotone" width="24" aria-hidden="true" />
          </span>
          <span className="text-[19px] font-extrabold tracking-tight lg:text-[22px]">Prodeklarant</span>
        </div>
        <div className="flex max-w-[560px] flex-col gap-8 lg:gap-10">
          <h1 className="m-0 text-[32px] font-extrabold leading-[1.1] tracking-tight lg:text-5xl">
            Yukingiz qayerda ekanini doim bilib turing
          </h1>
          <div aria-hidden="true" className="hidden rounded-[20px] bg-white/10 p-6 lg:block">
            <div className="mb-4 flex justify-between text-sm font-semibold">
              <span>Olma, 22 t</span>
              <span className="text-white/75">3 / 6</span>
            </div>
            <StageSegments total={6} done={2} tone="hero" />
          </div>
        </div>
        <p className="hidden text-sm text-white/75 lg:block">Bojxona deklaratsiyasi xizmati</p>
      </section>

      <section className="flex flex-1 items-start justify-center px-6 py-8 lg:items-center lg:py-12">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[420px] flex-col gap-5">
          <div>
            <h2 className="m-0 text-[28px] font-extrabold tracking-tight lg:text-[32px]">Kirish</h2>
            <p className="mt-2 text-base leading-normal text-p-muted">Login va parolni mas'ul xodimingiz bergan.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="login" className="text-[15px] font-semibold">Login (telefon raqam)</label>
            <input
              id="login"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-14 rounded-2xl border-[1.5px] border-p-field bg-p-card px-4 text-[17px] text-p-ink placeholder:text-p-muted/70"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-[15px] font-semibold">Parol</label>
            <div className="flex items-center rounded-2xl border-[1.5px] border-p-field bg-p-card focus-within:outline-3 focus-within:outline-p-brand">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[52px] min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-[17px] text-p-ink outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="mr-1.5 flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-p-tint-ink"
              >
                <Icon icon={showPassword ? 'solar:eye-closed-bold-duotone' : 'solar:eye-bold-duotone'} width="20" aria-hidden="true" />
                {showPassword ? 'Yashirish' : 'Ko\'rsatish'}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl bg-p-red-bg p-4 text-[15px] font-medium text-p-red-fg">
              <Icon icon="solar:danger-circle-bold-duotone" width="22" className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-p-brand text-[17px] font-bold text-p-brand-ink disabled:opacity-70"
          >
            {submitting && <Icon icon="solar:refresh-circle-bold-duotone" width="22" className="animate-spin" aria-hidden="true" />}
            {submitting ? 'Kirilmoqda…' : 'Kirish'}
          </button>

          <p className="flex items-start gap-3 rounded-2xl bg-p-tint p-4 text-sm leading-normal">
            <Icon icon="solar:phone-calling-bold-duotone" width="22" className="mt-0.5 shrink-0 text-p-tint-ink" aria-hidden="true" />
            <span>Parolni unutdingizmi? Mas'ul xodimingizga qo'ng'iroq qiling, u yangi parol beradi.</span>
          </p>
        </form>
      </section>
    </div>
  );
}
