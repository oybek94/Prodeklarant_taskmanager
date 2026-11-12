import { prisma } from '../prisma';

/**
 * Xodim sessiyasining yaroqliligi: token ichidagi `tv` bazadagi `User.tokenVersion` ga teng
 * va xodim faol bo'lishi shart. Parol/rol/filial o'zgarsa yoki xodim bloklansa versiya
 * oshadi — ilgari berilgan tokenlar (30 kunlik refresh ham) darhol yaroqsiz bo'ladi.
 *
 * Har so'rovga bazaga bormaslik uchun natija qisqa muddat keshlanadi. Shu jarayondagi
 * o'zgarish `invalidateStaffSession` bilan darhol tozalanadi; boshqa jarayonlar (pm2
 * klaster) uchun kechikish eng ko'pi bilan CACHE_TTL_MS.
 */
const CACHE_TTL_MS = 15_000;
const CACHE_MAX_ENTRIES = 5_000;

interface SessionSnapshot {
  tokenVersion: number;
  active: boolean;
}

const cache = new Map<number, { snapshot: SessionSnapshot | null; expiresAt: number }>();

const loadSnapshot = async (userId: number): Promise<SessionSnapshot | null> => {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.snapshot;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true, active: true },
  });
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(userId, { snapshot: user, expiresAt: Date.now() + CACHE_TTL_MS });
  return user;
};

/** `tv` yo'q (bu o'zgarishdan oldin berilgan token) = 0 versiya. Baza xatosi chaqiruvchiga uzatiladi. */
export const isStaffSessionValid = async (userId: number, tokenVersion: number | undefined): Promise<boolean> => {
  const snapshot = await loadSnapshot(userId);
  return !!snapshot && snapshot.active && snapshot.tokenVersion === (tokenVersion ?? 0);
};

type RevokeListener = (userId: number) => void;
const revokeListeners: RevokeListener[] = [];

/** Sessiya bekor qilinganda chaqiriladi (masalan, ochiq socket ulanishlarini uzish uchun). */
export const onStaffSessionRevoked = (listener: RevokeListener): void => {
  revokeListeners.push(listener);
};

/** Xodimning kirish huquqi o'zgargan/o'chirilgan: keshni tozalaydi va tinglovchilarni xabardor qiladi. */
export const invalidateStaffSession = (userId: number): void => {
  cache.delete(userId);
  for (const listener of revokeListeners) {
    try {
      listener(userId);
    } catch (err) {
      console.error('Staff session revoke listener error:', err instanceof Error ? err.message : err);
    }
  }
};

export const clearStaffSessionCache = (): void => {
  cache.clear();
};
