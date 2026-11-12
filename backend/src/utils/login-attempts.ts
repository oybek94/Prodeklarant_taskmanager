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
   * Xotira to'lganda FAQAT muddati o'tgan yozuvlar o'chiriladi. Amaldagi hisob (bloklangan
   * ham, hali chegaraga yetmagan ham) hech qachon o'chirilmaydi — aks holda hujumchi
   * tasodifiy kalitlar bilan xotirani to'ldirib, o'z urinishlar hisobini nolga tushirardi.
   */
  const hasRoom = (): boolean => {
    if (entries.size < maxKeys) return true;
    const time = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= time) entries.delete(key);
    }
    return entries.size < maxKeys;
  };

  return {
    isBlocked(key: string): boolean {
      const entry = current(key);
      if (entry) return entry.failures >= maxFailures;
      // Joy yo'q — yangi kalitni kuzatib bo'lmaydi; ochiq qoldirmasdan rad etamiz (fail closed)
      return !hasRoom();
    },
    recordFailure(key: string): void {
      const entry = current(key);
      if (entry) {
        entry.failures += 1;
        entry.expiresAt = now() + windowMs;
        return;
      }
      if (!hasRoom()) return;
      entries.set(key, { failures: 1, expiresAt: now() + windowMs });
    },
    reset(key: string): void {
      entries.delete(key);
    },
  };
}
