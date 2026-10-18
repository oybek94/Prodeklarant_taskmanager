import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { telHref } from '../format';

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center px-3.5 text-base border-b-[3px] -mb-px ${
    isActive ? 'border-p-brand font-bold text-p-tint-ink' : 'border-transparent font-medium text-p-muted'
  }`;

function AccountMenu() {
  const { client, logout } = usePortalAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profil"
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full bg-p-tint text-[15px] font-bold text-p-tint-ink"
      >
        {initials(client?.name ?? '')}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Menyuni yopish" tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-13 z-40 w-72 rounded-2xl border border-p-line bg-p-card p-2 shadow-xl">
            <div className="px-3 py-2">
              <div className="font-bold">{client?.name}</div>
              {client?.phone && <div className="text-sm text-p-muted">{client.phone}</div>}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold hover:bg-p-tint"
            >
              <Icon icon="solar:logout-2-bold-duotone" width="22" aria-hidden="true" />
              Chiqish
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ManagerPill() {
  const { client } = usePortalAuth();
  const m = client?.manager;
  if (!m?.phone) return null;
  return (
    <div className="hidden items-center gap-3 rounded-full border border-p-line py-1.5 pl-3.5 pr-1.5 lg:flex">
      <div className="text-right">
        <div className="text-xs leading-tight text-p-muted">Mas'ul xodim</div>
        <div className="text-sm font-semibold leading-snug">{m.name}</div>
      </div>
      <a
        href={telHref(m.phone)}
        aria-label={`${m.name}ga qo'ng'iroq qilish`}
        className="flex size-11 items-center justify-center rounded-full bg-p-brand text-p-brand-ink"
      >
        <Icon icon="solar:phone-calling-bold-duotone" width="22" aria-hidden="true" />
      </a>
    </div>
  );
}

const bottomItem = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${isActive ? 'font-bold text-p-tint-ink' : 'font-medium text-p-muted'}`;

export default function PortalLayout() {
  const { client } = usePortalAuth();
  const managerPhone = client?.manager?.phone ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-p-line bg-p-card">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center gap-x-8 px-4 md:min-h-[72px] md:px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-p-brand text-p-brand-ink">
              <Icon icon="solar:delivery-bold-duotone" width="22" aria-hidden="true" />
            </span>
            <span className="text-[19px] font-extrabold tracking-tight">Prodeklarant</span>
          </NavLink>
          <nav aria-label="Asosiy menyu" className="hidden self-stretch md:flex">
            <NavLink to="/" end className={navClass}>Yuklarim</NavLink>
            <NavLink to="/documents" className={navClass}>Hujjatlar</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3.5">
            <ManagerPill />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-14 md:pt-8">
        <Outlet />
      </main>

      <nav aria-label="Asosiy menyu" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-p-line bg-p-card px-2 pb-3 pt-1.5 md:hidden">
        <NavLink to="/" end className={bottomItem}>
          {({ isActive }) => (
            <>
              <span className={`flex h-[30px] w-14 items-center justify-center rounded-full ${isActive ? 'bg-p-tint' : ''}`}>
                <Icon icon="solar:delivery-bold-duotone" width="24" aria-hidden="true" />
              </span>
              Yuklarim
            </>
          )}
        </NavLink>
        <NavLink to="/documents" className={bottomItem}>
          {({ isActive }) => (
            <>
              <span className={`flex h-[30px] w-14 items-center justify-center rounded-full ${isActive ? 'bg-p-tint' : ''}`}>
                <Icon icon="solar:document-text-bold-duotone" width="24" aria-hidden="true" />
              </span>
              Hujjatlar
            </>
          )}
        </NavLink>
        {managerPhone ? (
          <a href={telHref(managerPhone)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium text-p-muted">
            <span className="flex h-[30px] w-14 items-center justify-center">
              <Icon icon="solar:phone-calling-bold-duotone" width="24" aria-hidden="true" />
            </span>
            Qo'ng'iroq
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
