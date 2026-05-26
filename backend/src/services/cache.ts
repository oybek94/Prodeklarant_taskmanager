/**
 * Simple in-memory cache with TTL support.
 * Suitable for small-scale apps (10-20 concurrent users).
 * No Redis dependency required.
 */

interface CacheEntry<T = any> {
  data: T;
  expiry: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 60_000) {
    // Eskirgan yozuvlarni har daqiqada tozalash
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Keshdan ma'lumot olish.
   * Agar mavjud bo'lmasa yoki muddati o'tgan bo'lsa, undefined qaytaradi.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * Keshga ma'lumot yozish.
   * @param key — kalit nomi
   * @param data — saqlanadigan ma'lumot
   * @param ttlMs — yashash muddati (millisekund)
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Keshdan ma'lumot olish yoki, mavjud bo'lmasa, fetchFn ni chaqirib saqlash.
   */
  async getOrSet<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Berilgan kalit yoki pattern bo'yicha keshni tozalash.
   * Pattern bilan boshlanadigan barcha kalitlar o'chiriladi.
   */
  invalidate(keyOrPrefix: string): void {
    if (this.store.has(keyOrPrefix)) {
      this.store.delete(keyOrPrefix);
      return;
    }
    // Prefix bo'yicha tozalash
    for (const key of this.store.keys()) {
      if (key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Barcha keshni tozalash */
  clear(): void {
    this.store.clear();
  }

  /** Eskirgan yozuvlarni tozalash */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  /** Server to'xtaganda tozalash */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// TTL konstantalari
export const CACHE_TTL = {
  /** Dashboard statistika — 5 daqiqa */
  DASHBOARD_STATS: 5 * 60 * 1000,
  /** Valyuta kursi — 1 soat */
  EXCHANGE_RATE: 60 * 60 * 1000,
  /** Filiallar, ishchilar ro'yxati — 10 daqiqa */
  REFERENCE_DATA: 10 * 60 * 1000,
  /** KPI konfiguratsiya — 30 daqiqa */
  KPI_CONFIG: 30 * 60 * 1000,
  /** Qisqa muddatli — 1 daqiqa */
  SHORT: 60 * 1000,
} as const;

// Singleton instance
export const appCache = new SimpleCache();

// Graceful shutdown
process.on('SIGTERM', () => appCache.destroy());
process.on('SIGINT', () => appCache.destroy());
