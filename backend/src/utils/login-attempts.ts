// Bitta login (telefon) bo'yicha ketma-ket noto'g'ri urinishlarni cheklash.
// IP bo'yicha rate-limit (server.ts) turli IP lardan bitta xodim parolini saralashni
// to'xtatmaydi — bu yerda hisob telefon bo'yicha yuritiladi. Xotirada saqlanadi
// (bitta instans); restartda nolga tushadi.

interface LimiterOptions {
  maxFailures: number;
  windowMs: number;
  now?: () => number;
}

interface Entry {
  failures: number;
  /** Shu vaqtdan keyin hisob nolga tushadi (va blok yechiladi) */
  expiresAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

export function createLoginAttemptLimiter({ maxFailures, windowMs, now = Date.now }: LimiterOptions) {
  const entries = new Map<string, Entry>();

  const current = (key: string): Entry | undefined => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
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
      // Tasodifiy telefonlar bilan xotirani to'ldirib yuborishdan himoya
      if (entries.size >= MAX_TRACKED_KEYS) entries.clear();
      entries.set(key, { failures: 1, expiresAt: now() + windowMs });
    },
    reset(key: string): void {
      entries.delete(key);
    },
  };
}
