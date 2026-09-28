/**
 * Toshkent vaqti (UTC+5, yozgi vaqt yo'q) bo'yicha kun/hafta/oy chegaralari.
 *
 * Server TZ sozlamasiga bog'liq emas: `setHours(0)` / `toISOString()` server UTC da
 * bo'lsa kun Toshkentda 05:00 da boshlanib, 00:00–05:00 dagi yozuvlar oldingi kunga
 * tushardi. Barcha hisob "siljitilgan" UTC maydonlari orqali bajariladi.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** Toshkent "devor soati"ni UTC maydonlarida ko'rsatuvchi Date (faqat getUTC* uchun) */
const shift = (date: Date) => new Date(date.getTime() + OFFSET_MS);
const unshift = (shifted: Date) => new Date(shifted.getTime() - OFFSET_MS);

/** Toshkent bo'yicha sana qismlari */
export function tashkentParts(date: Date) {
  const s = shift(date);
  return {
    year: s.getUTCFullYear(),
    month: s.getUTCMonth(), // 0-11
    day: s.getUTCDate(),
    hour: s.getUTCHours(),
    /** 0 = dushanba ... 6 = yakshanba */
    weekdayMon0: (s.getUTCDay() + 6) % 7,
  };
}

/** "YYYY-MM-DD" (Toshkent kuni) */
export function tashkentDateKey(date: Date): string {
  return shift(date).toISOString().slice(0, 10);
}

/** Toshkent vaqti bilan berilgan sana/soat → haqiqiy UTC momenti. month 0-11, day oshib ketsa normallashadi */
export function tashkentDate(year: number, month: number, day = 1, hour = 0, minute = 0, second = 0, ms = 0): Date {
  return unshift(new Date(Date.UTC(year, month, day, hour, minute, second, ms)));
}

export function startOfTashkentDay(date: Date): Date {
  const p = tashkentParts(date);
  return tashkentDate(p.year, p.month, p.day);
}

export function endOfTashkentDay(date: Date): Date {
  const p = tashkentParts(date);
  return tashkentDate(p.year, p.month, p.day, 23, 59, 59, 999);
}

/** Joriy haftaning dushanbasi 00:00 (Toshkent) */
export function startOfTashkentWeek(date: Date): Date {
  const p = tashkentParts(date);
  return tashkentDate(p.year, p.month, p.day - p.weekdayMon0);
}

export function startOfTashkentMonth(date: Date): Date {
  const p = tashkentParts(date);
  return tashkentDate(p.year, p.month, 1);
}

export function startOfTashkentYear(date: Date): Date {
  return tashkentDate(tashkentParts(date).year, 0, 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
