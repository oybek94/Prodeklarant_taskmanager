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
      // Kuzatilmayotgan kalit bloklanmaydi. Xotira to'lgan paytda ham shunday: yangi
      // kalitlarni rad etish hujumchiga hammani kirishdan to'sish imkonini berardi.
      // Haqiqiy hisoblarni himoya qiluvchi limiter (telefon bo'yicha, faqat mavjud xodimlar)
      // xodimlar soni bilan chegaralangan va hech qachon to'lmaydi.
      return (current(key)?.failures ?? 0) >= maxFailures;
    },
    recordFailure(key: string): void {
      const entry = current(key);
      if (entry) {
        // Blok boshlangach muddat qotadi: bloklangan paytdagi urinishlar uni cho'zmaydi,
        // aks holda hujumchi urinishni davom ettirib blokni cheksiz ushlab turardi
        if (entry.failures >= maxFailures) return;
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
