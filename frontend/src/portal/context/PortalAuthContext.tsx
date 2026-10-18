import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { portalApi, portalTokens, setSessionExpiredHandler } from '../lib/portalApi';
import type { PortalClient } from '../types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface PortalAuth {
  status: Status;
  client: PortalClient | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<PortalAuth | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(portalTokens.access ? 'loading' : 'anonymous');
  const [client, setClient] = useState<PortalClient | null>(null);

  const logout = useCallback(() => {
    portalTokens.clear();
    setClient(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(logout);
  }, [logout]);

  useEffect(() => {
    if (!portalTokens.access) return;
    let cancelled = false;
    portalApi
      .get<PortalClient>('/auth/me')
      .then((r) => {
        if (cancelled) return;
        setClient(r.data);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) logout();
      });
    return () => { cancelled = true; };
  }, [logout]);

  const login = useCallback(async (loginValue: string, password: string) => {
    const r = await portalApi.post<{ accessToken: string; refreshToken: string }>('/auth/login', { login: loginValue, password });
    portalTokens.set(r.data.accessToken, r.data.refreshToken);
    const me = await portalApi.get<PortalClient>('/auth/me');
    setClient(me.data);
    setStatus('authenticated');
  }, []);

  const value = useMemo(() => ({ status, client, login, logout }), [status, client, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortalAuth(): PortalAuth {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePortalAuth PortalAuthProvider ichida ishlatilishi kerak');
  return v;
}
