import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Mijoz portali mustaqil origin'da (my.prodeklarant.uz): /api/portal nginx orqali backend'ga boradi.
const API_BASE_URL =
  import.meta.env.VITE_PORTAL_API_BASE_URL || (import.meta.env.PROD ? '/api/portal' : 'http://localhost:3001/api/portal');

// Xodimlar ilovasidagi kalitlardan ataylab farqli
const ACCESS_KEY = 'portalAccessToken';
const REFRESH_KEY = 'portalRefreshToken';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const portalTokens = {
  get access() { return read(ACCESS_KEY); },
  get refresh() { return read(REFRESH_KEY); },
  set(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch { /* private rejim: sessiya sahifa yangilanguncha */ }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch { /* e'tiborsiz */ }
  },
};

export const portalApi = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

portalApi.interceptors.request.use((config) => {
  const token = portalTokens.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

const refreshAccess = (): Promise<string> => {
  if (!refreshing) {
    const refreshToken = portalTokens.refresh;
    if (!refreshToken) return Promise.reject(new Error('no refresh token'));
    refreshing = axios
      .post<{ accessToken: string; refreshToken: string }>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .then((r) => {
        portalTokens.set(r.data.accessToken, r.data.refreshToken);
        return r.data.accessToken;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean };

/** Sessiya tugaganda (refresh ham o'tmasa) chaqiriladi — context login'ga yo'naltiradi. */
let onSessionExpired: () => void = () => {};
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn; };

portalApi.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as Retriable | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        const token = await refreshAccess();
        original.headers.Authorization = `Bearer ${token}`;
        return portalApi(original);
      } catch {
        portalTokens.clear();
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

/** Foydalanuvchiga ko'rsatiladigan xato matni. */
export function apiErrorMessage(error: unknown, fallback = 'Xatolik yuz berdi. Qayta urinib ko\'ring.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Internetga ulanib bo\'lmadi. Aloqani tekshirib, qayta urinib ko\'ring.';
    const msg = (error.response.data as { error?: unknown } | undefined)?.error;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}
