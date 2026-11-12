// Bitta login (telefon) bo'yicha ketma-ket noto'g'ri urinishlarni cheklash.
// IP bo'yicha rate-limit (server.ts) turli IP lardan bitta xodim parolini saralashni
// to'xtatmaydi — bu yerda hisob telefon bo'yicha yuritiladi. Xotirada saqlanadi
// (bitta instans); restartda nolga tushadi.

interface LimiterOptions {
  maxFailures: number;
  windowMs: number;
  now?: () => number;
  /** Kuzatiladigan kalitlar soni chegarasi (xotira himoyasi) */
  maxKeys?: number;
}

interface Entry {
  failures: number;
  /** Shu vaqtdan keyin hisob nolga tushadi (va blok yechiladi) */
  expiresAt: number;
}

const DEFAULT_MAX_KEYS = 10_000;

export function createLoginAttemptLimiter({ maxFailures, windowMs, now = Date.now, maxKeys = DEFAULT_MAX_KEYS }: LimiterOptions) {
  const entries = new Map<string, Entry>();

  const current = (key: string): Entry | undefined => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  /**
   * Xotira to'lganda joy ochadi: avval muddati o'tganlar, keyin hali bloklanmaganlar
   * o'chiriladi. Bloklangan yozuvlar HECH QACHON o'chirilmaydi — aks holda hujumchi
   * tasodifiy kalitlar bilan xotirani to'ldirib, o'z blokini yechib olardi.
   */
  const makeRoom = (): boolean => {
    const time = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= time) entries.delete(key);
    }
    if (entries.size < maxKeys) return true;
    for (const [key, entry] of entries) {
      if (entry.failures < maxFailures) entries.delete(key);
    }
    return entries.size < maxKeys;
  };

  return {
    isBlocked(key: string): boolean {
      return (current(key)?.failures ?? 0) >= maxFailures;
    },
    recordFailure(key: string): void {
      const entry = current(key);
      if (entry) {
        entry.failures += 1;
        entry.expiresAt = now() + windowMs;
        return;
      }
      if (entries.size >= maxKeys && !makeRoom()) return;
      entries.set(key, { failures: 1, expiresAt: now() + windowMs });
    },
    reset(key: string): void {
      entries.delete(key);
    },
  };
}
